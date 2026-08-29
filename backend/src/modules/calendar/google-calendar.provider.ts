import { google } from 'googleapis';
import { getPrisma } from '../../config/database';
import { config } from '../../config';
import {
  CalendarProvider,
  CalendarEvent,
  TimeSlot,
  CreateCalendarEvent,
  UpdateCalendarEvent,
} from './calendar-provider';
import { UnauthorizedError, NotFoundError } from '../../shared/errors';
import { logger } from '../../shared/logger';

async function getOAuth2Client(userId: string) {
  const prisma = getPrisma();
  const account = await prisma.calendarAccount.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account) {
    throw new NotFoundError('No Google Calendar account connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.tokenExpiry?.getTime(),
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.calendarAccount.update({
        where: { id: account.id },
        data: {
          accessToken: tokens.access_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        },
      });
      logger.info(`Refreshed Google Calendar token for user ${userId}`);
    }
  });

  return { oauth2Client, account };
}

export class GoogleCalendarProvider implements CalendarProvider {
  async getEvents(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
    const { oauth2Client, account } = await getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: account.calendarId || 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id!,
      externalId: event.id!,
      title: event.summary || 'Untitled',
      description: event.description || undefined,
      start: new Date(event.start?.dateTime || event.start?.date || ''),
      end: new Date(event.end?.dateTime || event.end?.date || ''),
      allDay: !!event.start?.date,
      location: event.location || undefined,
      status: event.status || 'confirmed',
    }));
  }

  async getAvailability(userId: string, start: Date, end: Date): Promise<TimeSlot[]> {
    const events = await this.getEvents(userId, start, end);

    // Convert events to busy intervals
    const busyIntervals = events
      .filter((e) => !e.allDay)
      .map((e) => ({
        start: new Date(e.start),
        end: new Date(e.end),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Merge overlapping intervals
    const merged: Array<{ start: Date; end: Date }> = [];
    for (const interval of busyIntervals) {
      if (merged.length === 0) {
        merged.push(interval);
      } else {
        const last = merged[merged.length - 1];
        if (interval.start <= last.end) {
          last.end = new Date(Math.max(last.end.getTime(), interval.end.getTime()));
        } else {
          merged.push(interval);
        }
      }
    }

    // Generate free slots
    const slots: TimeSlot[] = [];
    let currentTime = new Date(start);

    for (const busy of merged) {
      if (currentTime < busy.start) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(busy.start),
          available: true,
        });
      }
      currentTime = new Date(Math.max(currentTime.getTime(), busy.end.getTime()));
    }

    if (currentTime < end) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(end),
        available: true,
      });
    }

    return slots;
  }

  async createEvent(userId: string, event: CreateCalendarEvent): Promise<CalendarEvent> {
    const { oauth2Client, account } = await getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.insert({
      calendarId: account.calendarId || 'primary',
      requestBody: {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        },
        location: event.location,
        attendees: event.attendees?.map((email) => ({ email })),
      },
    });

    const created = response.data;

    // Store in database
    const prisma = getPrisma();
    await prisma.calendarEvent.create({
      data: {
        calendarAccountId: account.id,
        externalEventId: created.id!,
        title: event.title,
        description: event.description,
        start: event.start,
        end: event.end,
        allDay: event.allDay || false,
        location: event.location,
      },
    });

    return {
      id: created.id!,
      externalId: created.id!,
      title: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      allDay: event.allDay || false,
      location: event.location,
      status: 'confirmed',
    };
  }

  async updateEvent(userId: string, eventId: string, event: UpdateCalendarEvent): Promise<CalendarEvent> {
    const { oauth2Client, account } = await getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const requestBody: Record<string, unknown> = {};
    if (event.title) requestBody.summary = event.title;
    if (event.description) requestBody.description = event.description;
    if (event.location) requestBody.location = event.location;
    if (event.start) {
      requestBody.start = {
        dateTime: event.start.toISOString(),
        timeZone: 'UTC',
      };
    }
    if (event.end) {
      requestBody.end = {
        dateTime: event.end.toISOString(),
        timeZone: 'UTC',
      };
    }

    const response = await calendar.events.patch({
      calendarId: account.calendarId || 'primary',
      eventId,
      requestBody,
    });

    const updated = response.data;

    // Update in database
    const prisma = getPrisma();
    await prisma.calendarEvent.updateMany({
      where: { calendarAccountId: account.id, externalEventId: eventId },
      data: {
        title: event.title,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
      },
    });

    return {
      id: updated.id!,
      externalId: updated.id!,
      title: updated.summary || 'Untitled',
      description: updated.description || undefined,
      start: new Date(updated.start?.dateTime || updated.start?.date || ''),
      end: new Date(updated.end?.dateTime || updated.end?.date || ''),
      allDay: !!updated.start?.date,
      location: updated.location || undefined,
      status: updated.status || 'confirmed',
    };
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const { oauth2Client, account } = await getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: account.calendarId || 'primary',
      eventId,
    });

    // Delete from database
    const prisma = getPrisma();
    await prisma.calendarEvent.deleteMany({
      where: { calendarAccountId: account.id, externalEventId: eventId },
    });
  }
}
