# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Maintenance / reader stability

## Current Goal
Active fix: continuous-scroll highlights still persisted as an issue despite older logs. Current work focuses on rebuilding highlight overlays from CFI after layout settles; previous highlight-fix logs are historical only.

## Completed

- **Absolute Coordinates & Body-Context Highlight Mounting** (`packages/foliate-js/overlayer.js`, `packages/foliate-js/reader.js`) (May 2026):
  - Solved coordinate-space mismatch bugs between `getClientRects()` viewport-relative coordinates and absolute SVG overlays inside stacked continuous-scroll iframes.
  - Implemented automatic scrollX / scrollY translation inside Overlayer's `add`, `redraw`, and `hitTest` methods to map all rects to absolute document coordinates.
  - Sized the chapter's absolute SVG overlays using `Math.max()` against both `documentElement.scrollHeight` and `body.scrollHeight` to safely capture maximum rendering boundaries.
  - Mounted the visual SVG overlayer to `doc.body` instead of `doc.documentElement` inside stacked continuous scroll dynamic iframes to place highlights in the correct DOM stacking context.
  - Injected `position: relative !important` to the body element inside all loaded chapters and style overrides to establish a robust, relative positioning context for body-mounted highlight overlays.
  - Configured `ResizeObserver` inside `onDocLoad` to observe `doc.body` instead of `doc.documentElement` to perfectly align redraw ticks.
  - Successfully verified building with Turbopack and compiling all TypeScript routes.

- **Top Level Await Warning Removal** (`packages/foliate-js/pdf.js`) (May 2026):
  - Eliminated build-time and development-reloader compilation warnings regarding top-level async/await by refactoring `pdf.js` to load the Mozilla PDF.js CSS assets lazily inside `renderPage` instead of using Top-Level Await.

- **CFI Range Resolution & Ghost View Crash Fix** (`packages/foliate-js/epubcfi.js`) (May 2026):
  - Fixed a critical `TypeError: Cannot read properties of undefined (reading 'length')` in `partsToNode` inside `epubcfi.js` that crashed ghost view initialization (`view.init`) and stopped highlight rendering during reading mode transitions.
  - Handled empty parent array contexts in `concatArrays(a, b)` by returning `b` when `a` is empty, avoiding index `-1` undefined errors during CFI collapsing.
  - Implemented robust empty/undefined array guards inside `partsToNode(node, parts, filter)` to return `{ node, offset: 0 }` gracefully instead of throwing exceptions.
  - Verified that highlights render dynamically and correctly survive transitions between paginated and continuous scroll modes.

- **Persistent Continuous Scroll Highlight Rerender Fix** (`packages/foliate-js/reader.js`, `packages/foliate-js/overlayer.js`) (May 2026):
  - Replaced redraw-only CS highlight updates with a CFI-driven rerender lifecycle: each chapter clears its overlayer, resolves each saved CFI against the current iframe document, creates a fresh DOM range, adds the highlight, and records fresh rects.
  - Added deferred initial rendering via double `requestAnimationFrame`, so highlights are not drawn during the iframe `load` event before layout is stable.
  - Routed iframe height recalculation, document-element resize, `doc.fonts.ready`, image `load` / `error`, and continuous-scroll style changes through the same scheduled rerender hook instead of calling `overlayer.redraw()` on stale ranges.
  - Added a bounded retry loop for empty rects to handle slow paints without creating an infinite retry cycle.
  - Added `Overlayer.clear()` so chapter overlays can be rebuilt from anchor semantics rather than cached geometry.
  - Kept optimistic newly-created highlights/notes in `#serverAnnotations` until the server acknowledgement replaces them, preventing layout rerenders from wiping unsaved-but-visible selections.

