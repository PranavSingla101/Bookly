import { SignUp } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import Image from "next/image";
import Link from "next/link";
import { Nunito, Cormorant_Garamond } from "next/font/google";
import { BookOpen, PenLine, RefreshCw } from "lucide-react";

const sans = Nunito({
  subsets: ["latin"],
  variable: "--font-auth-sans",
  weight: ["500", "600", "700", "800"],
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-auth-display",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const perks = [
  { Icon: BookOpen, label: "Cloud library" },
  { Icon: PenLine,  label: "Highlights & notes" },
  { Icon: RefreshCw, label: "Progress sync" },
];

export default function SignUpPage() {
  return (
    <main
      className={`auth-page relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 ${sans.variable} ${display.variable}`}
    >
      {/* Background */}
      <Image
        src="/Landing_Page_Background_Updated.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center scale-[1.04]"
        aria-hidden="true"
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 85% 90% at 50% 50%, rgba(14,7,2,0.14) 0%, rgba(14,7,2,0.82) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Warm tint */}
      <div
        className="absolute inset-0 z-[1]"
        style={{ background: "rgba(14, 7, 2, 0.14)" }}
        aria-hidden="true"
      />

      {/* Ambient glow */}
      <div
        className="absolute z-[2] h-[560px] w-[520px] rounded-full opacity-[0.11] blur-[110px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #9B4A2B 0%, #6b2f13 55%, transparent 100%)" }}
        aria-hidden="true"
      />

      {/* Glass card */}
      <div
        className="auth-card relative z-10 w-full max-w-[36rem] overflow-hidden rounded-3xl"
        style={{
          background: "rgba(16, 8, 3, 0.44)",
          backdropFilter: "blur(22px) saturate(1.6) brightness(1.05)",
          WebkitBackdropFilter: "blur(22px) saturate(1.6) brightness(1.05)",
          border: "1px solid rgba(255, 210, 155, 0.14)",
          boxShadow:
            "inset 0 1px 0 rgba(255, 220, 170, 0.10), 0 8px 40px rgba(8,4,1,0.32)",
        }}
      >
        {/* Rust accent bar */}
        <div
          className="h-[3px] w-full flex-shrink-0"
          style={{
            background:
              "linear-gradient(90deg, #3d1608 0%, #9B4A2B 42%, #C4763A 58%, #3d1608 100%)",
          }}
          aria-hidden="true"
        />

        {/* Header — logo + headline + subtitle */}
        <div className="flex flex-col items-center px-10 pt-10 pb-2 text-center">
          <div
            className="mb-6 flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full"
            style={{
              border: "1.5px solid rgba(155, 74, 43, 0.42)",
              boxShadow: "0 6px 28px rgba(0,0,0,0.5), 0 0 0 4px rgba(155,74,43,0.08)",
              background: "rgba(18, 9, 2, 0.75)",
            }}
          >
            <Image
              src="/Bookly_logo.png"
              alt="Bookly"
              width={60}
              height={60}
              className="h-full w-full object-cover"
              style={{ width: 60, height: 60 }}
              priority
            />
          </div>

          <h1
            style={{
              fontFamily: "var(--font-auth-display), Georgia, serif",
              fontSize: "clamp(2.6rem, 7vw, 3.4rem)",
              fontWeight: 600,
              color: "#fdf0de",
              lineHeight: 1.03,
              letterSpacing: "-0.025em",
              textShadow: "0 2px 28px rgba(6,3,1,0.6)",
              margin: 0,
            }}
          >
            Start reading.
          </h1>

          <p
            className="mt-2.5"
            style={{
              fontFamily: "var(--font-auth-sans), Nunito, sans-serif",
              fontSize: "0.9rem",
              color: "rgba(255, 210, 155, 0.58)",
              letterSpacing: "0.01em",
            }}
          >
            Your reading sanctuary starts here.
          </p>
        </div>

        {/* Clerk form */}
        <SignUp
          path="/sign-up"
          forceRedirectUrl="/library"
          signInUrl="/sign-in"
          appearance={{
            theme: shadcn,
            variables: {
              colorPrimary: "#9B4A2B",
              colorBackground: "#0c0602",
              colorForeground: "#fdf0de",
              colorMutedForeground: "rgba(255, 210, 160, 0.55)",
              borderRadius: "0.6rem",
              fontFamily: "var(--font-auth-sans), Nunito, sans-serif",
              fontSize: "0.92rem",
            },
            elements: {
              rootBox: { width: "100%", maxWidth: "100%" },
              cardBox: { width: "100%", maxWidth: "100%", background: "transparent" },
              card: {
                width: "100%",
                maxWidth: "100%",
                boxShadow: "none",
                border: "none",
                borderRadius: "0",
                margin: "0",
                background: "transparent",
                padding: "0.5rem 2.5rem 0.75rem",
              },
              header: { display: "none" },
              footer: {
                background: "transparent",
                borderTop: "none",
                padding: "0 2.5rem 0.25rem",
              },
              socialButtonsBlockButton: {
                background: "rgba(253, 248, 240, 0.94)",
                border: "none",
                borderRadius: "2rem",
                color: "#1a0d06",
                fontWeight: "700",
                fontSize: "0.93rem",
                boxShadow: "0 2px 16px rgba(0,0,0,0.22)",
                padding: "0.78rem 1.5rem",
                transition: "opacity 150ms ease",
              },
              socialButtonsBlockButtonText: { color: "#1a0d06", fontWeight: "700" },
              dividerLine: { background: "rgba(155, 74, 43, 0.22)" },
              dividerText: {
                color: "rgba(255, 200, 155, 0.42)",
                fontSize: "0.73rem",
                letterSpacing: "0.1em",
              },
              formFieldLabel: {
                color: "rgba(255, 215, 165, 0.68)",
                fontSize: "0.82rem",
                fontWeight: "600",
              },
              formFieldInput: {
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(155, 74, 43, 0.32)",
                color: "#fdf0de",
                borderRadius: "0.6rem",
                padding: "0.65rem 0.9rem",
              },
              footerActionText: { color: "rgba(255, 200, 150, 0.48)" },
              footerActionLink: {
                color: "#9B4A2B",
                fontWeight: "700",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              },
              alternativeMethodsBlockButton: {
                color: "rgba(253, 240, 222, 0.85)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                background: "transparent",
                border: "none",
                fontWeight: "600",
                fontSize: "0.88rem",
              },
            },
          }}
        />

        {/* Perks row */}
        <div
          className="grid grid-cols-3 gap-2 px-8 py-6"
          style={{ borderTop: "1px solid rgba(155, 74, 43, 0.16)" }}
        >
          {perks.map(({ Icon, label }, i) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2.5 text-center"
              style={i < perks.length - 1 ? { borderRight: "1px solid rgba(155,74,43,0.14)" } : {}}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: "rgba(155, 74, 43, 0.12)" }}
              >
                <Icon className="h-[18px] w-[18px]" style={{ color: "rgba(155, 74, 43, 0.85)" }} />
              </div>
              <p
                style={{
                  fontFamily: "var(--font-auth-sans), Nunito, sans-serif",
                  fontWeight: 700,
                  color: "#fdf0de",
                  fontSize: "0.82rem",
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Back to home */}
      <Link href="/" className="auth-back-link relative z-10 mt-5">
        ← Back to home
      </Link>
    </main>
  );
}
