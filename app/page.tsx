/**
 * The public landing page introduces Bookly and routes users to sign-in or
 * directly to their library based on the active Clerk session.
 */
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Fraunces, Manrope } from "next/font/google";

import { LandingDynamics } from "@/components/landing/landing-dynamics";
import { Button } from "@/components/ui/button";

const landingDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-landing-display",
  weight: ["600", "700"],
});

const landingSans = Manrope({
  subsets: ["latin"],
  variable: "--font-landing-sans",
  weight: ["500", "600", "700", "800"],
});

const SCROLLING_TAGS = [
  "EPUB reader",
  "Auto-save progress",
  "Annotations",
  "Calm focus mode",
  "Device sync",
  "Private library",
  "Quick uploads",
];

const FEATURE_CARDS = [
  {
    title: "Upload and organize",
    body: "Bring your files in once and keep your shelf tidy with clean metadata and covers.",
  },
  {
    title: "Reader built for focus",
    body: "A distraction-light experience with enough control for long reading sessions.",
  },
  {
    title: "Capture notes fast",
    body: "Highlight, annotate, and come back to ideas without breaking your reading flow.",
  },
  {
    title: "Resume from anywhere",
    body: "Your last position and context stay ready whether you return on laptop or mobile.",
  },
  {
    title: "Personal by design",
    body: "Your collection is tied to your account, so your workspace always feels yours.",
  },
  {
    title: "Low-friction interface",
    body: "Clear hierarchy, quiet color, and smooth interactions keep attention on the text.",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Do I need an account to use Bookly?",
    a: "Browsing is open, but signing in unlocks your personal collection, reading progress, and annotations.",
  },
  {
    q: "Which file types are supported?",
    a: "Bookly focuses on ebook reading workflows. Upload support can expand as your library needs evolve.",
  },
  {
    q: "Is my data shared publicly?",
    a: "No. Libraries are scoped to your account and intended for private personal reading.",
  },
] as const;

export default async function LandingPage() {
  const { userId } = await auth();
  const ctaHref = userId ? "/library" : "/sign-in";
  const ctaLabel = userId ? "Go to Library" : "Start Reading";
  const currentYear = new Date().getFullYear();

  return (
    <main className={`landing-shell ${landingDisplay.variable} ${landingSans.variable}`}>
      <div className="landing-atmosphere" aria-hidden="true" />

      <div className="landing-canvas">
        <header className="landing-topbar">
          <Link href="/" className="landing-brand" aria-label="Bookly home">
            <Image
              src="/bookly logo no bg.png"
              alt="Bookly logo"
              width={36}
              height={36}
              className="landing-brandMark"
              priority
            />
            <span className="landing-brandWord">Bookly</span>
          </Link>

          <nav className="landing-topbarActions" aria-label="Primary">
            <Button asChild variant="ghost" className="landing-topbarBtn">
              <Link href="/library">Browse library</Link>
            </Button>
            <Button asChild className="landing-topbarBtnPrimary">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </nav>
        </header>

        <section className="landing-hero">
          <div className="landing-heroCopy landing-reveal landing-reveal-1">
            <p className="landing-eyebrow">Your personal reading studio</p>
            <h1 className="landing-title">Reading that keeps its momentum.</h1>
            <p className="landing-subtitle">
              Build a private digital shelf, open a book in seconds, and continue exactly where you
              stopped on any device.
            </p>

            <div className="landing-ctaRow">
              <Button asChild size="lg" className="landing-ctaPrimary">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="landing-ctaSecondary">
                <Link href="/library">Browse Library</Link>
              </Button>
            </div>

            <div className="landing-scrollBand" aria-hidden="true">
              <div className="landing-scrollTrack">
                {[...SCROLLING_TAGS, ...SCROLLING_TAGS].map((tag, index) => (
                  <span key={`${tag}-${index}`} className="landing-scrollTag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-heroVisual landing-reveal landing-reveal-2">
            <div className="landing-heroCard">
              <Image
                src="/bookly branding.png"
                alt=""
                width={860}
                height={860}
                priority
                className="landing-heroImage"
              />
              <div className="landing-heroGlow" />
            </div>
            <LandingDynamics />
          </div>
        </section>

        <section className="landing-proof">
          <div className="landing-proofItem">
            <span className="landing-proofNumber">Fast</span>
            <span className="landing-proofLabel">From upload to first page in minutes.</span>
          </div>
          <div className="landing-proofItem">
            <span className="landing-proofNumber">Focused</span>
            <span className="landing-proofLabel">Calm layout built for long sessions.</span>
          </div>
          <div className="landing-proofItem">
            <span className="landing-proofNumber">Flexible</span>
            <span className="landing-proofLabel">Your bookshelf follows every device.</span>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-sectionHead">
            <h2 className="landing-h2">Everything you need to keep reading</h2>
            <p className="landing-lede">
              Bookly keeps file management light, navigation clear, and reading interactions smooth.
            </p>
          </div>

          <div className="landing-features">
            {FEATURE_CARDS.map((feature) => (
              <article key={feature.title} className="landing-featureCard">
                <h3 className="landing-h3">{feature.title}</h3>
                <p className="landing-body">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-sectionHead">
            <h2 className="landing-h2">How it works</h2>
            <p className="landing-lede">Three steps from file to focused reading.</p>
          </div>

          <ol className="landing-steps">
            <li className="landing-step">
              <div className="landing-stepBadge">1</div>
              <div className="landing-stepContent">
                <h3 className="landing-h3">Sign in</h3>
                <p className="landing-body">Create your personal space so progress and notes stay yours.</p>
              </div>
            </li>
            <li className="landing-step">
              <div className="landing-stepBadge">2</div>
              <div className="landing-stepContent">
                <h3 className="landing-h3">Add books</h3>
                <p className="landing-body">Upload your files, review covers, and keep your shelf organized.</p>
              </div>
            </li>
            <li className="landing-step">
              <div className="landing-stepBadge">3</div>
              <div className="landing-stepContent">
                <h3 className="landing-h3">Read and annotate</h3>
                <p className="landing-body">Pick up where you left off, highlight ideas, and keep moving.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="landing-section">
          <div className="landing-sectionHead">
            <h2 className="landing-h2">FAQ</h2>
            <p className="landing-lede">Quick answers before you jump in.</p>
          </div>

          <div className="landing-faq">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="landing-faqItem">
                <summary className="landing-faqQ">{item.q}</summary>
                <p className="landing-faqA">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-finalCta">
          <div className="landing-finalInner">
            <h2 className="landing-h2">Ready to build your library?</h2>
            <p className="landing-lede">Bring your books and settle into a calmer reading workflow.</p>

            <div className="landing-ctaRow">
              <Button asChild size="lg" className="landing-ctaPrimary">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="landing-ctaSecondary">
                <Link href="/library">Browse Library</Link>
              </Button>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footerInner">
            <span className="landing-footerBrand">Bookly</span>
            <div className="landing-footerLinks">
              <Link className="landing-footerLink" href="/library">
                Library
              </Link>
              <Link className="landing-footerLink" href="/sign-in">
                Sign in
              </Link>
              <Link className="landing-footerLink" href="/sign-up">
                Sign up
              </Link>
            </div>
          </div>
          <p className="landing-footerMeta">{currentYear} Bookly. Read at your pace.</p>
        </footer>
      </div>
    </main>
  );
}
