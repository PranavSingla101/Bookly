# UI Feature Detail Map

This file is the authoritative record of every interactive element, button, and UI component across Bookly. Its purpose is to prevent design drift: any time a new button is added, a color is changed, or a component is introduced, this file must be updated to reflect the exact location, colors, sizing, and behavior. This creates a single source of truth that lets AI agents and human contributors understand the full visual surface of the app without reading every source file. When implementing or modifying any UI element, cross-reference this document to stay consistent with the established design language.

---

## Page Map

| Page | Route | Component File |
|---|---|---|
| Landing | `/` | `app/page.tsx` |
| Sign In | `/sign-in` | `app/sign-in/[[...sign-in]]/page.tsx` |
| Sign Up | `/sign-up` | `app/sign-up/[[...sign-up]]/page.tsx` |
| Library | `/library` | `app/library/page.tsx` |
| Reader | `/library/[id]/read` | `app/library/[id]/read/page.tsx` |

---

## Landing Page (`/`)

**Shell class:** `.landing-shell`  
**Background:** Full-bleed hero image (`/Landing_Page_Background_Updated.png`) with warm/sepia radial vignette overlay.  
**Font — Headings:** Cormorant Garamond (`--font-landing-display`), weight 400/600/700, normal + italic  
**Font — Body/UI:** Nunito (`--font-landing-sans`), weight 500/600/700/800

### Primary CTA Button — "Start Reading Free"

- **Location:** Hero section, `app/page.tsx`
- **Class:** `landing-ctaPrimary rounded-full px-6 py-3 text-sm font-bold text-white`
- **Background:** CSS class `.landing-ctaPrimary` defined in `globals.css`, uses `--landing-button` (`#9B4A2B`) gradient
- **Hover:** `--landing-button-hover` (`#C4763A`)
- **Shape:** `rounded-full` (pill)
- **Text:** white, `font-bold`, `text-sm`
- **Icon:** `ArrowRight` (Lucide), `size-4`, trailing the label

### Secondary CTA Button — "Learn More"

- **Location:** Hero section, `app/page.tsx`
- **Class:** `landing-ctaSecondary rounded-full px-6 py-3 text-sm font-bold`
- **Background/border:** defined in `.landing-ctaSecondary` in `globals.css`; ghost style with `--landing-border` border (`rgba(155,74,43,0.28)`)
- **Shape:** `rounded-full` (pill)
- **Text:** `--landing-ink` (`#fff5e7`), `font-bold`

### How It Works — Step Cards

- **Location:** `app/page.tsx`, `howItWorksSteps` data array
- **Card background:** per-card warm color (`#fdeee3`, `#f5e6d4`, `#ecddd0`)
- **Icon container background:** per-card rust tones (`#9B4A2B`, `#7a4428`, `#5c3320`)
- **Shape:** `rounded-xl` card, `rounded-full` icon circle
- **Step label:** serif display font, muted `--text-muted` (`#8B6B57`)
- **Title:** `--text-dark` (`#2C1A0E`), display font
- **Body:** `--text-body` (`#5C3D2A`), sans font

### Feature Section Cards

- **Location:** `app/page.tsx`, `features` data array
- **Labels (badge):** `--brand-primary` (`#9B4A2B`) background, white text, `rounded-full`
- **Title:** `--text-dark` (`#2C1A0E`), display font, large weight
- **Body:** `--text-body` (`#5C3D2A`)
- **Illustration area:** custom inline SVG mock illustrations per feature

### Testimonial Cards

- **Location:** `app/page.tsx`, `testimonials` data array
- **Card:** soft cream background, `--landing-border` border, `rounded-xl`
- **Quote text:** `--text-body` (`#5C3D2A`), italic, display font
- **Avatar circle:** `--brand-primary` (`#9B4A2B`) background, white initials, `rounded-full`
- **Name:** `--text-dark`, sans font, `font-semibold`
- **Role:** `--text-muted` (`#8B6B57`), `text-xs`

### FAQ Accordion

