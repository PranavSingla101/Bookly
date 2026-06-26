# Feature Spec: Single Toggle Bookmark

**Status:** Ready for implementation

---

## 1. What We're Changing

The bookmark system currently supports **multiple bookmarks per book**. Each click on the bookmark button creates a new strip at the current reading position. There is no visual indicator on the button itself showing whether a bookmark exists.

This spec converts the bookmark to a **single toggle per book**:

- One bookmark per book, maximum
- The bookmark button reflects the current state: outline when empty, filled when active
- Clicking toggles between creating and removing
- The strip (visible marker in the reading area) still renders at the bookmarked position, still supports drag-to-reposition, still persists to the database

---

## 2. User-Facing Behavior

### Button states

| State | Icon | Title attribute | Click action |
|-------|------|-----------------|--------------|
| No bookmark | Outline bookmark (stroke only, `fill: none`) | "Bookmark this page" | Creates bookmark at current reading position |
| Bookmark exists | Filled bookmark (solid fill, `fill: currentcolor`) | "Remove bookmark" | Deletes the existing bookmark |

The button color follows the existing top-bar convention: `--reader-chrome-muted` at rest, `--reader-chrome` on hover. The fill/outline distinction is the only visual change — no new colors or icons.

### Interaction flow

**Creating a bookmark:**
1. User clicks the outline bookmark button
2. Strip appears at the current reading position (same as today)
3. Button fills in immediately (optimistic)
4. Toast: "Bookmark saved."
5. `bookly:bookmark-create` posted to parent → saved to database
6. `bookly:bookmark-saved` returns → temp ID swapped for real ID

**Removing a bookmark:**
1. User clicks the filled bookmark button
2. Strip removed from DOM immediately (optimistic)
3. Button goes back to outline
4. Toast: "Bookmark removed."
5. `bookly:annotation-delete` posted to parent → deleted from database

**Removing via strip trash icon:**
1. User hovers bookmark strip → trash icon appears
2. User clicks trash icon
3. Strip removed, `bookly:annotation-delete` posted (existing behavior)
4. **Button must also revert to outline** — the strip delete handler needs to notify the button state

### Edge case: what happens to existing multi-bookmark users

Old database rows remain. On book open, only the most recent bookmark is loaded (the annotation list is sorted `updated_at DESC`, and the load handler already uses an `isFirst` flag). Extra bookmarks sit in the database but are never rendered or interacted with. No migration needed.

---

## 3. Current Code Inventory

Before implementing, the developer should understand what exists and what each piece does, so nothing is broken by the toggle change.

### BookmarkController (`reader-bookmarks.js`)

**State:**
- `#bookmarkStrips` — `Map<id, { element, cfi, yOffset, container, cleanupFn }>`. Currently can hold 0–N entries. After this change, it holds 0 or 1.
- `#deferredBookmarks` — queue for bookmarks whose chapter iframe hasn't loaded yet. With single bookmark, this array holds at most one entry.
- `#pendingScrollChapter` — scroll target for resume on book open. Unchanged.

**Methods that stay as-is (no changes needed):**
- `resolveChapterIndexFromCfi(cfi)` — pure lookup, mode-agnostic
- `applyPendingScroll(chapterIdx)` — resume scroll, works for one bookmark
- `getRangeAtViewportCenter(chapterWrapper)` — CFI generation helper
- `getInitialYOffset(chapterWrapper)` — yOffset calculation
- `collectBookmarkData()` — iterates map, removes DOM, returns data array. Works for 0 or 1.
- `migrateBookmarkStrips(toContinuous)` — mode-switch migration. Works for 0 or 1.
- `repositionAllPaginatorStrips()` — reposition on resize/mode-toggle. Works for 0 or 1.
- `renderBookmarkStrip(id, yOffset, cfi, container)` — creates and mounts a strip. Guard `if (this.#bookmarkStrips.has(id)) return` already prevents duplicates for the same ID.
- `swapBookmarkId(tempId, serverAnnotation)` — temp→real ID swap. With single bookmark, there's only one temp entry so CFI matching is unambiguous.
- All private helpers (`#getContentColumnRect`, `#getContentRightOffset`, `#resolveDropPositionToCfi`, `#getBookmarkViewportRect`, `#positionPaginatorBookmarkStrip`)

**Methods that need modification or addition:** See Section 5.

### Reader class (`reader.js`)

**Bookmark button handler** (line ~988): Currently create-only. Needs to become a toggle.

