# UI Context

## Theme

Dark only. No light mode. The design language is a rich, warm reading environment —
deep near-black backgrounds with layered surfaces that evoke the feel of a dimly lit
personal library. Surfaces are elevated through warm tonal steps rather than harsh
borders. Woody brown accents ground every interactive element in something tactile
and familiar, like aged wood shelves and leather bindings.

---

## Colors

All components must use these tokens — no hardcoded hex values.

| Role            | CSS Variable       | Value     |
| --------------- | ------------------ | --------- |
| Page background | `--bg-base`        | `#0d0a08` |
| Surface         | `--bg-surface`     | `#181210` |
| Primary text    | `--text-primary`   | `#f2ede6` |
| Muted text      | `--text-muted`     | `#7a6e64` |
| Primary accent  | `--accent-primary` | `#b5703a` |
| Border          | `--border-default` | `#2c2118` |
| Error           | `--state-error`    | `#d95f5f` |
| Success         | `--state-success`  | `#5fa87a` |

---

## Typography

| Role      | Font       | Variable      |
| --------- | ---------- | ------------- |
| UI text   | Geist Sans | `--font-sans` |
| Code/mono | Geist Mono | `--font-mono` |

Load via the `geist` npm package and apply through `next/font`. Set `--font-sans`
on the root `<body>`. Use `--font-mono` for any CFI strings, debug surfaces, or
monospaced data displays.

---

## Border Radius

| Context           | Class         |
| ----------------- | ------------- |
| Inline / small UI | `rounded-lg`  |
| Cards / panels    | `rounded-xl`  |
| Modals / overlays | `rounded-2xl` |

---

## Component Library

shadcn/ui on top of Tailwind CSS. Components live in `components/ui/`. Use the
shadcn CLI to add new primitives rather than writing them from scratch:

```bash
npx shadcn@latest add <component>
```

Tailwind config extends the color tokens above via CSS custom properties so shadcn
theming stays consistent. The `cn()` utility from `lib/utils.ts` is used for all
conditional class merging.

---

## Layout Patterns

- **Library page:** Fixed top navbar with a bottom border separator. Below it, a
  full-width responsive book grid fills the remaining viewport height
  (`grid-cols-2` on mobile, up to `grid-cols-5` on wide screens). Generous gap
  and padding to let cover art breathe.
- **Navbar:** Fixed, `h-14`, `--bg-surface` background, `--border-default` bottom
  border. Bookly wordmark on the left, user avatar / menu on the right.
- **Reader page:** Full-viewport layout. Foliate-js iframe occupies the center.
  A collapsible TOC sidebar slides in from the left (`w-64`, `--bg-surface`
  background). A slim top strip holds reading mode, font size, and close controls.
- **Modals / overlays:** Centered overlay with `backdrop-blur-sm` and a
  `bg-black/60` scrim. Modal panel uses `--bg-surface` background and `rounded-2xl`.
- **Upload flow:** Triggered by the "+" book card in the library grid. Opens as a
  modal with a drag-and-drop file zone and a warm dashed border in `--accent-primary`.
- **Empty state:** Centered within the grid area — muted icon, short prompt text
  in `--text-muted`, and a primary CTA button in `--accent-primary`.

---

## Icons

Lucide React. Stroke-based icons only. Color inherits from `currentColor` — never
hardcode fill or stroke.

| Context                       | Size      |
| ----------------------------- | --------- |
| Inline / within text          | `h-4 w-4` |
| Buttons and controls          | `h-5 w-5` |
| Nav-level / prominent actions | `h-6 w-6` |