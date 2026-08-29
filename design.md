# design.md

# AI Meeting Scheduler — Product & UI Design

## 1. Design Goal

The application should feel like a modern AI productivity SaaS rather than a traditional calendar application.

The primary interaction should be:

> Tell the scheduler what you need.

The interface should minimize the number of steps required to schedule a meeting.

## 2. Design Principles

### AI First

The AI scheduler is the primary interaction point.

### Calendar Visibility

Users should be able to inspect their calendar and understand why a slot was selected.

### Minimal Friction

A typical meeting should be schedulable in:

```text
Request → Suggestions → Confirm
```

### Explainability

When recommending a slot, explain why.

Example:

> Wednesday at 3:00 PM is recommended because all participants are available, it falls within your working hours, and it leaves a 30-minute buffer before your next meeting.

## 3. Application Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Logo                         Search        🔔       Profile │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│ Dashboard    │                 Main Content                 │
│ Calendar     │                                              │
│ Meetings     │                                              │
│ AI Scheduler │                                              │
│ Contacts     │                                              │
│ Settings     │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

## 4. Pages

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

## 5. Landing Page

Sections:

* Hero
* AI scheduling demo
* How it works
* Calendar integrations
* Features
* Security
* CTA
* Footer

Hero copy:

```text
Schedule meetings
by simply asking.

Let AI find the best time for everyone.

[Try AI Scheduler]
[View Demo]
```

## 6. Dashboard

Display:

* Today's meetings
* Upcoming meetings
* AI scheduler
* Calendar summary
* Connected calendars
* Scheduling suggestions
* Quick actions

## 7. AI Scheduler

Support:

* Text input
* Suggested prompts
* Conversation
* Structured slot recommendations

Examples:

```text
Schedule a meeting with Rahul next week.

Find a 1-hour slot for the engineering team.

Move my 3 PM meeting to the earliest available time.

Schedule a client meeting, but give me at least 30 minutes of buffer.
```

## 8. Scheduling Result

Display recommended slots as cards:

```text
Recommended

Wednesday
3:00 PM – 3:30 PM

✓ Everyone available
✓ Within working hours
✓ 30 min buffer

[Select]
```

Also show alternative slots.

## 9. Calendar Page

Support:

* Month
* Week
* Day
* Agenda
* Event creation
* Event editing
* Event deletion
* AI rescheduling

## 10. Meeting Details

Show:

```text
Project Discussion

Wednesday, September 2
3:00 PM – 3:30 PM

Participants
✓ Manish
✓ Rahul
✓ Priya

Google Meet
[Join Meeting]

[Reschedule] [Cancel]
```

## 11. Settings

### Profile

* Name
* Email
* Avatar
* Timezone

### Scheduling

* Working hours
* Default duration
* Buffer time
* Preferred days
* Preferred meeting times

### Calendar

* Connected accounts
* Default calendar

### Notifications

* Email notifications
* Meeting reminders
* Scheduling confirmations

## 12. Responsive Design

The application must work on:

* Desktop
* Tablet
* Mobile

Mobile navigation should use a drawer or compact navigation.

## 13. Component Architecture

```text
src/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── calendar/
│   ├── meetings/
│   ├── scheduler/
│   ├── ai/
│   └── settings/
├── pages/
├── hooks/
├── services/
├── api/
├── store/
├── types/
└── utils/
```

## 14. Visual Language

Use:

* Clean SaaS layout
* Rounded cards
* Subtle borders
* Moderate shadows
* Clear typography hierarchy
* Accessible contrast
* Consistent spacing
* Responsive components

Avoid:

* Excessive gradients
* Excessive animations
* Cluttered dashboards
* Too many colors
* Unnecessary decoration

## 15. Accessibility

Implement:

* Keyboard navigation
* Proper labels
* Focus states
* ARIA attributes where required
* Accessible calendar interactions
* Screen-reader-friendly status messages
* Sufficient color contrast

## 16. UX States

Every major feature should support:

### Loading

Use skeletons or appropriate loading indicators.

### Empty

Example:

> No meetings scheduled yet.

### Error

Example:

> We couldn't access your calendar. Reconnect your Google Calendar.

### Success

Example:

> Meeting scheduled successfully.

### Confirmation

Destructive actions require confirmation.

## 17. AI UX Rules

AI responses should be concise.

Prefer structured information over large blocks of text.

Example:

> I found 3 times when everyone is available.

## 18. Confirmation Before Booking

Default flow:

```text
AI finds slot
      ↓
User reviews
      ↓
User confirms
      ↓
Meeting created
```

Automatic scheduling must be explicitly enabled by the user.