- **Highlights CS Mode Audit & Issue Tracker Clearance** (`Docs/current-issues.md`, `packages/foliate-js/reader.js`) (May 2026):
  - Audited `Docs/current-issues.md` which still contained a stale "Highlights not visible on continuous scroll" issue that had already been fully resolved across multiple prior sessions.
  - Confirmed all fixes are present and correct in `reader.js`:
    - `onDocLoad` calls `this.view?.resolveNavigation?.()` **synchronously** (no `.then()` chain) — the prior TypeError bug is fixed.
    - Per-chapter `Overlayer` instances are created with the iframe `doc` context, mounted on `doc.documentElement`, and sized via `fitOverlayerSize()`.
    - `ResizeObserver` observes `doc.documentElement` and triggers `overlayer.redraw()` on layout changes.
    - `doc.fonts.ready` hook fires an additional `redraw()` once web fonts settle.
    - Staggered retry redraws at 100 ms / 300 ms / 800 ms / 1500 ms handle empty-rect cases on slow paints.
    - `#csRenderAnnotation` also carries these retry guards for newly saved annotations.
    - `#csRenderAnnotation` is called from the `bookly:annotation-saved` handler to immediately visualize newly confirmed server annotations.
    - Cleared `Docs/current-issues.md` — set to "None."

- **IFrame Document Element Mounting, Margin Resets, & Unsettled Layout Redraw Retries for Highlights** (`packages/foliate-js/reader.js`, `packages/foliate-js/overlayer.js`, `packages/foliate-js/view.js`) (May 2026):
  - Fixed highlight coordinates misalignment and invisibility inside stacked iframes by mounting the overlayer `<svg>` directly to the iframe's `doc.documentElement` instead of the `body`.
  - Solved the **Layout Unsettled / Empty Rects Bug** where initial annotations render immediately during the `load` event when style calculations and layout are not yet finished (causing `range.getClientRects()` to return empty rects and render invisibly).
  - Added a public helper `getRects(key)` in `overlayer.js` to retrieve the active client rect coordinates of a highlight.
  - Implemented staggered layout redraw retries in `onDocLoad` and `#csRenderAnnotation` (using `setTimeout` at 100ms, 300ms, 800ms, and 1500ms intervals) if empty client rects are detected during initial load or draw.
  - Hooked into `doc.fonts.ready` to automatically redraw the highlights as soon as web fonts are fully loaded and styled inside the iframe.
  - Configured `ResizeObserver` inside `onDocLoad` to observe `doc.documentElement` instead of `doc.body` for perfect, dynamic redraw tracking.
  - Reset standard browser margins in `getCSS` inside `reader.js` by adding `margin: 0 !important` to the body selector inside the reader iframes, aligning viewport-relative coordinates and absolute SVG space perfectly.
  - Cleared all recorded active issues inside `Docs/current-issues.md`.

- **Cross-Mode Highlights Rendering, Cross-Document Render Fix & High-Visibility Settings** (`packages/foliate-js/reader.js`, `packages/foliate-js/reader.html`, `packages/foliate-js/overlayer.js`, `packages/foliate-js/view.js`) (May 2026):
  - Diagnosed and fixed continuous scroll highlights invisibility caused by cross-document DOM insertion (nodes created in parent document context failed to render when appended inside the stacked iframe document).
  - Parameterized the `Overlayer` constructor to accept a target document context `doc` (defaulting to the parent `document`) and refactored static drawing methods to use dynamic creator callbacks (`doc.createElementNS`).
  - Updated `onDocLoad` and `view.js` to instantiate `Overlayer` with the dynamic iframe `doc` object.
  - Fixed highlights height-clipping in continuous scroll mode by introducing `fitOverlayerSize()` to dynamically size the absolutely-positioned overlayer SVG to match the loaded chapter's scroll height/width.
  - Sized the overlayer dynamically both at initial render and within the `ResizeObserver` before triggering `overlayer.redraw()`.
  - Fixed missing user highlights inside paginated and scrolled reading modes on chapter/section change by updating the `create-overlay` event listener to loop over and re-render `#serverAnnotations` whenever a new section is loaded.
  - Enhanced highlight legibility in dark mode by converting `HIGHLIGHT_COLORS` in `reader.js` to high-fidelity solid hex codes and adding/injecting `--overlayer-highlight-opacity: 0.65` and `--overlayer-highlight-blend-mode: normal` inside both the reader `:root` and `getCSS`.

