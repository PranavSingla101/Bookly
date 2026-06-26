# 07 — Reader Modes UI Refactor

**Assumption:** This refactor is purely internal to `packages/foliate-js/`. No changes to `app/library/[id]/read/page.tsx`, the postMessage API, or the iframe embedding contract. Observable reader behavior is identical before and after.

---

## Context

`reader.js` is a 2,830-line monolith. All three reading modes (paginated, scrolled, continuous), annotations, bookmarks, progress sync, UI chrome, and settings live in one `Reader` class that queries 35+ DOM IDs scattered across `reader.html`. The `ContinuousScrollManager` class (lines 1–294) was already extracted and is the proven pattern to follow.

---

## Section 1 — Module Split

### Goal
Replace the single `Reader` class body with four focused modules and a thin orchestrator. Each module owns exactly one concern and is importable as a standard ES module (the package already uses `import` statements).

### File structure after refactor

```
packages/foliate-js/
  reader.js              ← orchestrator only (~300 lines)
  reader-continuous.js   ← ContinuousScrollManager (move from reader.js, no logic change)
  reader-paginated.js    ← new: paginated + scrolled mode (foliate-paginator surface)
  reader-annotations.js  ← new: highlights, selection popup, note dialog, highlights panel
  reader-bookmarks.js    ← new: bookmark strips, drag, CS deferral
  reader-toc.js          ← already exists ✓
  overlayer.js           ← already exists ✓
  reader-elements.js     ← new: all DOM references (see Section 2)
```

### `reader-continuous.js`
Move `ContinuousScrollManager` verbatim from lines 1–294 of the current `reader.js`. Export it as a named export. No logic changes.

```
Exports: ContinuousScrollManager
```

### `reader-paginated.js`
Owns everything that touches `FOLIATE-PAGINATOR` when not in continuous mode:

- `#applyPaginatorLayout(renderer, flowMode)` — sets `flow`, `max-inline-size`, `margin` attributes on the renderer element.
- `#applyPaginatorDisplayMode(renderer)` — overrides `max-inline-size` / `margin` for book vs. full display mode.
- `#updatePaginatorBookMode()` — adds/removes `.display-book-mode` on `#foliate-mount` and sets `--page-margin-width`.
- `#attachContinuousContainerScroll()` / `#detachContinuousContainerScroll()` — the renderer-level scroll listener that chains chapter-to-chapter navigation in scrolled mode.
- `#attachContinuousScrollListenersToDoc(doc)` / `#detachContinuousScrollListeners()` — per-iframe wheel/touch listeners for scrolled mode.
- `#onContinuousWheel`, `#onContinuousTouchStart`, `#onContinuousTouchMove`, `#onContinuousTouchEnd` — event handlers.
- `#tryChainContinuousScroll(dy, threshold)` — chapter-chaining logic.
- `#onContainerScrollEnd()` — fires when the renderer-level scroll reaches the boundary.

This module is initialized with a reference to the live `this.view` object and emits a small set of callbacks: `onChapterChain(direction)` (tells the orchestrator to call `renderer.nextSection()` / `renderer.prevSection()`).

```
Exports: PaginatedModeController
```

### `reader-annotations.js`
Owns everything that is not mode-specific:

- `HIGHLIGHT_COLORS` constant.
- `#selectionPopup` element: `#createSelectionPopup()`, `#showSelectionPopup(range, doc)`, `#hideSelectionPopup()`, `#showAnnotationInSelectionPopup(annotation, pos)`.
- `#attachSelectionHandlerToDoc(doc, index)`, `#handleSelectionChange(doc)`.
- `#registerAndRenderAnnotation(ann)` — stores in `#serverAnnotations`, delegates rendering to the active mode.
- `#initAnnotationViewListeners()` — `create-overlay`, `draw-annotation`, `show-annotation` listeners on the foliate view.
- `#initAnnotationListener()` — `window.message` listener for `bookly:load-annotations`, `bookly:annotation-saved`, `bookly:remove-annotation`.
- `#csRenderAnnotation(cfiRange, color)`, `#csRemoveAnnotation(cfiRange)`, `#scheduleCsHighlightRerender(index, delay)`, `#fitCsOverlayerSize(index)` — CS-specific annotation rendering.
- `#renderHighlightsPanel()`, `#createHighlightEntry(ann)`, `#addHighlightToPanel(ann)`, `#removeHighlightFromPanel(cfiRange)`, `#updateHighlightInPanel(cfiRange, color)`.
- `#createNoteDialog()` / note save flow.

