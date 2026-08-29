# architecture.md

# AI Meeting Scheduler — Architecture

## 1. Overview

AI Meeting Scheduler is an AI-powered SaaS application that allows users to schedule meetings using natural-language instructions.

Example:

> "Schedule a 30-minute meeting with Rahul and Priya next week after 2 PM. Avoid Friday."

The system uses AI to understand the request and converts it into structured scheduling constraints. A deterministic scheduling engine then checks calendar availability and finds valid meeting slots.

The AI must never directly decide whether a calendar slot is available. Calendar availability and booking must always be validated by backend services.

## 2. High-Level Architecture

```text
                        ┌─────────────────────┐
                        │       User          │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   React Frontend    │
                        │                     │
                        │ Dashboard           │
                        │ AI Scheduler        │
                        │ Calendar            │
                        │ Meetings            │
                        │ Settings            │
                        └──────────┬──────────┘
                                   │ HTTPS
                                   ▼
                        ┌─────────────────────┐
                        │    REST API         │
                        │  Node + Express     │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
       ┌─────────────┐      ┌──────────────┐     ┌─────────────┐
       │ Auth Service│      │ AI Service   │     │ Meeting     │
       │             │      │              │     │ Service     │
       └─────────────┘      └──────┬───────┘     └──────┬──────┘
                                   │                    │
                                   ▼                    ▼
                            ┌──────────────┐     ┌──────────────┐
                            │ LLM Provider │     │ Scheduling   │
                            │              │     │ Engine       │
                            └──────────────┘     └──────┬───────┘
                                                       │
                                  ┌────────────────────┼───────────────────┐
                                  │                    │                   │
                                  ▼                    ▼                   ▼
                           ┌─────────────┐      ┌─────────────┐     ┌─────────────┐
                           │ PostgreSQL  │      │ Redis       │     │ Calendar    │
                           │             │      │             │     │ Providers   │
                           └─────────────┘      └─────────────┘     └──────┬──────┘
                                                                          │
                                                               ┌──────────┴──────────┐
                                                               │                     │
                                                               ▼                     ▼
                                                        Google Calendar       Microsoft Graph
```

## 3. Technology Stack

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router
* TanStack Query
* FullCalendar or equivalent
* Axios
* Zod

### Backend

* Node.js
* Express.js
* TypeScript
* REST APIs
* JWT authentication
* OAuth 2.0
* Zod validation

### Database

PostgreSQL with Prisma ORM.

### Caching

Redis for:

* Calendar availability caching
* Rate limiting
* Temporary scheduling state
* AI request throttling

### AI

Use an LLM capable of structured output/tool calling.

The AI layer handles:

* Intent detection
* Meeting requirement extraction
* Natural-language date interpretation
* Participant extraction
* Preference extraction
* Scheduling explanation

### Calendar Integrations

Initial:

* Google Calendar

Future:

* Microsoft Outlook
* Apple Calendar

### Deployment

* Frontend: Vercel
* Backend: Render / AWS
* Database: PostgreSQL
* Cache: Redis Cloud / managed Redis

## 4. Major Services

### Authentication Service

Responsibilities:

* Registration
* Login
* Password hashing
* JWT generation
* Refresh tokens
* Logout
* Protected routes

Never store plaintext passwords.

### User Service

Responsibilities:

* User profile
* Timezone
* Working hours
* Scheduling preferences
* Meeting defaults

### Calendar Service

Responsibilities:

* Connect calendar provider
* OAuth
* Refresh access tokens
* Fetch events
* Check availability
* Create events
* Update events
* Delete events

Use a provider abstraction:

```ts
interface CalendarProvider {
  getEvents(
    userId: string,
    start: Date,
    end: Date
  ): Promise<CalendarEvent[]>;

  getAvailability(
    userId: string,
    start: Date,
    end: Date
  ): Promise<TimeSlot[]>;

  createEvent(
    userId: string,
    event: CreateCalendarEvent
  ): Promise<CalendarEvent>;

  updateEvent(
    userId: string,
    eventId: string,
    event: UpdateCalendarEvent
  ): Promise<CalendarEvent>;

  deleteEvent(
    userId: string,
    eventId: string
  ): Promise<void>;
}
```

## 5. AI Service

The AI Service must never directly modify application state.

```text
Natural Language
       ↓
LLM
       ↓
Structured Intent
       ↓
Validation
       ↓
Scheduling Engine
       ↓
Result
       ↓
LLM Explanation
```

Example:

```json
{
  "intent": "CREATE_MEETING",
  "title": "Project Discussion",
  "participants": [
    "rahul@example.com",
    "priya@example.com"
  ],
  "durationMinutes": 30,
  "dateRange": {
    "start": "2026-09-01",
    "end": "2026-09-07"
  },
  "timePreference": {
    "start": "14:00",
    "end": "18:00"
  },
  "excludedDays": [
    "FRIDAY"
  ]
}
```

## 6. Scheduling Engine

The Scheduling Engine is deterministic.

It receives:

* Participants
* Date range
* Duration
* Working hours
* Calendar events
* User preferences
* Buffer requirements
* Timezone
* Constraints

It returns ranked valid slots.

## 7. Slot Ranking

Factors may include:

* Participant availability
* Preferred hours
* Working hours
* Buffer availability
* Preferred days
* Earliest/later preference
* Meeting priority

## 8. Database Architecture

Core entities:

```text
User
CalendarAccount
CalendarEvent
Meeting
MeetingParticipant
AvailabilityPreference
SchedulingRequest
RefreshToken
AIConversation
AIMessage
```

## 9. API Architecture

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Users

```http
GET   /api/users/me
PATCH /api/users/me
GET   /api/users/me/preferences
PATCH /api/users/me/preferences
```

### Calendar

```http
GET    /api/calendar/connect
GET    /api/calendar/callback
GET    /api/calendar/accounts
DELETE /api/calendar/accounts/:id
GET    /api/calendar/events
GET    /api/calendar/availability
```

### Meetings

```http
POST   /api/meetings
GET    /api/meetings
GET    /api/meetings/:id
PATCH  /api/meetings/:id
DELETE /api/meetings/:id
POST   /api/meetings/:id/confirm
POST   /api/meetings/:id/reschedule
```

### AI

```http
POST /api/ai/chat
POST /api/ai/schedule
```

## 10. Security

Implement:

* HTTPS in production
* Argon2 or bcrypt
* JWT expiration
* Refresh-token rotation
* OAuth state validation
* CSRF protection where applicable
* Rate limiting
* Request validation
* Secure HTTP headers
* CORS
* Environment variables
* Token encryption where possible

Never log passwords, OAuth tokens, JWT secrets, or unnecessary private calendar information.

## 11. Core Principle

```text
AI interprets.
Backend validates.
Scheduling Engine calculates.
Calendar provider confirms.
User confirms.
Backend performs the side effect.
```
