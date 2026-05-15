# Key Architecture Decisions

## 1. Auth: Clerk + Supabase Service Role

**Decision:** Clerk handles user authentication (sign-up/sign-in/session). Supabase is accessed exclusively via `service_role` key (admin client) on the server side. No Supabase Auth is used.

**Why:**
- Clerk provides drop-in UI components, SSO, multi-device session management out of the box.
- Supabase is used purely as a Postgres DB + object storage layer.
- The `profiles` table bridges Clerk's `userId` to a Supabase `uuid` (`profile_id`). This is resolved in `requireUserProfile()` on every API call.
- RLS policies on `book_annotations` use `auth.uid()` — but since we use service role (bypasses RLS), this is effectively dead code unless we switch to Supabase Auth later. **Risk: RLS is not enforced.** All ownership filtering is application-level via `.eq("profile_id", profileId)`.

**Trade-off:** Simpler auth UX vs. no row-level security enforcement at the DB layer.

---

## 2. Storage Architecture: Three Supabase Buckets

**Decision:** Three private buckets: `epubs`, `covers`, `books`.

| Bucket | Contents | Access Pattern |
|--------|----------|----------------|
| `epubs` | Raw `.epub` files | Streamed via `/api/books/:id/epub` |
| `covers` | Compressed cover images (WebP/JPEG) | Served via `/api/books/:id/cover` |
| `books` | Extracted EPUB assets (OPF, XHTML, CSS, images) | Served via `/api/books/:id/content/...` (legacy path) |

**Why:**
- Private buckets — no public URLs leak. All access is authenticated through Next.js API routes.
- Separating epubs/covers from extracted assets keeps bucket semantics clean.
- The `books` bucket is a legacy path from when EPUBs were server-unzipped. New uploads use `epubs` bucket (raw EPUB) and Foliate opens it directly client-side.

---

## 3. Reader: Foliate-js in iframe

**Decision:** Foliate-js (a web-based EPUB renderer) is loaded in a full-page iframe from `/foliate-js/reader.html`. The EPUB is fetched as a raw `.epub` blob from `/api/books/:id/epub`.

**Why:**
- Foliate handles all EPUB parsing, pagination, scrolling, CFI generation natively.
- Iframe isolation prevents EPUB CSS/JS from polluting the main app.
- Foliate's `reader.js` is the customization layer — styles, font sizes, TOC sidebar, reading modes (paginated/scrolled/continuous).
- No need to re-implement EPUB rendering; Foliate is mature and supports CFI out of the box.

**Trade-off:** Cross-iframe communication for progress sync requires `postMessage` or URL param injection.

**Critical foliate-js internals (learned from debugging continuous scroll):**

- `foliate-paginator` uses `attachShadow({ mode: 'closed' })` — its shadow root is **inaccessible** from outside (`r.shadowRoot === null`). The internal `#container` scroll element cannot be reached directly.
- In `flow="scrolled"` mode, the paginator's internal `#container` (shadow DOM, `overflow: auto`) scrolls — NOT the iframe document. Each spine item renders in an iframe with `scrolling="no"`.
- The paginator exposes a **public API** for scroll interaction:
  - `renderer.scrollBy(dx, 0)` — scrolls the internal container. In non-vertical scrolled mode, `dx` maps to `scrollTop` (not `dy`).
  - `renderer.addEventListener('scroll', ...)` — fires on the renderer element itself whenever the container scrolls (re-emitted from inside the closed shadow DOM).
  - `r.start` / `r.end` / `r.viewSize` — public getters for current scroll position and content height.
  - `r.nextSection()` / `r.prevSection()` — navigate directly to the adjacent spine item. Use these instead of `view.next(distance)` which routes through `#scrollNext` and will scroll remaining pixels rather than navigate when not at the exact 2px threshold.
- Wheel and touch events inside the EPUB iframe do **not** propagate to the parent document (cross-frame boundary). They must be explicitly proxied via listeners on `doc` from the `load` event, forwarding to `renderer.scrollBy()`.
- When `scrollTop` is already clamped at the boundary, `renderer.scrollBy()` is a no-op and the `scroll` event does not fire — chapter navigation must be armed manually when `r.start` doesn't change after a `scrollBy` call.