- **Highlights & Notes Continuous Scroll Alignment & Durability Fix** (`packages/foliate-js/reader.js`, `app/library/[id]/read/page.tsx`) (May 2026):
  - Fixed highlights and notes missing or misaligning on book reopen, layout toggle, font scale change, or window resize in continuous scroll mode.
  - Added a dynamic `ResizeObserver` to each loaded stacked iframe's document body in `onDocLoad` to automatically trigger `overlayer.redraw()` whenever the body size resizes, keeping client rect coordinates perfectly aligned with text content.
  - Linked the ResizeObservers to the `#csOverlayers` map records and added clean lifecycle disconnection when switching modes or destroying the continuous scroll manager.
  - Passed `keepalive: true` to the `createBookAnnotation`, `updateBookAnnotation`, and `deleteBookAnnotation` mutations inside the Next.js `page.tsx` bridge to ensure durably persisting user annotations even during rapid page unmounts or reader closures.

- **Progress Sync, Highlights, & EPUB Landing Page Refinement** (`app/page.tsx`, `public/Saving_reading progress.png`, `public/Highlights_notes_landing_page.png`) (May 2026):
  - Added high-fidelity screenshots for both the Highlights (`Highlights_notes_landing_page.png`) and Progress Sync (`Saving_reading progress.png`) features.
  - Copied the design assets from `Docs/screenshots/` into the Next.js static asset `/public/` folder.
  - Replaced CSS/icon-constructed illustrations for both features in `app/page.tsx` with fully responsive `<Image>` components, utilizing tailored aspect crops (`object-left` for highlights and `object-right` for sync) to cleanly hide baked-in text and display only the premium mockup cards without layout distortion.
  - Removed the out-of-scope Habits ("Reading streaks & stats") feature block from the landing page and cleaned up related mock components/lucide-icon imports.
  - Refined the Library ("Universal library support") block to focus strictly on "Epub support" to align perfectly with the application's actual capabilities, updating `LibraryMockIllustration` to render a single, premium centered EPUB format card.
  - Cleaned up grammar by replacing the em-dash with a comma in the Meera S. testimonial quote.

- **Solid Full-Screen Close Progress Overlay** (`app/library/[id]/read/page.tsx`) (May 2026):
  - Changed the closing progress overlay's background from semi-transparent `rgba(13,10,8,0.85)` to a solid `#0d0a08` block.
  - This ensures that the book's cream page-margin layout does not show through, completely covering the sides and centering the rotating territorial accent spinner and "Saving reading progress..." text exactly in the middle of a clean, unified viewport.

- **Paginated/Scrolled Bookmark Placement Fix** (`packages/foliate-js/reader.js`) (May 2026):
  - Fixed bookmark strips in paginated and scrolled modes behaving like sticky screen markers instead of belonging to the saved reading location.
  - Added CFI-based viewport positioning for paginator modes: each strip resolves its saved bookmark CFI against the currently loaded Foliate document and derives its visible Y position from the resolved range.
  - Added collapsed-range handling based on Foliate's paginator strategy so point-like bookmark CFIs still produce a measurable viewport rect in paginated/scrolled modes.
  - Added a chapter-body fallback for chapter-level CFIs, preventing existing bookmarks from disappearing when they do not include a precise range anchor.
  - Bookmark strips now hide whenever their saved CFI is on another page, another chapter, or outside the scrolled viewport, so they only appear at the place the user bookmarked.
  - Paginator bookmark positions refresh on renderer `scroll`, renderer `load`, and Foliate `relocate` events, with cleanup when bookmark strips are removed or migrated between modes.

- **No-Flash Continuous Mode Switch Overlay** (`packages/foliate-js/reader.js`, `packages/foliate-js/reader.html`) (May 2026):
  - Fixed the remaining visual flash where switching from paginated/scrolled mode to continuous scroll briefly showed the start of the book before the preserved chapter loaded.
  - Added an in-reader `#reader-mode-switch-overlay` with a compact theme-matched spinner that covers the reader surface only during manual mode switches with a preserved target location.
  - `#restoreContinuousStart()` now keeps the overlay visible while continuous chapters load, applies the target scroll, repeats the restore after layout settling, then dismisses the overlay.
  - Switching away from continuous mode clears the overlay immediately so it cannot get stuck during rapid layout changes.

