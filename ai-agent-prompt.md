# ai-agent-prompt.md

# AI AGENT — BUILD THE AI MEETING SCHEDULER

You are a senior full-stack engineer responsible for designing, implementing, testing, and preparing a production-quality AI-powered meeting scheduler.

You must implement the project completely.

Do not create a superficial demo.

Do not leave core functionality mocked unless explicitly required by this specification.

---

# 1. PROJECT OBJECTIVE

Build a SaaS application that allows users to schedule meetings using natural language.

Example:

> "Schedule a 30-minute meeting with Rahul and Priya next week after 2 PM. Avoid Friday."

The application must:

1. Understand the request using an LLM.
2. Convert it into structured scheduling constraints.
3. Validate the constraints.
4. Resolve participants.
5. Access connected calendars.
6. Determine actual availability.
7. Generate valid meeting slots.
8. Rank the slots.
9. Explain recommended slots.
10. Ask the user for confirmation.
11. Re-check availability.
12. Create the calendar event.
13. Store the meeting.
14. Notify participants.

---

# 2. READ THE DOCUMENTATION FIRST

Before writing code, read:

```text
architecture.md
design.md
decision.md
workflow.md
```

These files define the system architecture, UI requirements, technical decisions, and workflows.

Treat them as project requirements.

Do not contradict them without a strong technical reason.

---

# 3. TECHNOLOGY STACK

## Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router
* TanStack Query
* Axios
* FullCalendar or equivalent mature calendar library
* Zod

## Backend

* Node.js
* Express
* TypeScript
* REST API
* Prisma
* PostgreSQL
* Redis

## Authentication

* JWT access tokens
* Refresh tokens
* Argon2 or bcrypt

## AI

Use an LLM provider supporting structured output/tool calling.

The AI provider must be abstracted so it can be replaced later.

## Calendar

Implement Google Calendar first.

Use a calendar-provider abstraction.

---

# 4. PROJECT STRUCTURE

Create:

```text
ai-meeting-scheduler/
│
├── frontend/
├── backend/
├── docs/
├── architecture.md
├── design.md
├── decision.md
├── workflow.md
├── ai-agent-prompt.md
├── docker-compose.yml
├── .env.example
├── README.md
└── package.json
```

Backend:

```text
backend/
└── src/
    ├── config/
    ├── middleware/
    ├── modules/
    │   ├── auth/
    │   ├── users/
    │   ├── calendar/
    │   ├── meetings/
    │   ├── scheduler/
    │   ├── ai/
    │   └── notifications/
    ├── shared/
    ├── app.ts
    └── server.ts
```

Frontend:

```text
frontend/
└── src/
    ├── api/
    ├── components/
    │   ├── ui/
    │   ├── layout/
    │   ├── calendar/
    │   ├── meetings/
    │   ├── scheduler/
    │   └── ai/
    ├── hooks/
    ├── pages/
    ├── routes/
    ├── services/
    ├── store/
    ├── types/
    ├── utils/
    ├── App.tsx
    └── main.tsx
```

---

# 5. DATABASE

Use PostgreSQL + Prisma.

Implement migrations.

Create appropriate models for:

```text
User
RefreshToken
CalendarAccount
CalendarEvent
Meeting
MeetingParticipant
AvailabilityPreference
SchedulingRequest
AIConversation
AIMessage
```

Define relationships, constraints, and indexes appropriately.

---

# 6. AUTHENTICATION

Implement:

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

Requirements:

* Password hashing
* Input validation
* JWT access tokens
* Refresh tokens
* Refresh token rotation
* Logout
* Protected routes
* Authentication middleware

Never store plaintext passwords.

---

# 7. USER SETTINGS

Implement:

```http
GET   /api/users/me
PATCH /api/users/me

GET   /api/users/me/preferences
PATCH /api/users/me/preferences
```

Support:

* Name
* Email
* Timezone
* Default meeting duration
* Working hours
* Buffer time
* Preferred days
* Preferred meeting times

---

# 8. GOOGLE CALENDAR OAUTH

Implement Google Calendar OAuth 2.0.

Flow:

```text
Connect Calendar
        ↓
OAuth Authorization
        ↓
Google Consent
        ↓
Callback
        ↓
Validate OAuth State
        ↓
Exchange Authorization Code
        ↓
Store Calendar Account
```

Implement:

```http
GET    /api/calendar/connect
GET    /api/calendar/callback
GET    /api/calendar/accounts
DELETE /api/calendar/accounts/:id
```

Handle token refresh.

OAuth tokens must not be exposed to the frontend.

---

# 9. CALENDAR PROVIDER ABSTRACTION

Create:

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

Google Calendar must implement this interface.

