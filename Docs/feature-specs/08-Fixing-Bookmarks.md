# 08 — Bookmark System: Complete Map & Known Bugs

**Status:** Investigation / Bug Triage  
**Date:** 2025-06-25

---

## 1. Architecture Overview

The bookmark system spans four layers connected by `postMessage`:

```
┌──────────────────────────────────┐
│  Supabase (book_annotations)     │  ← source of truth
└────────────┬─────────────────────┘
             │ REST API
┌────────────▼─────────────────────┐
│  Next.js page.tsx                │  ← bridge: fetches, caches, relays
│  app/library/[id]/read/page.tsx  │
└────────────┬─────────────────────┘
             │ postMessage
┌────────────▼─────────────────────┐
│  reader-annotations.js           │  ← message router (load / saved)
│  reader.js (Reader class)        │  ← orchestration, button handler
│  reader-bookmarks.js             │  ← BookmarkController (strips, state)
└──────────────────────────────────┘
```

---

## 2. File Map (every file that touches bookmarks)

### Core implementation

| File | Role | Key lines |
|------|------|-----------|
| `packages/foliate-js/reader-bookmarks.js` | `BookmarkController` class — strip rendering, deferred queue, drag, mode migration, CFI viewport rect | All (1–451) |
| `packages/foliate-js/reader.js` | Reader orchestration — bookmark button click, `onLoadBookmark` callback, deferred flush in `onChapterVisible`, mode-switch migration | 148–205, 420–505, 985–1005 |
| `packages/foliate-js/reader-annotations.js` | Inbound message listener — splits bookmarks from highlights on `load-annotations`, handles `bookmark-saved` | 76–93 |
| `packages/foliate-js/reader-elements.js` | DOM registry: `bookmarkButton` | Line 20 |
| `packages/foliate-js/reader.html` | `.bookmark-strip` CSS, `#bookmark-button` markup | 928–934, 1109–1110 |

### Backend & data

| File | Role |
|------|------|
| `app/library/[id]/read/page.tsx` | postMessage bridge — `bookmark-create`, `bookmark-update`, `annotation-delete`; annotation cache; resume CFI selection (lines 60–92, 214–271) |
| `app/api/books/[id]/annotations/route.ts` | `GET` (list) + `POST` (create) |
| `app/api/books/[id]/annotations/[annotationId]/route.ts` | `PATCH` (update payload) + `DELETE` |
| `lib/api/books/annotations.ts` | Validation helpers for annotation payloads |
| `lib/books/api.ts` | Client helpers: `createBookAnnotation`, `updateBookAnnotation`, `deleteBookAnnotation`, `fetchBookAnnotations` |
| `types/books.ts` (lines 18–27) | `BookAnnotation` interface |
| `supabase/migrations/20260320000000_books_progress_and_annotations.sql` | `book_annotations` table schema + RLS + grants |

### Documentation

| File | Content |
|------|---------|
| `Docs/feature-specs/04-Bookmark-fix.md` | Original feature spec (visible draggable strips) |
| `Docs/context/progress-tracker.md` (lines 125–215) | History of all bookmark bug fixes |

---

## 3. Database Schema

