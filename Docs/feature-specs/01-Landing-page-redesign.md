READ FRONTEND DESIGN SKILL
READ DOCS
# Bookly — Landing Page Redesign Brief

> **Version:** 1.0  
> **Status:** Draft  
> **Goal:** Stronger visual hierarchy & typography while preserving the warm, cozy aesthetic

---

## 1. Overview

Bookly is a distraction-free reading companion for everyone — from casual hobbyists to serious avid readers and students. The current landing page has strong brand warmth but lacks typographic structure and depth of content. This redesign retains the beloved background imagery and expands the page into a full conversion-focused experience.

---

## 2. What We're Keeping

| Element | Reason |
|---|---|
| Warm cozy room background image | Strong brand identity, immediately sets tone |
| Brand name & logo mark | Recognised, no change needed |
| Colour palette (terracotta, cream, warm brown) | On-brand and distinctive |
| Core value proposition copy direction | Resonates with audience |

---

## 3. Design Principles

### Typography
- **Headlines:** Serif display typeface — elegant, literary feel (e.g. *Playfair Display*, *Lora*, or *DM Serif Display*)
- **Body:** Clean humanist sans-serif for readability (e.g. *Inter*, *Nunito*, or *Source Sans 3*)
- **Hierarchy:** Establish clear H1 → H2 → H3 → body scale with generous spacing
- **Letter-spacing:** Tight on large display, relaxed on small caps labels (as currently used)

### Visual Hierarchy Rules
1. One dominant headline per section — no competing weights
2. Breathing room: increase section padding to let the background art show through
3. Cards and content panels: use frosted/translucent cream panels to layer over the BG image without hiding it
4. Consistent left-alignment for body content blocks; centred only for section labels and short pull quotes

---

## 4. Page Architecture

### Section 1 — Hero *(Redesign)*
**Current issue:** Content card is centred but feels cramped; CTA hierarchy unclear.

**Changes:**
- Increase headline size significantly — make `Read in a calmer flow, every day.` the undeniable focal point
- Add a subtle serif italic sub-tagline above the headline (replace the all-caps label)
- Increase card width slightly, with more internal padding
- Reorder CTAs: **Start Reading** (primary, filled) stays first; **Open Library** becomes a ghost/outline button
- Feature pills below CTAs gain icons (e.g. 🔄 sync, ✏️ highlights, 📖 reading)
- Animate headline in on load (fade + subtle upward drift)

---

### Section 2 — How It Works *(New)*
**3-step horizontal flow**, set against a slightly darker translucent panel

| Step | Icon | Title | Description |
|---|---|---|---|
| 1 | 📚 | Add your books | Import from your library, paste a URL, or browse Bookly's catalogue |
| 2 | 🔖 | Read & highlight | Distraction-free reader with inline note-taking and highlight colours |
| 3 | 🔄 | Pick up anywhere | Progress syncs across all your devices automatically |

---

### Section 3 — Features Deep-Dive *(New)*
**Alternating image + text layout** (or illustration + text on mobile: stacked)

Feature blocks to cover:
1. **Distraction-free reading mode** — full-screen, customisable font & background
2. **Smart highlights & notes** — capture thoughts in context, export anytime
3. **Progress sync across sessions** — never lose your place
4. **Reading streaks & stats** — gentle accountability, not gamification
5. **Universal library support** — EPUBs, PDFs, and web articles

Each block: serif H3, 2-sentence body, small ghost CTA link ("Learn more →")

---

### Section 4 — Testimonials / Social Proof *(New)*
**Layout:** Horizontal scroll on mobile; 3-column grid on desktop

Quote card design:
- Translucent cream card, warm shadow
- Large serif opening quotation mark in terracotta
- Quote text in italic serif
- Reviewer name + avatar + "Avid reader" / "Student" / "Book club host" label

**Placeholder copy (to be replaced with real quotes):**
> *"Bookly is the first reading app that actually feels like reading — not using software."*  
> — Meera S., avid reader

> *"I finally finish books now. The sync just works."*  
> — Tom R., casual reader

> *"My highlights are actually useful now. Game changer for research."*  
> — Anjali K., student

---

### Section 5 — Pricing *(New)*
**Free + paid tiers**

| | Free | Bookly Pro |
|---|---|---|
| **Price** | $0 forever | $4.99 / month or $39 / year |
| Reading mode | ✅ | ✅ |
| Progress sync | ✅ (1 device) | ✅ Unlimited devices |
| Highlights & notes | ✅ (50 limit) | ✅ Unlimited |
| Export highlights | ❌ | ✅ |
| Reading stats & streaks | ❌ | ✅ |
| Priority support | ❌ | ✅ |

**Design:** Two side-by-side cards; Pro card has a warm terracotta border and a "Most Popular" badge. Annual plan toggled with a pill toggle above cards ("Save 35%" label on annual).

---

### Section 6 — FAQ *(New)*
**Accordion layout** — collapsed by default, opens on click

Suggested questions:
1. Which file formats does Bookly support?
2. Does Bookly work offline?
3. Can I import my existing highlights from Kindle or Apple Books?
4. Is my reading data private?
5. Can I cancel my Pro plan anytime?
6. Is there a student discount?

**Design:** Clean accordion on a warm cream panel; terracotta chevron icon for expand/collapse.

---

### Section 7 — Final CTA *(Redesign of implied close)*
**Full-width section**, warm gradient overlay on BG image

- Large serif headline: *"Your next chapter starts here."*
- Subtext: *"Join thousands of readers who've found their calmer flow."*
- Single CTA: **Start Reading Free** (terracotta, large, pill-shaped)
- No distractions — just the CTA

---

### Footer *(New)*
Minimal, warm:
- Logo + tagline
- Links: Features · Pricing · FAQ · Privacy · Terms
- Social icons (minimal, muted)
- © 2026 Bookly

---

## 5. Responsive Behaviour

| Breakpoint | Notes |
|---|---|
| Mobile (< 640px) | Single column, stacked sections, hero card full-width |
| Tablet (640–1024px) | 2-col features, pricing cards side by side |
| Desktop (> 1024px) | Full layout as described above |

---

## 6. Colour Tokens

| Token | Value | Usage |
|---|---|---|
| `--brand-primary` | `#9B4A2B` | CTAs, accents, highlights |
| `--brand-warm` | `#C4763A` | Hover states, badges |
| `--surface-card` | `rgba(253, 248, 240, 0.88)` | Translucent panels over BG |
| `--text-dark` | `#2C1A0E` | Headlines |
| `--text-body` | `#5C3D2A` | Body copy |
| `--text-muted` | `#8B6B57` | Labels, captions |
| `--border-subtle` | `rgba(155, 74, 43, 0.15)` | Card borders, dividers |

---

## 7. Animation & Interaction

- **Hero headline:** Fade-in + 20px upward drift on load (300ms ease-out)
- **Section entries:** Staggered fade-in as user scrolls (IntersectionObserver)
- **Feature cards:** Subtle lift on hover (`transform: translateY(-4px)`)
- **Accordion:** Smooth max-height transition (250ms)
- **Pricing toggle:** Crossfade prices on Free ↔ Annual switch
- **No autoplay, no looping animations** — respects calm reading brand

---

## 8. Open Questions

- [ ] Do we have real testimonials, or should we collect them before launch?
- [ ] Is the pricing confirmed, or placeholder for now?
- [ ] Are there real screenshots/illustrations for the Features section, or should we use UI mockups?
- [ ] Any specific fonts already licensed, or open to recommendations?
- [ ] Target launch date?

---

*Brief prepared for design & development handoff. All copy is placeholder unless marked otherwise.*