---

## 4. Progress Sync: CFI + Last-Write-Wins

**Decision:** Reading position is stored as an EPUB CFI string (`reading_cfi`) with a numeric progress percentage and a `reading_updated_at` timestamp.

**Conflict resolution:** Last-write-wins. If the client sends an `updatedAt` older than the server's `reading_updated_at`, the API returns `409 Conflict`.

**Why:**
- CFI is the standard EPUB location format — it encodes chapter + character offset precisely.
- Progress percentage is derived client-side from CFI for UI display (progress bars).
- LWW is the simplest sync model that works across devices. No CRDT complexity needed for a single scalar (position).

**Gap:** The reader iframe (Foliate) currently does **not** emit progress events back to the parent page. The `#onRelocate` handler in `reader.js` updates the document title but doesn't POST to the API.

---

## 5. Client State: Zustand + localStorage Persistence

**Decision:** `useBookStore` (Zustand) holds the library list client-side with `persist` middleware writing to localStorage.

**Why:**
- Instant UI on page load (cached book list renders immediately).
- Cloud API is source of truth — `fetchBooks()` hydrates the store on mount, overwriting stale local data.
- Simple; no complex offline-first or sync queue needed for the library list itself.

**Trade-off:** Reading progress is NOT persisted in Zustand. It's only on the server. If the sync call fails, position is lost.

---

## 6. EPUB Processing Pipeline

**Decision:** Client-side metadata extraction + server-side raw storage.

| Step | Where | What |
|------|-------|------|
| Validate EPUB (magic bytes, extension) | Client + Server | Reject non-ZIP, non-.epub |
| Extract metadata (title, author) | Client (`extractEpubLocal`) | Parse OPF from ZIP in browser |
| Extract & compress cover | Client (`compressCoverForUpload`) | Resize/WebP encode in browser |
| Upload raw EPUB + cover | Server (`/api/books/upload`) | Store in `epubs` + `covers` buckets |
| Insert `books` row | Server | title, author, storage paths |

**Why:**
- Client-side extraction offloads CPU work and provides instant UI feedback (cover preview during upload).
- Server stores the raw EPUB — Foliate opens it directly. No server-side unzip needed for new uploads.
- Legacy `books` bucket + `extracted_storage_prefix` path supports older books that were server-unzipped.

---

## 7. API Route Structure (Next.js App Router)

```
/api/books              GET (list), POST via /upload
/api/books/upload       POST (multipart: file + cover + metadata)
/api/books/[id]         GET (single), DELETE, PATCH (metadata OR progress)
/api/books/[id]/epub    GET (stream raw .epub)
/api/books/[id]/cover   GET (stream cover image)
/api/books/[id]/reader  GET (returns URL for Foliate to load)
/api/books/[id]/content/[...assetPath]  GET (legacy extracted assets)
/api/books/[id]/annotations             GET, POST
/api/books/[id]/annotations/[annotationId]  PATCH, DELETE
```

**Why:**
- RESTful, predictable.
- PATCH on `/api/books/[id]` is overloaded: if body contains `cfi` → progress update; otherwise → metadata update. This works but is slightly implicit.

---

## 8. No Offline Support (Intentional)

**Decision:** No service worker, no IndexedDB caching, no offline reading.

**Why:**
- MVP scope. Cloud-first means "you need internet to read."
- Adding offline would require: SW + cache API for EPUB blobs, IndexedDB for progress queue, background sync — massive complexity.
- Can be a v2 feature.

---

## 9. No PDF / Non-EPUB Support (Intentional)

**Decision:** Only `.epub` files are supported.

**Why:**
- Foliate-js is an EPUB renderer. PDF would need a separate renderer (pdf.js).
- Keeping scope tight for MVP.

---

## 10. Deployment Target: Vercel (Implicit)

**Decision:** Next.js 16 on Vercel with `runtime = "nodejs"` for upload routes (need Buffer/stream APIs). `maxDuration = 120` for upload.

**Why:**
- Next.js + Vercel is zero-config deployment.
- Node runtime needed because `adm-zip` and `busboy` require Node APIs.
- 120s timeout accommodates large EPUB uploads over slow connections.