This module is initialized with:
- A `getView()` callback (returns the current foliate-view instance).
- A `isContinuousMode()` callback (returns bool).
- A `getCsOverlayer(index)` callback (returns the per-chapter Overlayer for CS mode).
- A `postToParent(msg)` helper (wraps `window.parent.postMessage`).

```
Exports: AnnotationController
```

### `reader-bookmarks.js`
Owns everything in the current `#bookmarkStrips` and `#deferredBookmarks` subsystem:

- `#bookmarkStrips` Map, `#deferredBookmarks` array, `#pendingScrollChapter`.
- `#renderBookmarkStrip(id, yOffset, cfi, container)` — all three rendering modes (continuous / scrolled / paginated).
- `#positionPaginatorBookmarkStrip(strip, cfi)` — fixed-position tracking for paginated mode.
- `#getBookmarkViewportRect(cfi)` — CFI-to-viewport rect.
- `#getInitialYOffset(chapterWrapper)`.
- `#migrateBookmarkStrips(toContinuous)` / `#collectBookmarkData()` — mode-switch migration.
- `#applyPendingScroll(chapterIndex)` — fires the deferred scroll-to-resume.
- `#resolveChapterIndexFromCfi(cfi)`.

Initialized with `getView()`, `isContinuousMode()`, `getCsManager()`, and `postToParent(msg)`.

```
Exports: BookmarkController
```

### `reader.js` (orchestrator)
After the split, `reader.js` owns only:

- URL param parsing and the `open(file)` entry point.
- `Reader` class with: `setReadingMode(mode)`, `#readingModeFromState()`, `#syncReadingModeSelect()`, `#initLayoutDropdown()`, mode-switch state machine (`flowMode`, `continuousScroll`, `#csDisplayMode`).
- Instantiation and wiring of `ContinuousScrollManager`, `PaginatedModeController`, `AnnotationController`, `BookmarkController`.
- `#initContinuousScroll(book, switchTarget)` and `#restoreContinuousStart(index, target)` — remain here because they coordinate all four modules.
- Close button, keyboard handler, toast, progress sync, metadata display, book info dialog.
- The `open(book)` async method that configures the view, calls `setReadingMode`, restores CFI position, and fires `bookly:reader-ready`.

---

## Section 2 — DOM Element Registry

### Goal
Every DOM reference in `reader.js` (and its new modules) goes through a single `reader-elements.js` file. No module calls `document.getElementById` or `$('#id')` directly. A rename in `reader.html` requires one edit in `reader-elements.js` and nowhere else.

### `reader-elements.js`

Exports a single frozen `els` object populated at module load time. Each key maps to one element. If an element is not found at load time, the value is `null` — callers guard with optional chaining, not try/catch.

The complete set of IDs that must be registered, grouped by role:

**Chrome (top bar)**
- `readerTopBar` ← `#reader-top-bar`
- `sideBarButton` ← `#side-bar-button`
- `aaSettingsButton` ← `#aa-settings-button`
- `menuButton` ← `#menu-button`
- `layoutTrigger` ← `#reader-layout-trigger`
- `layoutTriggerValue` ← `#reader-layout-trigger-value`
- `layoutListbox` ← `#reader-layout-listbox`
- `layoutMode` ← `#reader-layout-mode` (hidden `<select>`)
- `layoutSelectWrap` ← `#reader-layout-select-wrap`
- `closeButton` ← `#close-button`
- `bookmarkButton` ← `#bookmark-button`
- `csViewModeBtn` ← `#cs-view-mode-btn`
- `csIconBook` ← `#cs-icon-book`
- `csIconFull` ← `#cs-icon-full`

**Reading surfaces**
- `foliatMount` ← `#foliate-mount`
- `csOuter` ← `#cs-outer`
- `csChapters` ← `#cs-chapters`
- `modeSwitchOverlay` ← `#reader-mode-switch-overlay`