**`onLoadBookmark` callback** (line ~171): Called by the annotation listener for each bookmark in the annotation list. Currently renders all bookmarks. Needs to skip non-first bookmarks.

**`onBookmarkSaved` callback** (line ~195): Calls `swapBookmarkId`. Also needs to update button state to "active" (confirming the save succeeded).

### AnnotationController (`reader-annotations.js`)

**`initAnnotationListener`** (line ~72): The `bookly:load-annotations` handler loops through all annotations. For bookmarks, it calls `onLoadBookmark(ann, yOffset, isFirst)` for every bookmark — `isFirst` is true only for the first one. Currently, all bookmarks are rendered. Needs to skip rendering for non-first bookmarks.

### Bookmark button markup (`reader.html`)

**Current:** Line 1110–1114. A `<button>` containing an SVG with a single `<path>`. The `.icon` class sets `fill: none; stroke: currentcolor; stroke-width: 2px`. The path `d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"` is a closed shape — setting `fill: currentcolor` produces a solid filled bookmark.

**Button styling:** `.reader-top-bar button` uses `color: var(--reader-chrome-muted)` at rest, `color: var(--reader-chrome)` on hover. The fill toggle inherits these colors automatically through `currentcolor`.

### Parent page (`page.tsx`)

**No changes needed.** The create, delete, and update handlers all work with single or multiple bookmarks. The cache (`cachedAnnotationsRef`) stores an array — with single bookmark it just has 0 or 1 bookmark entries alongside highlights. The resume CFI logic (`mostRecentBookmark?.cfi_range`) already picks the first bookmark.

### Database

**No changes needed.** No migration, no schema change. Old extra bookmarks persist harmlessly.

---

## 4. Visual Design

### Button icon — inactive (no bookmark)

```
    ┌─────────┐
   ╱           ╲      Outline only
  │             │      fill: none
  │             │      stroke: currentcolor (--reader-chrome-muted)
  │             │
   ╲     ╱     ╱
    ╲   ╱     ╱
     ╲ ╱
```

This is the current look. No change.

### Button icon — active (bookmark exists)

```
    ┌─────────┐
   ╱███████████╲      Solid fill
  │█████████████│      fill: currentcolor (--reader-chrome-muted)
  │█████████████│      stroke: currentcolor
  │█████████████│
   ╲█████╱█████╱
    ╲███╱█████╱
     ╲█╱
```

Same SVG path. Only difference: `fill: currentcolor` added via the `bookmark-active` class.

### CSS rule to add

```css
#bookmark-button.bookmark-active .icon {
    fill: currentcolor;
}
```

Place in the reader chrome section of `reader.html` (near line 233, alongside the other `#bookmark-button` / top-bar button rules).

---

## 5. Implementation — File by File

### A. `reader-bookmarks.js` — new methods on BookmarkController

**1. `get hasBookmark`**

A getter that returns `true` if `#bookmarkStrips.size > 0`. Used by the toggle handler to decide create vs delete.

**2. `getExistingBookmark()`**

Returns the first (and only) entry from `#bookmarkStrips` as `{ id, cfi, yOffset, element, cleanupFn }`, or `null` if the map is empty. Used by the toggle handler to get the ID for deletion.

Implementation: call `this.#bookmarkStrips.entries().next().value` — destructure to `[id, record]`, return `{ id, ...record }`.

**3. `removeBookmark()`**

Removes the single bookmark. Steps:
1. Get the existing bookmark via `getExistingBookmark()`
2. If null, return null (nothing to remove)
3. Call `record.cleanupFn?.()` to detach scroll/resize listeners
4. Call `record.element.remove()` to remove the strip from DOM
5. Delete the entry from `#bookmarkStrips`
6. Clear `#deferredBookmarks` (in case it was deferred and not yet rendered)
7. If the ID does NOT start with `temp-`, post `bookly:annotation-delete` to the parent with the real ID and CFI
8. Return the removed bookmark's `{ id, cfi }` so the caller knows what was deleted

**Why not just reuse the existing trash-icon delete handler?** The trash handler is an event listener bound to a specific strip's delete button. We need a programmatic method callable from the bookmark button's click handler, which has no reference to the strip's DOM elements. A clean method on the controller is the right abstraction.

