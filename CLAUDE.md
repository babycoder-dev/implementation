# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Learning Management System (LMS) built with Next.js 14, PostgreSQL (Drizzle ORM), and MinIO for file storage. The system supports task-based learning with PDF/document viewing, quizzes, and video progress tracking.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run production server
npm run start

# Lint code
npm run lint

# Run all tests
npm test

# Run a specific test file
npm test -- src/lib/auth/__tests__/session.test.ts

# Database operations
npm run db:generate   # Generate migration files from schema changes
npm run db:migrate    # Run migrations
npm run db:push       # Push schema directly (dev only)
npm run db:studio     # Open Drizzle Studio for database inspection

# Create admin user
npm run create-admin
```

## Architecture

### Layer Structure

```
src/
├── app/               # Next.js App Router (API routes + pages)
│   ├── api/          # API endpoints
│   ├── login/        # Login page
│   └── admin/        # Admin dashboard
├── db/               # Database layer
│   ├── schema.ts     # Drizzle schema definitions
│   ├── index.ts      # Database client (postgres.js + drizzle)
│   └── transaction.ts # Transaction wrapper for atomic operations
├── lib/
│   ├── auth/         # Authentication (password hashing, JWT sessions)
│   ├── storage/      # MinIO S3-compatible file storage
│   ├── validations/  # Zod schemas
│   ├── learning/     # Learning activity logging
│   ├── rate-limit.ts # In-memory rate limiting
│   └── utils.ts      # Shared utilities
└── components/       # React components (PDF viewer, etc.)
```

### Key Architectural Patterns

**Session Management**: JWT-based stateless authentication using `jose`. Sessions stored as `session-token` cookie. Session payload contains `userId` and `createdAt` with 7-day expiration.

**Transaction Wrapper**: Use `transaction()` from `src/db/transaction.ts` for atomic multi-step database operations. All database operations in a single transaction are automatically rolled back on error.

**Rate Limiting**: Sliding window algorithm via `src/lib/rate-limit.ts`. Currently in-memory (for development/production single-server). Use `rateLimit(identifier, limit, windowMs)` in API routes.

**File Storage**: Files stored in MinIO (S3-compatible). The MinIO service is expected to be accessible at `${MINIO_ENDPOINT}:${MINIO_PORT}` with an `/api/upload` endpoint. Client uploads via `src/lib/storage/minio.ts` which delegates to the external MinIO service.

**Middleware**: `src/middleware.ts` protects all non-public routes by checking `session-token` cookie. Public paths: `/login`, `/api/auth/login`, `/api/auth/register`.

### Database Schema

Key tables and relationships:
- `users` - User accounts (id, username, passwordHash, name, role)
- `tasks` - Learning tasks (id, title, description, deadline, createdBy)
- `taskFiles` - Files attached to tasks (cascade deleted when task deleted)
- `taskAssignments` - Many-to-many between users and tasks
- `quizQuestions` - Quiz questions with JSONB options array and `correctAnswer` index
- `quizAnswers` - User quiz submissions with auto-graded `isCorrect`
- `learningLogs` - PDF viewing activity (open, next_page, finish)
- `videoProgress` - Video playback position (currentTime, duration)
- `videoLogs` - Video actions (play, pause, seek, finish)

All use UUID primary keys with `defaultRandom()`. Timestamps use `defaultNow()`.

## Testing

**Framework**: Vitest with Node environment. Test files use `__tests__` naming convention.

**Mocking**: Use `vi.stubGlobal()` to mock global functions. When mocking Drizzle, mock `db.transaction` to return test data directly.

**Test Environment**: `vitest.config.ts` sets test environment variables. Tests don't require actual database/MinIO.

**Coverage Goal**: 80%+ minimum. New features should follow TDD approach.

## Environment Variables

Required (validated at startup via `src/env.ts`):
```
DATABASE_URL         # PostgreSQL connection string
MINIO_ENDPOINT       # MinIO server address
MINIO_PORT           # MinIO port
MINIO_ACCESS_KEY     # MinIO access key
MINIO_SECRET_KEY     # MinIO secret key
MINIO_BUCKET         # Bucket name for file storage
MINIO_USE_SSL        # "true" or "false"
SESSION_SECRET       # JWT signing secret (min 32 chars recommended)
```

## Common Tasks

**Creating a new API route**: Add route under `src/app/api/`. Use `rateLimit()` for auth endpoints. Wrap database mutations in `transaction()`.

**Adding a new database table**: Modify `src/db/schema.ts`, run `npm run db:generate`, then `npm run db:migrate`.

**Validating user sessions**: In API routes, extract token from `request.cookies.get('session-token')?.value` and call `validateSession(token)` from `src/lib/auth/session.ts`.

**Uploading files**: Use `uploadFile(file, prefix, filename)` from `src/lib/storage/minio.ts`. The file is sent to the external MinIO service's `/api/upload` endpoint.

## Code Style Notes

- Use immutable patterns (never mutate objects directly)
- All user-facing errors should have user-friendly messages
- No `console.log` statements in production code
- All async operations use try-catch with proper error handling
- Database operations in transactions should use atomic callbacks
