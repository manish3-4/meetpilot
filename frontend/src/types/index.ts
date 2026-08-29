export interface User {
  id: string
  email: string
  name: string
  timezone: string
  createdAt: string
}

export interface CalendarAccount {
  id: string
  provider: string
  calendarName: string
  isDefault: boolean
  createdAt: string
}

export interface CalendarEvent {
  id: string
  externalId: string
  title: string
  description?: string
  start: string
  end: string
  allDay: boolean
  location?: string
  status: string
}

export interface Meeting {
  id: string
  title: string
  description?: string
  start: string
  end: string
  durationMinutes: number
  status: string
  timezone: string
  location?: string
  meetingLink?: string
  creator: User
  participants: MeetingParticipant[]
  createdAt: string
}

export interface MeetingParticipant {
  id: string
  email: string
  name?: string
  status: string
}

export interface TimeSlot {
  start: string
  end: string
  score: number
  reasons: string[]
}

export interface SchedulingIntent {
  intent: 'CREATE_MEETING' | 'RESCHEDULE_MEETING' | 'CANCEL_MEETING' | 'FIND_AVAILABILITY'
  title?: string
  participants: string[]
  durationMinutes: number
  dateRange: {
    start: string
    end: string
  }
  timePreference?: {
    start: string
    end: string
  }
  excludedDays?: string[]
}

export interface AIConversation {
  id: string
  title?: string
  createdAt: string
  updatedAt: string
}

export interface AIMessage {
  id: string
  role: string
  content: string
  structuredOutput?: {
    intent: SchedulingIntent
    slots: TimeSlot[]
  }
  createdAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    errors?: Record<string, string[]>
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AvailabilityPreference {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}