**Sidebar**
- `sideBar` ← `#side-bar`
- `dimmingOverlay` ← `#dimming-overlay`
- `sideBarTitle` ← `#side-bar-title`
- `sideBarAuthor` ← `#side-bar-author`
- `sideBarCover` ← `#side-bar-cover`
- `sideBarInfo` ← `#side-bar-info`
- `tabToc` ← `#sidebar-tab-toc`
- `tabHighlights` ← `#sidebar-tab-highlights`
- `tocView` ← `#toc-view`
- `highlightsView` ← `#highlights-view`

**Dialogs**
- `bookInfoDialog` ← `#book-info-dialog`
- `bookInfoDialogClose` ← `#book-info-dialog-close`
- `bookInfoDialogBody` ← `#book-info-dialog-body`
- `noteInputDialog` ← `#note-input-dialog`
- `noteInputTextarea` ← `#note-input-textarea`

**Toast**
- `readerToast` ← `#reader-toast`

**Drop target (file open)**
- `dropTarget` ← `#drop-target`
- `fileInput` ← `#file-input`
- `fileButton` ← `#file-button`

### Constraint
Modules must import `els` and use `els.someKey` — never query the DOM directly. This means all five module files start with:
```js
import { els } from './reader-elements.js'
```

---

## Section 3 — CSS Organization in `reader.html`

### Goal
The single `<style>` block in `reader.html` is ~800 lines with no visible structure. Reading mode surface styles are mixed with chrome styles. Split into labeled CSS blocks (using comment banners) so a developer can find the styles for any subsystem in under 5 seconds.

### Required blocks (in order)

1. **`:root` design tokens** — CSS custom properties (`--reader-chrome`, `--reader-chrome-muted`, `--reader-overlay`, `--reader-sidebar-bg`, `--reader-sidebar-border`, `--reader-active-bg`, `--overlayer-highlight-opacity`, `--overlayer-highlight-blend-mode`).

2. **Base / reset** — `html`, `body`, `overflow: hidden`.

3. **Continuous scroll surface** — `#cs-outer`, `.cs-chapter`, `.cs-chapter iframe`, `.cs-chapter-divider`, `.cs-sentinel`, `#cs-outer.cs-mode-book #cs-chapters`, `#cs-outer.cs-mode-full #cs-chapters`. Everything that styles the stacked-iframe container.

4. **Paginated / scrolled surface** — `#foliate-mount`, `foliate-view`, `#foliate-mount.display-book-mode`, `--page-margin-width` usage. Everything that styles the foliate-paginator mounting point.

5. **Mode-switch overlay** — `#reader-mode-switch-overlay`, `.reader-mode-switch-loader`, `@keyframes reader-mode-switch-spin`.

6. **Top bar chrome** — `.reader-top-bar`, `.reader-top-bar__inner`, `.reader-top-bar__end`, `#side-bar-button`, `#menu-button`, `#close-button`, `#bookmark-button`, `#aa-settings-button`, button base styles.

7. **Layout mode dropdown** — `.reader-layout-select-wrap`, `.reader-layout-dropdown`, `.reader-layout-select-btn`, `.reader-layout-listbox`, `.reader-layout-option`, `.reader-layout-select-sr-only`.

8. **View mode button** — `#cs-view-mode-btn` and its `.cs-mode-visible` modifier.

9. **Sidebar** — `#dimming-overlay`, `#side-bar`, `.side-bar-header`, `#side-bar-cover`, `#side-bar-title`, `#side-bar-author`, `.side-bar-info-btn`, `.side-bar-tab`, `.side-bar-tab--active`.

10. **TOC panel** — `#toc-view`, `.toc-list`, `.toc-chapter-row`, `.toc-chapter-row--active`, `.toc-chapter-row__title`, `.toc-chapter-row__meta`, `.toc-section-heading`, `.toc-empty`.

11. **Highlights panel** — `#highlights-view`, `.highlight-entry`, `.highlight-entry__chip`, `.highlight-entry__body`, `.highlight-entry__text`, `.highlight-entry__note`, `.highlights-empty`.

12. **Book info dialog** — `#book-info-dialog`, `.book-info-dialog__header`, `.book-info-dialog__body`, `.book-info-dialog__close`.

13. **Font size menu** — `.menu-container`, `.menu`, `.menu li`, `.menu li[aria-checked="true"]`.