---

# 10. AI SCHEDULER

Implement:

```http
POST /api/ai/chat
POST /api/ai/schedule
```

Support natural-language requests such as:

```text
Schedule a meeting with Rahul tomorrow.

Find a 1-hour slot for the engineering team next week.

Schedule a meeting after lunch but before 5 PM.

Move my 3 PM meeting to the earliest available slot.

Find a time when everyone is available.

Schedule a meeting with Rahul next week and avoid Friday.
```

---

# 11. AI SAFETY ARCHITECTURE

This is mandatory.

The LLM must never directly:

* Write to the database
* Create calendar events
* Delete calendar events
* Update calendar events

Required architecture:

```text
User
 ↓
LLM
 ↓
Structured Intent
 ↓
Schema Validation
 ↓
Backend Business Logic
 ↓
Scheduling Engine
 ↓
Calendar API
```

The LLM is an interpreter and conversational layer.

The backend remains authoritative.

---

# 12. STRUCTURED AI OUTPUT

Define a strict schema.

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
  ],
  "timezone": "Asia/Kolkata"
}
```

Use runtime schema validation.

Reject malformed AI output.

---

# 13. DATE AND TIME

Support natural-language expressions:

```text
tomorrow
next week
this Friday
after lunch
before 5 PM
morning
afternoon
evening
next Monday
```

Always resolve dates relative to the user's timezone.

Never silently assume UTC.

---

# 14. PARTICIPANT RESOLUTION

Support:

```text
Rahul
rahul@example.com
Rahul from Engineering
```

If multiple people match:

```text
I found multiple contacts named Rahul.
Which one do you mean?
```

Never guess when ambiguity could result in a meeting being sent to the wrong person.

---

# 15. SCHEDULING ENGINE

Implement a deterministic scheduling engine.

Inputs:

```text
Participants
Date Range
Duration
Working Hours
Existing Calendar Events
Buffer
Timezone
Preferences
Time Constraints
Excluded Days
```

Process:

```text
Fetch calendars
 ↓
Normalize timezones
 ↓
Convert events to busy intervals
 ↓
Merge intervals
 ↓
Find free intervals
 ↓
Apply working hours
 ↓
Apply buffer
 ↓
Generate candidate slots
 ↓
Validate candidates
 ↓
Rank candidates
```

Return multiple valid options.

---

# 16. SLOT RANKING

Implement configurable ranking.

Factors:

* Everyone available
* Preferred time
* Preferred day
* Working hours
* Buffer availability
* Earliest possible slot
* User preferences
* Number of constraints satisfied

Return reasons with every recommended slot.

---

# 17. RACE CONDITION PROTECTION

Mandatory workflow:

```text
Initial Availability
        ↓
User selects slot
        ↓
User confirms
        ↓
RE-CHECK AVAILABILITY
        ↓
Available → Create Event
Unavailable → Reject + Offer Alternatives
```

Never rely solely on the initial availability result.

---

# 18. MEETING API

Implement:

```http
POST   /api/meetings
GET    /api/meetings
GET    /api/meetings/:id
PATCH  /api/meetings/:id
DELETE /api/meetings/:id

POST /api/meetings/:id/confirm
POST /api/meetings/:id/reschedule
```

Statuses:

```text
SCHEDULED
CANCELLED
RESCHEDULED
COMPLETED
```

---

# 19. MEETING CREATION

Flow:

```text
User confirms
 ↓
Authentication check
 ↓
Validate request
 ↓
Re-check availability
 ↓
Create calendar event
 ↓
Generate meeting link if supported
 ↓
Store meeting
 ↓
Store participants
 ↓
Send notifications
 ↓
Return success
```

Prevent duplicate meetings when requests are retried.

Use idempotency where appropriate.

---

# 20. RESCHEDULING

Support:

> Move tomorrow's 3 PM meeting to the earliest available slot.

Flow:

```text
Identify meeting
 ↓
Extract constraints
 ↓
Find availability
 ↓
Show alternatives
 ↓
User confirms
 ↓
Re-check availability
 ↓
Update calendar event
 ↓
Update database
 ↓
Notify participants
```

---

# 21. CANCELLATION

Require confirmation before destructive actions.

```text
Cancel request
 ↓
Identify meeting
 ↓
Show meeting
 ↓
Confirm cancellation
 ↓
Cancel calendar event
 ↓
Update database
 ↓
Notify participants
```

---

# 22. FRONTEND

Implement:

```text
/
 /login
 /register
 /dashboard
 /calendar
 /meetings
 /meetings/:id
 /scheduler
 /settings
