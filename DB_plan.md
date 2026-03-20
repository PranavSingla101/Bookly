## Supabase Cloud Library + Per-User Reading Resume Plan

### Summary
Implement a cloud-first library where each authenticated Clerk user has a Supabase-backed book collection, private EPUB storage, and synced reading state (including last location/last page via CFI + progress). Local browser storage remains a cache only; cloud is the source of truth across devices/logins.

### Implementation Changes
- **Pre-implementation guardrail (Next.js version-specific)**
  - Before coding, read `node_modules/next/dist/docs/01-app` guides for Route Handlers and Proxy behavior (per `AGENTS.md`) to avoid outdated conventions.

- **Supabase foundation**
  - Add server-side Supabase client setup using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-only).
  - Create a private storage bucket (e.g., `books`) for EPUB binaries.
  - Add SQL migration:
    - `profiles` table: `id (uuid pk)`, `clerk_user_id (text unique)`, timestamps.
    - `books` table: `id (uuid pk)`, `profile_id (fk)`, `title`, `author`, `cover_data`, `storage_path`, `file_name`, `file_size`, `mime_type`, `reading_location`, `progress`, `last_read_at`, timestamps.
    - Indexes on `profile_id`, `updated_at`, and uniqueness for per-user storage path as needed.
  - Enable RLS and keep client direct access disabled for this version (all access via server routes + Clerk auth).

- **Server API contract (Next Route Handlers)**
  - `GET /api/books`: return current user’s library, sorted by recent activity.
  - `POST /api/books/upload`: accept multipart (`file`) + metadata (`title`, `author`, `coverData`), create DB row, upload file to private bucket, return normalized book DTO.
  - `DELETE /api/books/:id`: verify ownership, delete DB row and storage object.
  - `PATCH /api/books/:id/progress`: update `reading_location`, `progress`, `last_read_at`.
  - `GET /api/books/:id/file`: verify ownership and return short-lived signed URL (or streamed file) for reader fetch.
  - Shared server helper: resolve Clerk `userId` -> upsert/fetch `profiles.id` for all handlers.

- **Client state and UI flow**
  - Keep Zustand for in-memory UX + local cache, but hydrate library from `GET /api/books` after login.
  - Upload flow in library page:
    - Parse metadata client-side (existing EPUB helper), call upload API, optimistically insert returned DTO.
    - Cache uploaded file blob in IndexedDB for faster reopen.
  - Read flow:
    - If local blob exists, use it; otherwise fetch file via secure API and cache locally.
    - Use cloud `reading_location` as `initialLocation`.
  - Progress sync:
    - Keep local optimistic updates on relocate.
    - Debounced server sync (e.g., every ~3–5s while reading) + flush on tab hide/unmount.
  - Local migration policy (chosen): **start fresh in cloud**.
    - Version bump persisted store key so old local library does not auto-import.
    - No automatic backfill from pre-cloud local books.

- **Public interfaces/types to update**
  - `Book` model (shared client DTO) should include cloud-backed fields:
    - `id`, `title`, `author`, `coverData`, `progress`, `readingLocation`, `lastReadAt`, `createdAt`, `updatedAt`.
    - Optional transient `file` remains local-only cache data, never source of truth.
  - API response shape should be normalized/camel-cased once at server boundary.

### Test Plan
- **Auth/ownership**
  - Unauthenticated user cannot access `/api/books*`.
  - User A cannot read/update/delete User B book IDs.
- **Upload + persistence**
  - Upload creates DB row + storage object and appears after logout/login and on second device.
  - Upload failure paths clean up partial DB/storage artifacts.
- **Reader resume**
  - Reading updates persist and restore correct `initialLocation` after refresh, re-login, and device switch.
  - Progress debounce prevents excessive requests while keeping last state accurate.
- **Deletion consistency**
  - Delete removes both metadata and file; card disappears and read route shows “not found/unavailable”.
- **Local cache behavior**
  - First open downloads/caches; subsequent open uses cache.
  - Cache miss still works by cloud fetch.
- **Regression checks**
  - Clerk sign-in/sign-up/route protection still function.
  - Existing EPUB rendering and metadata extraction still work.

### Assumptions and Defaults
- Chosen by you:
  - User mapping: **separate `profiles` table**.
  - Sync model: **cloud-first with local cache**.
  - File privacy: **private Supabase bucket + signed access**.
  - Migration: **start fresh in cloud** (no auto-import of old local books).
- Implementation default:
  - All Supabase operations are server-mediated via Route Handlers (no direct client Supabase auth flow in v1).