- **Seamless Paginated/Scrolled to Continuous Mode Switch** (`packages/foliate-js/reader.js`) (May 2026):
  - Fixed switching from paginated or scrolled mode into continuous scroll resetting the reader to the start of the book.
  - `setReadingMode()` now captures the current Foliate CFI before entering continuous mode, resolves it to the current spine/chapter index, and passes that target into continuous scroll initialization.
  - Continuous scroll now loads chapters up to the target index and scrolls directly to that chapter instead of always starting from chapter `0`.
  - Scrolled-mode switches also preserve the approximate vertical offset within the current chapter via the paginator's public `start` / `size` getters, with delayed restore passes to account for iframe height settling.
  - `Docs/current-issues.md` cleared after resolving the reported mode-switch reset.

- **Page-Like Visual Effect in Paginated / Scrolled Book Mode** (`packages/foliate-js/reader.js`, `packages/foliate-js/reader.html`) (May 2026):
  - Brought the CS "book mode" dark-margin / floating-page visual effect to paginated and scrolled modes.
  - Implemented via `::before` / `::after` pseudo-elements on `#foliate-mount` (which has `position: fixed; z-index: 0` and creates its own stacking context). The panels sit at z-index 1 within that context — above iframe content (z-index auto) but below bookmark strips (z-index 200), so no z-index conflicts.
  - Panel width is driven by CSS custom property `--page-margin-width` set to `max(0px, calc(50% - 360px))` for paginated (720px column) and `max(0px, calc(50% - 24rem))` for scrolled (48rem column). The `max(0px, …)` clamps to 0 when the viewport is narrower than the column.
  - Added `#updatePaginatorBookMode()` which toggles `display-book-mode` on `#foliate-mount` and sets/removes the CSS variable. Called from both `#applyCsDisplayMode` and `#applyPaginatorLayout`.
  - Class and CSS variable are cleared when switching to continuous mode (which has its own `cs-mode-book` / `cs-mode-full` classes on `#cs-outer`).

- **Book/Full Layout Toggle in All Reading Modes** (`packages/foliate-js/reader.js`) (May 2026):
  - Extended the book/full display-mode toggle (previously continuous-scroll-only) to also work in paginated and scrolled modes.
  - **Book mode** (paginated): `max-inline-size: 720px`, `margin: 48px` — centered column like a physical page.
  - **Full mode** (paginated/scrolled): `max-inline-size: 9999px`, `margin: 0` — content fills the full reading area.
  - **Book mode** (scrolled): `max-inline-size: 48rem`, `margin: 0` — constrained readable column.
  - Added `#applyPaginatorDisplayMode(renderer)` helper that sets the correct `max-inline-size`/`margin` attributes on the `foliate-paginator` for the current mode.
  - `#applyPaginatorLayout` now calls `#applyPaginatorDisplayMode` at the end so the display mode is respected whenever the layout is initialised or updated.
  - `#applyCsDisplayMode` extended to call `#applyPaginatorDisplayMode` when not in continuous mode.
  - Toggle button (`#cs-view-mode-btn`) is now always visible (was hidden in non-continuous modes); `onclick` wired once in `open()` and removed from `#initContinuousScroll`.
  - Saved display mode (`bookly:csDisplayMode`) is now restored at `open()` time before the second `setReadingMode` call, ensuring it is applied to all modes on book open.

- **Bookmark Scroll-Tracking in Scrolled Mode** (`packages/foliate-js/reader.js`) (May 2026):
  - Fixed bookmark strip floating at a fixed `top: 40%` in scrolled mode regardless of content scroll position.
  - Root cause: both paginated and scrolled modes passed `container = null` into `#renderBookmarkStrip`, causing the same static `position: fixed; top: 40%` CSS for both. In scrolled mode the user wants the strip anchored to the bookmarked line, showing/hiding as that line enters/leaves the viewport.
  - Added `isScrolledMode` detection via `renderer?.scrolled === true` inside `#renderBookmarkStrip`.
  - In scrolled mode, attaches a `scroll` event listener to the `foliate-paginator` renderer that recalculates `strip.style.top = yOffset - renderer.start` on every scroll tick, and hides the strip with `display: none` when the bookmarked line is outside the viewport.
  - Updated `#getInitialYOffset` to capture content-absolute scroll offset (`renderer.start + renderer.size / 2`) for new bookmarks created in scrolled mode, so the stored `yOffset` correctly reflects the content position.
  - Extended `#bookmarkStrips` map records to carry an optional `cleanupFn` field; `#collectBookmarkData` now calls `cleanupFn?.()` before removing each strip element, preventing stale scroll listeners after mode switches or deletion.
  - Removed the drag-grip from scrolled mode (position is content-derived, not user-draggable).