```

Protected routes must require authentication.

---

# 23. DASHBOARD

Display:

* Greeting
* Today's meetings
* Upcoming meetings
* AI scheduler
* Calendar summary
* Connected calendar status
* Quick actions

The AI scheduler should be visually prominent.

---

# 24. AI SCHEDULER UI

Build a polished conversational interface.

Support:

```text
What would you like to schedule?

[ Schedule a meeting with Rahul... ]

Suggested prompts:

• Find time with my team
• Schedule a client meeting
• Reschedule tomorrow's meeting
```

Show slot cards with:

* Date
* Time
* Availability
* Score/reason
* Select button

---

# 25. CALENDAR UI

Implement:

* Month view
* Week view
* Day view
* Agenda
* Event details
* Event creation
* Event editing
* Event deletion

Use a mature calendar library.

Do not build a calendar engine from scratch.

---

# 26. SETTINGS

Implement:

### Profile

* Name
* Email
* Timezone

### Scheduling

* Working hours
* Default duration
* Buffer
* Preferred days
* Preferred times

### Calendar

* Connected accounts
* Default calendar

### Notifications

* Email notifications
* Reminders

---

# 27. DESIGN

Follow `design.md`.

The application must look like a real SaaS product.

Do not create a generic dashboard.

Use:

* Consistent spacing
* Cards
* Clear typography
* Responsive design
* Accessible controls
* Loading states
* Empty states
* Error states
* Confirmation dialogs

Avoid excessive gradients, animations, colors, and clutter.

---

# 28. API ERROR FORMAT

Every API error must follow:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Implement centralized error handling.

Do not expose stack traces in production.

---

# 29. VALIDATION

Validate:

```text
Frontend
 ↓
API
 ↓
Business Logic
 ↓
Database
```

Never trust:

* Frontend input
* User input
* LLM output
* External API responses

---

# 30. REDIS

Use Redis for:

* Availability caching
* Rate limiting
* OAuth temporary state
* AI throttling
* Temporary scheduling sessions

Do not use Redis as the source of truth.

---

# 31. SECURITY

Implement:

* Password hashing
* JWT expiration
* Refresh-token rotation
* OAuth state validation
* CORS
* Rate limiting
* Secure headers
* Input validation
* Environment variables
* Token protection

Never commit secrets.

---

# 32. ENVIRONMENT

Create `.env.example`:

```env
NODE_ENV=development

PORT=5000

DATABASE_URL=

REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

AI_API_KEY=

