import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getPrisma } from '../../config/database';
import { config } from '../../config';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../shared/errors';
import { AuthPayload } from '../../middleware/auth';

const SALT_ROUNDS = 12;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

async function storeRefreshToken(token: string, userId: string, expiresAt: Date): Promise<void> {
  const prisma = getPrisma();
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
}

export async function register(
  email: string,
  name: string,
  password: string
): Promise<{ user: { id: string; email: string; name: string }; tokens: TokenPair }> {
  const prisma = getPrisma();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new BadRequestError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  // Create default availability preferences (Mon-Fri 9-17)
  const defaultPreferences = [];
  for (let day = 1; day <= 5; day++) {
    defaultPreferences.push({
      userId: user.id,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    });
  }
  await prisma.availabilityPreference.createMany({ data: defaultPreferences });

  const tokenPayload: AuthPayload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await storeRefreshToken(refreshToken, user.id, expiresAt);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    tokens: { accessToken, refreshToken },
  };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: { id: string; email: string; name: string }; tokens: TokenPair }> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokenPayload: AuthPayload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await storeRefreshToken(refreshToken, user.id, expiresAt);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    tokens: { accessToken, refreshToken },
  };
}

export async function refreshTokens(
  refreshToken: string
): Promise<{ tokens: TokenPair }> {
  const prisma = getPrisma();

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (new Date() > storedToken.expiresAt) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new UnauthorizedError('Refresh token expired');
  }

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const tokenPayload: AuthPayload = {
    userId: storedToken.user.id,
    email: storedToken.user.email,
  };
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await storeRefreshToken(newRefreshToken, storedToken.user.id, expiresAt);

  return {
    tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export async function getMe(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, timezone: true, createdAt: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}
