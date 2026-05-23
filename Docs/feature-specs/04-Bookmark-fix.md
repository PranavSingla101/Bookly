# Feature Spec: Visible, Draggable Bookmark Strip

**Status:** Ready for implementation
**Reference image:** `Docs/screenshots/bookmark.png`

---

## 1. What We're Building

The bookmark button already saves a CFI to the database but nothing renders in the reader. This feature adds a **dark-blue horizontal strip** that:

- Appears on the right edge of the chapter content at the user's current reading position (viewport center) when they press the bookmark button
- **Scrolls with the text** — it is a child of the chapter wrapper, not a viewport overlay
- Is **draggable vertically** so the user can slide it to mark an exact line
- Persists across page loads — restored from the saved `yOffset` in the database
- Supports multiple bookmarks; each renders at its own saved position

---

## 2. Visual Design

```
  ┌─────────────────────────────────────────┐
  │                                         │
  │  Text line the user was reading...      ▐███
  │                                         │  ↑
  │  More text below...                     │  28px wide × 12px tall
  │                                         │  dark blue fill (#1B3A6B)
  └─────────────────────────────────────────┘  rounded left corners only
```

- **Colour:** `#1B3A6B` (dark blue)
- **Size:** 28 px wide × 12 px tall
- **Placement:** `position: absolute; right: 0` inside the chapter's wrapper div
- **Shape:** `border-radius: 4px 0 0 4px`
- **Hover:** lighten slightly, show a trash icon centered on the strip; clicking it deletes the bookmark
- **Drag cursor:** `grab` normally, `grabbing` while dragging
- **Multiple on same chapter:** each strip renders at its own `top` value; they stack vertically

---

## 3. How `yOffset` Is Calculated

When the user clicks the bookmark button, the strip is placed at the user's **current reading position** — the vertical center of the viewport mapped into chapter-content coordinates.

### Continuous scroll mode (primary)

```
yOffset = csOuter.scrollTop                  // how far user has scrolled
        - chapterWrapper.offsetTop           // top of this chapter in cs-chapters
        + csOuter.clientHeight / 2           // center of the viewport
```

`chapterWrapper` is the `.cs-chapter` div for `currentChapterIndex`.

### Paginated / scrolled mode

The strip is placed at a fixed `top: 40%` of the rendered page. Since there is no scrollable chapter wrapper in paginated mode, the strip is positioned relative to `#foliate-mount` using `position: fixed` (right edge, 40% from top). It is not draggable in paginated mode (drag support is continuous-mode only for now).

---

## 4. DOM Placement

- **Continuous mode:** strip element appended to `.cs-chapter` wrapper div.
  - `.cs-chapter` already has `position: relative` in CSS — strip's `position: absolute; right: 0; top: Xpx` works correctly.
  - Strip scrolls with the chapter content as the user scrolls.
- **Paginated mode:** strip element appended to `#foliate-mount` with `position: fixed; right: 0; top: 40%`.

---

## 5. Data Model — No Schema Change

Existing `book_annotations` table with `annotation_type = 'bookmark'` and `payload jsonb`.

Add `yOffset` (number, pixels from top of chapter content in continuous mode; `null` in paginated) to payload:

```json
{ "label": "Bookmark", "yOffset": 523 }
```

---

## 6. Backend Changes

### 6.1 New `PATCH` handler — `app/api/books/[id]/annotations/[annotationId]/route.ts`

This route already has a `DELETE` handler. Add `PATCH` to update payload when the user drags a bookmark to a new position.

```ts
export async function PATCH(
  request: Request,
  props: RouteContext<"/api/books/[id]/annotations/[annotationId]">
) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id, annotationId } = await props.params;

    const { data: book, error: bookError } = await fetchOwnedBook(supabase, id, profileId, "id");
    if (bookError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const body = await request.json();
    const { payload } = body as { payload?: Record<string, unknown> };
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "payload required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("book_annotations")
      .update({ payload, updated_at: new Date().toISOString() })
      .eq("id", annotationId)
      .eq("book_id", id)
      .eq("profile_id", profileId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to update annotation" }, { status: 500 });
    }

    return NextResponse.json({ annotation: data });
  } catch (error) {
    return handleCommonApiError(error);
  }
}
```

### 6.2 New client helper — `lib/books/api.ts`

