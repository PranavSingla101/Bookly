# UI Context

## Theme

Two modes: light and dark, toggled via `useThemeStore`. The `.dark` class is applied
to `<html>` by `ThemeProvider`. The design language is a clean, neutral reading
environment — zinc-based greys in dark mode, soft off-whites in light mode.

The landing page has its own distinct warm/sepia aesthetic, scoped inside
`.landing-shell` in `globals.css`.

---

## App Color Tokens

All app components must use these CSS custom properties — no hardcoded hex values.
Defined in `:root` (light) and `.dark` in `globals.css`.

| Token                     | Light value            | Dark value                    | Role                          |
| ------------------------- | ---------------------- | ----------------------------- | ----------------------------- |
| `--color-bg`              | `#f5f5f7`              | `#09090b`                     | Page background               |
| `--color-surface`         | `#ffffff`              | `#18181b`                     | Navbar, dropdowns, panels     |
| `--color-card`            | `#e8e8ec`              | `#1c1c20`                     | Book cards, elevated tiles    |
| `--color-card-alt`        | `#eaeaee`              | `#1c1c20`                     | Add-book card, secondary tiles|
| `--color-card-alt-border` | `#d0d0d4`              | `rgba(255,255,255,0.08)`      | Add-book card border          |
| `--color-text-primary`    | `#1a1a1a`              | `#f4f4f5`                     | Body copy, titles             |
| `--color-text-secondary`  | `#6b6b6b`              | `#a1a1aa`                     | Labels, metadata, icons       |
| `--color-text-muted`      | `#9a9a9a`              | `#71717a`                     | Placeholders, empty states    |
| `--color-border`          | `#e0e0e0`              | `rgba(255,255,255,0.10)`      | All borders and dividers      |
| `--color-separator`       | `#d4d4d4`              | `#3f3f46`                     | Horizontal rule dividers      |
| `--color-hover`           | `rgba(0,0,0,0.04)`     | `rgba(255,255,255,0.06)`      | Hover overlay on interactive  |
| `--color-input-bg`        | `rgba(0,0,0,0.04)`     | `rgba(255,255,255,0.05)`      | Search / input background     |
| `--color-input-text`      | `#1a1a1a`              | `#f4f4f5`                     | Input text                    |
| `--color-input-placeholder`| `#8a8a8a`             | `#71717a`                     | Input placeholder             |

Usage in TSX:
```tsx
style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
style={{ borderColor: 'var(--color-border)' }}
```

---

## Landing Page Color Tokens

Scoped inside `.landing-shell` in `globals.css`. Only used by landing page components.
Do not use these tokens outside of `app/page.tsx` and `components/landing/`.

| Token                   | Value                        | Role                         |
| ----------------------- | ---------------------------- | ---------------------------- |
| `--landing-button`      | `#9B4A2B`                    | Primary CTA button           |
| `--landing-button-hover`| `#C4763A`                    | Primary CTA hover            |
| `--landing-ink`         | `#fff5e7`                    | Hero text on dark background |
| `--landing-border`      | `rgba(155,74,43,0.28)`       | Landing section borders      |
| `--brand-primary`       | `#9B4A2B`                    | Brand accent (rust/terracotta)|
| `--brand-warm`          | `#C4763A`                    | Brand warm accent            |
| `--text-dark`           | `#2C1A0E`                    | Dark body text on cream bg   |
| `--text-body`           | `#5C3D2A`                    | Body copy on cream bg        |
| `--text-muted`          | `#8B6B57`                    | Muted copy on cream bg       |

> **Note:** Landing page TSX currently uses some of these as hardcoded Tailwind values
> (e.g. `text-[#2C1A0E]`). When editing landing components, prefer
> `text-[var(--text-dark)]` to reference the token.

---

## Typography

| Role             | Font               | Variable                  |
| ---------------- | ------------------ | ------------------------- |
| App UI           | Geist Sans         | `--font-sans`             |
| Code / mono      | Geist Mono         | `--font-mono`             |
| Landing headings | Playfair / serif   | `--font-landing-display`  |
| Landing body     | Figtree / sans     | `--font-landing-sans`     |

Fonts are loaded via `next/font` in `app/layout.tsx` (app fonts) and `app/page.tsx`
(landing fonts). Apply `--font-landing-display` and `--font-landing-sans` only inside
`.landing-shell`.

---

## Border Radius

| Context             | Class         |
| ------------------- | ------------- |
| Inline / small UI   | `rounded-lg`  |
| Cards / panels      | `rounded-xl`  |
| Modals / overlays   | `rounded-2xl` |
| Pills / badges      | `rounded-full`|

---

## Component Recipes

Use these exact patterns when building new components. Do not invent new patterns —
extend these instead.

### Primary Button (app)
```tsx
<button className="rounded-lg bg-[var(--color-card)] border border-[var(--color-border)]
  px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]
  hover:bg-[var(--color-hover)] transition-colors">
  Label
</button>
```

### Primary CTA Button (landing page only)
```tsx
<Button className="landing-ctaPrimary rounded-full px-6 py-3 text-sm font-bold
  text-white">
  Get Started
</Button>
```
Styles are defined in `.landing-ctaPrimary` in `globals.css` — uses `--landing-button`
gradient. Do not inline the gradient.

### Secondary CTA Button (landing page only)
```tsx
<Button className="landing-ctaSecondary rounded-full px-6 py-3 text-sm font-bold">
  Learn More
</Button>
```

### Card
```tsx
<div className="rounded-xl border"
  style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
```

### Input / Search
```tsx
<input className="rounded-lg px-3 py-2 text-sm outline-none"
  style={{
    background: 'transparent',   // navbar search: transparent to blend into pill
    color: 'var(--color-input-text)',
    borderColor: 'var(--color-border)',
  }} />
```

### Divider
```tsx
<div style={{ borderTop: '1px solid var(--color-separator)' }} />
```

### Muted label / metadata
```tsx
<span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
```

---

## Component Inventory

For a complete map of every button, icon, input, modal, and overlay across all pages
— including exact colors, sizing, hover states, and behavior — see:

**[`Docs/context/ui-feature-detail.md`](ui-feature-detail.md)**

Update that file whenever a new UI element is added or an existing one is modified.

---

## Icons

Lucide React. Stroke-based only. Color inherits from `currentColor` — never hardcode
fill or stroke color directly.

| Context                        | Size class  |
| ------------------------------ | ----------- |
| Inline / within text           | `size-4`    |
| Buttons and controls           | `size-5`    |
| Nav-level / prominent actions  | `size-6`    |

---

## Layout Patterns

- **Library page:** Fixed top navbar (`h-14`, `--color-surface` bg, `--color-border`
  bottom border). Full-width responsive book grid below (`grid-cols-2` → `grid-cols-5`).
- **Book card:** `rounded-xl` cover image, transparent metadata strip below. Cover
  placeholder uses `--color-card` bg.
- **Navbar:** `position: fixed`, `backdrop-blur`, `color-mix` for semi-transparent
  surface. Wordmark left, user avatar right.
- **Dropdown:** `rounded-xl`, `--color-surface` bg, `--color-border` border,
  `backdrop-blur-md`, `shadow-xl`.
- **Reader page:** Full-viewport fixed shell (`book-reader-shell` class). Foliate
  iframe fills center. Background `#0c0c0e` (reader-specific, not a design token).
- **Modals / overlays:** `backdrop-blur-sm`, `bg-black/60` scrim. Panel uses
  `--color-surface` bg and `rounded-2xl`.