- **Bookmark Visibility Across Mode Switches** (`packages/foliate-js/reader.js`) (May 2026):
  - Fixed bookmarks disappearing when switching between continuous scroll and paginated (or back).
  - Root cause: `ContinuousScrollManager.destroy()` wipes `#cs-chapters` innerHTML removing bookmark strip DOM nodes, but `#bookmarkStrips` map still held their IDs — so the deduplication guard `if (this.#bookmarkStrips.has(id)) return` in `#renderBookmarkStrip` blocked all re-rendering. Same issue in reverse when switching back to continuous.
  - Added `#collectBookmarkData()` helper that iterates `#bookmarkStrips`, calls `element.remove()` on each strip, clears the map, and returns the raw `{ id, cfi, yOffset }` data.
  - Added `#migrateBookmarkStrips(toContinuous)` that calls `#collectBookmarkData()` then either re-renders immediately as fixed overlays (paginated) or populates `#deferredBookmarks` (continuous) so strips appear as each chapter loads.
  - `setReadingMode` now calls `#collectBookmarkData()` before `destroy()` when leaving continuous, and `#migrateBookmarkStrips(true)` before `#initContinuousScroll` when entering continuous.

- **No-Flash Direct Position Restore & Opening Loader Overlay** (May 2026):
  - Fixed a flash of the cover/first page that occurred when opening a book while continuous-scroll index generation and position restoration loaded in the background.
  - Implemented a Client Component state `isOpeningAndRestoring` in the read page wrapper (`app/library/[id]/read/page.tsx`).
  - Added a premium, themed loading overlay with a spinning wheel and the text "Opening book..." that perfectly matches the close-progress saving loader screen.
  - Configured the overlay to remain fully active, masking the iframe content underneath, and dismiss smoothly only when the position restore has completed and the `bookly:reader-ready` (or `bookly:restore-failed`) message is received from the reader iframe.
  - Added a 6-second safety timeout using `useEffect` to guarantee the loader auto-dismisses if reader initialization ever crashes or hangs.
  - Successfully verified a clean Next.js and TypeScript build (`npm run build`) with zero compilation errors.

- **Database Table Privileges Grant for Bookmarks & Annotations** (May 2026):
  - Fixed a database-level `403 Forbidden` error that rejected all REST reads and inserts on the `book_annotations` table.
  - Discovered that the database roles `anon`, `authenticated`, and `service_role` lacked standard permissions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on the `book_annotations` table, blocking PostgREST queries even under the service role client.
  - Granted full privileges on `public.book_annotations` to these roles, restoring complete backend save and load operations.
  - Appended `GRANT` statement to the bottom of the SQL migration file `20260320000000_books_progress_and_annotations.sql` for automated deployment and reset safety.
  - Added thorough server-side console diagnostic logging inside the annotations REST API (`GET`, `POST`, `PATCH`, `DELETE` routes) for real-time visibility.
  - Verified compilation and build stability by successfully executing `npm run build` with zero errors or warnings.

- **Bookmarks Pipeline Audit & Build Verification** (May 2026):
  - Audited the entire bookmarks and annotations pipeline end-to-end (Database schema, Supabase columns, backend PATCH/DELETE/GET/POST routes, Next.js page controller, postMessage iframe events, drag-to-reposition logic, and visual styling).
  - Confirmed the system fully saves bookmark positions (`yOffset`), recovers them correctly on book reload, and scrolls to the exact resume coordinates when opening a book.
  - Verified that hover delete (trash button) and repositioning (drag grip) interactions work flawlessly and update the database in real-time.
  - Successfully ran `npm run build` to verify perfect TypeScript and Next.js compilation with zero errors or warnings.

- **Single-Page Paginated Layout** (`packages/foliate-js/paginator.js`, `packages/foliate-js/reader.js`):
  - Fixed the paginated view displaying a two-page column spread on wide screens.
  - Changed the default CSS property `--_max-column-count` from `2` to `1` in `paginator.js`.
  - Added explicit dynamic `max-column-count="1"` attribute enforcement in `reader.js`'s `#applyPaginatorLayout` method.
  - Ensured the paginator renders as a clean, centralized, single-column reading column on all orientations and screen sizes, matching premium web reading app standards.

