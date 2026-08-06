# Repository Guidelines

## Project Structure & Module Organization

This is a full-stack Next.js ticketing system using Drizzle ORM, PostgreSQL, and AWS S3. App routes live in `src/app/`, reusable UI in `src/components/`, server helpers in `src/lib/`, and database schema in `src/db/schema.ts`. Drizzle migrations are stored in `drizzle/`. Tests live in `tests/`, and static public assets should go in `public/`.

## Build, Test, and Development Commands

- `pnpm dev`: start the local Next.js development server.
- `pnpm build`: create a production build and validate server/client boundaries.
- `pnpm test`: run Vitest tests.
- `pnpm lint`: run ESLint.
- `pnpm db:generate`: generate Drizzle migrations from schema changes.
- `pnpm db:migrate`: apply migrations to the configured PostgreSQL database.
- `pnpm db:seed-admin`: create the initial admin from `ADMIN_*` environment variables.

## Coding Style & Naming Conventions

Use TypeScript, React server components by default, and `"use client"` only for interactive UI such as inline dropdown updates. Use PascalCase for components, camelCase for functions and variables, kebab-case for route folders, and snake_case for database table/column names. Use two-space indentation.

## Testing Guidelines

Add tests for validation, auth/session helpers, role permissions, ticket status/priority changes, S3 upload behavior, and database permission filtering. Name tests by behavior, such as `permissions.test.ts` or `validation.test.ts`. Mock S3 in tests and avoid production AWS resources.

## Commit & Pull Request Guidelines

This directory has no Git history yet, so use Conventional Commits such as `feat: add ticket queue` or `fix: validate attachment size`. Pull requests should include a short summary, linked task, screenshots for UI changes, migration notes, and the exact checks run.

## Security & Configuration Tips

Never commit real credentials or connection strings. Keep secrets in `.env` or `.env.local`, and keep `.env.example` safe with placeholders for `DATABASE_URL`, AWS variables, `S3_BUCKET_NAME`, session secrets, and seed admin values.
