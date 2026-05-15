# Feature Spec: Continuous Scroll — Diagnosis & Fix

_Last updated: 2026-05-16_

---

## Goal

Make the reader's **Continuous Scroll** mode work correctly: the user scrolls down through a chapter and, on reaching the bottom, the next chapter loads seamlessly — no click, no explicit page turn.

---

## Root Cause (the one that mattered)

`foliate-paginator` uses `attachShadow({ mode: 'closed' })`.

From outside the custom element, `renderer.shadowRoot` is always `null`. The internal `#container` DOM element (the actual scrolling element, `overflow: auto`) is **completely unreachable**. Every attempt to call `r.shadowRoot.getElementById('container')` silently returned `null`, which meant:

- `container.scrollTop += deltaY` never executed — no scroll happened at all.
- `container.addEventListener('scroll', ...)` was never registered — no chapter transitions fired.

The entire continuous-scroll machinery was a no-op. Users could not scroll at all in continuous mode.

---

## Secondary Issues Found & Fixed

### 1. `view.next(distance)` doesn't navigate at chapter boundaries

`view.next(distance)` calls the paginator's internal `#scrollNext(distance)`, which only triggers a chapter navigation when `viewSize - end <= 2px`. If called with any positive distance while still >2px from the bottom, it scrolls that distance and returns without navigating.

**Fix:** Call `renderer.nextSection()` / `renderer.prevSection()` directly. These bypass `#scrollNext` and immediately load the adjacent spine item.

### 2. Double-wheel scroll (2× speed)

Scroll listeners were attached to both `doc` and `win` of each iframe with `{ capture: true }`. Both fire for the same event (window capture fires before document capture), so `scrollBy` was called twice per wheel tick.

**Fix:** Attach only to `doc` (document-level capture is sufficient).

### 3. Touch double-navigation

`#onContinuousTouchEnd` called `#tryChainContinuousScroll` unconditionally, while the container scroll listener (`#onContainerScrollEnd`) could also fire from the same gesture. Both could call `nextSection()` for one swipe.

**Fix:** `#onContinuousTouchEnd` only calls `#tryChainContinuousScroll` for short pages (content shorter than viewport), where no container scroll event fires naturally.

### 4. Clamped scrollTop at boundary never triggers navigation

When `scrollTop` is already at its maximum, `renderer.scrollBy(delta, 0)` is a no-op. The paginator fires no `scroll` event (nothing changed), so `#onContainerScrollEnd` never fires and chapter navigation never triggers.

**Fix:** After each `scrollBy` call, compare `r.start` before and after. If unchanged and not in cooldown, arm the navigation timer manually (80ms).

### 5. Duplicate listener setup in `open()`

`#updateContinuousScrollListeners()` + `#attachContinuousContainerScroll()` were called four times in one `open()` execution. Two of those calls happened before `this.view` existed (no-ops that added noise).

**Fix:** Removed the redundant early pair.

### 6. Reading mode not persisted

Switching mode via the dropdown reset to Continuous Scroll on every page refresh.

**Fix:** `setReadingMode()` writes to `localStorage` (`bookly:readingMode`). `open()` reads it as the fallback when no URL param is present.

### 7. Console.log spam in hot scroll paths

Debug logs in `#attachContinuousContainerScroll` and `#onContainerScrollEnd` fired ~8×/sec while scrolling.

**Fix:** Removed all debug logs from those paths.

---

## The Correct Architecture for Continuous Scroll

```
User wheel/touch inside EPUB iframe
        │
        │  (cross-frame events don't propagate natively)
        │
reader.js attaches listeners to `doc` from the `load` event
        │
        ▼
#onContinuousWheel / #onContinuousTouchMove
  └── renderer.scrollBy(deltaY, 0)
        │  (public method — accesses #container internally)
        ▼
paginator #container scrollTop changes
        │
        ▼
paginator fires 'scroll' on renderer element (public, not in shadow DOM)
        │
        ▼
#attachContinuousContainerScroll listener (debounced 120ms)
        │
        ▼
#onContainerScrollEnd
  ├── r.start / r.end / r.viewSize  (public getters)
  ├── viewSize - end <= 16px  →  renderer.nextSection()
  └── start <= 16px           →  renderer.prevSection()
```

### Key API facts about `foliate-paginator`

| Need | Wrong approach | Correct approach |
|------|---------------|-----------------|
| Scroll the container | `container.scrollTop += dy` (shadow inaccessible) | `renderer.scrollBy(dy, 0)` |
| Detect scroll events | `container.addEventListener('scroll', ...)` | `renderer.addEventListener('scroll', ...)` |
| Read scroll position | `container.scrollTop` | `r.start`, `r.end`, `r.viewSize` |
| Navigate to next chapter | `view.next(distance)` | `renderer.nextSection()` |
| Navigate to prev chapter | `view.prev(distance)` | `renderer.prevSection()` |

### `renderer.scrollBy(dx, dy)` argument order

In non-vertical (horizontal text) scrolled mode, the paginator maps `dx` → `scrollTop` (not `dy`). To scroll down, pass the delta as the **first** argument: `renderer.scrollBy(deltaY, 0)`.

### EPUB rendition metadata override

Some EPUBs declare `<meta name="rendition:flow" content="paginated"/>` in their OPF. Foliate respects this on `view.open()`. Re-apply the flow attribute after open by calling `setReadingMode` after `await view.open(book)` — which already happens in the `open()` method via `this.setReadingMode(this.#readingModeFromState())`.

---

## Files Changed

| File | Change |
|------|--------|
| `packages/foliate-js/reader.js` | Full rewrite of continuous-scroll machinery |

### Specific changes in `reader.js`

- `#onContinuousWheel` — replaced `container.scrollTop += deltaY` with `r.scrollBy(e.deltaY, 0)`; added clamped-boundary detection
- `#onContinuousTouchMove` — same replacement for touch
- `#attachContinuousContainerScroll` — now listens to `renderer.addEventListener('scroll', ...)` instead of shadow DOM container
- `#detachContinuousContainerScroll` — cleans up renderer listener via `#rendererScrollCleanup`
- `#updateContinuousScrollListeners` — simplified; shadow DOM iframe enumeration removed (was always null)
- `#onContainerScrollEnd` — uses `r.nextSection()` / `r.prevSection()` instead of `view.next(distance)`
- `#tryChainContinuousScroll` — same navigation fix for short-page touch path
- `#onContinuousTouchEnd` — only navigates for short pages; normal pages handled by container scroll
- `#attachContinuousScrollListenersToDoc` — removed duplicate `win` wheel listener
- `setReadingMode` — added `persist` flag; saves to `localStorage`
- `Reader.#savedMode` / `Reader.#saveMode` — static localStorage helpers
- `open()` — reads saved mode as fallback; removed duplicate listener-setup calls
- Removed `#continuousScrollContainer`, `#findPaginatorScrollContainer` (dead code)
- Removed all `console.log` from scroll hot paths