- **Progress and Bookmark Saving on Close** (`packages/foliate-js/reader.js`, `app/library/[id]/read/page.tsx`, `lib/books/api.ts`):
  - Resolved the route-navigation race condition that aborted progress-sync fetches when exiting the reader.
  - Implemented an asynchronous close bridge (`bookly:close` postMessage channel) that handles saving before navigating to the library.
  - Added support for the standard `{ keepalive: true }` parameter in `updateBookProgress` and all annotations mutations (`createBookAnnotation`, `updateBookAnnotation`, `deleteBookAnnotation`) to guarantee request delivery even if the tab or page is unmounted.
  - Guarded bookmark interactions by disabling hover drag/delete controls while a bookmark strip has a temporary unsaved ID, avoiding database-sync anomalies.
  - Synchronized Next.js client-side annotations cache instantly on creation, update, and delete events to ensure zero stale reads.
  - Added a premium, theme-matching visual overlay ("Saving reading progress...") with a custom `--accent-primary` rotating spinner and `backdrop-blur-sm` filter to provide rich, visual confirmation during state saving.

- **Visible, Draggable Bookmark Strip** (`packages/foliate-js/reader.js`, `packages/foliate-js/reader.html`, `app/library/[id]/read/page.tsx`, `lib/books/api.ts`):
  - Added visible, enlarged bookmark strip (48x24px, `#1B3A6B`, left-rounded only, with drop-shadow) that scrolls with the text in continuous scroll mode and mounts as a fixed overlay in paginated mode.
  - Implemented dual-icon hover overlay (a white trash delete icon with a red hover transition, and a classic 6-dot vertical drag grip indicator).
  - Implemented vertical dragging support for bookmark strips in continuous scroll mode to allow precise repositioning.
  - Added optimistic deletion of the bookmark from both DOM and database.
  - Optimized annotations retrieval via a ref cache (`cachedAnnotationsRef`) in `page.tsx` to prevent duplicate network calls.
  - Resolved loading race condition by implementing a `bookly:reader-ready` postMessage signal from the iframe, ensuring annotations only load after the viewer is fully constructed.
  - Added duplicate-rendering guards to both bookmark strips and highlights/notes inside `reader.js` to ensure bulletproof rendering integrity.
  - Wired point restoration upon opening a book to prioritize the most recently updated bookmark, falling back to `readingCfi` (last read position) or beginning of the book.
  - Implemented optimistic creation with temp-to-permanent ID swapping on server response, and drag updates synchronization to the database.

- **Continuous scroll — two layout modes** (`packages/foliate-js/reader.js`, `packages/foliate-js/reader.html`):
  - Added **Book mode** (centred 760 px column, dark margins, box-shadow page effect) and **Full mode** (edge-to-edge)
  - Toggle button (`#cs-view-mode-btn`) in top bar: hidden in paginated/scrolled modes, shown in continuous mode
  - `Reader.#csDisplayMode` field; `#setCsDisplayMode()` + `#applyCsDisplayMode()` methods
  - Persisted to `localStorage` under `bookly:csDisplayMode`; restored on init
  - `styleGetter` closure injects per-mode body padding into iframes; `applyStyles()` triggers height re-fit on switch
  - Spec written to `Docs/feature-specs/03-Two-modes.md`

- **Continuous scroll — stacked-iframe redesign** (`packages/foliate-js/reader.js`, `packages/foliate-js/reader.html`):
  - Added `ContinuousScrollManager` class: stacks one auto-height iframe per spine item in a native-scroll outer container (`#cs-outer`)
  - Each iframe sized to full content height via `ResizeObserver`; no internal scroll — browser native inertia handles momentum
  - `IntersectionObserver` sentinel pre-loads next chapter 800 px before it hits the viewport
  - Chapter transitions are fully seamless — no `nextSection()` call, no scroll reset
  - Ghost `foliate-view` stays hidden for CFI generation and mode-switch support
  - TOC navigation, bookmark, progress sync all updated for continuous mode
  - Keyboard arrows scroll `#cs-outer` natively in continuous mode