- **Location:** `components/landing/FaqAccordion.tsx`
- **Container:** `rounded-xl`, `--landing-border` border
- **Trigger text:** `--text-dark`, display font
- **Chevron icon:** Lucide `ChevronDown`, `size-4`, rotates 180° when open
- **Content text:** `--text-body`, `text-sm`, `leading-relaxed`

### Pricing Section

- **Location:** `components/landing/PricingSection.tsx`
- **Plan card:** `rounded-2xl`, `--landing-border` border
- **CTA buttons:** follow Primary / Secondary CTA patterns above

---

## Auth Pages (`/sign-in`, `/sign-up`)

Both pages share the same visual shell. Sign-up mirrors sign-in with only the Clerk component and headline text differing.

**Shell class:** `.auth-page`  
**Background:** `/Landing_Page_Background_Updated.png` (fill, `object-cover`, scale 1.04) + radial dark vignette + warm tint overlay + amber radial glow  
**Font — Headings:** Cormorant Garamond (`--font-auth-display`)  
**Font — UI/body:** Nunito (`--font-auth-sans`)

### Glass Auth Card

- **Location:** `app/sign-in/[[...sign-in]]/page.tsx` / `app/sign-up/[[...sign-up]]/page.tsx`
- **Shape (sign-in):** `rounded-3xl` | **Shape (sign-up):** `rounded-2xl`
- **Background:** `rgba(16, 8, 3, 0.44)` — matches `.landing-panel` transparency so warm bg shows through
- **Backdrop:** `blur(22px) saturate(1.6) brightness(1.05)` — same as landing panel
- **Border:** `1px solid rgba(255, 210, 155, 0.14)` — subtle warm gold, same as landing panel
- **Shadow:** `inset 0 1px 0 rgba(255,220,170,0.10), 0 8px 40px rgba(8,4,1,0.32)`

### Rust Accent Bar (top of card)

- **Height:** `3px`
- **Background:** linear gradient: `#3d1608` → `#9B4A2B` → `#C4763A` → `#3d1608`
- **Width:** full card width, flush with card top

### Logo Avatar

- **Size:** `60×60px` (sign-in) / `42×42px` (sign-up), `rounded-full`
- **Border:** `1.5px solid rgba(155, 74, 43, 0.42)`
- **Shadow:** `0 0 0 4px rgba(155,74,43,0.08)`
- **Background:** `rgba(18, 9, 2, 0.75)`
- **Content:** `/Bookly_logo.png`

### Headline

- **Text (sign-in):** "Welcome back."
- **Text (sign-up):** "Start reading."
- **Subtitle (sign-in):** "Continue your reading journey."
- **Subtitle (sign-up):** "Your reading sanctuary starts here."
- **Font:** `--font-auth-display`, `clamp(2.6rem, 7vw, 3.4rem)`, weight 600
- **Color:** `#fdf0de`

### Clerk Form — Social Button (Google OAuth)

- **Background:** `rgba(253, 248, 240, 0.94)` (near-white — both pages)
- **Shape:** `border-radius: 2rem` (pill)
- **Text color:** `#1a0d06`, `font-weight: 700`, `0.93rem`
- **Shadow:** `0 2px 16px rgba(0,0,0,0.22)`
- **Padding:** `0.78rem 1.5rem`

### Clerk Form — Text Inputs

- **Background:** `rgba(255, 255, 255, 0.05)`
- **Border:** `1px solid rgba(155, 74, 43, 0.32)` — brand primary tint
- **Text color:** `#fdf0de`
- **Border radius:** `0.6rem`
- **Padding:** `0.65rem 0.9rem`

### Clerk Form — Labels

- **Color:** `rgba(255, 215, 165, 0.68)`, `0.82rem`, `font-weight: 600`

### Clerk Form — Primary Submit Button

- **Color:** `--colorPrimary: #9B4A2B` (matches `--brand-primary` / `--landing-button`)

### Clerk Form — Footer Link

- **Color:** `#9B4A2B`, underline, `font-weight: 700`

### Perks Row (bottom of sign-up card)

