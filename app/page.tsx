import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Cormorant_Garamond, Nunito } from "next/font/google";
import {
  BookOpen,
  RefreshCw,
  PenLine,
  ArrowRight,
  Moon,
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
    label: "Library",
    title: "Epub support",
    body: "Import any valid DRM-free EPUB file to your personal cloud. Read on any device with standard-compliant native rendering.",
    Illustration: LibraryMockIllustration,
  },
];

const testimonials = [
  {
    quote:
      "Bookly is the first reading app that actually feels like reading, not using software.",
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
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#1a1a1a] bg-black shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <Image
        src="/Distraction free reading mode.png"
        alt="Distraction-free reading mode screenshot"
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover object-top"
      />
    </div>
  );
}

function HighlightsMockIllustration() {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#1a1a1a] bg-black shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <Image
        src="/Highlights_notes_landing_page.png"
        alt="Smart highlights & notes screenshot"
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover object-top"
      />
    </div>
  );
}

function SyncMockIllustration() {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#1a1a1a] bg-black shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <Image
        src="/Saving_reading progress.png"
        alt="Progress sync across sessions screenshot"
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-contain"
      />
    </div>
  );
}

function LibraryMockIllustration() {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] shadow-[0_20px_60px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center gap-5 text-center">
      <div className="h-16 w-16 rounded-2xl bg-[#9B4A2B]/25 flex items-center justify-center text-[#C4763A]">
        <BookOpen className="h-9 w-9" aria-hidden="true" />
      </div>
      <div>
        <span className="font-[family-name:var(--font-landing-sans)] text-xs font-bold tracking-widest text-[#C4763A] uppercase">
          Format Support
        </span>
        <h4 className="mt-1 font-[family-name:var(--font-landing-display),Georgia,serif] text-2xl font-bold text-white">
          EPUB
        </h4>
        <p className="mt-2 font-[family-name:var(--font-landing-sans)] text-xs text-white/45 leading-relaxed max-w-[200px]">
          DRM-free standard reflowable layout rendering
        </p>
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
          src="/Landing_Page_Background_Updated.png"
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
                style={{ width: 32, height: 32 }}
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
                Your reading sanctuary.
              </h1>
              <p className="landing-summary">
                Continue where you left off, organise your books, save highlights, and stay
                immersed — without distractions.
              </p>

              <div className="landing-ctaRow">
                <Button asChild size="lg" className="landing-ctaPrimary">
                  <Link href="/sign-in">Start Reading</Link>
                </Button>
                <Button asChild size="lg" className="landing-ctaSecondary">
                  <Link href="/sign-in">Explore Library</Link>
                </Button>
              </div>

              {/* Feature badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { Icon: BookOpen, label: "Organised Library" },
                  { Icon: PenLine, label: "Save Highlights" },
                  { Icon: Moon, label: "Dark Mode" },
                ].map(({ Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 rounded-full border border-[rgba(255,210,155,0.18)] bg-[rgba(16,8,3,0.45)] px-3 py-1.5 backdrop-blur-md"
                  >
                    <Icon className="h-3.5 w-3.5 text-[rgba(255,218,165,0.85)]" aria-hidden="true" />
                    <span className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold text-[rgba(255,228,190,0.85)]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Social proof */}
              <div className="mt-5 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    { src: "/Pranav-user1.png", alt: "Reader" },
                    { src: "/User2.png", alt: "Reader" },
                    { src: "/User3.png", alt: "Reader" },
                  ].map(({ src, alt }, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-[rgba(255,220,165,0.3)] overflow-hidden"
                      style={{ width: 32, height: 32 }}
                    >
                      <Image
                        src={src}
                        alt={alt}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                        style={{ width: 32, height: 32 }}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5" aria-label="5 stars">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-[#C4763A] text-xs leading-none">★</span>
                    ))}
                  </div>
                  <p className="font-[family-name:var(--font-landing-sans)] text-xs text-[rgba(255,228,190,0.7)] mt-0.5">
                    Loved by 10,000+ readers
                  </p>
                </div>
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
              className="mx-auto mt-3 max-w-sm font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-tight text-[#2C1A0E] md:text-5xl"
            >
              Three steps to a calmer flow.
            </h2>
          </ScrollReveal>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {howItWorksSteps.map((step, i) => (
              <ScrollReveal key={step.step} delay={i * 100} className="relative">
                {/* connector arrow between cards */}
                {i < howItWorksSteps.length - 1 && (
                  <div className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 sm:flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(155,74,43,0.35)] bg-[#ecd8c6] text-[#9B4A2B] shadow-sm">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                )}
                <article
                  className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[rgba(155,74,43,0.12)] p-7 shadow-[0_2px_16px_rgba(155,74,43,0.06)] transition-shadow hover:shadow-[0_8px_32px_rgba(155,74,43,0.12)]"
                  style={{ backgroundColor: step.cardBg }}
                >
                  {/* large ghost step number */}
                  <span
                    className="pointer-events-none absolute right-5 top-3 select-none font-[family-name:var(--font-landing-display),Georgia,serif] text-[80px] font-bold leading-none text-[#9B4A2B]/[0.07]"
                    aria-hidden="true"
                  >
                    {step.step}
                  </span>

                  {/* icon */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                    style={{ backgroundColor: step.iconBg }}
                  >
                    <step.Icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>

                  {/* text */}
                  <div className="mt-6">
                    <h3 className="font-[family-name:var(--font-landing-display),Georgia,serif] text-2xl font-semibold text-[#2C1A0E]">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#5C3D2A]/80">
                      {step.body}
                    </p>
                  </div>

                  {/* bottom accent line */}
                  <div
                    className="mt-auto pt-6"
                  >
                    <div className="h-px w-10 rounded-full opacity-30" style={{ backgroundColor: step.iconBg }} />
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