14. **Selection / annotation popup** — `.selection-popup`, `.selection-popup__colors`, `.selection-popup__color`, `.selection-popup__color--active`, `.selection-popup__delete`, `.selection-popup__btn`, `.selection-popup__divider`, `.selection-popup__action-el`.

15. **Note input dialog** — `#note-input-dialog`, `.note-dialog__header`, `#note-input-textarea`, `.note-dialog__actions`, `.note-dialog__btn`.

16. **Bookmark strip** — `.bookmark-strip` (base only; inline styles from JS handle mode-specific positioning — that constraint stays).

17. **Toast** — `#reader-toast`, `.reader-toast--visible`.

18. **Drop target / empty state** — `#drop-target`, `.icon`, `.empty-state-icon`, `#file-button`.

### Constraint
No CSS moves out of `reader.html` into separate `.css` files. The CSP in the `<meta>` tag permits only `'unsafe-inline'` for styles, and the iframe sandbox is `allow-same-origin allow-scripts` — an external stylesheet would require an additional `<link>` permitted origin, which would break the CSP. Keep everything in one `<style>` block; organize only by comments.

---

## Section 4 — postMessage Contract

### Goal
Document the complete message protocol as a stable API surface. No behavioral change — this section makes the implicit contract explicit so both sides can be edited independently.

### Outbound messages (reader iframe → Next.js parent)

| `type` | When sent | Payload fields |
|---|---|---|
| `bookly:reader-ready` | After `view.init()` completes and annotations are set up | _(none)_ |
| `bookly:progress` | On `relocate` event, debounced 1 s | `cfi: string`, `progress: number`, `updatedAt: string` |
| `bookly:close` | Close button click | `cfi: string\|null`, `progress: number`, `updatedAt: string`, `returnUrl: string` |
| `bookly:restore-failed` | CFI from URL param could not be resolved | _(none)_ |
| `bookly:annotation-create` | User confirms a new highlight or note | `cfiRange: string`, `annotationType: string`, `payload: object` |
| `bookly:annotation-update` | User changes highlight color on existing highlight | `id: string`, `payload: object` |
| `bookly:annotation-delete` | User deletes a highlight or bookmark | `id: string`, `cfiRange: string` |
| `bookly:bookmark-create` | User taps the bookmark button | `cfi: string`, `yOffset: number` |
| `bookly:bookmark-update` | Bookmark dragged to new y position | `id: string`, `payload: { yOffset: number }` |

### Inbound messages (Next.js parent → reader iframe)

| `type` | When sent | Payload fields | Effect |
|---|---|---|---|
| `bookly:load-annotations` | After `bookly:reader-ready` is received | `annotations: BookAnnotation[]` | Renders all highlights and bookmarks |
| `bookly:annotation-saved` | After server confirms a create | `cfiRange: string`, `annotation: BookAnnotation` | Registers the server-assigned ID; updates `annotationsByValue` |
| `bookly:bookmark-saved` | After server confirms bookmark create | `annotation: BookAnnotation` | Swaps temp ID for server ID in `#bookmarkStrips` |
| `bookly:remove-annotation` | After server confirms a delete | `cfiRange: string` | Removes the visual highlight from the active mode's overlayer |

### Constraint
The refactored modules must not add, remove, or rename any message type. `page.tsx` is not changed as part of this refactor.

---

## Section 5 — Reading Mode State Machine

### Goal
Document the mode-switching logic clearly so `reader-paginated.js` and the orchestrator can be written without referring to the original monolith.

### States

| Mode name | `flowMode` | `continuousScroll` | Active render surface |
|---|---|---|---|
| `paginated` | `'paginated'` | `false` | `#foliate-mount` (paginator, columnar) |
| `scrolled` | `'scroll'` | `false` | `#foliate-mount` (paginator, scroll) |
| `continuous` | `'scroll'` | `true` | `#cs-outer` (stacked iframes) |

### Persistence
Mode is persisted to `localStorage` under the key `'bookly:readingMode'`. Display sub-mode (book/full) is persisted under `'bookly:csDisplayMode'`. Both are read at load and applied before the book renders.

### Entry transitions

