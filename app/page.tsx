import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Cormorant_Garamond, Nunito } from "next/font/google";
import {
  BookOpen,
  RefreshCw,
  PenLine,
  BarChart3,
  Library,
  ArrowRight,
  BookMarked,
  Smartphone,
  Monitor,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { PricingSection } from "@/components/landing/PricingSection";

const landingDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-landing-display",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const landingSans = Nunito({
  subsets: ["latin"],
  variable: "--font-landing-sans",
  weight: ["500", "600", "700", "800"],
});

/* ─── Data ─────────────────────────────────────────────────────────────── */

const howItWorksSteps = [
  {
    Icon: BookOpen,
    step: "01",
    title: "Add your books",
    body: "Import from your library, paste a URL, or browse Bookly's catalogue.",
    cardBg: "#fdeee3",
    iconBg: "#9B4A2B",
  },
  {
    Icon: PenLine,
    step: "02",
    title: "Read & highlight",
    body: "Distraction-free reader with inline note-taking and highlight colours.",
    cardBg: "#f5e6d4",
    iconBg: "#7a4428",
  },
  {
    Icon: RefreshCw,
    step: "03",
    title: "Pick up anywhere",
    body: "Progress syncs across all your devices automatically.",
    cardBg: "#ecddd0",
    iconBg: "#5c3320",
  },
];

const features = [
  {
    label: "Deep Focus",
    title: "Distraction-free reading mode",
    body: "Full-screen reading with customisable fonts and backgrounds. Nothing competes with the words on the page.",
    Illustration: ReaderMockIllustration,
  },
  {
    label: "Annotations",
    title: "Smart highlights & notes",
    body: "Capture thoughts in context with colour-coded highlights. Export your annotations anytime you need them.",
    Illustration: HighlightsMockIllustration,
  },
  {
    label: "Sync",
    title: "Progress sync across sessions",
    body: "Your reading position is saved automatically. Pick up exactly where you left off on any signed-in device.",
    Illustration: SyncMockIllustration,
  },
  {
    label: "Habits",
    title: "Reading streaks & stats",
    body: "Gentle progress tracking to keep the momentum going. Accountability without gamification pressure.",
    Illustration: StatsMockIllustration,
  },
  {
    label: "Library",
    title: "Universal library support",
    body: "Import EPUBs, PDFs, and web articles into one organised shelf. Your entire reading life in one place.",
    Illustration: LibraryMockIllustration,
  },
];

const testimonials = [
  {
    quote:
      "Bookly is the first reading app that actually feels like reading — not using software.",
    name: "Meera S.",
    role: "Avid reader",
    initials: "MS",
  },
  {
    quote: "I finally finish books now. The sync just works.",
    name: "Tom R.",
    role: "Casual reader",
    initials: "TR",
  },
  {
    quote: "My highlights are actually useful now. Game changer for research.",
    name: "Anjali K.",
    role: "Student",
    initials: "AK",
  },
];

/* ─── Illustration components ───────────────────────────────────────────── */

function ReaderMockIllustration() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#1e120a]">
      <div className="absolute inset-0 flex flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <BookOpen className="ml-auto h-3.5 w-3.5 text-white/25" aria-hidden="true" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-10 py-6">
          <div className="h-2.5 w-3/5 rounded-full bg-white/20" />
          <div className="h-1.5 w-full rounded-full bg-white/10" />
          <div className="h-1.5 w-11/12 rounded-full bg-white/10" />
          <div className="h-1.5 w-full rounded-full bg-white/10" />
          <div className="h-1.5 w-4/5 rounded-full bg-white/10" />
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10" />
          <div className="h-1.5 w-11/12 rounded-full bg-white/10" />
          <div className="h-1.5 w-full rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function HighlightsMockIllustration() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[rgba(155,74,43,0.1)] bg-[#fdf8f0]">
      <div className="absolute inset-0 flex flex-col justify-center gap-2.5 px-8 py-6">
        <div className="h-2 w-full rounded-full bg-[rgba(155,74,43,0.08)]" />
        <div className="h-2 w-11/12 rounded-full bg-[rgba(196,118,58,0.28)]" />
        <div className="h-2 w-full rounded-full bg-[rgba(155,74,43,0.08)]" />
        <div className="h-2 w-4/5 rounded-full bg-[rgba(155,74,43,0.08)]" />
        <div className="h-2 w-full rounded-full bg-[rgba(155,74,43,0.08)]" />
        <div className="h-2 w-11/12 rounded-full bg-[rgba(155,74,43,0.2)]" />
        <div className="h-2 w-full rounded-full bg-[rgba(155,74,43,0.08)]" />
        <div className="mt-1 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[rgba(196,118,58,0.15)] p-1">
            <PenLine className="h-full w-full text-[#9B4A2B]" aria-hidden="true" />
          </div>
          <div className="h-1.5 w-24 rounded-full bg-[rgba(155,74,43,0.15)]" />
        </div>
      </div>
    </div>
  );
}

