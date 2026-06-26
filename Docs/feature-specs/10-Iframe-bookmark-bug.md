# 10 — Paginated Mode: Bookmark Strip Visible on Wrong Page

**Status:** Partially Fixed (see Bug 10.1 below)  
**Severity:** Medium  
**Files:**
- `packages/foliate-js/paginator.js` — `getRectPage`, `isRectOnCurrentPage`
- `packages/foliate-js/reader-bookmarks.js` — `#getBookmarkViewportRect`, `#positionPaginatorBookmarkStrip`

---

## 1. Symptom (Original)

When a bookmark is created on page 2 (or later) of a chapter in paginated mode, the bookmark strip appears on **every page** of that chapter — not just the page where it was created. Two strips are visible: one at the correct position on the bookmarked page, and a phantom on every other page.

---

## 2. Root Cause (Original)

### How the paginator lays out pages

The `foliate-paginator` custom element uses CSS multi-column layout inside a shadow DOM:

```
#top (grid)
  └── #container (overflow: hidden, scrolls via scrollLeft)
        └── View.#element (sized to expandedSize + size*2)
              └── View.#iframe (sized to expandedSize = pageCount × pageSize)
                    └── content document (column layout, documentElement width = pageSize)
```

Key dimensions (`paginator.js` lines 388–396):
- `pageSize` = `this.#size` = one column/page width (e.g. 700px)
- `pageCount` = `Math.ceil(contentSize / pageSize)` (e.g. 3 pages)
- `expandedSize` = `pageCount × pageSize` (e.g. 2100px)
- The **iframe** is set to `expandedSize` wide (2100px) — it spans ALL pages
- The **documentElement** inside the iframe is set to `pageSize` wide (700px) — this creates the CSS columns
- The `#container` has `overflow: hidden` and scrolls `scrollLeft` to show one page at a time

### The `#element` wrapper and its one-page padding

`View.#element` is set to `expandedSize + size * 2` (e.g. 2100 + 1400 = 3500px). The iframe (2100px) is **flex-centered** inside this element (`justifyContent: 'center'`), placing `size` (700px) of padding on each side. This means the iframe starts at offset `size` inside `#element`.

The paginator itself knows about this offset — its `#getVisibleRange()` uses `this.start - size` to compensate (line 989).

### What `getClientRects()` returns

Inside the iframe, `getClientRects()` on a DOM range returns coordinates relative to the iframe's own coordinate space. The iframe is `expandedSize` wide (all pages). So:

- Element on page 1: `rect.left ≈ 0–700`
- Element on page 2: `rect.left ≈ 700–1400`
- Element on page 3: `rect.left ≈ 1400–2100`

The CSS column layout lives inside the iframe's content document. The scrolling happens on the **outer** `#container` element (paginator shadow DOM), not inside the iframe. So `getClientRects()` returns layout-space coordinates, not scroll-adjusted.

### Why the old visibility check failed

The old check compared `rect.left` against `iframeRect.width` (2100px) — all pages passed. See original doc for full explanation.

---

## 3. Fix Applied (Bug 10)

Two methods added to `Paginator` class (`paginator.js`):

```js
getRectPage(rect) {
    return Math.floor(rect.left / this.size)
}
isRectOnCurrentPage(rect) {
    return this.getRectPage(rect) === this.page
}
```

The broken check in `#getBookmarkViewportRect` was replaced with:

```js
if (!renderer.isRectOnCurrentPage(rect)) return null

const pageStart = renderer.start
return {
    top: iframeRect.top + rect.top,
    right: iframeRect.left + (rect.right - pageStart),
    bottom: iframeRect.top + rect.bottom,
    left: iframeRect.left + (rect.left - pageStart),
    height: rect.height,
}
```

---

## Bug 10.1 — Bookmark Strip Still Glitchy After Fix

**Status:** Open  
**Severity:** Medium

### Symptom

The bookmark strip still behaves inconsistently in paginated mode:
- Strip doesn't always appear on the correct page
- Strip may appear at wrong vertical position
- Strip may not appear at all on some page navigations

### Root Cause: Double coordinate adjustment

The Bug 10 fix has a **coordinate mapping error**. It subtracts `renderer.start` (the scroll offset) from `rect.left` — but `iframeRect.left` (from `getBoundingClientRect()` on the `<iframe>` element) **already incorporates the scroll offset**.

Here's why:

#### How scrolling affects `iframeRect.left`

The DOM structure is:
```
#container (overflow: hidden, scrollLeft controls page)
  └── #element (width: expandedSize + size*2, flex-centers the iframe)
        └── iframe (width: expandedSize)
```

`#element` is `expandedSize + size*2` wide (e.g. 3500px). The iframe is flex-centered inside it, so the iframe starts at offset `size` (700px) from `#element`'s left edge.

When the container scrolls to show page N, `#container.scrollLeft = N * size`. This physically shifts `#element` (and the iframe inside it) to the left. `iframe.getBoundingClientRect()` returns the iframe's **visual position** on screen — which has already been shifted by scrollLeft.

Concrete example (3-page chapter, `size = 700`):

| Viewing | `scrollLeft` | `iframeRect.left` (approx) | Shift from page 1 |
|---------|-------------|----------------------------|-------------------|
| Page 1  | 0           | `containerLeft + 700`      | 0                 |
| Page 2  | 700         | `containerLeft + 0`        | -700              |
| Page 3  | 1400        | `containerLeft - 700`      | -1400             |

#### The double-subtraction

For a bookmark element on page 2, `rect.left ≈ 700` (layout-space inside iframe).