**What about `#deferredBookmarks`?** If the user clicks the bookmark button to create, then clicks again to remove before the chapter loads (so the strip was deferred, not yet rendered), the bookmark exists in `#deferredBookmarks` but not in `#bookmarkStrips`. `removeBookmark()` must also clear `#deferredBookmarks`. However, the deferred entry doesn't have a server ID yet if it was created in this session — or it does if it was loaded from the database. Check: if `#deferredBookmarks` has entries, iterate and post `bookly:annotation-delete` for any that have a real (non-temp) ID, then clear the array.

### B. `reader.js` — toggle handler and button state

**1. Replace the bookmark button click handler**

Current handler (line ~988) always creates. Replace with:

```
if bookmark.hasBookmark OR bookmark.deferredBookmarks.length > 0:
    bookmark.removeBookmark()
    updateBookmarkButtonState(false)
    showToast('Bookmark removed.')
else:
    compute cfi + yOffset (existing logic, unchanged)
    bookmark.renderBookmarkStrip(tempId, yOffset, cfi, chapterWrapper)
    postMessage('bookly:bookmark-create', { cfi, yOffset })
    updateBookmarkButtonState(true)
    showToast('Bookmark saved.')
    peekTopBar(1500)
```

**2. Add `#updateBookmarkButtonState(active)` method**

```
if active:
    els.bookmarkButton.classList.add('bookmark-active')
    els.bookmarkButton.title = 'Remove bookmark'
    els.bookmarkButton.setAttribute('aria-label', 'Remove bookmark')
else:
    els.bookmarkButton.classList.remove('bookmark-active')
    els.bookmarkButton.title = 'Bookmark this page'
    els.bookmarkButton.setAttribute('aria-label', 'Bookmark this page')
```

**3. Call `#updateBookmarkButtonState` at the right moments**

| Moment | Where | Call |
|--------|-------|------|
| After load-annotations renders a bookmark | `onLoadBookmark` callback, after `renderBookmarkStrip` | `#updateBookmarkButtonState(true)` |
| After bookmark-saved confirms the server save | `onBookmarkSaved` callback, after `swapBookmarkId` | `#updateBookmarkButtonState(true)` |
| After strip trash-icon delete | The `del.addEventListener('click')` inside `renderBookmarkStrip` currently posts `bookly:annotation-delete` but does NOT update button state. This is inside `reader-bookmarks.js` which has no reference to the button. |

**The trash-icon problem:** The strip's delete handler lives inside `BookmarkController.renderBookmarkStrip()`. It removes the strip and posts the delete message, but it doesn't know about the bookmark button. Two options:

- **Option A — callback:** Add an `onBookmarkRemoved` callback to the `BookmarkController` constructor options. The strip's trash-icon handler calls it after deletion. Reader.js passes `() => this.#updateBookmarkButtonState(false)`. This keeps the controller decoupled from DOM details.

- **Option B — direct element access:** Import `els.bookmarkButton` in `reader-bookmarks.js` (it already imports `els`). Toggle the class directly. This couples the controller to the button element, which is less clean but simpler.

**Recommendation:** Option A (callback). The controller already takes four callbacks in its constructor. Adding a fifth is consistent with the existing pattern.

**4. Constructor change for BookmarkController**

Add `onBookmarkRemoved` to the constructor options:

```
constructor({ getView, isContinuousMode, getCsManager, postToParent, onBookmarkRemoved })
```

Store as `this.#onBookmarkRemoved = onBookmarkRemoved`. Call it:
- At the end of `removeBookmark()` after removing the strip
- Inside the trash-icon `del.addEventListener('click')` handler after deleting from the map

In Reader.js, pass:
```
onBookmarkRemoved: () => this.#updateBookmarkButtonState(false)
```

### C. `reader-annotations.js` — skip non-first bookmarks

Current code (line 76–88):

```js
for (const ann of list) {
    if (ann.annotation_type === 'bookmark') {
        const yOffset = ann.payload?.yOffset ?? 0
        const isFirst = !firstBookmarkSeen
        firstBookmarkSeen = true
        this.#onLoadBookmark?.(ann, yOffset, isFirst)
    } else {
        this.registerAndRenderAnnotation(ann)
    }
}
```

Change: after `firstBookmarkSeen = true`, add `if (!isFirst) continue` before calling `onLoadBookmark`. This skips all bookmarks after the first. The first bookmark is the most recent (`updated_at DESC` ordering from the API).

Alternatively, the `continue` can go before `firstBookmarkSeen = true`:

```
if (ann.annotation_type === 'bookmark') {
    if (firstBookmarkSeen) continue     // skip all after the first
    firstBookmarkSeen = true
    const yOffset = ann.payload?.yOffset ?? 0
    this.#onLoadBookmark?.(ann, yOffset, true)
}
```