- **Layout:** `grid grid-cols-3`, same structure as sign-in stats row
- **Icons:** `BookOpen` (Cloud library), `PenLine` (Highlights & notes), `RefreshCw` (Progress sync)
- **Icon container:** `rgba(155, 74, 43, 0.12)` background, `40×40px`, `rounded-full`
- **Icon color:** `rgba(155, 74, 43, 0.85)`
- **Label text:** `#fdf0de`, `font-weight: 700`, `0.82rem`
- **Dividers:** `1px solid rgba(155,74,43,0.14)` between cells
- **Top border:** `1px solid rgba(155, 74, 43, 0.16)`

### Stats Row (bottom of sign-in card only)

- **Layout:** `grid grid-cols-3`, `rounded-full` icon containers
- **Icon container:** `rgba(155, 74, 43, 0.12)` background, `40×40px`
- **Icon color:** `rgba(155, 74, 43, 0.85)`
- **Value text:** `#fdf0de`, `font-weight: 800`, `0.88rem`
- **Label/sub text:** `rgba(255, 210, 155, 0.55)`, `0.74rem`
- **Dividers between cells:** `1px solid rgba(155,74,43,0.14)`
- **Top border of row:** `1px solid rgba(155, 74, 43, 0.16)`

### Back to Home Link

- **Location:** below the card
- **Class:** `.auth-back-link` (defined in `globals.css`)
- **Color:** muted warm tone, `text-sm`
- **Label:** "← Back to home"
- **Destination:** `/`

---

## Library Page (`/library`)

**File:** `app/library/page.tsx`  
**Background:** `var(--color-bg)` (`#f5f5f7` light / `#09090b` dark)  
**Text:** `var(--color-text-primary)`

### Navbar

**File:** `components/layout/navbar.tsx`  
**Position:** `fixed top-6`, horizontally centered (`left-1/2 -translate-x-1/2`)  
**Size:** `h-14`, `w-[90%] max-w-3xl`  
**Shape:** `rounded-full`  
**Background:** `var(--color-surface)` (solid) with `backdrop-blur-md`  
**Border:** `var(--color-border)`  
**Shadow:** `shadow-2xl`

#### Library Home Icon Button

- **Icon:** Lucide `Library`, `h-[1.125rem] w-[1.125rem]`, `strokeWidth={1.75}`
- **Container:** `h-9 w-9`, `rounded-full`
- **Color:** `var(--color-text-secondary)`
- **Hover:** `transition-colors` (inherits hover token)
- **Action:** navigates to `/library`

#### Search Input

- **Type:** `input[type="search"]`
- **Size:** `h-9`, `w-full`, `rounded-full`
- **Background:** `transparent` (inherits navbar pill surface — no nested box)
- **Text color:** `var(--color-input-text)`
- **Placeholder:** "Search library...", `var(--color-input-placeholder)` color
- **Left icon:** Lucide `Search`, `h-3.5 w-3.5`, `absolute left-3`, `var(--color-input-placeholder)`, `pointer-events-none`
- **Padding:** `pl-9 pr-3 py-1.5`
- **Focus:** `outline-none ring-0`
- **Keyboard shortcut:** pressing `/` (outside any input/textarea) focuses the field; `Escape` blurs it

#### Layout Toggle Button

- **Icon:** Lucide `LayoutGrid`, `h-[1.125rem] w-[1.125rem]`
- **Container:** `h-9 w-9`, `rounded-full`
- **Color:** `var(--color-text-secondary)`
- **Note:** currently visual-only (no connected state)

#### Settings Button (opens dropdown)

- **File:** `components/layout/user-settings-dropdown.tsx`
- **Icon:** Lucide `Settings`, `h-[1.125rem] w-[1.125rem]`, `strokeWidth={1.75}`
- **Container:** `h-9 w-9`, `rounded-full`
- **Color:** `var(--color-text-secondary)`
- **Action:** toggles `UserSettingsDropdown` open/closed

### User Settings Dropdown

