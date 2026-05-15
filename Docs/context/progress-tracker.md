# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

In Progress — Landing Page Redesign

## Current Goal

Full conversion-focused landing page per `feature-specs/01-Landing-page-redesign.md`.

## Completed

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

- Verify TypeScript build passes (`npm run build`)
- Replace placeholder testimonials with real quotes when available
- Add real feature screenshots/illustrations to replace icon mock panels (open question from spec)
- Collect and confirm pricing tiers (open question from spec)

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

## Session Notes

- Landing page spec is in `Docs/feature-specs/01-Landing-page-redesign.md`
- All new landing components live in `components/landing/`
- The `/sign-up` route does not yet exist in the app (Clerk provides it via `app/sign-up/[[...sign-up]]/page.tsx`) — links to `/sign-up` in the landing page will resolve correctly once Clerk route is active
