# decision.md

# AI Meeting Scheduler — Architecture Decisions

## ADR-001: PostgreSQL

Use PostgreSQL as the primary database.

Reason:

* Strong consistency
* Foreign keys
* Transactions
* Structured queries
* Reliable relationships

## ADR-002: Prisma

Use Prisma as the ORM for:

* Type-safe database access
* Migrations
* Strong TypeScript integration
* Clear schema definitions

## ADR-003: Node.js + Express

Use Node.js and Express for the backend.

Reason:

* Fast development
* Large ecosystem
* Strong API support
* TypeScript compatibility

## ADR-004: React + Vite

Use React + Vite for the frontend.

Reason:

* Highly interactive UI
* Fast development
* Strong ecosystem
* Excellent TypeScript support

## ADR-005: Structured AI Output

The LLM must return structured scheduling intent.

```text
User Request
     ↓
LLM
     ↓
Structured JSON
     ↓
Schema Validation
     ↓
Scheduling Engine
```

Reason:

Natural-language output must not directly control scheduling operations.

## ADR-006: Deterministic Scheduling Engine

Availability calculations must be deterministic.

```text
AI = interpretation
Backend = validation
Scheduling Engine = calculation
Calendar API = source of truth
```

## ADR-007: Google Calendar First

Implement Google Calendar first.

The architecture must allow additional providers later.

## ADR-008: Calendar Provider Abstraction

Use a provider interface:

```ts
interface CalendarProvider {
  getEvents(...);
  getAvailability(...);
  createEvent(...);
  updateEvent(...);
  deleteEvent(...);
}
```

This prevents provider-specific logic from spreading through the application.

## ADR-009: JWT Authentication

Use short-lived JWT access tokens with refresh tokens.

Refresh tokens must be securely stored and rotated.

## ADR-010: Redis

Use Redis for:

* Availability caching
* Rate limiting
* OAuth temporary state
* AI throttling
* Temporary scheduling sessions

Redis is never the source of truth for meetings.

## ADR-011: Explicit Confirmation

Meeting creation requires explicit confirmation by default.

Reason:

Calendar changes are external side effects.

## ADR-012: Timezone-Aware Scheduling

All timestamps must be timezone-aware.

Store timestamps consistently and preserve timezone information.

Display times in the user's selected timezone.

## ADR-013: REST API

Use REST for frontend/backend communication.

Resources include:

* Users
* Meetings
* Calendar events
* Scheduling requests

## ADR-014: Validation

Validate at:

```text
Frontend
 ↓
API
 ↓
Business Logic
 ↓
Database
```

Never trust frontend validation alone.

## ADR-015: Secrets

All credentials must be environment variables.

Example:

```env
DATABASE_URL=
REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

AI_API_KEY=
```

Provide `.env.example`.

## ADR-016: Minimize AI Data

Only provide the AI with the minimum calendar information required.

Prefer:

```json
{
  "start": "...",
  "end": "...",
  "busy": true
}
```

instead of exposing private event descriptions.

## ADR-017: API Error Contract

All errors must follow:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## ADR-018: Automatic Scheduling Is Opt-In

Automatic booking is disabled by default.

Users can explicitly enable it.

## ADR-019: Modular Backend

Organize backend by domain:

```text
modules/
├── auth/
├── users/
├── calendar/
├── meetings/
├── scheduler/
├── ai/
└── notifications/
```

## ADR-020: MVP Scope

MVP includes:

* Authentication
* User profile
* Google Calendar OAuth
* Calendar events
* Availability
* AI scheduling
* Scheduling engine
* Meeting confirmation
* Meeting creation
* Dashboard
* Calendar UI
* Settings

Deferred:

* Microsoft Calendar
* Slack
* Teams
* Apple Calendar
* Advanced team scheduling
* AI meeting summaries
* Complex recurring scheduling
* Voice scheduling