**File:** `components/layout/user-settings-dropdown.tsx`  
**Position:** `absolute right-0 top-full mt-2`  
**Size:** `w-60`  
**Shape:** `rounded-xl`  
**Background:** `var(--color-surface)`  
**Border:** `var(--color-border)`  
**Shadow:** `shadow-xl`  
**Backdrop:** `backdrop-blur-md`  
**Dismiss:** click outside or `Escape` key

#### User Identity Header (inside dropdown)

- **Name:** `text-sm font-medium`, `var(--color-text-primary)`, truncated
- **Email:** `text-xs`, `var(--color-text-muted)`, truncated
- **Bottom border:** `var(--color-border)`
- **Padding:** `px-4 py-3`

#### Theme Toggle Button

- **Icon:** Lucide `Sun` (when dark mode active) or `Moon` (when light mode active), `h-4 w-4`
- **Label:** "Light mode" or "Dark mode"
- **Color:** `var(--color-text-secondary)`
- **Style:** `flex w-full items-center gap-3 px-4 py-2.5 text-sm`
- **Action:** calls `useThemeStore.toggleTheme()`

#### Divider (between theme and sign out)

- `borderTop: 1px solid var(--color-border)`

#### Sign Out Button

- **Icon:** Lucide `LogOut`, `h-4 w-4`
- **Label:** "Sign out"
- **Default color:** `text-red-400`
- **Hover:** `hover:bg-red-500/10 hover:text-red-300`
- **Style:** `flex w-full items-center gap-3 px-4 py-2.5 text-sm`
- **Action:** Clerk `signOut()`, then redirects to `/`

---

### Upload Error Banner

- **Location:** above book grid in `app/library/page.tsx`, `role="alert"`
- **Visible when:** `uploadError` is set
- **Style:** `rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200`
- **Content:** error message string

### Upload Progress Banner

- **Location:** above book grid in `app/library/page.tsx`, `aria-live="polite"`
- **Visible when:** `uploadPhase !== "idle"`
- **Cover preview thumbnail:** `h-14 w-10 rounded border object-cover`, `var(--color-border)` border, shown only when cover extraction is complete
- **Status text color:** `var(--color-text-secondary)`
- **Status labels:**
  - Extracting: "Extracting metadata and cover…"
  - Compressing: "Optimizing cover image…"
  - Uploading: "Uploading EPUB…"

#### Cancel Upload Button

- **Visible when:** `uploadPhase === "uploading"` only
- **Style:** `rounded-md border px-3 py-1.5 text-xs font-medium`
- **Background:** `var(--color-card)`
- **Border:** `var(--color-border)`
- **Text:** `var(--color-text-primary)`
- **Action:** aborts the in-flight upload fetch via `AbortController`

---

### Book Grid

