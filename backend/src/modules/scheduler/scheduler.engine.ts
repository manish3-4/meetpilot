import { TimeSlot } from '../calendar/calendar-provider';

export interface SchedulingConstraint {
  participants: string[];
  dateRange: { start: Date; end: Date };
  durationMinutes: number;
  workingHours: { start: string; end: string }[];
  existingEvents: TimeSlot[];
  bufferMinutes: number;
  timezone: string;
  timePreference?: { start: string; end: string };
  excludedDays?: number[];
}

export interface CandidateSlot {
  start: Date;
  end: Date;
  score: number;
  reasons: string[];
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function mergeIntervals(intervals: Array<{ start: Date; end: Date }>): Array<{ start: Date; end: Date }> {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Array<{ start: Date; end: Date }> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = new Date(Math.max(last.end.getTime(), sorted[i].end.getTime()));
    } else {
      merged.push(sorted[i]);
    }
  }

  return merged;
}

export function findAvailableSlots(constraint: SchedulingConstraint): CandidateSlot[] {
  const {
    dateRange,
    durationMinutes,
    workingHours,
    existingEvents,
    bufferMinutes,
    timePreference,
    excludedDays,
  } = constraint;

  const candidateSlots: CandidateSlot[] = [];
  const currentDate = new Date(dateRange.start);

  while (currentDate <= dateRange.end) {
    const dayOfWeek = currentDate.getDay();

    // Skip excluded days
    if (excludedDays?.includes(dayOfWeek)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Get working hours for this day
    const dayHours = workingHours.find((wh) => {
      const dayNum = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(wh.start);
      return dayNum === dayOfWeek || wh.start === dayOfWeek.toString();
    });

    if (!dayHours) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const dayStart = timeToMinutes(dayHours.start);
    const dayEnd = timeToMinutes(dayHours.end);

    // Get busy intervals for this day
    const dayBusy = existingEvents
      .filter((event) => {
        const eventDate = new Date(event.start);
        return eventDate.toDateString() === currentDate.toDateString();
      })
      .map((event) => ({
        start: new Date(event.start),
        end: new Date(event.end),
      }));

    const mergedBusy = mergeIntervals(dayBusy);

    // Find free intervals
    let currentTime = dayStart;

    for (const busy of mergedBusy) {
      const busyStart = busy.start.getHours() * 60 + busy.start.getMinutes();
      const busyEnd = busy.end.getHours() * 60 + busy.end.getMinutes();

      // Free interval before busy
      if (currentTime + durationMinutes + bufferMinutes <= busyStart) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        const slot = createCandidateSlot(slotStart, slotEnd, constraint);
        if (slot) candidateSlots.push(slot);
      }

      currentTime = busyEnd + bufferMinutes;
    }

    // Check free interval after last busy
    if (currentTime + durationMinutes <= dayEnd) {
      const slotStart = new Date(currentDate);
      slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

      const slot = createCandidateSlot(slotStart, slotEnd, constraint);
      if (slot) candidateSlots.push(slot);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort by score descending
  candidateSlots.sort((a, b) => b.score - a.score);

  return candidateSlots;
}

function createCandidateSlot(
  start: Date,
  end: Date,
  constraint: SchedulingConstraint
): CandidateSlot | null {
  let score = 0;
  const reasons: string[] = [];

  // Check if all participants are available
  const hasConflict = constraint.existingEvents.some(
    (event) => start < event.end && end > event.start
  );

  if (hasConflict) {
    return null;
  }

  score += 30;
  reasons.push('All participants are available');

  // Check working hours
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const workStart = timeToMinutes(constraint.workingHours[0]?.start || '09:00');
  const workEnd = timeToMinutes(constraint.workingHours[0]?.end || '17:00');

  if (startMinutes >= workStart && endMinutes <= workEnd) {
    score += 20;
    reasons.push('Within working hours');
  }

  // Check time preference
  if (constraint.timePreference) {
    const prefStart = timeToMinutes(constraint.timePreference.start);
    const prefEnd = timeToMinutes(constraint.timePreference.end);

    if (startMinutes >= prefStart && endMinutes <= prefEnd) {
      score += 25;
      reasons.push('Matches preferred time range');
    }
  }

  // Check buffer availability
  const bufferAvailable = !constraint.existingEvents.some((event) => {
    const eventStart = event.start.getHours() * 60 + event.start.getMinutes();
    const eventEnd = event.end.getHours() * 60 + event.end.getMinutes();
    return (
      Math.abs(startMinutes - eventEnd) < constraint.bufferMinutes ||
      Math.abs(eventStart - endMinutes) < constraint.bufferMinutes
    );
  });

  if (bufferAvailable) {
    score += 15;
    reasons.push(`${constraint.bufferMinutes} minute buffer available`);
  }

  // Prefer earlier slots
  const hoursFromNow = (start.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursFromNow < 24) {
    score += 10;
    reasons.push('Within next 24 hours');
  }

  return {
    start,
    end,
    score,
    reasons,
  };
}

export function rankSlots(slots: CandidateSlot[], maxSlots: number = 5): CandidateSlot[] {
  return slots.slice(0, maxSlots);
}
