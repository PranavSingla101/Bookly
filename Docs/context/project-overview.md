Bookly is a e-library, used to manage and read books from your virtual library. you can upload books which are then saved to cloud. and then neatly displayed on any device like phone, laptop. has a neat state sync. 

---

# Bookly

## Overview

Bookly is a cloud-based personal e-library web application that lets users upload, manage, and read EPUB books from any device. It is built for readers who want a single, synced reading experience across phone, tablet, and desktop — upload a book once, pick up exactly where you left off on any device. The app solves the problem of fragmented reading: no more emailing EPUBs to yourself, no more losing your place when switching devices. Books are stored in private cloud storage, metadata and reading progress are synced to a database, and the reader renders EPUBs natively in the browser using Foliate-js.

---

## Goals

1. **Upload and store EPUBs in the cloud** — A user can upload any valid `.epub` file and have it securely stored in private Supabase storage, accessible from any device they sign into.
2. **Read EPUBs in-browser with a full-featured reader** — The reader (powered by Foliate-js) supports paginated, scrolled, and continuous reading modes, font size controls, and a table-of-contents sidebar.
3. **Sync reading progress across devices** — After reading on one device, reopening the same book on another device resumes at the same position.

---

## Core User Flow

1. **User visits the app** — Landing page loads at `/`.
2. **User signs up or signs in** — Clerk handles authentication (email/password, optional OAuth). After sign-in, user lands on `/library`.
3. **User uploads an EPUB** — Clicks the "+" card, selects a `.epub` file. The browser extracts the title, author, and cover image from the EPUB locally, then uploads the raw EPUB and compressed cover to Supabase Storage. A book record is created in the database.
4. **Book appears in the library grid** — The library page shows all uploaded books as cards with cover art, title, and author.
5. **User opens a book** — Clicks a book card, which navigates to the reader page. The EPUB is fetched as a blob from `/api/books/:id/epub` and loaded into the Foliate-js iframe renderer.
6. **User reads** — Navigates pages, jumps via table of contents, adjusts font size and reading mode.
7. **Progress is saved automatically**
8. **User closes the reader** — Returns to `/library`.
9. **User reopens the book on another device** — The reader fetches the saved CFI from the API and resumes at the same position.
10. **User deletes a book** — The book record and all associated storage files (EPUB + cover) are removed.

---

## Features

### Authentication & Accounts

- Email/password sign-up and sign-in via Clerk
- Optional OAuth (Google, GitHub) — configurable in Clerk dashboard
- Session persistence across browser closes
- All routes and API endpoints are protected; unauthenticated requests redirect to `/sign-in`
- Each user's library is fully isolated — no cross-user data access

### Library Management

- Grid view of all uploaded books with cover art, title, and author
- Upload EPUB files with client-side metadata and cover extraction (no server-side unzip required)
- Empty-state UI for new users with no books
- Delete books (removes DB record + both storage objects)
- Metadata editing (title/author update via PATCH API)
- Zustand store with localStorage persistence for instant library render on page load

### EPUB Reader (Foliate-js)

- Full EPUB rendering in an isolated iframe (prevents EPUB CSS/JS from polluting the app)
- Three reading modes: **Paginated**, **Scrolled**, **Continuous**
- Keyboard navigation (arrow keys for page turns)
- Table of contents sidebar with chapter navigation
- Font size controls (Small, Default, Large, X-Large)
- Theme/appearance settings exposed by Foliate

### Reading Progress Sync

- Position tracked as an EPUB CFI string (chapter + character offset)
- Numeric progress percentage stored alongside CFI for UI display
- Progress persisted to Supabase via `PATCH /api/books/:id`
- Debounced API calls to avoid excessive writes during rapid page turns
- Last-write-wins conflict resolution: if a stale update arrives, the API returns `409 Conflict`
- Cross-device sync: opening a book on any signed-in device resumes at the last saved position

### Annotations (In-scope for MVP, P1/P2 priority)

- Text highlight creation and deletion
- Highlights persisted to `book_annotations` table, scoped per user and per book
- Highlights visible on reopen and across devices
- Optional text notes attached to highlights

### Storage & Security

- Three private Supabase Storage buckets: `epubs` (raw files), `covers` (compressed images), `books` (legacy extracted assets)
- No public URLs — all file access is proxied through authenticated Next.js API routes
- User data isolation enforced at the application layer (service role bypasses RLS; all queries filter by `profile_id`)

---

## Scope

### In Scope

- EPUB file format only (`.epub`)
- Upload, store, and stream raw EPUB files via private cloud storage
- In-browser EPUB rendering using Foliate-js
- Cloud reading progress sync (CFI-based, cross-device)
- Text highlight annotations with server persistence
- Responsive UI (mobile + desktop)
- Authentication via Clerk (email/password + optional OAuth)
- Deployment to Vercel with Supabase as the backend (Postgres DB + object storage)

### Out of Scope

- PDF or other non-EPUB formats (no pdf.js integration)
- Offline reading (no service worker, no IndexedDB EPUB caching)
- Social or sharing features (no shared libraries, no public book links)
- Book discovery or store integration (users supply their own EPUBs)
- Native mobile apps (iOS/Android) — web only
- Row-level security enforcement at the DB layer (service role is used; RLS is not active)
- Real-time collaborative reading or multi-user sync
- Custom domain, analytics, or error monitoring (out of MVP scope; decisions deferred)

---

## Success Criteria

1. A signed-in user can upload a valid `.epub` file and see it appear in their library grid with the correct title, author, and cover within 10 seconds on a standard connection.
2. Clicking a book card opens the Foliate reader and renders the first page of the EPUB without errors.
3. After reading to any position and closing the reader, reopening the same book on any signed-in device resumes at the exact same position (CFI match).
4. A user's books and reading progress are invisible to any other user account (cross-user data isolation holds).
5. Deleting a book removes it from the library UI and from Supabase storage (no orphaned files).
6. The library and reader are usable on a 375px-wide mobile screen (responsive layout, no horizontal overflow).