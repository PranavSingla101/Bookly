# Highlights Feature Spec

## What's Already There (Don't Rebuild)

The foundation is largely complete:

- **`reader.js`** already has a selection popup with Highlight / Note / Copy buttons
- **`Overlayer`** already draws SVG highlight rectangles via `Overlayer.highlight`
- **`HIGHLIGHT_COLORS`** defines 4 colors: yellow, blue, green, pink
- **`#serverAnnotations` Map** stores and de-dupes server-synced highlights
- **`#registerAndRenderAnnotation(ann)`** registers + renders a highlight from a server record
- **`bookly:load-annotations`** already loads all non-bookmark annotations and renders them
- **`bookly:annotation-create`** postMessage is already sent when user highlights
- **`book_annotations` table** already exists in Supabase with `annotation_type`, `cfi_range`, `payload` (JSONB)
- **API routes** `/api/books/[id]/annotations` (GET/POST) and `/api/books/[id]/annotations/[annotationId]` (PATCH/DELETE) already exist

---

## What's Missing (The Actual Work)

### 1. Color Picker in Selection Popup (`reader.js`)

Right now "Highlight" always saves `color: 'yellow'`. Need to:
- Replace the single Highlight button with a 4-swatch color picker row
- When user taps a color swatch → optimistic render with that color + `postMessage` with `annotationType: 'highlight'`, `payload: { color: '<chosen>' }`

### 2. Annotation Click → Edit/Delete Popup (`reader.js`)

Right now the `show-annotation` event fires on tap but the handler only reads `annotation.note`. Need to:
- Build a small popup on `show-annotation` that shows: selected text snippet, color swatches to change color, and a Delete button
- On color change → `postMessage` `bookly:annotation-update` with new `payload.color`
- On delete → `postMessage` `bookly:annotation-delete` with `id` + `cfiRange`

### 3. Highlights Panel — Sidebar Tab (`reader.js`)

A sidebar tab listing all highlights for the book:
- Read from `#serverAnnotations` Map (already populated from `bookly:load-annotations`)
- Each entry shows: text snippet, color chip, chapter/location, click to navigate
- Navigate via `this.view.goTo(cfiRange)` (existing Foliate API)
- Add/remove entries live as annotations are created/deleted in the same session

### 4. Color Change postMessage Handler (`page.tsx`)

`page.tsx` already handles `bookly:annotation-delete` and `bookly:bookmark-update`. Need to add:
- Handler for `bookly:annotation-update` → calls `updateBookAnnotation(bookId, id, newPayload)` → updates `#serverAnnotations` in `reader.js`

### 5. `bookly:annotation-saved` Reply Back to Iframe (`page.tsx`)

Currently `annotation-create` is fire-and-forget. The iframe does an optimistic render but never gets back the server-assigned `id`. Without the `id`, an annotation cannot be updated or deleted. Fix:
- After `createBookAnnotation` resolves → `postMessage` back `{ type: 'bookly:annotation-saved', cfiRange, annotation: result.annotation }`
- In `reader.js` → on `bookly:annotation-saved` → update the `#serverAnnotations` entry with the real `id`

---

## DB Schema — No Migration Needed

The `book_annotations` table already supports everything:

| column | type | usage for highlights |
|---|---|---|
| `id` | uuid | identify for update/delete |
| `book_id` | uuid | scoping |
| `profile_id` | text | auth isolation |
| `cfi_range` | text | the selected range CFI |
| `annotation_type` | text | `'highlight'` or `'note'` |
| `payload` | jsonb | `{ color: 'yellow', note?: '...', selectedText?: '...' }` |
| `updated_at` | timestamp | ordering |

The only field worth adding to `payload` is **`selectedText`** — the raw string of highlighted text, needed to display it in the Highlights Panel without re-parsing CFIs. This is a payload-level addition, not a schema migration.

---

## Execution Order

1. **`page.tsx`** — Add `bookly:annotation-saved` reply + `bookly:annotation-update` handler
2. **`reader.js`** — Add `bookly:annotation-saved` listener to backfill real `id` into `#serverAnnotations`
3. **`reader.js`** — Replace Highlight button with color swatch picker; include `selectedText` in payload
4. **`reader.js`** — Add annotation click popup (color change + delete)
5. **`reader.js`** — Add Highlights panel tab to the sidebar

Everything routes through the existing `postMessage` bridge and `book_annotations` table — no new API routes, no schema migrations.