```ts
export async function updateBookAnnotation(
  bookId: string,
  annotationId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`/api/books/${bookId}/annotations/${annotationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) throw new Error(`Update annotation failed: ${res.status}`);
}
```

---

## 7. `page.tsx` Changes — `app/library/[id]/read/page.tsx`

### 7.1 Import

```ts
import {
  // existing imports...
  updateBookAnnotation,   // ← add
} from "@/lib/books/api";
```

### 7.2 Update `bookly:bookmark-create` handler

Send `yOffset` to DB; relay the saved annotation back to the iframe.

```ts
if (data.type === "bookly:bookmark-create") {
  const { cfi, yOffset } = data as { cfi: string; yOffset: number };
  createBookAnnotation({
    bookId,
    cfiRange: cfi,
    type: "bookmark",
    payload: { label: "Bookmark", yOffset },
  })
    .then((result) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "bookly:bookmark-saved", annotation: result.annotation },
        "*"
      );
    })
    .catch((err) => console.warn("[reader] Bookmark save failed:", err));
  return;
}
```

> Verify that `createBookAnnotation` in `lib/books/api.ts` returns `{ annotation }` (the POST route returns `{ annotation: data }` — it does).

### 7.3 Add `bookly:bookmark-update` handler

```ts
if (data.type === "bookly:bookmark-update") {
  const { id, payload } = data as {
    id: string;
    payload: Record<string, unknown>;
  };
  updateBookAnnotation(bookId, id, payload).catch((err) =>
    console.warn("[reader] Bookmark update failed:", err)
  );
  return;
}
```

---

## 8. `reader.js` Changes

### 8.1 New class field

```js
// Inside Reader class, with other state fields
#bookmarkStrips = new Map()  // annotationId → { element, cfi, yOffset }
```

### 8.2 `#getInitialYOffset(chapterWrapper)` — viewport-center in chapter coords

Called when the user clicks the bookmark button.

```js
#getInitialYOffset(chapterWrapper) {
    if (this.continuousScroll) {
        const csOuter = $('#cs-outer')
        if (!csOuter || !chapterWrapper) return 0
        const scrollTop = csOuter.scrollTop
        const chapterTop = chapterWrapper.offsetTop
        const viewportCenter = csOuter.clientHeight / 2
        return Math.max(0, scrollTop - chapterTop + viewportCenter)
    }
    // Paginated: fixed Y, not used for DOM placement (strip goes fixed)
    return 0
}
```

### 8.3 Updated bookmark button click handler

Replace the existing handler (around line 1473):

```js
$('#bookmark-button')?.addEventListener('click', () => {
    let cfi = this.view?.lastLocation?.cfi
    let chapterWrapper = null

    if (this.continuousScroll && this.#csManager) {
        const idx = this.#csManager.currentChapterIndex
        if (idx >= 0) {
            cfi = this.view?.getCFI?.(idx, null) ?? cfi
            chapterWrapper = this.#csManager.getChapterWrapper(idx)
        }
    }
    if (!cfi) return

    const yOffset = this.#getInitialYOffset(chapterWrapper)
    const tempId = `temp-${Date.now()}`

    // Optimistic render
    this.#renderBookmarkStrip(tempId, yOffset, cfi, chapterWrapper)

    window.parent.postMessage({ type: 'bookly:bookmark-create', cfi, yOffset }, '*')
    this.#showToast('Bookmark saved.')
    this.#peekTopBar(1500)
})
```

### 8.4 `getChapterWrapper(index)` — expose from `ContinuousScrollManager`

Add a getter to `ContinuousScrollManager`:

```js
getChapterWrapper(index) {
    return this.#chapterEls.get(index)?.wrapper ?? null
}
```

(`wrapper` is already the `.cs-chapter` div stored in `#chapterEls` — confirm the property name by checking `appendChapter()`.)

### 8.5 `#renderBookmarkStrip(id, yOffset, cfi, container)` — create DOM element