```sql
CREATE TABLE book_annotations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       uuid NOT NULL REFERENCES books(id),
  profile_id    uuid NOT NULL REFERENCES profiles(id),
  cfi_range     text NOT NULL,          -- EPUB CFI string (opaque)
  annotation_type text NOT NULL,        -- "bookmark" | "highlight" | "note"
  payload       jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

**Bookmark payload shape:** `{ "label": "Bookmark", "yOffset": <number> }`

- `cfi_range` — canonical position (opaque, Foliate-only)
- `yOffset` — content-relative pixel offset, used for strip placement in continuous mode and scroll-resume

---

## 4. State Management

### Reader iframe (BookmarkController)

```
#bookmarkStrips   Map<id, { element, cfi, yOffset, container, cleanupFn }>
#deferredBookmarks  Array<{ ann, yOffset }>   — waiting for chapter iframe to load
#pendingScrollChapter  { chapterIdx, yOffset } — scroll target for resume
```

### Parent page (page.tsx)

```
cachedAnnotationsRef   useRef<BookAnnotation[] | null>   — single-fetch cache
lastSyncedCfiRef       useRef<string | null>             — dedup progress syncs
initialCfi             useState<string | null>           — resume position
isOpeningAndRestoring  useState<boolean>                 — loading overlay
```

---

## 5. Bookmark Behavior Per Reading Mode

### A. Continuous Scroll Mode

| Aspect | Behavior |
|--------|----------|
| **Container** | `.cs-chapter` div (has `position: relative`) |
| **Position** | `position: absolute; right: 0; top: ${yOffset}px` — scrolls with text |
| **yOffset calc** | `csOuter.scrollTop - chapterWrapper.offsetTop + csOuter.clientHeight / 2` |
| **Draggable** | Yes — vertical drag with 6-dot grip; updates `yOffset` in DB on drop |
| **Deferred rendering** | If chapter iframe not yet loaded, queued in `#deferredBookmarks`; flushed when `onChapterVisible` fires |
| **Resume scroll** | `applyPendingScroll()` — `csOuter.scrollTop = wrapper.offsetTop + yOffset - viewportCenter` |

### B. Paginated Mode

| Aspect | Behavior |
|--------|----------|
| **Container** | `#foliate-mount` (fixed overlay) |
| **Position** | `position: fixed; right: 0; top: ${CFI-derived}px` |
| **Visibility** | Hidden (`display: none`) when bookmark CFI is off-screen; shown when CFI is on current page |
| **Position update** | Recalculated on renderer `scroll`, `load`, and Foliate `relocate` events via `#positionPaginatorBookmarkStrip()` |
| **yOffset** | Stored as `0` — position derived entirely from CFI at render time |
| **Draggable** | No (fixed position tied to CFI) |

### C. Scrolled Mode

| Aspect | Behavior |
|--------|----------|
| **Container** | `#foliate-mount` (fixed overlay, scroll-tracked) |
| **Position** | `position: fixed; right: 0; top: ${yOffset - renderer.start}px` |
| **yOffset calc** | `renderer.start + renderer.size / 2` (content-absolute offset) |
| **Scroll tracking** | Attached scroll listener on `foliate-paginator` recalculates top on every tick; hides when out of viewport |
| **Draggable** | No (position is content-derived) |
| **Cleanup** | `cleanupFn` removes scroll listener on strip deletion or mode switch |

### Mode Switch Migration

1. `collectBookmarkData()` — iterates `#bookmarkStrips`, calls `cleanupFn?.()`, removes DOM, clears map, returns `[{ id, cfi, yOffset }]`
2. **To continuous:** populates `#deferredBookmarks` (strips render when each chapter loads)
3. **From continuous:** immediately re-renders each strip via `renderBookmarkStrip(id, yOffset, cfi, null)` as paginator overlay

---

## 6. CRUD Flow

### CREATE

```
User clicks #bookmark-button
  → reader.js: gets CFI + yOffset + tempId
  → BookmarkController.renderBookmarkStrip(tempId, ...) — optimistic DOM
  → postMessage("bookly:bookmark-create", { cfi, yOffset })
  → page.tsx: POST /api/books/[id]/annotations
  → page.tsx: updates cachedAnnotationsRef
  → postMessage("bookly:bookmark-saved", { annotation })
  → reader-annotations.js: calls onBookmarkSaved
  → BookmarkController.swapBookmarkId(tempId, serverAnnotation)
```

### READ (hydration on book open)

