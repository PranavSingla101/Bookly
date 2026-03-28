/**
 * The public landing page introduces Bookly and routes users to sign-in or
 * directly to their library based on the active Clerk session.
 */
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Cormorant_Garamond, Nunito } from "next/font/google";

import { Button } from "@/components/ui/button";

const landingDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-landing-display",
  weight: ["600", "700"],
});

const landingSans = Nunito({
  subsets: ["latin"],
  variable: "--font-landing-sans",
  weight: ["500", "600", "700", "800"],
});

const experienceFeatures = [
  {
    imageSrc: "/file.svg",
    imageAlt: "Open book file icon suggesting a saved place in your reading",
    imageClass: "object-contain p-[14%] opacity-[0.88]",
    panelClass:
      "bg-[#f0d4d8]/90 ring-1 ring-[#c9a8a8]/25",
    title: "Smart Progress",
    body:
      "Resume from your exact page on any device, without hunting for where you stopped.",
  },
  {
    imageSrc:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Editorial notebook and pen on a warm desk surface",
    imageClass: "object-cover opacity-[0.8] scale-[1.03]",
    panelClass:
      "bg-[#f5ecc8]/95 ring-1 ring-[#d4c9a0]/35",
    title: "Inline Notes",
    body:
      "Highlight and annotate in context so ideas stay tied to the passage that inspired them.",
  },
  {
    imageSrc: "/window.svg",
    imageAlt: "Minimal window frame suggesting a calm, focused reading interface",
    imageClass: "object-contain p-[14%] opacity-[0.88]",
    panelClass:
      "bg-[#d9e5d6]/95 ring-1 ring-[#a8b8a5]/35",
    title: "Quiet Interface",
    body:
      "Minimal controls and calm typography so the page—not the chrome—stays in focus.",
  },
] as const;

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/library");
  }

  const currentYear = new Date().getFullYear();

  return (
    <main className={`landing-shell ${landingDisplay.variable} ${landingSans.variable}`}>
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
                src="/bookly logo no bg.png"
                alt="Bookly logo"
                width={34}
                height={34}
                className="landing-brandMark"
                priority
              />
              <span className="landing-brandWord">Bookly</span>
            </Link>

            <nav className="landing-actions" aria-label="Primary">
              <Button asChild className="landing-navButtonPrimary">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </nav>
          </header>

          <section className="landing-hero">
            <div className="landing-panel">
              <p className="landing-kicker">A quiet home for your books</p>
              <h1 className="landing-title">Read in a calmer flow, every day.</h1>
              <p className="landing-summary">
                Keep your shelf organized, continue from your last page, and save highlights
                without losing focus. Bookly stays warm, simple, and intentionally minimal.
              </p>

              <div className="landing-ctaRow">
                <Button asChild size="lg" className="landing-ctaPrimary">
                  <Link href="/sign-in">Start Reading</Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="landing-ctaSecondary">
                  <Link href="/library">Open Library</Link>
                </Button>
              </div>

              <ul className="landing-points" aria-label="Key features">
                <li className="landing-point">Progress sync across sessions</li>
                <li className="landing-point">Highlights and notes in context</li>
                <li className="landing-point">Simple, distraction-free reading</li>
              </ul>
            </div>
          </section>
        </div>
        <div className="landing-heroFade" aria-hidden="true" />
      </section>

      {/* Editorial sections below hero — warm cream + earthy brown palette */}
      <div className="w-full">
        {/* Section 1: The Experience */}
        <section
          className="mx-auto w-full max-w-6xl px-6 py-32 md:px-8"
          aria-labelledby="experience-heading"
        >
          <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#6f5036]/85">
            The experience
          </p>
          <h2
            id="experience-heading"
            className="mt-3 max-w-3xl text-left font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-[1.1] tracking-tight text-[#3b2616] md:text-5xl"
          >
            Everything stays where you left it.
          </h2>

          <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10 lg:gap-12">
            {experienceFeatures.map((feature) => (
              <article key={feature.title} className="flex flex-col gap-5">
                <div
                  className={`relative aspect-square w-full overflow-hidden rounded-2xl ${feature.panelClass}`}
                >
                  <Image
                    src={feature.imageSrc}
                    alt={feature.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={feature.imageClass}
                    priority={false}
                  />
                </div>
                <h3 className="font-[family-name:var(--font-landing-display),Georgia,serif] text-2xl font-semibold text-[#3e2716]">
                  {feature.title}
                </h3>
                <p className="font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#6f5036]">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Section 2: The Journey */}
        <section
          className="border-y border-[rgba(143,79,36,0.08)] bg-gradient-to-b from-[#faf3ea] via-[#f5eadc] to-[#f3e6da] py-32"
          aria-labelledby="journey-heading"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 md:px-8 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#6f5036]/85">
                The journey
              </p>
              <h2
                id="journey-heading"
                className="mt-3 text-left font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-[1.1] tracking-tight text-[#3b2616] md:text-5xl"
              >
                Three steps to serenity.
              </h2>

              <ol className="mt-12 flex list-none flex-col gap-12 pl-0">
                <li className="grid grid-cols-[minmax(3.5rem,4.5rem)_1fr] items-start gap-x-5 sm:gap-x-7 md:grid-cols-[minmax(4rem,5rem)_1fr] md:gap-x-8">
                  <span
                    className="pointer-events-none select-none text-right font-[family-name:var(--font-landing-display),Georgia,serif] text-[2.65rem] font-semibold leading-none tracking-tight text-[#3b2616]/[0.14] tabular-nums sm:text-[3.05rem] md:text-[3.35rem]"
                    aria-hidden="true"
                  >
                    01
                  </span>
                  <div className="min-w-0 pt-1">
                    <h3 className="font-[family-name:var(--font-landing-display),Georgia,serif] text-xl font-semibold text-[#3e2716]">
                      Arrive
                    </h3>
                    <p className="mt-2 font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#6f5036]">
                      Sign in and settle into a reading space that feels like yours—uncluttered and calm.
                    </p>
                  </div>
                </li>
                <li className="grid grid-cols-[minmax(3.5rem,4.5rem)_1fr] items-start gap-x-5 sm:gap-x-7 md:grid-cols-[minmax(4rem,5rem)_1fr] md:gap-x-8">
                  <span
                    className="pointer-events-none select-none text-right font-[family-name:var(--font-landing-display),Georgia,serif] text-[2.65rem] font-semibold leading-none tracking-tight text-[#3b2616]/[0.14] tabular-nums sm:text-[3.05rem] md:text-[3.35rem]"
                    aria-hidden="true"
                  >
                    02
                  </span>
                  <div className="min-w-0 pt-1">
                    <h3 className="font-[family-name:var(--font-landing-display),Georgia,serif] text-xl font-semibold text-[#3e2716]">
                      Curate
                    </h3>
                    <p className="mt-2 font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#6f5036]">
                      Upload books and arrange your shelf so what you love is always within reach.
                    </p>
                  </div>
                </li>
                <li className="grid grid-cols-[minmax(3.5rem,4.5rem)_1fr] items-start gap-x-5 sm:gap-x-7 md:grid-cols-[minmax(4rem,5rem)_1fr] md:gap-x-8">
                  <span
                    className="pointer-events-none select-none text-right font-[family-name:var(--font-landing-display),Georgia,serif] text-[2.65rem] font-semibold leading-none tracking-tight text-[#3b2616]/[0.14] tabular-nums sm:text-[3.05rem] md:text-[3.35rem]"
                    aria-hidden="true"
                  >
                    03
                  </span>
                  <div className="min-w-0 pt-1">
                    <h3 className="font-[family-name:var(--font-landing-display),Georgia,serif] text-xl font-semibold text-[#3e2716]">
                      Read on
                    </h3>
                    <p className="mt-2 font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#6f5036]">
                      Read, highlight, and pick up exactly where you left off—any time you return.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="relative min-h-[min(28rem,70vh)] w-full">
              <div
                className="flex h-full min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-[rgba(128,82,44,0.14)] bg-[#fffdf8] shadow-xl"
                role="img"
                aria-label="App window preview"
              >
                <div className="flex items-center gap-2 border-b border-[rgba(128,82,44,0.1)] px-4 py-3.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e8c4b8]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5d9a8]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#c5d4c2]" />
                </div>
                <div className="relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-8 py-14">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(143,79,36,0.06),transparent_58%)]"
                    aria-hidden="true"
                  />
                  <Image
                    src="/bookly logo no bg.png"
                    alt=""
                    width={52}
                    height={52}
                    className="relative z-[1] opacity-[0.42]"
                    aria-hidden
                  />
                  <p className="relative z-[1] text-center font-[family-name:var(--font-landing-sans)] text-sm font-medium tracking-wide text-[#6f5036]/40">
                    Your sanctuary is ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: CTA */}
        <section
          className="relative overflow-hidden py-32"
          aria-labelledby="cta-heading"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,rgba(143,79,36,0.09),transparent_65%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 50%, transparent 48%, rgba(143, 79, 36, 0.04) 49%, transparent 50%),
                radial-gradient(circle at 50% 50%, transparent 62%, rgba(143, 79, 36, 0.03) 63%, transparent 64%),
                radial-gradient(circle at 50% 50%, transparent 76%, rgba(143, 79, 36, 0.025) 77%, transparent 78%)
              `,
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center md:px-8">
            <h2
              id="cta-heading"
              className="font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-[1.12] tracking-tight text-[#3b2616] md:text-5xl"
            >
              Ready to find your focus?
            </h2>
            <p className="mt-5 max-w-md font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#6f5036]">
              A calmer shelf, gentler controls, and reading that stays with you—start in minutes.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-10 rounded-full border-0 bg-[#8f4f24] px-10 font-[family-name:var(--font-landing-sans)] font-semibold text-[#fff8ef] shadow-[0_12px_28px_rgba(67,33,10,0.28)] transition-colors hover:bg-[#a45f2f] focus-visible:ring-2 focus-visible:ring-[#8f4f24]/40"
            >
              <Link href="/sign-in">Start your journey</Link>
            </Button>
          </div>
        </section>

        {/* Section 4: Footer */}
        <footer className="border-t border-gray-200/50 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 text-xs text-[#6f5036]/80 md:flex-row md:items-center md:justify-between md:px-8">
            <p className="font-[family-name:var(--font-landing-sans)]">
              Bookly · © {currentYear}
            </p>
            <nav aria-label="Footer">
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-[family-name:var(--font-landing-sans)]">
                <li>
                  <Link href="#" className="transition-colors hover:text-[#3b2616]">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-[#3b2616]">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-[#3b2616]">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/library" className="transition-colors hover:text-[#3b2616]">
                    Archive
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </footer>
      </div>
    </main>
  );
}