```js
#renderBookmarkStrip(id, yOffset, cfi, container) {
    // Continuous mode: container = .cs-chapter div (position:relative)
    // Paginated mode: container = null → append to #foliate-mount (position:fixed)
    const isPaginated = !container
    const mountEl = container ?? $('#foliate-mount')
    if (!mountEl) return

    const strip = document.createElement('div')
    strip.dataset.bookmarkId = id
    strip.className = 'bookmark-strip'

    if (isPaginated) {
        // Fixed overlay on the right, vertically centered-ish
        strip.style.cssText = `
            position: fixed;
            right: 0;
            top: 40%;
            width: 28px;
            height: 12px;
            background: #1B3A6B;
            border-radius: 4px 0 0 4px;
            cursor: default;
            z-index: 200;
        `
    } else {
        strip.style.cssText = `
            position: absolute;
            right: 0;
            top: ${yOffset}px;
            width: 28px;
            height: 12px;
            background: #1B3A6B;
            border-radius: 4px 0 0 4px;
            cursor: grab;
            z-index: 200;
            transition: background 150ms;
        `
    }

    strip.title = 'Bookmark'

    // Trash icon — hidden until hover
    const del = document.createElement('span')
    del.innerHTML = `<svg width="8" height="9" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 3h8M4 3V2h2v1M2 3l.667 7h4.666L8 3" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
    del.style.cssText = `
        display: none;
        position: absolute;
        inset: 0;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
    `
    strip.appendChild(del)

    strip.addEventListener('mouseenter', () => {
        strip.style.background = '#2a5298'
        del.style.display = 'flex'
    })
    strip.addEventListener('mouseleave', () => {
        strip.style.background = '#1B3A6B'
        del.style.display = 'none'
    })

    del.addEventListener('click', (e) => {
        e.stopPropagation()
        strip.remove()
        this.#bookmarkStrips.delete(id)
        window.parent.postMessage(
            { type: 'bookly:annotation-delete', id, cfiRange: cfi },
            '*'
        )
    })

    // Drag to reposition — continuous mode only
    if (!isPaginated) {
        let dragStartY = 0
        let dragStartTop = 0

        strip.addEventListener('mousedown', (e) => {
            if (e.target === del) return
            e.preventDefault()
            dragStartY = e.clientY
            dragStartTop = parseInt(strip.style.top, 10)
            strip.style.cursor = 'grabbing'

            const onMove = (ev) => {
                const dy = ev.clientY - dragStartY
                const newTop = Math.max(0, dragStartTop + dy)
                strip.style.top = newTop + 'px'
            }
            const onUp = () => {
                document.removeEventListener('mousemove', onMove)
                document.removeEventListener('mouseup', onUp)
                strip.style.cursor = 'grab'
                const finalTop = parseInt(strip.style.top, 10)

                const record = this.#bookmarkStrips.get(id)
                if (record) record.yOffset = finalTop

                // Only persist if we have a real DB id (not a temp)
                if (!id.startsWith('temp-')) {
                    window.parent.postMessage({
                        type: 'bookly:bookmark-update',
                        id,
                        payload: { label: 'Bookmark', yOffset: finalTop },
                    }, '*')
                }
            }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
        })
    }

    mountEl.appendChild(strip)
    this.#bookmarkStrips.set(id, { element: strip, cfi, yOffset, container: mountEl })
}
```

### 8.6 Handle `bookly:bookmark-saved` — swap temp id for real DB id

Inside the existing `window.addEventListener('message', …)` block in `#initAnnotationListener`:

```js
if (e.data?.type === 'bookly:bookmark-saved') {
    const { annotation } = e.data
    // Match on CFI, not insertion order — guards against out-of-order server
    // responses if the user clicks the bookmark button twice in quick succession.
    for (const [tempId, record] of this.#bookmarkStrips) {
        if (tempId.startsWith('temp-') && record.cfi === annotation.cfi_range) {
            record.element.dataset.bookmarkId = annotation.id
            this.#bookmarkStrips.delete(tempId)
            this.#bookmarkStrips.set(annotation.id, record)
            break
        }
    }
}
```

`page.tsx` already passes the full `annotation` object (which contains `cfi_range`) in `bookly:bookmark-saved` — no change needed there. `Date.now()` is sufficient for temp-id uniqueness since JS is single-threaded; a UUID is unnecessary.

### 8.7 Render bookmarks from `bookly:load-annotations`

Inside the `if (e.data?.type === 'bookly:load-annotations')` block in `#initAnnotationListener`, after the existing loop that calls `#registerAndRenderAnnotation`:

```js
for (const ann of list) {
    this.#registerAndRenderAnnotation(ann)   // existing — handles highlights/notes

    if (ann.annotation_type === 'bookmark') {
        const yOffset = ann.payload?.yOffset ?? 0
        // Resolve chapter wrapper from CFI if in continuous mode
        let container = null
        if (this.continuousScroll && this.#csManager) {
            // Parse chapter index from CFI — format is epubcfi(/6/Xpx...)
            // Simplest: find the chapter whose CFI matches ann.cfi_range prefix
            const idx = this.#resolveChapterIndexFromCfi(ann.cfi_range)
            if (idx >= 0) {
                container = this.#csManager.getChapterWrapper(idx)
                // If chapter not loaded yet, defer until it loads
                if (!container) {
                    this.#deferredBookmarks = this.#deferredBookmarks ?? []
                    this.#deferredBookmarks.push({ ann, yOffset })
                    continue
                }
            }
        }
        this.#renderBookmarkStrip(ann.id, yOffset, ann.cfi_range, container)
    }
}
```

