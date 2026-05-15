# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes — do not layer workarounds.
- Do not mix unrelated concerns in one component or route.
- Name files after the responsibility they contain, not the technology.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any`; use explicit interfaces or narrowly scoped types.
- Use `interface` for object contracts; use `type` for unions and utility compositions.
- Validate unknown external input (EPUB metadata, API responses, storage URLs) at system
  boundaries before trusting it.
- Never assert types with `as` to silence errors — fix the type instead.

## Next.js

- Default to React Server Components. Add `"use client"` only when the component
  needs browser APIs, event handlers, hooks, or real-time state.
- Keep route handlers thin and focused on a single responsibility — one route per
  operation (upload, fetch epub, patch progress, delete).
- Long-running or heavy work (e.g. cover extraction, storage uploads) belongs in
  dedicated utilities, not inline in route handlers.
- All routes and pages are protected. Use Clerk's `auth()` helper at the top of every
  route handler and redirect unauthenticated requests to `/sign-in`.

## Styling

- Use the CSS custom property tokens defined in `globals.css` — no raw Tailwind color
  utilities like `amber-*`, `stone-*`, or hardcoded hex values anywhere in components.
- Reference tokens through Tailwind utility names mapped to the design system:
  `bg-base`, `bg-surface`, `text-primary`, `text-muted`, `accent-primary`,
  `border-default`, etc.
- Maintain the border radius scale: `rounded-lg` for inline / small elements,
  `rounded-xl` for cards, `rounded-2xl` for modals and overlays.
- All class merging goes through the `cn()` utility from `lib/utils.ts` — never
  concatenate class strings manually.

## API Routes

- Parse and validate all request input before any logic runs (use `zod` or manual
  checks — never trust raw `req.json()` directly).
- Enforce Clerk auth and user ownership checks (`profile_id` match) before any read
  or mutation.
- All file access (EPUBs, covers) is proxied through authenticated API routes — never
  expose raw Supabase Storage URLs to the client.
- Return consistent response shapes: `{ data }` on success, `{ error: string }` on
  failure, with appropriate HTTP status codes.

## Supabase Usage

- Use the Supabase service role client (`lib/supabase/server.ts`) in API routes only —
  never expose the service role key to the client.
- All queries must filter by `profile_id` to enforce per-user data isolation.
  Row-level security is not active; isolation is enforced at the application layer.
- Do not store generated or derived data (cover blobs, EPUB content) directly in the
  database — Supabase Storage holds the files; the database holds only path references.
- Three storage buckets are in use: `epubs`, `covers`, `books` (legacy). Do not create
  additional buckets without updating `architecture-context.md`.
- Handle `409 Conflict` responses from progress sync gracefully on the client — they
  are expected under last-write-wins semantics.

## Authentication (Clerk)

- Use Clerk's `auth()` server helper in Server Components and route handlers.
- Use `useAuth()` / `useUser()` client hooks only inside `"use client"` components.
- Never implement custom session logic — delegate entirely to Clerk.
- The Clerk `userId` is the source of truth for `profile_id` throughout the app.

## State Management (Zustand)

- Zustand stores live in `store/`. One store per domain (e.g. `useLibraryStore`,
  `useReaderStore`).
- Persist only what is needed for instant render on page load (e.g. the book list
  metadata). Do not persist ephemeral UI state.
- Keep store actions pure and side-effect-free — side effects (API calls, storage
  reads) belong in components or hooks that call store actions after resolution.
- Do not import stores in Server Components.

## EPUB Reader (Foliate-js)

- The Foliate-js renderer runs inside an isolated `<iframe>` — never attempt to
  access or style its internals from the parent app.
- The EPUB blob is fetched from `/api/books/:id/epub` and passed to the iframe via
  a blob URL — never construct a direct Supabase Storage URL on the client.
- CFI strings are the canonical representation of reading position. Treat them as
  opaque — do not parse or manipulate CFI values in application code.
- Debounce all progress `PATCH` calls by at least 1 second to avoid excessive
  writes during rapid page turns.

## File Organization

```
app/
  (auth)/         — Clerk sign-in / sign-up pages
  api/            — Route handlers (one file per resource operation)
  library/        — Library page (Server Component shell)
  reader/[id]/    — Reader page (Client Component for Foliate iframe)
components/
  ui/             — shadcn/ui primitives (added via CLI only)
  library/        — Library-specific composed components
  reader/         — Reader-specific composed components
lib/
  supabase/       — Supabase client factories (server + client)
  utils.ts        — cn() and other shared utilities
store/            — Zustand stores
types/            — Shared TypeScript interfaces and types
```

- `components/ui/` is managed by the shadcn CLI — do not hand-edit generated
  primitives. Customise by composing, not by modifying.
- Business logic does not belong in `components/` — push it into `lib/` utilities
  or API routes.
- Co-locate page-specific components with their route when they are not reused.