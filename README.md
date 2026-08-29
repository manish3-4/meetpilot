# MeetPilot

AI-powered meeting scheduler that lets you schedule meetings using natural language.

## Features

- **Natural Language Scheduling**: Schedule meetings by simply describing what you need
- **AI-Powered**: Understands requests like "Schedule a 30-minute meeting with Rahul next week after 2 PM"
- **Calendar Integration**: Connect Google Calendar for real-time availability
- **Smart Scheduling**: Finds optimal meeting times considering all participants' availability
- **Race Condition Protection**: Re-checks availability before booking
- **Working Hours**: Respects your preferred working hours and buffer time
- **Multi-Timezone Support**: Handles participants across different timezones

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- FullCalendar
- React Router

### Backend
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- Google Calendar API
- OpenAI API

## Prerequisites

- Node.js 18+
- Docker Desktop (running)
- Google Calendar API credentials
- OpenAI API key

## Quick Start (Single Command)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd meetpilot
npm run setup
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start Everything

```bash
npm run dev
```

This single command will:
- Start PostgreSQL and Redis via Docker
- Start the backend server (port 5000)
- Start the frontend dev server (port 3000)

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services (DB + Backend + Frontend) |
| `npm run setup` | Install all dependencies and setup database |
| `npm run build` | Build both frontend and backend |
| `npm run start` | Start production servers |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:migrate` | Run database migrations |

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/calendar/callback`
6. Copy Client ID and Client Secret to `.env`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Calendar
- `GET /api/calendar/connect` - Get OAuth URL
- `GET /api/calendar/callback` - OAuth callback
- `GET /api/calendar/accounts` - List connected calendars
- `DELETE /api/calendar/accounts/:id` - Disconnect calendar
- `GET /api/calendar/events` - Get events
- `GET /api/calendar/availability` - Get availability

### Meetings
- `POST /api/meetings` - Create meeting
- `GET /api/meetings` - List meetings
- `GET /api/meetings/:id` - Get meeting
- `PATCH /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Cancel meeting
- `POST /api/meetings/:id/confirm` - Confirm meeting

### AI Scheduler
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/schedule` - Schedule meeting

### Users
- `GET /api/users/me` - Get profile
- `PATCH /api/users/me` - Update profile
- `GET /api/users/me/preferences` - Get preferences
- `PATCH /api/users/me/preferences/:day` - Update preferences

## Project Structure

```
meetpilot/
├── frontend/           # React frontend
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom hooks
│   │   ├── pages/      # Page components
│   │   ├── types/      # TypeScript types
│   │   └── utils/      # Utilities
│   └── ...
├── backend/            # Express backend
│   ├── prisma/         # Database schema
│   └── src/
│       ├── config/     # Configuration
│       ├── middleware/  # Express middleware
│       ├── modules/    # Feature modules
│       │   ├── auth/   # Authentication
│       │   ├── ai/     # AI service
│       │   ├── calendar/ # Calendar integration
│       │   ├── meetings/ # Meeting management
│       │   ├── scheduler/ # Scheduling engine
│       │   └── users/  # User management
│       └── shared/     # Shared utilities
├── docker-compose.yml  # Docker services
└── .env.example        # Environment template
```

## License

MIT
