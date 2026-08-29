export interface CalendarEvent {
  id: string;
  externalId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  status: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface CreateCalendarEvent {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  location?: string;
  attendees?: string[];
}

export interface UpdateCalendarEvent {
  title?: string;
  description?: string;
  start?: Date;
  end?: Date;
  allDay?: boolean;
  location?: string;
}

export interface CalendarProvider {
  getEvents(userId: string, start: Date, end: Date): Promise<CalendarEvent[]>;
  getAvailability(userId: string, start: Date, end: Date): Promise<TimeSlot[]>;
  createEvent(userId: string, event: CreateCalendarEvent): Promise<CalendarEvent>;
  updateEvent(userId: string, eventId: string, event: UpdateCalendarEvent): Promise<CalendarEvent>;
  deleteEvent(userId: string, eventId: string): Promise<void>;
}
