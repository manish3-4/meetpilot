# workflow.md

# AI Meeting Scheduler — System Workflows

## 1. User Registration

```text
User
 ↓
Register Form
 ↓
POST /auth/register
 ↓
Validate Input
 ↓
Hash Password
 ↓
Create User
 ↓
Create Default Preferences
 ↓
Dashboard
```

## 2. Login

```text
User
 ↓
Login
 ↓
POST /auth/login
 ↓
Validate Credentials
 ↓
Verify Password
 ↓
Generate Access Token
 ↓
Generate Refresh Token
 ↓
Return Session
```

## 3. Connect Google Calendar

```text
User
 ↓
Connect Google Calendar
 ↓
GET /calendar/connect
 ↓
Generate OAuth URL
 ↓
Google Consent Screen
 ↓
User Grants Permission
 ↓
OAuth Callback
 ↓
Validate OAuth State
 ↓
Exchange Authorization Code
 ↓
Store Calendar Account
 ↓
Encrypt Sensitive Tokens
 ↓
Calendar Connected
```

## 4. Calendar Synchronization

```text
Application
 ↓
Request Calendar Events
 ↓
Calendar Service
 ↓
Check Cached Data
 ↓
If stale → Calendar Provider
 ↓
Google Calendar API
 ↓
Normalize Events
 ↓
Store/cache events
 ↓
Return calendar data
```

## 5. AI Scheduling Request

Example:

> Schedule a 30-minute meeting with Rahul tomorrow after 3 PM.

Workflow:

```text
User
 ↓
AI Scheduler
 ↓
POST /api/ai/schedule
 ↓
AI Service
 ↓
LLM
 ↓
Structured Scheduling Intent
 ↓
Schema Validation
 ↓
Resolve Participants
 ↓
Fetch Calendar Availability
 ↓
Scheduling Engine
 ↓
Generate Valid Slots
 ↓
Rank Slots
 ↓
Return Suggestions
```

## 6. Structured AI Intent

Example:

```json
{
  "intent": "CREATE_MEETING",
  "participants": [
    "rahul@example.com"
  ],
  "durationMinutes": 30,
  "dateRange": {
    "start": "2026-08-30",
    "end": "2026-08-30"
  },
  "timePreference": {
    "start": "15:00",
    "end": "18:00"
  }
}
```

The backend validates every field.

## 7. Participant Resolution

Support:

```text
Rahul
rahul@example.com
Rahul from Engineering
```

Resolution:

```text
Input
 ↓
Contact/User Search
 ↓
Potential Matches
 ↓
Exact Match?
 ├── Yes → Continue
 └── No → Ask User
```

Never guess an ambiguous participant.

## 8. Availability Calculation

Inputs:

* Participants
* Date range
* Duration
* Working hours
* Existing events
* Buffer
* Preferences
* Timezone

Process:

```text
Fetch participant calendars
 ↓
Normalize timezones
 ↓
Convert events into busy intervals
 ↓
Merge overlapping intervals
 ↓
Calculate free intervals
 ↓
Apply working hours
 ↓
Apply buffer requirements
 ↓
Generate candidate slots
 ↓
Filter invalid slots
 ↓
Rank candidates
```

## 9. Slot Ranking

Example:

```text
Candidate Slot
      ↓
Everyone available?
      ↓
Within working hours?
      ↓
User preference?
      ↓
Buffer available?
      ↓
Preferred day?
      ↓
Calculate score
```

Example result:

```json
{
  "start": "2026-09-02T15:00:00+05:30",
  "end": "2026-09-02T15:30:00+05:30",
  "score": 96,
  "reasons": [
    "Everyone is available",
    "Within working hours",
    "30 minute buffer available"
  ]
}
```

## 10. User Confirmation

```text
AI
 ↓
"Here are the best available times."
 ↓
User selects slot
 ↓
Show Meeting Preview
 ↓
User confirms
 ↓
Backend re-checks availability
 ↓
Create Calendar Event
```

The second availability check is mandatory.

