import { SignUp } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import Image from "next/image";
import { Nunito } from "next/font/google";

const sans = Nunito({
  subsets: ["latin"],
  variable: "--font-auth-sans",
  weight: ["500", "600", "700"],
});

export default function SignUpPage() {
  return (
    <main
      className={`auth-page relative flex min-h-screen items-center justify-center overflow-x-clip p-4 sm:p-6 ${sans.variable}`}
    >
      <Image
        src="/landing_page_bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-[1.03] object-cover object-center"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, rgba(28,14,5,0.72) 0%, rgba(28,14,5,0.60) 55%, rgba(28,14,5,0.74) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="auth-card relative z-10 w-full max-w-[min(25rem,calc(100vw-2rem))] min-w-0 rounded-2xl shadow-[0_32px_80px_rgba(6,3,1,0.55)]">
        <SignUp
          path="/sign-up"
          forceRedirectUrl="/library"
          signInUrl="/sign-in"
          appearance={{
            theme: shadcn,
            variables: {
              colorPrimary: "#9B4A2B",
              colorBackground: "#fdf8f0",
              colorText: "#2C1A0E",
              colorTextSecondary: "#5C3D2A",
              borderRadius: "0rem",
              fontFamily: "var(--font-auth-sans), Nunito, sans-serif",
              fontSize: "0.9rem",
            },
            elements: {
              rootBox: {
                width: "100%",
                maxWidth: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "0",
              },
              cardBox: {
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              },
              card: {
                width: "100%",
                maxWidth: "100%",
                boxShadow: "none",
                border: "none",
                borderRadius: "0",
                margin: "0",
              },
              footer: {
                background: "#fdf8f0",
                borderRadius: "0",
                margin: "0",
                borderTop: "1px solid rgba(155, 74, 43, 0.1)",
              },
              headerTitle: {
                fontFamily: "var(--font-auth-sans), Nunito, sans-serif",
                fontSize: "1.25rem",
                color: "#2C1A0E",
              },
              headerSubtitle: { color: "#5C3D2A" },
              socialButtonsBlockButton: {
                border: "1px solid rgba(155, 74, 43, 0.22)",
                background: "#ffffff",
                color: "#2C1A0E",
              },
              socialButtonsBlockButtonText: {
                color: "#2C1A0E",
              },
              dividerLine: { background: "rgba(155, 74, 43, 0.12)" },
              dividerText: { color: "#8B6B57" },
              formFieldLabel: { color: "#5C3D2A" },
              formFieldInput: { border: "1px solid rgba(155, 74, 43, 0.25)" },
              footerActionText: { color: "#5C3D2A" },
              footerActionLink: { color: "#9B4A2B" },
            },
          }}
        />
      </div>
    </main>
  );
}
