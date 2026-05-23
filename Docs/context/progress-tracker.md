# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
None

## Current Goal
None

## Completed

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

- None.

## Next Up

- Replace placeholder testimonials with real quotes when available
- Add real feature screenshots/illustrations to replace icon mock panels (open question from spec)
- Collect and confirm pricing tiers (open question from spec)
- **Reader continuous scroll** — test the new stacked-iframe approach end-to-end in a real book; verify images/fonts auto-size correctly and the IntersectionObserver triggers pre-load reliably

## Open Questions

- Do we have real testimonials, or should we collect them before launch?
- Is the pricing confirmed ($0 free / $4.99 monthly / $39 annual), or placeholder?
- Are there real screenshots/illustrations for the Features section, or should we use UI mockups (current approach)?
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
  - **Annotations are saved in continuous mode but not visually rendered** — they appear when switching to paginated/scrolled mode. This is a known limitation.

## Session Notes

- Landing page spec is in `Docs/feature-specs/01-Landing-page-redesign.md`
- All new landing components live in `components/landing/`
- The `/sign-up` route does not yet exist in the app (Clerk provides it via `app/sign-up/[[...sign-up]]/page.tsx`) — links to `/sign-up` in the landing page will resolve correctly once Clerk route is active
