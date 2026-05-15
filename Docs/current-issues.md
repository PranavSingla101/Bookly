# Current Issues — Continuous Scroll

_Last updated: 2026-05-16_

---

## 1. Stale scroll-container reference on chapter navigation

**File:** `packages/foliate-js/reader.js` — `#attachContinuousContainerScroll` (~line 479)

`#continuousScrollContainer` caches the `#container` element from the paginator's shadow DOM. When Foliate navigates to a new chapter it may recreate the shadow-DOM tree, making the cached reference point to a detached/dead element. The `if (container === this.#continuousScrollContainer) return` guard then prevents re-attachment to the new container. Result: the scroll listener silently stops working after the first chapter transition.

---

## 2. Edge detection reads per-chapter metrics, not container scroll position

**File:** `packages/foliate-js/reader.js` — `#onContainerScrollEnd` (~line 522), `#tryChainContinuousScroll` (~line 326)

`r.start`, `r.end`, `r.viewSize` reflect the paginator's internal per-iframe scroll state for the currently loaded spine item — not the overall `container.scrollTop / scrollHeight`. In continuous mode the intent is to detect "user scrolled to the bottom of the page", but these values are derived from the wrong coordinate system, so edge detection can trigger at the wrong time or not at all.

---

## 3. Wheel events are blocked even when the scroll container is not found

**File:** `packages/foliate-js/reader.js` — `#onContinuousWheel` (~line 355)

`e.preventDefault()` is called unconditionally before the container lookup. If `#findPaginatorScrollContainer()` returns null (shadow DOM not ready, container detached, or wrong element ID), the scroll event is swallowed entirely — the page stops scrolling with no fallback. User sees a completely frozen scroll.

---

## 4. Touch scroll can double-navigate on chapter boundaries

**File:** `packages/foliate-js/reader.js` — `#onContinuousTouchEnd` (~line 394) + `#onContainerScrollEnd` (~line 522)

On a touch device, reaching the chapter boundary triggers **both** paths:
- `#onContinuousTouchEnd` → `#tryChainContinuousScroll` (100 ms timer)
- The container `scroll` event fires → `#onContainerScrollEnd` (120 ms debounce)

Both can call `view.next()` / `view.prev()` for the same gesture, skipping a chapter.

---

## 5. Duplicate listener setup during `open()`

**File:** `packages/foliate-js/reader.js` — `open()` method (~lines 924, 966, 1008–1009, 1113–1115)

`#updateContinuousScrollListeners()` and `#attachContinuousContainerScroll()` are called **four times** in a single `open()` execution:
1. Via `setReadingMode(initialMode)` at line 924 (before `this.view` exists — both calls are no-ops)
2. Via `setReadingMode(...)` at line 966
3. Explicitly at lines 1008–1009
4. Explicitly again at lines 1113–1115

The repeated calls are harmless due to deduplication guards, but they produce noise in the console and increase the chance of attaching listeners to the wrong shadow-DOM state if timing is off.

---

## 6. Reading mode is not persisted

**File:** `packages/foliate-js/reader.js` / `app/library/[id]/read/page.tsx`

Switching between Paginated / Scrolled / Continuous scroll in the UI dropdown calls `setReadingMode()` but does not write to `localStorage` or update the URL query params. On page refresh or book reopen the mode always resets to **Continuous scroll** (the hard-coded default at line 909).

---

## 7. Production debug `console.log` calls left in hot paths

**File:** `packages/foliate-js/reader.js` — lines 511–512, 529–534, 537, 543, 549, 555

`#attachContinuousContainerScroll` and `#onContainerScrollEnd` log on every scroll event (120 ms debounce means ~8 logs/sec while scrolling). This floods DevTools and adds measurable overhead on low-end devices.

---

## 8. `continuousScroll` URL param logic is inconsistent between host page and reader

**Files:** `app/library/[id]/read/page.tsx` lines 176–189 / `packages/foliate-js/reader.js` lines 906–922

The Next.js host page only forwards `continuousScroll` param values `"0"/"false"/"off"` and `"1"/"true"/"on"`, but the reader `open()` checks for the `mode` param first and ignores `continuousScroll` entirely when `mode` is present. There is no URL param that maps cleanly to just enabling the "continuous" mode — the host page never passes `mode=continuous` explicitly, relying on the default fallback. If a future caller passes `mode=scrolled` the continuous-scroll listeners still get attached because `setReadingMode` is never called with the correct value derived from that param combination.

---

## Summary Table

| # | Severity | Category | File |
|---|----------|----------|------|
| 1 | High | Broken scroll after ch. nav | reader.js |
| 2 | High | Wrong coordinate system | reader.js |
| 3 | High | Scroll frozen when container missing | reader.js |
| 4 | Medium | Double chapter skip on touch | reader.js |
| 5 | Low | Duplicate setup / noise | reader.js |
| 6 | Medium | UX — mode lost on refresh | reader.js / page.tsx |
| 7 | Low | Debug logs in prod | reader.js |
| 8 | Low | Param logic mismatch | page.tsx / reader.js |