- **Layout:** `grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
- **Max width:** `max-w-6xl`, `px-6 md:px-8`
- **Top padding:** `pt-36 md:pt-40` (clears fixed navbar)

---

### Book Card

**File:** `components/library/book-card.tsx`  
**Shape:** vertical flex column, no outer panel (transparent, inherits page bg)

#### Cover Link Area

- **Shape:** `aspect-[2/3]`, `rounded-xl`, `overflow-hidden`
- **Background (fallback):** `var(--color-card)`
- **Border:** `var(--color-border)`, `shadow-md`
- **Focus:** `focus-visible:ring-2 focus-visible:ring-offset-2`
- **Action:** navigates to `/library/[id]/read`

#### Cover Image

- **Sizing:** `h-full w-full object-cover`
- **On error:** falls back to placeholder

#### Cover Placeholder (no cover)

- **Background:** inherits `var(--color-card)` from parent
- **Icon:** custom book SVG, `h-7 w-7`, `opacity-40`, `var(--color-text-muted)`
- **Title text:** `text-[10px] font-medium leading-snug line-clamp-3`, `var(--color-text-secondary)`

#### Book Title (below cover)

- **Style:** `text-sm font-semibold leading-snug truncate`
- **Color:** `var(--color-text-primary)`

#### Progress Label

- **Style:** `text-xs tabular-nums`
- **Color:** `var(--color-text-secondary)`
- **Content:** formatted reading percent (e.g. "42%")

#### Book Settings Button (gear icon)

- **Icon:** Lucide `Settings`, `size-4`, `strokeWidth={1.75}`
- **Container:** `size-8`, `rounded-md`
- **Color:** `var(--color-text-secondary)`
- **Action:** opens `BookDetailsModal`; stops event propagation to prevent cover link from firing

---

### Add Book Card

**File:** `components/library/add-book-card.tsx`  
**Shape:** `aspect-[2/3]`, `rounded-xl`, `border-2 border-dashed`  
**Background:** `bg-transparent`  
**Border color:** `var(--color-card-alt-border)`  
**Icon:** Lucide `Plus`, `h-8 w-8`, `stroke-[1.5]`  
**Icon color:** `var(--color-text-muted)`  
**Disabled state:** `opacity-40 pointer-events-none` (during upload)  
**Action:** triggers hidden `<input type="file" accept=".epub">` click

---

### Book Details Modal

**File:** `components/library/book-details-modal.tsx`  
**Library:** Radix UI `Dialog`  
**Scrim:** `bg-black/75 backdrop-blur-[2px]`, `fixed inset-0 z-50`  
**Panel size:** `w-[min(100vw-1.5rem,520px)]`, `max-h-[min(90vh,720px)]`  
**Panel shape:** `rounded-2xl`  
**Panel background:** `bg-zinc-950`  
**Panel border:** `border-zinc-800` + `ring-1 ring-white/5`  
**Panel shadow:** `shadow-2xl`  
**Animation:** `animate-in/out fade + zoom` (Radix data attributes)

#### Modal Header

- **Title:** "Book Details", `text-base font-semibold tracking-tight text-zinc-100`
- **Bottom border:** `border-zinc-800/90`
- **Padding:** `px-12 py-4`

#### Close Button (top-right of header)

- **Icon:** Lucide `XIcon`, `size-5`
- **Container:** `size-9`, `rounded-full`
- **Default color:** `text-zinc-400`
- **Hover:** `hover:bg-zinc-800 hover:text-zinc-100`
- **Action:** closes the modal (`Dialog.Close`)

#### Cover Thumbnail (inside modal)

- **Size:** `h-36 w-24`, `rounded-lg`, `overflow-hidden`
- **Background:** `bg-zinc-900`, `ring-1 ring-white/10`
- **Fallback text:** "No cover", `text-[10px] text-zinc-500`

#### Book Title (display mode)

- **Style:** `text-lg font-semibold leading-snug text-zinc-50`

#### Author (display mode)

- **Style:** `text-sm text-zinc-400`
- **Fallback:** "Unknown author"

#### Edit Button (pencil icon)

- **Icon:** Lucide `PencilIcon`, `size-[18px]`
- **Container:** `size-10`, `rounded-lg`
- **Default color:** `text-zinc-400`
- **Hover:** `hover:bg-zinc-800 hover:text-zinc-100`
- **Action:** enters inline editing mode

#### Delete Button (trash icon)

- **Icon:** Lucide `Trash2Icon`, `size-[18px]`
- **Container:** `size-10`, `rounded-lg`
- **Default color:** `text-zinc-400`
- **Hover:** `hover:bg-red-950/60 hover:text-red-300`
- **Action:** `window.confirm()` prompt, then calls `onDelete(book.id)` and closes modal

#### Download Button (download icon)

- **Icon:** Lucide `DownloadIcon`, `size-[18px]`
- **Container:** `size-10`, `rounded-lg`, rendered as `<a>` tag
- **Default color:** `text-zinc-400`
- **Hover:** `hover:bg-zinc-800 hover:text-zinc-100`
- **Action:** `<a download>` to `/api/books/[id]/epub`

#### Edit Mode — Title Input

- **Style:** `h-9 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 text-zinc-100`
- **Placeholder:** "Title"

#### Edit Mode — Author Input

- **Style:** same as title input
- **Placeholder:** "Author"

#### Edit Mode — Cancel Button

- **Component:** `<Button size="sm" variant="secondary">`
- **Label:** "Cancel"
- **Action:** reverts draft fields and exits editing mode

#### Edit Mode — Save Button

- **Component:** `<Button size="sm">`
- **Label:** "Save" / "Saving…" (during async)
- **Action:** calls `updateBookMetadata` API and updates parent via `onBookUpdated`

#### Save Error Message

- **Style:** `text-xs text-red-400`, `role="alert"`

#### Metadata Accordion — "Metadata"

- **Library:** Radix UI `Accordion`
- **Container:** `rounded-xl border border-zinc-800/90 bg-zinc-900/40`
- **Trigger:** `text-sm font-medium text-zinc-200`, hover `bg-zinc-800/50`
- **Chevron:** Lucide `ChevronDownIcon`, `size-4 text-zinc-500`, rotates 180° when open
- **Fields:** Publisher, Published Date, Updated Date, Added Date, Language, Subjects, Format (EPUB), File Size, Identifier
- **Field label style:** `text-[11px] font-medium uppercase tracking-wide text-zinc-500`
- **Field value style:** `text-sm text-zinc-200`

#### Metadata Accordion — "Series"

- Same styling as Metadata accordion
- **Fields:** Series name, Series index

#### Metadata Accordion — "Description"

- Same styling as above
- **Content:** plain paragraph, `text-sm leading-relaxed text-zinc-400`

---

## Reader Page (`/library/[id]/read`)

**File:** `app/library/[id]/read/page.tsx`  
**Shell class:** `.book-reader-shell` (defined in `globals.css`)  
**Background:** `#0c0c0e` (reader-specific, not a design token)  
**Layout:** full-viewport fixed shell; Foliate iframe fills the center