```
page.tsx: fetchBookAnnotations() → cachedAnnotationsRef
  → on reader-ready: postMessage("bookly:load-annotations", { annotations })
  → reader-annotations.js: splits list
    → bookmarks: onLoadBookmark(ann, yOffset, isFirst)
      → reader.js: resolves chapter, renders or defers
      → if isFirst + continuous: sets pendingScrollChapter → applyPendingScroll()
    → highlights: registerAndRenderAnnotation(ann)
```

### UPDATE (drag reposition)

```
User drags strip (continuous mode only)
  → mouseup: calculates finalTop
  → updates #bookmarkStrips map
  → postMessage("bookly:bookmark-update", { id, payload: { yOffset } })
  → page.tsx: PATCH /api/books/[id]/annotations/[annotationId]
  → updates cachedAnnotationsRef
```

### DELETE

```
User clicks trash icon on strip
  → calls cleanupFn() (removes scroll listeners)
  → strip.remove()
  → #bookmarkStrips.delete(id)
  → postMessage("bookly:annotation-delete", { id, cfiRange })
  → page.tsx: DELETE /api/books/[id]/annotations/[annotationId]
  → updates cachedAnnotationsRef
  → postMessage("bookly:remove-annotation", { cfiRange }) — also clears highlights
```

---

## 7. Resume Position Priority

On book open (`page.tsx` lines 74–79):

1. **Most recent bookmark** (`updated_at DESC`, first `annotation_type === "bookmark"`)
2. **Last read position** (`book.readingCfi`)
3. **Start of book** (`null`)

---

## 8. postMessage Event API

### Iframe → Parent

| Event | Payload | Purpose |
|-------|---------|---------|
| `bookly:bookmark-create` | `{ cfi, yOffset }` | Create new bookmark |
| `bookly:bookmark-update` | `{ id, payload: { yOffset } }` | Update position after drag |
| `bookly:annotation-delete` | `{ id, cfiRange }` | Delete bookmark/highlight |

### Parent → Iframe

| Event | Payload | Purpose |
|-------|---------|---------|
| `bookly:load-annotations` | `{ annotations[] }` | Hydrate all on reader-ready |
| `bookly:bookmark-saved` | `{ annotation }` | Temp → real ID swap |
| `bookly:remove-annotation` | `{ cfiRange }` | Remove rendered highlight overlay |

---

## 9. Behavior Change: Single Toggle Bookmark Per Book

**Status:** Ready for implementation  
**Full spec:** `Docs/feature-specs/09-bookmark-toggle.md`

---

## 10. Known Bugs & Issues

### ~~BUG 1: Same CFI for all bookmarks in a chapter (Continuous Mode)~~ FIXED

**Status:** Fixed (June 2026)  
**Fix:** Added `getRangeAtViewportCenter()` to `BookmarkController` and `getChapterIframe()` to `ContinuousScrollManager`. Bookmark button handler now passes the viewport-center Range to `view.getCFI(idx, range)`, producing position-specific CFIs like `epubcfi(/6/X!/4/2/1:42)`.  
**Details:** See progress tracker entry "Position-Specific CFI for Continuous-Mode Bookmarks".

---

### ~~BUG 1.1: Paginated/scrolled bookmark strip renders at viewport edge, not content edge~~ FIXED

**Status:** Fixed (June 2026)  
**Fix:** Added `#getContentColumnRect()` and `#getContentRightOffset()` helpers that compute the gap between the content iframe's right edge and `els.foliatMount`. Strips now position at the content column edge. Added `resize` listener, `repositionAllPaginatorStrips()`, and explicit double-rAF reposition after display mode toggle. All visibility bounds use mount-relative dimensions instead of `window.innerWidth`.  
**Details:** See progress tracker entry "Content-Edge Bookmark Strip Positioning in Paginated/Scrolled Modes".

---

### ~~BUG 1.2: Paginated/scrolled bookmark strips are not draggable~~ FIXED