FRONTEND_URL=
```

---

# 33. TESTING

Write tests for:

## Authentication

* Registration
* Login
* Invalid password
* Protected routes

## Scheduling Engine

* No conflicts
* One conflict
* Multiple conflicts
* Working hours
* Buffer
* Different durations
* Excluded days
* Date ranges
* Timezones
* No available slots

## AI

* Valid structured output
* Invalid structured output
* Missing participant
* Missing date
* Ambiguous participant

## Meetings

* Creation
* Confirmation
* Cancellation
* Rescheduling
* Race-condition handling

---

# 34. CRITICAL SCHEDULING TEST CASES

Test:

### Case 1

User availability:

```text
09:00 - 18:00
```

Meeting:

```text
30 minutes
```

Expected:

```text
Valid slots generated.
```

### Case 2

Existing meeting:

```text
14:00 - 15:00
```

Requested:

```text
14:30 - 15:00
```

Expected:

```text
Rejected.
```

### Case 3

Buffer:

```text
Buffer = 30 minutes
Existing meeting = 15:00
Requested meeting ends = 14:45
```

Expected:

```text
Rejected.
```

### Case 4

Timezone:

```text
User: Asia/Kolkata
Participant: America/New_York
```

Expected:

```text
Availability correctly converted.
```

---

# 35. DATABASE MIGRATIONS

Use Prisma migrations.

README must include:

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

---

# 36. LOCAL DEVELOPMENT

Provide Docker Compose for:

```text
PostgreSQL
Redis
```

README must explain:

```bash
docker compose up -d
```

and how to start frontend/backend.

---

# 37. README

Create a professional README containing:

* Project overview
* Features
* Architecture
* Tech stack
* Folder structure
* Environment setup
* Google OAuth setup
* Database setup
* Redis setup
* AI provider setup
* Development commands
* Testing
* Deployment
* API overview
* Screenshots placeholder

---

# 38. IMPLEMENTATION ORDER

Follow this order:

## Phase 1

Project setup.

* Monorepo
* TypeScript
* Frontend
* Backend
* PostgreSQL
* Prisma
* Redis
* Environment configuration

## Phase 2

Authentication.

## Phase 3

User settings.

## Phase 4

Google Calendar OAuth.

## Phase 5

Calendar synchronization.

## Phase 6

Scheduling engine.

## Phase 7

AI structured intent extraction.

## Phase 8

AI scheduling workflow.

## Phase 9

Meeting confirmation and creation.

## Phase 10

Rescheduling/cancellation.

## Phase 11

Frontend dashboard.

## Phase 12

Calendar UI.

## Phase 13

AI scheduler UI.

## Phase 14

Testing.

## Phase 15

Security hardening.

## Phase 16

Deployment preparation.

---

# 39. DO NOT TAKE SHORTCUTS

Do NOT:

* Hardcode fake calendar events
* Hardcode available slots
* Pretend OAuth is implemented
* Return fake AI responses
* Use mock scheduling logic in production paths
* Store plaintext passwords
* Expose OAuth tokens
* Let the LLM directly call the database
* Let the LLM directly create calendar events
* Ignore timezone handling
* Ignore race conditions
* Build only the frontend
* Leave core APIs unimplemented

If an external API cannot be configured locally, provide a clean development abstraction/mock adapter, but keep the real production adapter implemented.

---

# 40. CODE QUALITY

Use:

* TypeScript strict mode
* Minimal `any`
* Small focused functions
* Clear naming
* Domain-based modules
* Reusable services
* Centralized error handling
* Validation schemas
* Proper async error handling
* No duplicated business logic

---

# 41. LOGGING

Use structured logging.

Log:

* Request IDs
* API failures
* Calendar provider failures
* Scheduling failures
* Authentication failures

Never log:

* Passwords
* Access tokens
* Refresh tokens
* JWT secrets
* Sensitive calendar contents

---

# 42. FINAL VERIFICATION

Before declaring the project complete, verify:

## Frontend

* [ ] Application starts
* [ ] Routing works
* [ ] Authentication works
* [ ] Dashboard works
* [ ] Calendar works
* [ ] AI scheduler works
* [ ] Meeting UI works
* [ ] Settings works
* [ ] Responsive design works

## Backend

* [ ] Server starts
* [ ] Database connects
* [ ] Redis connects
* [ ] Authentication works
* [ ] JWT works
* [ ] Google OAuth works
* [ ] Calendar APIs work
* [ ] Scheduling engine works
* [ ] AI service works
* [ ] Meeting APIs work
* [ ] Error handling works

## Scheduling

* [ ] Availability is real
* [ ] Timezones work
* [ ] Buffer works
* [ ] Working hours work
* [ ] Excluded days work
* [ ] Participant conflicts work
* [ ] Race-condition check exists
* [ ] No-slot handling works

## Security

* [ ] Secrets use environment variables
* [ ] Passwords are hashed
* [ ] OAuth state is validated
* [ ] Tokens are protected
* [ ] CORS is configured
* [ ] Rate limiting exists
* [ ] Input validation exists

## Documentation

* [ ] README complete
* [ ] Architecture documented
* [ ] Setup instructions documented
* [ ] API documented
* [ ] Environment variables documented
* [ ] Testing documented

---

# 43. DEFINITION OF DONE

The project is complete only when a new user can perform this complete journey:

```text
Register
   ↓
Login
   ↓
Connect Google Calendar
   ↓
Set timezone/preferences
   ↓
Open AI Scheduler
   ↓
Type:

"Schedule a 30-minute meeting with Rahul
next week after 2 PM."

   ↓
AI understands request
   ↓
Backend validates intent
   ↓
Participant resolved
   ↓
Calendar availability fetched
   ↓
Scheduling engine calculates slots
   ↓
Best slots displayed
   ↓
User selects a slot
   ↓
User confirms
   ↓
Availability checked again
   ↓
Google Calendar event created
   ↓
Meeting stored in PostgreSQL
   ↓
Participants notified
   ↓
Meeting appears in dashboard/calendar
```

This end-to-end flow must actually work.

---

# 44. FINAL AGENT BEHAVIOR

You are responsible for the complete implementation.

Do not stop after creating the project skeleton.

Do not stop after implementing the UI.

Do not stop after implementing the backend.

Do not mark a feature complete because a button exists.

A feature is complete only when its complete workflow works.

When something is ambiguous:

1. Prefer the architecture documents.
2. Prefer deterministic backend behavior.
3. Prefer secure defaults.
4. Prefer explicit user confirmation for external side effects.
5. Keep implementation modular.
6. Document important assumptions.

At the end, provide:

```text
1. What was implemented
2. Files created/modified
3. Database schema
4. API endpoints
5. Environment variables required
6. How to run locally
7. How to run tests
8. Remaining external configuration
9. Known limitations
```

Do not claim functionality is implemented if it is only mocked or partially implemented.