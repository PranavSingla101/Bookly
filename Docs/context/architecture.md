# Architecture Context

## Stack

| Layer        | Technology                    | Role                                                                 |
| ------------ | ----------------------------- | -------------------------------------------------------------------- |
| Framework    | Next.js 16 + TypeScript       | App shell, routing, API routes, Server Components                    |
| UI           | Tailwind CSS v4 + shadcn/ui   | Styling system and composable UI primitives                          |
| Auth         | Clerk                         | User identity, session management, route protection                  |
| Database     | Supabase (PostgreSQL)         | Book metadata, reading progress, annotations — relational records    |
| File Storage | Supabase Storage              | Raw EPUB files and compressed cover images — private buckets         |
| State        | Zustand                       | Client-side library cache and reader UI state with localStorage sync |
| EPUB Render  | Foliate-js                    | In-browser EPUB rendering inside an isolated iframe                  |

---

## System Boundaries

- `app/api/` — All server-side logic. Route handlers own auth checks, input
  validation, Supabase queries, and Storage access. Nothing outside this boundary
  talks to Supabase directly.
- `app/(auth)/` — Clerk-managed sign-in and sign-up pages. No application logic lives
  here.
- `app/library/` — Library page. A Server Component shell that renders the book grid.
  Delegates client interactivity (upload, delete, optimistic updates) to components.
- `app/reader/[id]/` — Reader page. A Client Component that fetches the EPUB blob via
  the API and mounts the Foliate-js iframe renderer. Owns CFI-based progress sync.
- `components/ui/` — shadcn/ui primitives. Managed by the shadcn CLI. Not hand-edited.
- `components/library/` — Composed library UI (BookCard, UploadModal, EmptyState).
  No business logic — calls API routes or Zustand actions.
- `components/reader/` — Composed reader UI (TOC sidebar, control strip, font size
  picker). Communicates with the Foliate iframe via `postMessage` only.
- `lib/` — Shared infrastructure. Supabase client factories, Clerk auth helpers, `cn()`
  utility. No UI, no route logic.
- `store/` — Zustand stores. Client-only. Owns the in-memory book list and reader
  state. Persists book metadata to localStorage for instant render on page load.
- `types/` — Shared TypeScript interfaces. No runtime logic.

---

## Storage Model

- **Supabase PostgreSQL**: Book records (title, author, cover path, EPUB path,
  `profile_id`), reading progress (CFI string, progress percentage), and annotations
  (highlight range, note text, `profile_id`, `book_id`). All relational ownership and
  metadata live here.
- **Supabase Storage — `epubs` bucket**: Raw `.epub` files uploaded by the user. Private.
  Accessed only through authenticated API routes (`/api/books/:id/epub`). Never exposed
  directly to the client.
- **Supabase Storage — `covers` bucket**: Compressed cover images extracted client-side
  from the EPUB before upload. Private. Served through `/api/books/:id/cover`.
- **Supabase Storage — `books` bucket**: Legacy bucket retained for backwards
  compatibility. No new files are written here.
- **Zustand + localStorage**: Client-side cache of the book list for instant render.
  Treated as a read cache — the database is the source of truth.

---

## Auth and Access Model

- Every user authenticates via Clerk (email/password or configured OAuth providers).
  Clerk issues and manages all sessions.
- The Clerk `userId` is the canonical identity. It is stored as `profile_id` on every
  database record that belongs to a user.
- All API routes call Clerk's `auth()` helper first. Unauthenticated requests are
  rejected with `401` before any query runs.
- Every database query filters by `profile_id` derived from the authenticated Clerk
  session. A user can only read or mutate their own books, progress, and annotations.
- Supabase is accessed exclusively via the service role key, server-side only. Row-level
  security is not active — isolation is enforced entirely at the application layer.
  The service role key is never sent to the client.
- There are no shared libraries, public book links, or collaborative features. Every
  user's data is fully isolated.

---

## Invariants

1. **No raw Storage URLs on the client.** EPUB and cover files are always proxied
   through authenticated Next.js API routes. Supabase Storage URLs are never
   constructed or exposed client-side.
2. **Every DB query filters by `profile_id`.** No query may return or mutate data
   without scoping to the authenticated user's ID. This is the sole isolation
   mechanism.
3. **The Foliate iframe is an opaque boundary.** The parent Next.js app communicates with
   the reader only via `postMessage`. No DOM access, no style injection, no direct function
   calls across the iframe boundary.
   — Within `reader.js` (inside the iframe), the `foliate-paginator` renderer also uses a
   **closed** shadow DOM (`attachShadow({ mode: 'closed' })`). Its internal `#container`
   is unreachable from outside. All scroll interaction must go through the renderer's
   public API: `renderer.scrollBy(dx, 0)`, `renderer.addEventListener('scroll', ...)`,
   and the public getters `r.start` / `r.end` / `r.viewSize`.
4. **CFI strings are never parsed or manipulated by application code.** They are
   written to the database and read back as opaque strings. Foliate-js is the only
   system that interprets them.
5. **The service role key is server-only.** It must never appear in client bundles,
   environment variables prefixed with `NEXT_PUBLIC_`, or any code that runs in the
   browser.
6. **Progress writes are debounced.** The reader must not issue a `PATCH` on every page
   turn. A minimum 1-second debounce is required before any progress write is sent to
   the API.
7. **Deleting a book is atomic across DB and Storage.** A delete operation must remove
   the database record and both storage objects (EPUB + cover) in the same handler.
   Orphaned storage files are not acceptable.