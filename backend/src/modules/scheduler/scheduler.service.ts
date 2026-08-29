import { getPrisma } from '../../config/database';
import { findAvailableSlots, rankSlots, SchedulingConstraint } from './scheduler.engine';
import { getEvents } from '../calendar/calendar.service';
import { logger } from '../../shared/logger';

interface ScheduleRequest {
  participants: string[];
  dateRange: { start: Date; end: Date };
  durationMinutes: number;
  timePreference?: { start: string; end: string };
  excludedDays?: number[];
  timezone?: string;
}

export async function findSlots(
  userId: string,
  request: ScheduleRequest
) {
  const prisma = getPrisma();

  // Get user preferences
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const timezone = request.timezone || user?.timezone || 'UTC';

  // Get working hours
  const preferences = await prisma.availabilityPreference.findMany({
    where: { userId },
  });

  const workingHours = preferences
    .filter((p) => p.isAvailable)
    .map((p) => ({
      start: p.startTime,
      end: p.endTime,
    }));

  // Get calendar events for all participants
  const allEvents: Array<{ start: Date; end: Date }> = [];

  // Get current user's events
  const userEvents = await getEvents(userId, request.dateRange.start, request.dateRange.end);
  allEvents.push(...userEvents.map((e) => ({ start: e.start, end: e.end })));

  // Get participant events (if they are users in the system)
  for (const participant of request.participants) {
    const participantUser = await prisma.user.findFirst({
      where: { email: participant },
    });

    if (participantUser) {
      const participantEvents = await getEvents(
        participantUser.id,
        request.dateRange.start,
        request.dateRange.end
      );
      allEvents.push(...participantEvents.map((e) => ({ start: e.start, end: e.end })));
    }
  }

  // Create scheduling constraint
  const constraint: SchedulingConstraint = {
    participants: request.participants,
    dateRange: request.dateRange,
    durationMinutes: request.durationMinutes,
    workingHours,
    existingEvents: allEvents,
    bufferMinutes: 15, // Default buffer
    timezone,
    timePreference: request.timePreference,
    excludedDays: request.excludedDays,
  };

  // Find available slots
  const slots = findAvailableSlots(constraint);
  const rankedSlots = rankSlots(slots);

  return rankedSlots;
}
