# eLib

eLib is a personal cloud-backed ebook library built with Next.js, React, Clerk, and Supabase.  
Users can upload files and manage their library.

This README is intentionally detailed so it remains useful as the project grows.

## Tech Stack

- Next.js 16 (App Router + Route Handlers)
- React 19
- TypeScript
- Tailwind CSS v4
- Clerk (authentication)
- Supabase (database + storage)
- Zustand (client state)

## Current Features

- Clerk-based sign-in and sign-up flows
- Protected user library page
- Upload files through API routes
- Persist books in Supabase-backed storage model

## Project Structure

```text
app/
  api/books/...                # Server routes for books, upload, annotations, progress
  library/                     # Library pages
  sign-in/, sign-up/           # Clerk auth routes
components/
  library/                     # Library UI components
  layout/                      # Navbar and layout pieces
  ui/                          # Reusable UI primitives
lib/
  auth/                        # Auth helpers
  books/                       # Book DTO + API utilities
  epub/                        # Upload parsing/building helpers
  supabase/                    # Supabase server/storage utilities
store/                         # Client state stores
supabase/                      # SQL/migration or infra-related files
```

## Prerequisites

- Node.js 20+
- npm 10+ (or compatible package manager)
- Clerk app keys
- Supabase project URL and service role key

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required keys:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` (same value as `SUPABASE_URL`)

Notes:

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Never commit real `.env*` files.

## Local Development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Other scripts:

- `npm run build` - Production build
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

## Data and API Notes

Main API surface:

- `GET /api/books`
- `POST /api/books/upload`
- `DELETE /api/books/:id`
- `GET /api/books/:id`
- `GET /api/books/:id/annotations`
- `POST /api/books/:id/annotations`
- `DELETE /api/books/:id/annotations/:annotationId`

Auth model:

- Clerk identifies the current user.
- Server-side handlers mediate Supabase access.

Storage model:

- Book files are stored in Supabase storage.
- Metadata/progress is stored in Supabase tables.

## Future Roadmap

This section is the long-term reference for planned work.

### Near Term

- Improve upload reliability and partial-failure cleanup
- Strengthen progress sync debounce and flush behavior
- Expand API validation and error consistency
- Add better loading/error UI states in upload flows

### Mid Term

- Richer annotations and highlight UX
- Cross-device sync hardening and conflict handling
- Search/filter/sort in large libraries
- Better offline caching strategy for previously opened books

### Long Term

- Multi-format support
- Sharing/collaboration options
- Reading analytics and insights
- Background processing pipeline for heavy parsing tasks

## Testing Checklist (Manual)

- Auth-protected routes reject unauthenticated access
- A user cannot access another user's books
- Upload appears after refresh/re-login
- Delete removes both metadata and underlying file reference

## Important Contributor Note

Project-specific agent rules require checking Next.js docs in:

`node_modules/next/dist/docs/`

before implementing behavior that depends on framework conventions, because this project targets a version with potential breaking changes.

## License

No license file is currently defined. Add one before open-source distribution.