### 8.8 `#resolveChapterIndexFromCfi(cfi)` — extract spine index from CFI

```js
#resolveChapterIndexFromCfi(cfi) {
    if (!cfi || !this.view) return -1
    try {
        // view.resolveNavigation returns { index, anchor } for a CFI string
        const resolved = this.view.resolveNavigation(cfi)
        return resolved?.index ?? -1
    } catch {
        return -1
    }
}
```

### 8.9 Render deferred bookmarks when a chapter loads

In `ContinuousScrollManager.appendChapter()`, there is already an `onDocLoad` callback. Hook into the `#onChapterVisible` callback in `Reader.#initContinuousScroll` to flush deferred bookmarks:

```js
onChapterVisible: (index) => {
    this.#onCsChapterVisible(index)
    // Render any bookmarks deferred because their chapter wasn't loaded yet
    if (this.#deferredBookmarks?.length) {
        const remaining = []
        for (const { ann, yOffset } of this.#deferredBookmarks) {
            const idx = this.#resolveChapterIndexFromCfi(ann.cfi_range)
            if (idx === index) {
                const wrapper = this.#csManager.getChapterWrapper(idx)
                if (wrapper) {
                    this.#renderBookmarkStrip(ann.id, yOffset, ann.cfi_range, wrapper)
                    continue
                }
            }
            remaining.push({ ann, yOffset })
        }
        this.#deferredBookmarks = remaining
    }
},
```

---

## 9. CSS — `reader.html`

Add inside the `<style>` block:

```css
/* ── Bookmark strip ─────────────────────────────────────── */
.bookmark-strip {
    pointer-events: all;
    user-select: none;
    box-sizing: border-box;
}
```

`.cs-chapter` already has `position: relative` — no change needed there.

---

## 10. Deleting a Bookmark

### Interaction

1. User hovers over any bookmark strip → strip lightens to `#2a5298`, a small white trash icon appears centered on the strip
2. User clicks the trash icon → strip is removed from the DOM immediately (optimistic), `bookly:annotation-delete` is posted to `page.tsx`, which calls `deleteBookAnnotation` and tells the reader iframe to remove the rendered highlight (existing flow)

### Visual states

| State | Background | Icon |
|---|---|---|
| Idle | `#1B3A6B` | Hidden |
| Hover | `#2a5298` | White SVG trash icon, 8×9 px, centered on strip |
| Dragging | `#1B3A6B` | Hidden (mouseenter suppressed during drag) |

### The trash icon SVG

Inline SVG drawn directly into the `del` span — no external asset needed:

```html
<svg width="8" height="9" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 3h8M4 3V2h2v1M2 3l.667 7h4.666L8 3"
        stroke="#fff" stroke-width="1.2"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

### Code flow in `reader.js` (inside `#renderBookmarkStrip`)

```js
del.addEventListener('click', (e) => {
    e.stopPropagation()
    strip.remove()
    this.#bookmarkStrips.delete(id)
    window.parent.postMessage(
        { type: 'bookly:annotation-delete', id, cfiRange: cfi },
        '*'
    )
})
```

`page.tsx` already handles `bookly:annotation-delete` — it calls `deleteBookAnnotation(bookId, id)` and posts `bookly:remove-annotation` back to the iframe. The existing `#initAnnotationListener` handler for `bookly:remove-annotation` removes the highlight overlay. No additional `page.tsx` changes needed for delete.

### Edge case: deleting during drag

Add a guard so a drag `mousedown` that started on the strip body cannot accidentally trigger the trash icon click. The `e.target === del` check in the drag `mousedown` handler already handles this — drag only starts if the click target is the strip itself, not the `del` span.

---

## 11. Resume Position on Book Open

### Behaviour

| Condition | Resumes at |
|---|---|
| User has ≥ 1 bookmark | CFI of the most recently updated bookmark (`updated_at DESC`) |
| No bookmarks | `readingCfi` (last read position, existing behaviour) |
| Neither | Beginning of book (existing fallback) |

The annotations API already returns results sorted by `updated_at DESC`, so the first bookmark in the list is always the correct one — no extra sorting needed.

### Why this approach

The user most recently interacted with that bookmark (created it or dragged it to a new line), making it the strongest signal for "where they want to be." A book-order sort would require CFI comparison, which is non-trivial and adds complexity without meaningful UX benefit.

