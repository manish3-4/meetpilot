import { google } from 'googleapis';
import { getPrisma } from '../../config/database';
import { config } from '../../config';
import { GoogleCalendarProvider } from './google-calendar.provider';
import { CalendarProvider, CalendarEvent } from './calendar-provider';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { logger } from '../../shared/logger';

const calendarProvider = new GoogleCalendarProvider();

function getCalendarProvider(): CalendarProvider {
  return calendarProvider;
}

export function getGoogleAuthUrl(userId: string, state: string): string {
  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent',
  });

  return url;
}

export async function handleOAuthCallback(
  code: string,
  userId: string
): Promise<{ calendarId: string; calendarName: string }> {
  const prisma = getPrisma();

  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get user info
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendarList = await calendar.calendarList.list();
  const primaryCalendar = calendarList.data.items?.find((cal) => cal.primary);

  if (!primaryCalendar) {
    throw new BadRequestError('No primary calendar found');
  }

  // Store or update calendar account
  const existingAccount = await prisma.calendarAccount.findFirst({
    where: { userId, provider: 'google', providerAccountId: primaryCalendar.id! },
  });

  if (existingAccount) {
    await prisma.calendarAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        calendarId: primaryCalendar.id,
        calendarName: primaryCalendar.summary || 'Google Calendar',
      },
    });
  } else {
    await prisma.calendarAccount.create({
      data: {
        userId,
        provider: 'google',
        providerAccountId: primaryCalendar.id!,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        calendarId: primaryCalendar.id,
        calendarName: primaryCalendar.summary || 'Google Calendar',
      },
    });
  }

  return {
    calendarId: primaryCalendar.id!,
    calendarName: primaryCalendar.summary || 'Google Calendar',
  };
}

export async function getCalendarAccounts(userId: string) {
  const prisma = getPrisma();
  const accounts = await prisma.calendarAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      calendarName: true,
      isDefault: true,
      createdAt: true,
    },
  });

  return accounts;
}

export async function disconnectCalendar(userId: string, accountId: string): Promise<void> {
  const prisma = getPrisma();
  const account = await prisma.calendarAccount.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    throw new NotFoundError('Calendar account not found');
  }

  await prisma.calendarAccount.delete({ where: { id: accountId } });
}

export async function getEvents(
  userId: string,
  start: Date,
  end: Date
): Promise<CalendarEvent[]> {
  return calendarProvider.getEvents(userId, start, end);
}

export async function getAvailability(
  userId: string,
  start: Date,
  end: Date
) {
  return calendarProvider.getAvailability(userId, start, end);
}