## 11. Meeting Creation

```text
User Confirmation
 ↓
POST /meetings/:id/confirm
 ↓
Validate Authentication
 ↓
Validate Meeting Request
 ↓
Re-check Availability
 ↓
Create Calendar Event
 ↓
Generate Meeting Link
 ↓
Store Meeting
 ↓
Store Participants
 ↓
Send Notifications
 ↓
Return Meeting
```

## 12. Rescheduling

```text
User
 ↓
AI
 ↓
Identify Meeting
 ↓
Identify New Constraints
 ↓
Fetch Availability
 ↓
Generate New Slots
 ↓
User Selects
 ↓
Re-check Availability
 ↓
Update Calendar Event
 ↓
Update Database
 ↓
Notify Participants
```

## 13. Cancellation

```text
User
 ↓
Select Meeting
 ↓
Cancel
 ↓
Confirmation
 ↓
Delete/Cancel Calendar Event
 ↓
Update Meeting Status
 ↓
Notify Participants
```

Recommended statuses:

```text
SCHEDULED
CANCELLED
RESCHEDULED
COMPLETED
```

## 14. Calendar Conflict

If a selected slot becomes unavailable:

```text
Create Request
 ↓
Availability Check
 ↓
Conflict Detected
 ↓
Do NOT create event
 ↓
Return:
"That time is no longer available."
 ↓
Generate new suggestions
```

Never silently move the meeting.

## 15. Token Refresh

```text
Calendar API Request
 ↓
Access Token Valid?
 ├── Yes → API Request
 └── No
      ↓
Refresh Token
      ↓
Get New Access Token
      ↓
Update Token
      ↓
Retry Request
```

If refresh fails:

```text
Calendar Authentication Required
```

## 16. AI Conversation

```text
User Message
 ↓
Conversation Context
 ↓
Intent Detection
 ↓
Need More Information?
 ├── Yes → Ask Clarifying Question
 └── No
      ↓
Execute Scheduling Tool
      ↓
Get Tool Result
      ↓
Generate Explanation
      ↓
Return Response
```

Example:

```text
User:
Schedule a meeting with Rahul.

AI:
Sure. How long should the meeting be?

User:
30 minutes.

AI:
What day or date range should I use?

User:
Next week.

AI:
I found 5 suitable slots...
```

## 17. Clarification Rules

Ask for clarification when critical information is missing.

Required information depends on intent.

For scheduling:

* Participant
* Date/date range
* Duration or default duration

Optional:

* Time preference
* Location
* Meeting title
* Description

Do not ask unnecessary questions when safe defaults can be used.

## 18. Notification Workflow

```text
Meeting Created
 ↓
Notification Service
 ├── Email
 └── In-app notification
```

Future:

```text
Slack
Microsoft Teams
Push Notifications
```

## 19. Failure Handling

### Calendar API

Retry only when safe.

If failure persists, return a user-friendly error.

### AI

Return:

> I couldn't interpret that request. Please try specifying the participants and date.

### Database

Log detailed information server-side and return a generic error.

Never expose stack traces.

## 20. Complete End-to-End Flow

```text
                    USER
                      │
                      ▼
              Natural Language
                      │
                      ▼
                AI Scheduler
                      │
                      ▼
             Structured Intent
                      │
                      ▼
                Validation
                      │
                      ▼
             Participant Resolver
                      │
                      ▼
             Calendar Service
                      │
                      ▼
             Availability Engine
                      │
                      ▼
              Candidate Slots
                      │
                      ▼
               Slot Ranking
                      │
                      ▼
              AI Explanation
                      │
                      ▼
             User Confirmation
                      │
                      ▼
           Final Availability Check
                      │
                      ▼
             Calendar Event Creation
                      │
                      ▼
             Meeting Database Record
                      │
                      ▼
                Notifications
                      │
                      ▼
                 SUCCESS
```

## 21. Core Rule

```text
AI suggests.
Backend verifies.
Calendar provider confirms.
User approves.
Backend performs the side effect.
```