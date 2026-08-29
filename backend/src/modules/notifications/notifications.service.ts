import { logger } from '../../shared/logger';

interface NotificationData {
  meetingId: string;
  title: string;
  start: Date;
  end: Date;
  participants: string[];
}

export async function sendMeetingCreatedNotification(data: NotificationData): Promise<void> {
  logger.info('Meeting created notification', undefined, {
    meetingId: data.meetingId,
    title: data.title,
    participants: data.participants,
  });
}

export async function sendMeetingCancelledNotification(data: NotificationData): Promise<void> {
  logger.info('Meeting cancelled notification', undefined, {
    meetingId: data.meetingId,
    title: data.title,
    participants: data.participants,
  });
}

export async function sendMeetingRescheduledNotification(
  data: NotificationData,
  oldStart: Date,
  oldEnd: Date
): Promise<void> {
  logger.info('Meeting rescheduled notification', undefined, {
    meetingId: data.meetingId,
    title: data.title,
    oldStart: oldStart.toISOString(),
    oldEnd: oldEnd.toISOString(),
    newStart: data.start.toISOString(),
    newEnd: data.end.toISOString(),
  });
}