**Status:** Fixed (June 2026)  
**Fix:** Enabled drag in paginator modes with `cursor: grab` and drag grip icon. Added `#resolveDropPositionToCfi(clientY)` that uses `caretRangeFromPoint` fallback chain on the content document and `view.getCFI(index, range)`. On drop, updates stored CFI in `#bookmarkStrips`, repositions via `#positionPaginatorBookmarkStrip`, and persists via extended `bookly:bookmark-update` with optional `cfiRange` field. Backend already supported `cfiRange` in PATCH. Client helper `updateBookAnnotation` and `page.tsx` handler extended to pass `cfiRange` through.  
**Details:** See progress tracker entry "Draggable Bookmark Strips in Paginated/Scrolled Modes".

---

### ~~BUG 2: `swapBookmarkId` called with `null` tempId~~ OBSOLETE

Eliminated by single-toggle bookmark (Section 9). Only one temp strip ever exists, so CFI matching is unambiguous.

---

### ~~BUG 3: No duplicate bookmark guard~~ OBSOLETE

Eliminated by single-toggle bookmark (Section 9). The toggle prevents creation when a bookmark exists.

---

### ~~BUG 4: Paginated mode bookmarks — position flicker on page turn~~ FIXED

**Status:** Fixed (June 2026)  
**Fix:** `updatePos` in `renderBookmarkStrip` now hides the strip synchronously (`display: none`) before the rAF callback repositions it, eliminating the 1-frame flash at the stale position.  
**Details:** See `Docs/feature-specs/09-bookmark-toggle.md` Section 12.

### ~~BUG 5: `yOffset` persisted but semantics differ across modes~~ OBSOLETE

Eliminated by single-toggle bookmark (Section 9) combined with Bug 1.1/1.2 fixes. With one bookmark, paginated/scrolled modes derive position from CFI. The only cross-mode mismatch (scrolled→continuous yOffset) is minor with a single strip the user can reposition.

---

### ~~BUG 6: Deferred bookmarks never flushed if chapter already visible~~ FIXED

**Status:** Fixed (June 2026)  
**Fix:** Extracted `flushDeferredBookmarks(chapterIndex?)` on `BookmarkController`, replacing duplicated inline flush blocks. Added a 200ms retry flush after deferring in `onLoadBookmark` to cover the race window where the chapter wrapper becomes available after `onChapterVisible` already fired.  
**Details:** See `Docs/feature-specs/09-bookmark-toggle.md` Section 12.

### ~~BUG 7: Temp bookmark strips allow delete before server save~~ FIXED

**Status:** Fixed (June 2026)  
**Fix:** Implemented `#pendingCreateCfi` and `#deleteOnSave` flags in `BookmarkController`. When `removeBookmark()` runs on a temp-ID strip while a create is pending, it sets `#deleteOnSave = true` instead of posting `bookly:annotation-delete` with the unknown temp ID. When `swapBookmarkId` later receives the server-assigned real ID, it detects the flag, immediately posts `bookly:annotation-delete` with the real ID, and clears the flag — preventing the database orphan.  
**Details:** See progress tracker entry "Single Toggle Bookmark" and spec Section 9 of `Docs/feature-specs/09-bookmark-toggle.md`.

---

## 11. Previously Fixed Bugs (for reference)

All from `progress-tracker.md`, May 2026:

1. **Paginated/Scrolled placement** — strips were static `top: 40%` markers; fixed with CFI-based viewport positioning
2. **Scrolled mode scroll-tracking** — strip didn't move with content; fixed with scroll listener + `yOffset - renderer.start`
3. **Mode-switch disappearance** — DOM removed but map not cleared, blocking re-render; fixed with `collectBookmarkData()` + `migrateBookmarkStrips()`
4. **Database 403 Forbidden** — missing `GRANT` on `book_annotations`; fixed by granting to `anon`, `authenticated`, `service_role`
5. **Progress save on close** — route navigation aborting fetch; fixed with `keepalive: true` + `bookly:close` bridge

---

## 12. Potential Improvements (not bugs, but noted)

- **Touch drag support:** Currently mouse-only. Mobile users cannot reposition strips.