function SyncMockIllustration() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[rgba(155,74,43,0.1)] bg-[#fdf8f0]">
      <div className="absolute inset-0 flex items-center justify-center gap-6 px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-11 items-center justify-center rounded-xl border-2 border-[rgba(155,74,43,0.25)] bg-white/70">
            <Smartphone className="h-6 w-6 text-[#9B4A2B]/50" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-1 w-10 rounded-full bg-[#9B4A2B]/20" />
            <div className="h-1 w-7 rounded-full bg-[#9B4A2B]/15" />
          </div>
        </div>
        <RefreshCw className="h-7 w-7 text-[#9B4A2B]/35" aria-hidden="true" />
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-20 items-center justify-center rounded-xl border-2 border-[rgba(155,74,43,0.25)] bg-white/70">
            <Monitor className="h-7 w-7 text-[#9B4A2B]/50" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-1 w-14 rounded-full bg-[#9B4A2B]/20" />
            <div className="h-1 w-10 rounded-full bg-[#9B4A2B]/15" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsMockIllustration() {
  const bars = [40, 65, 50, 80, 70, 90, 75];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[rgba(155,74,43,0.1)] bg-[#fdf8f0] px-8 py-8">
      <div className="flex items-end gap-2" style={{ height: "6rem" }}>
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-none"
            style={{
              height: `${h}%`,
              background: i === 5 ? "#9B4A2B" : "rgba(155,74,43,0.2)",
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between">
        {days.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center font-[family-name:var(--font-landing-sans)] text-[10px] text-[#8B6B57]/70"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#9B4A2B]" aria-hidden="true" />
        <span className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold text-[#5C3D2A]">
          7-day reading streak
        </span>
      </div>
    </div>
  );
}

function LibraryMockIllustration() {
  const formats = [
    { label: "EPUB", Icon: BookOpen, color: "#9B4A2B" },
    { label: "PDF", Icon: BookMarked, color: "#C4763A" },
    { label: "Article", Icon: Library, color: "#6a7a8B" },
  ];
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[rgba(155,74,43,0.1)] bg-[#fdf8f0]">
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="grid w-full grid-cols-3 gap-3">
          {formats.map(({ label, Icon, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2.5 rounded-xl border border-[rgba(155,74,43,0.12)] bg-white/70 p-4"
            >
              <Icon className="h-8 w-8" style={{ color }} aria-hidden="true" />
              <span
                className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold"
                style={{ color }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/library");

  const currentYear = new Date().getFullYear();

  return (
    <main className={`landing-shell ${landingDisplay.variable} ${landingSans.variable}`}>

      {/* ================================================================
          SECTION 1 — HERO
          ================================================================ */}
      <section className="landing-heroStage">
        <Image
          src="/landing_page_bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="landing-bgImage"
          aria-hidden="true"
        />
        <div className="landing-overlay" aria-hidden="true" />

        <div className="landing-content">
          <header className="landing-topbar">
            <Link href="/" className="landing-brand" aria-label="Bookly home">
              <Image
                src="/Bookly_logo.png"
                alt="Bookly logo"
                width={32}
                height={32}
                className="landing-brandMark"
                priority
              />
              <span className="landing-brandWord">Bookly</span>
            </Link>

            <nav className="landing-actions" aria-label="Primary navigation">
              <a href="#features" className="landing-navLink hidden sm:block">Features</a>
              <a href="#pricing" className="landing-navLink hidden sm:block">Pricing</a>
              <a href="#faq" className="landing-navLink hidden sm:block">FAQ</a>
              <div className="landing-navDivider hidden sm:block" aria-hidden="true" />
              <Button asChild className="landing-navButtonPrimary">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </nav>
          </header>

          <section className="landing-hero" aria-labelledby="hero-heading">
            <div className="landing-panel">
              <p className="landing-kicker-serif">A quiet home for your books</p>
              <h1 id="hero-heading" className="landing-title">
                Read in a calmer flow, every day.
              </h1>
              <p className="landing-summary">
                Keep your shelf organised, continue from your last page, and save highlights
                without losing focus. Bookly stays warm, simple, and intentionally minimal.
              </p>

              <div className="landing-ctaRow">
                <Button asChild size="lg" className="landing-ctaPrimary">
                  <Link href="/sign-in">Start Reading</Link>
                </Button>
                <Button asChild size="lg" className="landing-ctaSecondary">
                  <Link href="/library">Open Library</Link>
                </Button>
              </div>

            </div>
          </section>
        </div>
      </section>

      {/* Editorial sections — warm cream background */}
      <div className="w-full">

        {/* ================================================================
            SECTION 2 — HOW IT WORKS
            ================================================================ */}
        <section
          className="mx-auto w-full max-w-6xl px-6 py-28 md:px-8"
          aria-labelledby="how-heading"
        >
          <ScrollReveal className="text-center">
            <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#8B6B57]">
              How it works
            </p>
            <h2
              id="how-heading"
              className="mx-auto mt-3 max-w-xl font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-tight text-[#2C1A0E] md:text-5xl"
            >
              Three steps to your calmer flow.
            </h2>
          </ScrollReveal>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {howItWorksSteps.map((step, i) => (
              <ScrollReveal key={step.step} delay={i * 100}>
                <article
                  className="flex flex-col gap-6 rounded-2xl border border-[rgba(155,74,43,0.1)] p-8"
                  style={{ backgroundColor: step.cardBg }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: step.iconBg }}
                    >
                      <step.Icon className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <span
                      className="font-[family-name:var(--font-landing-sans)] text-xs font-bold tracking-widest text-[#9B4A2B]/40"
                      aria-hidden="true"
                    >
                      {step.step}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-landing-display),Georgia,serif] text-2xl font-semibold text-[#2C1A0E]">
                      {step.title}
                    </h3>
                    <p className="mt-2 font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#5C3D2A]">
                      {step.body}
                    </p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ================================================================
            SECTION 3 — FEATURES DEEP-DIVE
            ================================================================ */}
        <section
          className="border-y border-[rgba(155,74,43,0.08)] bg-gradient-to-b from-[#faf3ea] via-[#f5eadc] to-[#f3e6da] py-28"
          aria-labelledby="features-heading"
          id="features"
        >
          <div className="mx-auto max-w-6xl px-6 md:px-8">
            <ScrollReveal className="text-center">
              <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#8B6B57]">
                Features
              </p>
              <h2
                id="features-heading"
                className="mx-auto mt-3 max-w-xl font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-tight text-[#2C1A0E] md:text-5xl"
              >
                Everything a reader needs.
              </h2>
            </ScrollReveal>

            <div className="mt-20 flex flex-col gap-24">
              {features.map((feature, i) => (
                <ScrollReveal key={feature.title}>
                  <div
                    className={`flex flex-col gap-10 lg:items-center lg:gap-16 ${
                      i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                    }`}
                  >
                    {/* Text */}
                    <div className="flex-1">
                      <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#8B6B57]">
                        {feature.label}
                      </p>
                      <h3 className="mt-3 font-[family-name:var(--font-landing-display),Georgia,serif] text-3xl font-semibold leading-tight text-[#2C1A0E] md:text-4xl">
                        {feature.title}
                      </h3>
                      <p className="mt-4 font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#5C3D2A]">
                        {feature.body}
                      </p>
                      <Link
                        href="/sign-up"
                        className="mt-5 inline-flex items-center gap-1.5 font-[family-name:var(--font-landing-sans)] text-sm font-semibold text-[#9B4A2B] transition-colors hover:text-[#C4763A]"
                      >
                        Learn more
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>

                    {/* Illustration */}
                    <div className="flex-1">
                      <feature.Illustration />
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4 — TESTIMONIALS
            ================================================================ */}
        <section
          className="mx-auto w-full max-w-6xl px-6 py-28 md:px-8"
          aria-labelledby="testimonials-heading"
        >
          <ScrollReveal className="text-center">
            <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#8B6B57]">
              Social proof
            </p>
            <h2
              id="testimonials-heading"
              className="mx-auto mt-3 max-w-lg font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-tight text-[#2C1A0E] md:text-5xl"
            >
              Loved by readers.
            </h2>
          </ScrollReveal>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 100}>
                <figure className="flex h-full flex-col rounded-2xl border border-[rgba(155,74,43,0.12)] bg-[rgba(253,248,240,0.88)] p-8 shadow-[0_4px_24px_rgba(155,74,43,0.07)]">
                  <span
                    className="font-[family-name:var(--font-landing-display),Georgia,serif] text-5xl leading-none text-[#9B4A2B]/60"
                    aria-hidden="true"
                  >
                    &ldquo;
                  </span>
                  <blockquote className="mt-2 flex-1 font-[family-name:var(--font-landing-display),Georgia,serif] text-lg italic leading-snug text-[#2C1A0E]">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9B4A2B]/10 font-[family-name:var(--font-landing-sans)] text-xs font-bold text-[#9B4A2B]">
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-[family-name:var(--font-landing-sans)] text-sm font-semibold text-[#2C1A0E]">
                        {t.name}
                      </p>
                      <p className="font-[family-name:var(--font-landing-sans)] text-xs text-[#8B6B57]">
                        {t.role}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ================================================================
            SECTION 5 — PRICING (client component — toggle state)
            ================================================================ */}
        <PricingSection />

        {/* ================================================================
            SECTION 6 — FAQ
            ================================================================ */}
        <section
          className="mx-auto w-full max-w-3xl px-6 py-28 md:px-8"
          aria-labelledby="faq-heading"
          id="faq"
        >
          <ScrollReveal className="text-center">
            <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#8B6B57]">
              FAQ
            </p>
            <h2
              id="faq-heading"
              className="mx-auto mt-3 max-w-lg font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-tight text-[#2C1A0E] md:text-5xl"
            >
              Common questions.
            </h2>
          </ScrollReveal>

          <div className="mt-12 rounded-2xl border border-[rgba(155,74,43,0.12)] bg-[rgba(253,248,240,0.88)] px-8 py-2">
            <FaqAccordion />
          </div>
        </section>

        {/* ================================================================
            FOOTER
            ================================================================ */}
        <footer className="border-t border-[rgba(155,74,43,0.12)] bg-[#ecddd0]">
          <div className="mx-auto w-full max-w-6xl px-6 py-7 md:px-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <nav aria-label="Footer navigation">
                <ul className="flex flex-wrap gap-x-6 gap-y-2 font-[family-name:var(--font-landing-sans)] text-sm text-[#8B6B57]">
                  <li><a href="#features" className="transition-colors hover:text-[#2C1A0E]">Features</a></li>
                  <li><a href="#pricing" className="transition-colors hover:text-[#2C1A0E]">Pricing</a></li>
                  <li><a href="#faq" className="transition-colors hover:text-[#2C1A0E]">FAQ</a></li>
                  <li><Link href="#" className="transition-colors hover:text-[#2C1A0E]">Privacy</Link></li>
                  <li><Link href="#" className="transition-colors hover:text-[#2C1A0E]">Terms</Link></li>
                </ul>
              </nav>
              <p className="font-[family-name:var(--font-landing-sans)] text-xs text-[#8B6B57]">
                © {currentYear} Bookly
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