When entering **continuous** from paginated or scrolled:
1. Hide `#foliate-mount` (`visibility: hidden`), show `#cs-outer` (`display: block`).
2. If a book is loaded and `#csManager` is null, call `#getContinuousSwitchTarget()` to record the current location.
3. Call `#initContinuousScroll(book, switchTarget)`.
4. Do not destroy the foliate-view — it stays as a hidden "ghost view" for CFI generation.

When leaving **continuous**:
1. Capture `#csManager.currentChapterIndex` and all bookmark data.
2. Call `#csManager.destroy()`, clear `#csOverlayers`, clear highlight timers.
3. Navigate the ghost view to the captured chapter index.
4. Show `#foliate-mount`, hide `#cs-outer`.
5. Apply paginator layout and re-render bookmark strips as paginator-mode fixed overlays.

When switching between **paginated** and **scrolled** (no continuous involved):
1. Update `flowMode`, call `#applyPaginatorLayout(renderer, flowMode)`.
2. Call `#applyPaginatorDisplayMode(renderer)` and `#updatePaginatorBookMode()`.
3. Re-attach scroll listeners (`#updateContinuousScrollListeners`, `#attachContinuousContainerScroll`).

### Constraint
The display sub-mode toggle (book / full) applies to **all three** reading modes, not just continuous. The `#csDisplayMode` field name is misleading — it should be treated as a global display preference. Do not rename it in this refactor (would require DB migration of no benefit).

---

## Section 6 — `reader-elements.js` Load Timing

### Goal
Ensure that DOM queries in `reader-elements.js` do not run before the HTML is parsed.

### Rule
`reader-elements.js` must be imported from a `<script type="module">` tag placed **at the end of `<body>`** in `reader.html`, or the existing inline `<script type="module">` at the bottom of `reader.html` must remain the sole entry point. All five new modules are imported transitively through `reader.js` — they do not appear in additional `<script>` tags.

The `els` object must be populated synchronously at module evaluation time, which is guaranteed because ES module scripts run after HTML parsing completes.

---

## Check When Done

The following observable behaviors must work identically after the refactor. Verify manually:

- [x] Opening a book in the default mode (continuous) renders text and restores saved reading position.
- [x] Switching from continuous → paginated mid-book lands on the same chapter.
- [x] Switching from continuous → scrolled mid-book lands on the same chapter.
- [x] Switching from paginated → continuous mid-book lands on the same chapter.
- [x] Switching from scrolled → paginated and back does not lose position.
- [x] Reading mode selection persists across a full page reload (localStorage).
- [x] Font size changes (small / medium / large / extra large) apply in all three modes.
- [x] Book/full display mode toggle applies in all three modes and persists across reload.
- [x] Selecting text shows the highlight popup with four color swatches.
- [x] Creating a highlight in each of the three modes renders the colored overlay.
- [x] Clicking an existing highlight opens the edit popup with the correct color active.
- [x] Changing a highlight color updates the overlay and the highlights panel entry.
- [x] Deleting a highlight removes the overlay and the panel entry.
- [x] Adding a note saves and the note text appears in the annotation popup.
- [x] The highlights sidebar panel lists all highlights with correct colors and text.
- [x] Tapping the bookmark button creates a bookmark strip at the correct y-position.
- [x] Dragging a bookmark strip in continuous mode repositions it (fires `bookly:bookmark-update`).
- [x] Deleting a bookmark strip removes it and fires `bookly:annotation-delete`.
- [x] Bookmarks survive a mode switch (continuous bookmark strip becomes fixed paginator strip).
- [x] The TOC sidebar opens, lists chapters, and navigating to a chapter closes the sidebar.
- [x] The active TOC entry updates as the user reads.
- [x] The close button fires `bookly:close` with a valid CFI and navigates to `/library`.
- [x] Progress sync fires debounced on page turn (not on every scroll event).
- [x] Arrow-key navigation works in paginated mode; scroll-key navigation works in continuous mode.
- [x] Touch-to-peek the top bar works on mobile in all three modes.
- [x] The "Opening book…" overlay in `page.tsx` dismisses when `bookly:reader-ready` fires.
- [x] A bad saved CFI shows the restore-failed toast and opens the book from the beginning.
- [x] No `console.error` appears during a normal open → read → close flow.