This is cleaner — the `isFirst` parameter is always `true` (the only call), so the callback no longer needs to handle the `isFirst === false` case. However, keep the parameter for now to avoid changing the callback signature — just always pass `true`.

### D. `reader.html` — CSS for active state

Add one rule in the reader chrome CSS section (after the existing `.reader-top-bar button` rules, near line 250):

```css
#bookmark-button.bookmark-active .icon {
    fill: currentcolor;
}
```

That's it. The `currentcolor` inherits from the button's `color` property, which is already `--reader-chrome-muted` at rest and `--reader-chrome` on hover. The filled icon transitions naturally with the existing hover transition (`transition: color 0.15s ease`).

No markup changes to the button or SVG. The existing `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>` is a closed shape that looks correct both stroked and filled.

---

## 6. postMessage API — No Changes

All existing events are reused:

| Event | Direction | Used for |
|-------|-----------|----------|
| `bookly:bookmark-create` | iframe → parent | Creating the bookmark |
| `bookly:bookmark-saved` | parent → iframe | Confirming server ID |
| `bookly:annotation-delete` | iframe → parent | Deleting the bookmark |
| `bookly:bookmark-update` | iframe → parent | Drag-to-reposition |
| `bookly:load-annotations` | parent → iframe | Hydrating on book open |

No new event types. No payload changes.

---

## 7. Database & API — No Changes

- `book_annotations` table: unchanged
- GET/POST/PATCH/DELETE endpoints: unchanged
- Client helpers: unchanged
- Old extra bookmarks from before this change remain in the database. They are never loaded (only the first is rendered), never displayed, and don't affect any logic. They could be cleaned up with a one-time migration, but it's not necessary.

---

## 8. What This Eliminates

The single-bookmark model makes several open bugs from `08-Fixing-Bookmarks.md` irrelevant:

| Bug | Status after this change |
|-----|--------------------------|
| **Bug 2** (`swapBookmarkId` with null tempId) | Eliminated. Only one temp strip ever exists, so CFI matching is unambiguous regardless of the null parameter. |
| **Bug 3** (no duplicate bookmark guard) | Eliminated. The toggle prevents creation when a bookmark exists. Rapid double-click: first click creates, second click deletes. No duplicates possible. |
| **Bug 5** (yOffset semantics differ across modes) | Reduced to non-issue. The map holds at most one entry. Mode migration handles one strip correctly. The cross-mode yOffset mismatch still exists technically, but with one bookmark the user notices and can drag to reposition. |
| **Bug 7** (delete on temp ID) | Narrowed but not eliminated. If the user clicks to create (temp ID) then immediately clicks to remove, `removeBookmark()` will post `bookly:annotation-delete` with the temp ID, which the API won't find (404). The strip is removed from DOM. Then `bookly:bookmark-saved` arrives — but the strip is gone, so `swapBookmarkId` finds nothing to swap. The annotation is orphaned in the database. **This race still needs handling** — see Section 9. |

---

## 9. Remaining Edge Case: Delete During Temp ID Window

**Scenario:**
1. User clicks bookmark button → strip created with `temp-123`, `bookly:bookmark-create` posted
2. User immediately clicks again → `removeBookmark()` runs, removes the strip with `temp-123`, posts `bookly:annotation-delete` with `id: "temp-123"`
3. Parent receives `bookly:annotation-delete` for `temp-123` → `deleteBookAnnotation("temp-123")` → API returns 404 (no such ID)
4. Parent receives `bookly:bookmark-saved` with `{ id: "real-uuid", cfi_range: ... }` → posts `bookly:bookmark-saved` back to iframe
5. Iframe receives `bookly:bookmark-saved` → `swapBookmarkId` finds no temp strip → annotation is orphaned in DB

**How to fix (two options):**

**Option A — Track pending create in BookmarkController:**
- Add a `#pendingCreateCfi` field. Set it when creating a temp bookmark. Clear it when `swapBookmarkId` runs.
- In `removeBookmark()`, if `#pendingCreateCfi` is set, don't post `bookly:annotation-delete` (the server doesn't have the ID yet). Instead, set a `#deleteOnSave` flag.
- When `bookly:bookmark-saved` arrives and `#deleteOnSave` is true, immediately post `bookly:annotation-delete` with the now-known real ID, and clear the flag.

