import { getPrisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors';

interface UpdateUserInput {
  name?: string;
  timezone?: string;
}

interface UpdatePreferencesInput {
  defaultDurationMinutes?: number;
  bufferMinutes?: number;
  preferredDays?: number[];
  preferredStartTime?: string;
  preferredEndTime?: string;
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

export async function updateMe(userId: string, data: UpdateUserInput) {
  const prisma = getPrisma();
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, timezone: true },
  });

  return user;
}

export async function getPreferences(userId: string) {
  const prisma = getPrisma();
  const preferences = await prisma.availabilityPreference.findMany({
    where: { userId },
    orderBy: { dayOfWeek: 'asc' },
  });

  return preferences;
}

export async function updatePreferences(userId: string, dayOfWeek: number, data: {
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
}) {
  const prisma = getPrisma();
  const preference = await prisma.availabilityPreference.upsert({
    where: { userId_dayOfWeek: { userId, dayOfWeek } },
    update: data,
    create: {
      userId,
      dayOfWeek,
      startTime: data.startTime || '09:00',
      endTime: data.endTime || '17:00',
      isAvailable: data.isAvailable ?? true,
    },
  });

  return preference;
}