### Changes to `page.tsx`

**Problem to avoid:** annotations are currently fetched twice — once in the initial load (new, to determine CFI) and once in `handleIframeLoad` (existing, to send to the iframe for rendering). Cache them in a ref to make a single network request.

#### Add a cache ref

```ts
const cachedAnnotationsRef = useRef<import("@/lib/books/api").BookAnnotation[] | null>(null);
```

#### Expand the initial `Promise.all` to include annotations

```ts
void Promise.all([
  fetchBookReaderEntry(bookId),
  fetchBook(bookId),
  fetchBookAnnotations(bookId),          // ← add
])
  .then(([readerResult, bookResult, annotationsResult]) => {
    if (cancelled) return;

    // Cache for reuse in handleIframeLoad — avoids a second fetch
    cachedAnnotationsRef.current = annotationsResult.annotations;

    // Pick resume CFI: most recent bookmark > last read position > null
    const mostRecentBookmark = annotationsResult.annotations
      .find((a) => a.annotation_type === "bookmark");

    setReaderAssetUrl(readerResult.url);
    setInitialCfi(mostRecentBookmark?.cfi_range ?? bookResult.book.readingCfi ?? null);
  })
  .catch(/* existing error handler — unchanged */);
```

`fetchBookAnnotations` failing should not block the reader from opening. If it rejects, the `Promise.all` rejects and the existing error handler fires. To make it non-blocking, wrap it:

```ts
// Graceful fallback: annotations failure doesn't kill the reader
const safeAnnotations = fetchBookAnnotations(bookId).catch(() => ({ annotations: [] }));

void Promise.all([fetchBookReaderEntry(bookId), fetchBook(bookId), safeAnnotations])
  .then(([readerResult, bookResult, annotationsResult]) => { … })
```

#### Update `handleIframeLoad` to reuse cache

```ts
const handleIframeLoad = useCallback(async () => {
  if (!bookId) return;
  try {
    // Reuse cached annotations if available; only re-fetch if the ref was cleared
    const { annotations } = cachedAnnotationsRef.current !== null
      ? { annotations: cachedAnnotationsRef.current }
      : await fetchBookAnnotations(bookId);

    iframeRef.current?.contentWindow?.postMessage(
      { type: "bookly:load-annotations", annotations },
      "*"
    );
  } catch (err) {
    console.warn("[reader] Failed to load annotations:", err);
  }
}, [bookId]);
```

### No backend changes needed

This is a pure client-side ordering change. The existing `GET /api/books/[id]/annotations` already returns all annotations including bookmarks, sorted by `updated_at DESC`.

---

## 12. Implementation Order

1. `ContinuousScrollManager.getChapterWrapper(index)` getter
2. PATCH endpoint in `app/api/books/[id]/annotations/[annotationId]/route.ts`
3. `updateBookAnnotation` in `lib/books/api.ts`
4. `page.tsx`:
   - Add `cachedAnnotationsRef`
   - Expand `Promise.all` to fetch annotations, compute resume CFI (§11)
   - Update `bookly:bookmark-create` handler (add `yOffset`, relay `bookly:bookmark-saved`)
   - Add `bookly:bookmark-update` handler
   - Update `handleIframeLoad` to use cache
5. `reader.js`: add `#bookmarkStrips` map + `#deferredBookmarks`, add `#getInitialYOffset`, `#renderBookmarkStrip`, `#resolveChapterIndexFromCfi`, update click handler, update `#initAnnotationListener` to handle `bookmark-saved` and render bookmarks from `load-annotations`, flush deferred bookmarks on chapter visible
6. `reader.html`: add `.bookmark-strip` CSS
7. Smoke test:
   - Save bookmark → strip appears at viewport center → drag → refresh → strip at saved position → hover trash → deleted
   - Close book → reopen → resumes at bookmark position
   - Delete all bookmarks → reopen → resumes at last read position

---

## 13. Remaining Decisions



| Question | Answer needed before coding |
|---|---|
| `#chapterEls` property name for the wrapper div | Check `appendChapter()` in `ContinuousScrollManager` — confirm the Map value shape is `{ iframe, sentinel, wrapper, ro }` and `wrapper` is the `.cs-chapter` div |
| Paginated mode drag | Out of scope for this fix; fixed strip only |
| Bookmark colour picker | Later feature — dark blue `#1B3A6B` hardcoded for now |
| Touch drag (mobile) | Later feature — mouse events only for now |