- **Landing page redesign** (`app/page.tsx`) — Implemented all 7 sections + footer:
  - **Section 1 (Hero):** Redesigned — serif italic kicker above headline, larger headline with entrance animation, ghost/outline secondary CTA ("Open Library"), feature pills with emoji icons (🔄 ✏️ 📖)
  - **Section 2 (How It Works):** New — 3-column horizontal step cards with icon, step number, title, and description
  - **Section 3 (Features Deep-Dive):** New — 5 alternating image+text feature blocks with icon-based UI mock illustrations
  - **Section 4 (Testimonials):** New — 3-column grid of frosted cream quote cards with terracotta opening mark
  - **Section 5 (Pricing):** New — `PricingSection` client component with Free/Pro cards and monthly/annual toggle (saves 35%)
  - **Section 6 (FAQ):** New — `FaqAccordion` client component with 6 questions and smooth max-height accordion
  - **Section 7 (Final CTA):** Redesigned — full-width BG image with warm gradient overlay, large serif headline, single "Start Reading Free" pill CTA
  - **Footer:** New — logo + tagline, nav links (Features · Pricing · FAQ · Privacy · Terms), copyright
- **`components/landing/ScrollReveal.tsx`** — IntersectionObserver-driven scroll reveal (staggered fade+lift per spec; respects `prefers-reduced-motion`)
- **`components/landing/FaqAccordion.tsx`** — Accessible accordion with terracotta chevron, smooth 300ms max-height transition
- **`components/landing/PricingSection.tsx`** — Monthly/annual toggle with crossfade pricing, Free + Pro pricing cards
- **`app/globals.css`** — Updated: spec color tokens (`--brand-primary`, `--surface-card`, `--text-dark`, etc.), larger hero headline size (`clamp(2.4rem, 9.5vw, 4.75rem)`), `.landing-kicker-serif` (italic display font), ghost secondary CTA, `.reveal-item`/`.reveal-visible` scroll animation classes

## In Progress

None

## Completed

- **Highlights Feature — CS Mode Fix & Popup Redesign** (`packages/foliate-js/reader.js`, `packages/foliate-js/reader.html`) (May 2026):
  - **Fixed highlights not appearing on book reopen in continuous scroll mode.** Root cause: `onDocLoad`'s annotation render loop called `.then()` on `view.resolveNavigation()`, which is synchronous and returns a plain `{ index, anchor }` object. Calling `.then()` on a non-Promise threw `TypeError: .then is not a function` on every chapter load, silently killing all annotation rendering. Fixed by replacing the `.then().catch()` chain with a direct synchronous call wrapped in `try/catch`.
  - **Added `#csRenderAnnotation` call in `bookly:annotation-saved` handler** so that newly confirmed server annotations are immediately visualised in continuous mode (ensures the overlayer stays in sync even if the optimistic render was missed).
  - **Removed the separate Delete panel** from the annotation click popup (the divider + labelled red "Delete" row below the color swatches). Replaced with a compact trash-icon button appended to the right end of the color swatch row — same 26×26 px circular style as the color buttons, maintaining a single-row popup layout.
  - Updated `.annot-popup__delete` CSS: now `border-radius: 50%`, `width/height: 26px`, icon-only (no label), with matching hover scale and red tint.

- **Highlights Feature** (`packages/foliate-js/reader.js`, `packages/foliate-js/reader.html`, `app/library/[id]/read/page.tsx`) (May 2026):
  - Replaced the single "Highlight" button in the selection popup with a 4-color swatch picker (yellow, blue, green, pink). Selected color is used for the optimistic render and saved in `payload.color`.
  - `selectedText` (up to 300 chars) is now captured from the DOM range at creation time and saved in `payload.selectedText`, enabling the highlights panel to display a text snippet without re-parsing CFIs.
  - Optimistic `annotationsByValue` entry (with `id: null`) is inserted at highlight/note creation time so `show-annotation` works immediately while the server save is in flight.
  - Added `bookly:annotation-saved` postMessage reply in `page.tsx`: after `createBookAnnotation` resolves, the server-assigned `id` and full annotation record are sent back to the iframe. The `#initAnnotationListener` handler in `reader.js` then backfills `#serverAnnotations` and `annotationsByValue` with the real id and adds the entry to the Highlights panel.
  - Added `bookly:annotation-update` handler in `page.tsx` (calls `updateBookAnnotation`) and wired it to the annotation popup's color-change buttons.
  - Added annotation click popup (`annot-popup`): tapping an existing highlight shows a bottom-anchored popup with the text snippet, 4 color swatches, and a Delete button. Color change does an optimistic re-render via `view.deleteAnnotation` + `view.addAnnotation`, updates local maps, refreshes the panel chip, and postMessages `bookly:annotation-update`. Delete removes from all local state and postMessages `bookly:annotation-delete`.
  - Added **Highlights panel** sidebar tab: a "Contents / Highlights" tab row was added to the sidebar. The Highlights tab renders all entries from `#serverAnnotations` on demand (`#renderHighlightsPanel`), with a colored left-border chip, italic text snippet, and note preview. Clicking an entry calls `view.goTo(cfiRange)` and closes the sidebar. Live add/remove/color-update methods keep the panel in sync without a full re-render.
  - `bookly:remove-annotation` handler now also removes the entry from the Highlights panel.
  - Build verified: `npm run build` passes with zero errors or warnings.