**Option B — Handle in page.tsx:**
- In the parent's `bookly:annotation-delete` handler, if `deleteBookAnnotation` fails with 404, check if the `cfiRange` matches a pending create. If so, queue the deletion to run after the create response arrives.

**Recommendation:** Option A is cleaner — it keeps the race handling inside the controller where the state lives.

---

## 10. Implementation Order

1. `reader.html` — add the CSS rule (one line, no risk)
2. `reader-bookmarks.js` — add `hasBookmark` getter, `getExistingBookmark()`, `removeBookmark()`, `onBookmarkRemoved` callback
3. `reader-annotations.js` — skip non-first bookmarks in load handler
4. `reader.js` — rewrite button handler as toggle, add `#updateBookmarkButtonState`, pass `onBookmarkRemoved` callback, call state updates after load and save

### Smoke test

1. Open a book with no bookmarks → button shows outline icon
2. Click button → strip appears, button fills, toast "Bookmark saved."
3. Click button again → strip removed, button outlines, toast "Bookmark removed."
4. Click button → strip appears at new position (not the old one)
5. Hover strip → trash icon appears → click trash → strip removed, button outlines
6. Drag strip to new position → strip snaps to new location, position persisted
7. Close and reopen book → strip appears at saved position, button is filled
8. Switch reading modes (continuous ↔ paginated ↔ scrolled) → strip migrates correctly, button stays filled
9. Open a book that has multiple old bookmarks → only the most recent renders, button is filled

---

## 11. Files to Modify

| File | What changes |
|------|-------------|
| `packages/foliate-js/reader.html` | Add `#bookmark-button.bookmark-active .icon { fill: currentcolor; }` |
| `packages/foliate-js/reader-bookmarks.js` | Add `hasBookmark` getter, `getExistingBookmark()`, `removeBookmark()`. Add `#onBookmarkRemoved` callback to constructor. Call it from `removeBookmark()` and from the trash-icon delete handler. |
| `packages/foliate-js/reader-annotations.js` | Skip non-first bookmarks in `bookly:load-annotations` handler |
| `packages/foliate-js/reader.js` | Add `#updateBookmarkButtonState(active)`. Rewrite bookmark button click handler as toggle. Pass `onBookmarkRemoved` callback to BookmarkController. Call `#updateBookmarkButtonState(true)` after load and after saved. |

---

## 12. Remaining Bugs (from `08-Fixing-Bookmarks.md`)

### ~~BUG 4: Paginated mode bookmark — position flicker on page turn~~ FIXED

**Status:** Fixed (June 2026)  
**Fix:** The `updatePos` handler in `renderBookmarkStrip` now sets `strip.style.display = 'none'` synchronously before the `requestAnimationFrame` callback. The rAF callback (`#positionPaginatorBookmarkStrip`) restores `display: flex` at the correct position. The strip is invisible during the transition frame instead of flashing at the stale location.

---

### ~~BUG 6: Deferred bookmark never flushed if chapter already visible~~ FIXED

**Status:** Fixed (June 2026)  
**Fix:** Extracted `flushDeferredBookmarks(chapterIndex?)` method on `BookmarkController` — consolidates the duplicated flush logic from `onChapterVisible` and `onDocLoad` into a single method. Added a 200ms retry flush in `onLoadBookmark` after deferring, so if the chapter wrapper becomes available shortly after (the narrow race window), the deferred entry is picked up. Also cleaned up the two inline flush blocks in `reader.js` to call the new method.

---

### ~~BUG 8: Paginated mode — bookmark strip visible on wrong page~~ FIXED

**Status:** Fixed (June 2026)  
**File:** `reader-bookmarks.js` — `#getBookmarkViewportRect`

When the bookmark has a chapter-level CFI (no sub-chapter anchor — e.g. old bookmarks created before the position-specific CFI fix, or bookmarks migrated from continuous mode), `#getBookmarkViewportRect` resolves the CFI's anchor to `null`. The fallback on line 372 (`target ??= content.doc.body ?? content.doc.documentElement`) uses the `<body>` element's bounding rect instead.

The body element spans the entire chapter content across all paginated columns. Its `getBoundingClientRect()` always returns a rect starting near `top: 0` in viewport coordinates, regardless of which page the paginator is currently showing. The visibility check in `#positionPaginatorBookmarkStrip` (lines 400–409) compares `rect.right`/`rect.left`/`rect.top`/`rect.bottom` against viewport bounds — but the body rect is always "in bounds" because it covers the full content area including the currently visible column.