### Reader Iframe

- **Class:** `.book-reader-frame`
- **`src`:** `/foliate-js/reader.html?url=...&return=...&cfi=...`
- **`allow`:** `fullscreen`
- **`loading`:** `eager`

### Opening / Restoring Overlay

- **Visible when:** `isOpeningAndRestoring === true`
- **Style:** `position: fixed inset-0 z-[99999]`
- **Background:** `#0d0a08` (solid dark, prevents flash of cover page)
- **Spinner:** `2.5rem` circle, `border: 3px solid #2c2118`, `borderTopColor: #b5703a`, CSS `spin-loader` animation `1s linear infinite`
- **Text:** "Opening book...", `#f2ede6`, `0.95rem`, `var(--font-sans)`, `letterSpacing: 0.02em`
- **Safety timeout:** auto-dismissed after 20 seconds

### Saving Progress Overlay

- **Visible when:** `isSavingAndClosing === true` (triggered by reader `bookly:close` postMessage)
- **Style:** same fixed full-screen overlay as Opening overlay
- **Background:** `#0d0a08`
- **Spinner:** same dimensions and color as opening spinner; animation `spin 1s linear infinite`
- **Text:** "Saving reading progress...", same color and font

### Restore Error Toast

- **Visible when:** `restoreError` is set (auto-clears after 5 seconds)
- **Position:** `fixed bottom-[1.5rem] left-1/2 -translate-x-1/2 z-[9999]`
- **Background:** `#27272a`
- **Text:** `#e4e4e7`, `0.82rem`
- **Shape:** `border-radius: 0.6rem`
- **Shadow:** `0 4px 20px rgba(0,0,0,0.5)`
- **`pointer-events: none`** (non-blocking)
- **Content:** "Reading progress could not be restored. Starting from the beginning."

### Error State (load failure)

- **Visible when:** `errorMessage` is set
- **Class:** `.reader-status` (centered flex column)
- **Error text:** `#a1a1aa`

#### Retry Button (error state)

- **Label:** "Retry"
- **Background:** `#3f3f46`
- **Text color:** `#e4e4e7`
- **Shape:** `border-radius: 0.5rem`
- **Padding:** `0.5rem 1.25rem`
- **Font size:** `0.875rem`
- **Action:** `window.location.reload()`

#### Back to Library Link (error state)

- **Label:** "← Back to Library"
- **Color:** `#71717a`
- **Font size:** `0.875rem`
- **Destination:** `/library`