**On page 2** (`scrollLeft = 700`, `iframeRect.left ≈ containerLeft`):
```
Current code:
  left = iframeRect.left + (rect.left - pageStart)
       = containerLeft + (700 - 700)
       = containerLeft                    ← appears at left edge of container
```

But `iframeRect.left` already shifted left by 700 due to scrollLeft. The element at `rect.left = 700` inside the iframe is physically at `iframeRect.left + 700 = containerLeft + 700` on screen — which is exactly where it should be. The `- pageStart` cancels out a shift that was already handled by `getBoundingClientRect()`.

**Correct mapping** (without `- pageStart`):
```
  left = iframeRect.left + rect.left
       = containerLeft + 700              ← correct visual position
```

Wait — but if that's true, the _original_ code (`iframeRect.left + rect.left` without any adjustment) should have mapped coordinates correctly. The original bug was the _visibility check_ (wrong boundary), not the coordinate mapping.

#### The real problem: two interacting bugs

1. **Visibility check** (Bug 10, fixed): Comparing against `iframeRect.width` instead of per-page bounds → strips showed on all pages
2. **Coordinate mapping** (Bug 10.1, new): Subtracting `pageStart` double-corrects the scroll offset → strip positions are wrong

The `- pageStart` adjustment was based on the assumption that `getClientRects()` coordinates are independent of `#container.scrollLeft`. That assumption is **correct** — the coordinates ARE layout-space. But `iframeRect.left` from `getBoundingClientRect()` is NOT layout-space — it's viewport-space, which already accounts for the parent's scrollLeft. So the iframe's outer rect already "absorbed" the scroll, and the inner rect provides the per-page offset. Adding them together gives the correct viewport position without any additional adjustment.

### Proposed Fix

#### Step 1: Remove the `- pageStart` adjustment in `#getBookmarkViewportRect`

**Replace** (`reader-bookmarks.js`, `#getBookmarkViewportRect`):
```js
if (!renderer.isRectOnCurrentPage(rect)) return null

const pageStart = renderer.start
return {
    top: iframeRect.top + rect.top,
    right: iframeRect.left + (rect.right - pageStart),
    bottom: iframeRect.top + rect.bottom,
    left: iframeRect.left + (rect.left - pageStart),
    height: rect.height,
}
```

**With:**
```js
if (!renderer.isRectOnCurrentPage(rect)) return null

return {
    top: iframeRect.top + rect.top,
    right: iframeRect.left + rect.right,
    bottom: iframeRect.top + rect.bottom,
    left: iframeRect.left + rect.left,
    height: rect.height,
}
```

The `isRectOnCurrentPage` check is correct and should stay — it's the gate that hides the strip when viewing a different page. Only the coordinate mapping needs fixing.

#### Step 2: Fix the `rect.left > boundsW` check in `#positionPaginatorBookmarkStrip`

After restoring the original coordinate mapping, `rect.left` for a bookmark on page 2 will be large (e.g. `containerLeft + 700`). The downstream check in `#positionPaginatorBookmarkStrip`:

```js
if (rect.left > boundsW) {
    strip.style.display = 'none'
    return
}
```

This compares `rect.left` (a viewport-space X coordinate) against `boundsW` (the mount element's **width**). These are different things — one is a position, the other is a dimension. This check accidentally works on page 1 (small `rect.left`, small `boundsW`), but on page 2+ the rect position may exceed the width value.

However, since `isRectOnCurrentPage` already gates visibility, this check is now redundant for the "wrong page" case. The remaining purpose is to hide the strip if the bookmark rect is genuinely off-screen (e.g. during transitions). A correct bounds check would compare against `mountRect.right` (a position) instead of `mountRect.width`:

**Replace:**
```js
if (
    !rect ||
    rect.right < 0 ||
    rect.left > boundsW ||
    rect.bottom < 0 ||
    rect.top > boundsH
) {
    strip.style.display = 'none'
    return
}
```

**With:**
```js
if (
    !rect ||
    rect.right < (mountRect?.left ?? 0) ||
    rect.left > (mountRect?.right ?? window.innerWidth) ||
    rect.bottom < (mountRect?.top ?? 0) ||
    rect.top > (mountRect?.bottom ?? window.innerHeight)
) {
    strip.style.display = 'none'
    return
}
```

This compares viewport-space positions against viewport-space positions — which is the correct comparison.

#### Step 3: Fix `centerY` clamping

The `centerY` range check and clamping also use `boundsH` as if it's a position:

```js
if (centerY < -STRIP_H / 2 || centerY > boundsH + STRIP_H / 2)
```

`centerY` is `rect.top + rect.height / 2` — a viewport-space position. `boundsH` is `mountRect.height` — a dimension. If the mount element doesn't start at y=0, this comparison is wrong. Fix:

```js
const mountTop = mountRect?.top ?? 0
const mountBottom = mountRect?.bottom ?? window.innerHeight
if (centerY < mountTop - STRIP_H / 2 || centerY > mountBottom + STRIP_H / 2)
```

And the strip positioning:
```js
strip.style.top = Math.max(mountTop, Math.min(mountBottom - STRIP_H, centerY - STRIP_H / 2)) + 'px'
```

### Summary

| Issue | Bug 10 | Bug 10.1 |
|-------|--------|----------|
| **What** | Strip visible on wrong page | Strip at wrong position / missing |
| **Cause** | Visibility check used iframe width (all pages) | `- pageStart` double-subtracts scroll offset |
| **Fix** | `isRectOnCurrentPage()` gate | Remove `- pageStart`, fix position-vs-dimension comparisons |