**Result:** The strip appears at the top of every page the user navigates to, not just the page where the bookmark was created.

**Fix — replace body fallback with a collapsed range at the start of the chapter:**

In `#getBookmarkViewportRect`, line 372 currently does:

```js
target ??= content.doc.body ?? content.doc.documentElement
```

When `target` is `null` (chapter-level CFI, anchor resolved to nothing), this falls back to the `<body>` element. `getBoundingClientRect()` on the body returns a rect spanning the entire chapter content across all paginated columns — it's always "in view."

**Replace the body fallback** with a collapsed Range at position 0 of the body:

```js
if (!target) {
    try {
        const body = content.doc.body ?? content.doc.documentElement
        const range = content.doc.createRange()
        range.setStart(body, 0)
        range.collapse(true)
        target = range
    } catch {
        return null
    }
}
```

This creates a collapsed Range pointing at the first child node of `<body>`. Then `uncollapseRange(target)` on the next line expands it:
- `endContainer` is `<body>` (Element node), `endOffset` is `0`
- `childNodes[0]` is the first child — if it's an Element, `uncollapseRange` returns that element
- `getClientRects()` on that first child element returns rects positioned in the **first column** of the paginator

When the user is on page 1 (first column), the rect is in the viewport → strip shows at the top of the content. When the user navigates to page 2+, the first column has scrolled left past the viewport → `rect.right < 0` → the existing visibility check hides the strip. The strip now correctly only appears on the page where the chapter starts.

**File:** `reader-bookmarks.js`, `#getBookmarkViewportRect`, line 372.

---

### ~~BUG 9: Paginated mode — bookmark strip at viewport edge instead of content edge after mode switch~~ FIXED

**Status:** Fixed (June 2026)  
**File:** `reader-bookmarks.js` — `#positionPaginatorBookmarkStrip`

When switching from continuous scroll to paginated mode, `renderBookmarkStrip` is called to re-render the strip as a fixed overlay. The strip's initial `right` offset is set via `#getContentRightOffset()`, which computes the gap between `els.foliatMount.right` and the content iframe's right edge using `#getContentColumnRect()`.

`#getContentColumnRect()` gets the iframe via `renderer.getContents()?.[0]?.doc?.defaultView?.frameElement?.getBoundingClientRect()`. After a mode switch, the paginator's `goTo` navigation is async — even with the double-rAF delay added in the migration fix, the content iframe's layout may not have fully settled. If `getContents()` returns an empty array or the iframe hasn't been sized yet, `#getContentColumnRect()` returns `null` and `#getContentRightOffset()` falls back to `0`.

**Result:** The strip renders at `right: 0px` — the viewport edge — instead of aligned with the content column edge. The `updatePos` listener eventually repositions it on the next `scroll`/`load`/`relocate` event, but there's a visible flash at the wrong position first.

**Fix — guard `#positionPaginatorBookmarkStrip` against missing iframe rect:**

In `#positionPaginatorBookmarkStrip`, add an early check: if `#getContentColumnRect()` returns `null`, the content iframe isn't ready yet — hide the strip and return. The next `updatePos` tick (triggered by `load`/`scroll`/`relocate`) will re-run positioning once the iframe has settled.

```js
#positionPaginatorBookmarkStrip(strip, cfi) {
    if (!this.#getContentColumnRect()) {
        strip.style.display = 'none'
        return
    }
    // ... existing rect/bounds logic unchanged ...
}
```

This prevents the strip from ever showing at `right: 0px`. The `updatePos` handler is already wired to `renderer.addEventListener('load', ...)`, which fires when the paginator finishes loading the chapter content and the iframe becomes available — at that point `#getContentColumnRect()` returns a valid rect and the strip positions correctly.

**File:** `reader-bookmarks.js`, `#positionPaginatorBookmarkStrip`, line 392.

---

### BUG 10: Paginated mode — bookmark strip visible on non-bookmarked page due to expanded iframe width

**Status:** Open — initial fix was incorrect  
**File:** `reader-bookmarks.js` — `#getBookmarkViewportRect`  
**Full spec:** `Docs/feature-specs/10-Iframe-bookmark-bug.md`

The iframe is expanded to `pageCount × pageSize` (e.g. 2100px for 3 pages), so the iframe-width check (`rect.left > iframeRect.width`) never triggers — all pages are within the iframe. The correct boundary is `renderer.start` / `renderer.start + renderer.size`, which represents the one-page visible area controlled by the container's `scrollLeft`. See the full spec for the fix.
