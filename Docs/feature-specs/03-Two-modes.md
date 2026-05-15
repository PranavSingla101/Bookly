# Feature Spec: Continuous Scroll — Two Layout Modes

_Last updated: 2026-05-16_

---

## Goal

Give users two visual layout options while reading in Continuous Scroll mode:

1. **Book mode** — content centred in a narrower column (~760 px) with a dark margin visible on both sides, giving the feeling of reading a physical page.
2. **Full mode** — content spans edge-to-edge with generous side padding, maximising reading area on wide screens.

A toggle button in the reader top bar lets users switch instantly. The choice is persisted across sessions.

---

## UI

### Toggle button

- Placed in `.reader-top-bar__end`, to the left of the bookmark button.
- `id="cs-view-mode-btn"` — hidden (`display:none`) unless Continuous Scroll mode is active; shown by adding class `cs-mode-visible`.
- Two SVG icons inside the button:
  - `#cs-icon-full` (expand arrows) — shown when the current mode is **book** (clicking switches to full).
  - `#cs-icon-book` (rectangle) — shown when the current mode is **full** (clicking switches to book).

### Visual difference

| | Book mode | Full mode |
|---|---|---|
| `#cs-chapters` max-width | 760 px | none |
| `#cs-chapters` margin | `0 auto` | `0` |
| `#cs-chapters` background | `#1a1a1c` | transparent |
| `#cs-outer` background | `#121214` (dark margin visible) | `#121214` (no margin gap) |
| body padding inside iframes | `1.5rem 2.5rem` | `1.5rem 2rem` |

---

## Implementation

### CSS (`reader.html`)

```css
/* Book mode: centred "page" with dark surround */
#cs-outer.cs-mode-book #cs-chapters {
    max-width: 760px;
    margin: 0 auto;
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.6);
    background: #1a1a1c;
    min-height: 100vh;
}

/* Full mode: edge-to-edge */
#cs-outer.cs-mode-full #cs-chapters {
    max-width: none;
    margin: 0;
    background: transparent;
}

/* Toggle button — hidden unless .cs-mode-visible is present */
#cs-view-mode-btn { display: none; }
#cs-view-mode-btn.cs-mode-visible { display: flex; }
```

### State (`reader.js`)

- `Reader.#csDisplayMode` — `'book' | 'full'`, defaults to `'book'`.
- Persisted to `localStorage` under key `bookly:csDisplayMode`.
- Applied via `Reader.#applyCsDisplayMode()`:
  - Adds/removes `.cs-mode-book` / `.cs-mode-full` on `#cs-outer`.
  - Swaps which icon is visible inside the toggle button.
- `Reader.#setCsDisplayMode(mode)` — called by button click; updates state, persists, applies, then calls `csManager.applyStyles()` to re-inject layout CSS into all loaded iframes and re-fit their heights.

### CSS inside iframes (`ContinuousScrollManager.styleGetter`)

The `styleGetter` closure captures `Reader.#csDisplayMode`:

```js
styleGetter: () => {
    const layoutCSS = this.#csDisplayMode === 'full'
        ? `body { max-width: none !important; padding: 1.5rem 2rem !important; }`
        : `body { padding: 1.5rem 2.5rem !important; }`
    return getCSS(this.style) + layoutCSS + `
        img, svg, video { max-width: 100% !important; height: auto !important; }
    `
},
```

`applyStyles()` re-injects this CSS on mode switch and triggers an `rAF`-based height re-fit so iframes resize correctly.

---

## Files Changed

| File | Change |
|------|--------|
| `packages/foliate-js/reader.html` | Added toggle button HTML; added `.cs-mode-book` / `.cs-mode-full` CSS rules |
| `packages/foliate-js/reader.js` | Added `#csDisplayMode` field; added `#setCsDisplayMode()`, `#applyCsDisplayMode()`; updated `styleGetter`; show/hide toggle button in `setReadingMode()` |
