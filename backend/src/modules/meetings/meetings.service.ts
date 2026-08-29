import { getPrisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors';
import { GoogleCalendarProvider } from '../calendar/google-calendar.provider';
import { logger } from '../../shared/logger';

const calendarProvider = new GoogleCalendarProvider();

interface CreateMeetingInput {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  participants: string[];
  timezone?: string;
  location?: string;
}

interface UpdateMeetingInput {
  title?: string;
  description?: string;
  start?: Date;
  end?: Date;
  location?: string;
}

export async function createMeeting(userId: string, input: CreateMeetingInput) {
  const prisma = getPrisma();

  // Re-check availability before creating
  const existingEvents = await calendarProvider.getEvents(
    userId,
    new Date(input.start.getTime() - 24 * 60 * 60 * 1000),
    new Date(input.end.getTime() + 24 * 60 * 60 * 1000)
  );

  const hasConflict = existingEvents.some(
    (event) => input.start < event.end && input.end > event.start
  );

  if (hasConflict) {
    throw new BadRequestError('Time slot is no longer available');
  }

  // Create calendar event
  const calendarEvent = await calendarProvider.createEvent(userId, {
    title: input.title,
    description: input.description,
    start: input.start,
    end: input.end,
    location: input.location,
    attendees: input.participants,
  });

  // Create meeting in database
  const meeting = await prisma.meeting.create({
    data: {
      title: input.title,
      description: input.description,
      start: input.start,
      end: input.end,
      durationMinutes: input.durationMinutes,
      creatorId: userId,
      timezone: input.timezone || 'UTC',
      location: input.location,
      externalEventId: calendarEvent.externalId,
    },
  });

  // Create participants
  for (const participant of input.participants) {
    const user = await prisma.user.findFirst({ where: { email: participant } });
    await prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        userId: user?.id,
        email: participant,
        name: user?.name,
        status: user ? 'ACCEPTED' : 'PENDING',
      },
    });
  }

  return meeting;
}

export async function getMeetings(userId: string, start?: Date, end?: Date) {
  const prisma = getPrisma();

  const where: Record<string, unknown> = {
    OR: [
      { creatorId: userId },
      { participants: { some: { userId } } },
    ],
  };

  if (start && end) {
    where.start = { gte: start };
    where.end = { lte: end };
  }

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      participants: true,
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { start: 'asc' },
  });

  return meetings;
}

export async function getMeetingById(meetingId: string, userId: string) {
  const prisma = getPrisma();

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      participants: true,
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  if (!meeting) {
    throw new NotFoundError('Meeting not found');
  }

  // Check if user is creator or participant
  const isCreator = meeting.creatorId === userId;
  const isParticipant = meeting.participants.some((p) => p.userId === userId);

  if (!isCreator && !isParticipant) {
    throw new ForbiddenError('You do not have access to this meeting');
  }

  return meeting;
}

export async function updateMeeting(meetingId: string, userId: string, input: UpdateMeetingInput) {
  const prisma = getPrisma();

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    throw new NotFoundError('Meeting not found');
  }

  if (meeting.creatorId !== userId) {
    throw new ForbiddenError('Only the meeting creator can update it');
  }

  // Update calendar event if external event exists
  if (meeting.externalEventId) {
    try {
      await calendarProvider.updateEvent(userId, meeting.externalEventId, {
        title: input.title,
        description: input.description,
        start: input.start,
        end: input.end,
        location: input.location,
      });
    } catch (error) {
      logger.error('Failed to update calendar event', undefined, { error: (error as Error).message });
    }
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      title: input.title,
      description: input.description,
      start: input.start,
      end: input.end,
      location: input.location,
    },
  });

  return updated;
}

export async function deleteMeeting(meetingId: string, userId: string) {
  const prisma = getPrisma();

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    throw new NotFoundError('Meeting not found');
  }

  if (meeting.creatorId !== userId) {
    throw new ForbiddenError('Only the meeting creator can cancel it');
  }

  // Delete calendar event
  if (meeting.externalEventId) {
    try {
      await calendarProvider.deleteEvent(userId, meeting.externalEventId);
    } catch (error) {
      logger.error('Failed to delete calendar event', undefined, { error: (error as Error).message });
    }
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: 'CANCELLED' },
  });

  return { message: 'Meeting cancelled' };
}

export async function confirmMeeting(meetingId: string, userId: string) {
  const prisma = getPrisma();

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: true },
  });

  if (!meeting) {
    throw new NotFoundError('Meeting not found');
  }

  // Re-check availability
  if (meeting.externalEventId) {
    try {
      const events = await calendarProvider.getEvents(
        userId,
        new Date(meeting.start.getTime() - 60 * 60 * 1000),
        new Date(meeting.end.getTime() + 60 * 60 * 1000)
      );

      const hasConflict = events.some(
        (event) =>
          event.externalId !== meeting.externalEventId &&
          meeting.start < event.end &&
          meeting.end > event.start
      );

      if (hasConflict) {
        throw new BadRequestError('That time is no longer available. Please select another slot.');
      }
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      logger.error('Failed to re-check availability', undefined, { error: (error as Error).message });
    }
  }

  // Update participant status
  const participant = meeting.participants.find((p) => p.userId === userId);
  if (participant) {
    await prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: { status: 'ACCEPTED' },
    });
  }

  return { message: 'Meeting confirmed' };
}