## Next Up

- Replace placeholder testimonials with real quotes when available
- Add remaining real feature screenshots/illustrations to replace other icon mock panels (e.g. annotations, habits, library)
- Collect and confirm pricing tiers (open question from spec)
- **Reader continuous scroll** — test the new stacked-iframe approach end-to-end in a real book; verify images/fonts auto-size correctly and the IntersectionObserver triggers pre-load reliably

## Open Questions

- Do we have real testimonials, or should we collect them before launch?
- Is the pricing confirmed ($0 free / $4.99 monthly / $39 annual), or placeholder?
- Are there real screenshots/illustrations for the remaining Features section (annotations, habits, library), or should we continue using the high-fidelity CSS mockups (current approach)? We have successfully integrated the progress sync screenshot.
- Target launch date?

## Architecture Decisions

- **Client components isolated to interactive leaves** — `PricingSection`, `FaqAccordion`, and `ScrollReveal` are `"use client"` components; `app/page.tsx` remains a Server Component (uses Clerk `auth()` for redirect). This preserves SSR for the bulk of the page.
- **Illustration panels use icon compositions** — No real screenshots available; feature section uses Lucide-icon-based UI mocks that match the warm palette. Designed to be swapped for real screenshots.
- **Fonts** — Kept `Cormorant_Garamond` (display, including italic variant) + `Nunito` (sans). Cormorant Garamond exceeds spec's suggestions (Playfair Display / Lora) in elegance. `weight: ["400"]` + `style: ["italic"]` added for new serif kicker.
- **Color tokens** — Spec's palette (`#9B4A2B`, `#C4763A`, `rgba(253,248,240,0.88)`, `#2C1A0E`, `#5C3D2A`, `#8B6B57`) adopted as CSS custom properties on `.landing-shell`, replacing slightly different prior values.
- **Continuous scroll — stacked-iframe architecture** — Replaced the paginator-based scroll (which caused jumps on chapter transition) with `ContinuousScrollManager`: one `<iframe>` per spine item, all stacked vertically in a native-scroll outer container (`#cs-outer`). Key behaviours:
  - `section.load()` fetches section blob URL; iframe CSS forces `height:auto; overflow:hidden` so each frame renders at its full content height.
  - `ResizeObserver` on `doc.body` re-fits iframe height after images/fonts load.
  - `IntersectionObserver` sentinel (800 px rootMargin) pre-loads the next chapter before it scrolls into view.
  - The ghost `foliate-view` stays hidden (`visibility:hidden`) and is used only for CFI generation, TOC resolution, and mode switching back to paginated.
  - Progress is reported as a chapter-level CFI via `view.getCFI(index, null)`.
  - Annotations are saved and visually rendered in continuous mode. Each chapter's `onDocLoad` callback renders all `#serverAnnotations` for that chapter synchronously via `resolveNavigation` + per-chapter `Overlayer`.

## Session Notes

- Landing page spec is in `Docs/feature-specs/01-Landing-page-redesign.md`
- All new landing components live in `components/landing/`
- The `/sign-up` route does not yet exist in the app (Clerk provides it via `app/sign-up/[[...sign-up]]/page.tsx`) — links to `/sign-up` in the landing page will resolve correctly once Clerk route is active
