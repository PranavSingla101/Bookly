"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  { label: "Reading mode", included: true },
  { label: "Progress sync (1 device)", included: true },
  { label: "Highlights & notes (50 limit)", included: true },
  { label: "Export highlights", included: false },
  { label: "Reading stats & streaks", included: false },
  { label: "Priority support", included: false },
];

const PRO_FEATURES = [
  { label: "Reading mode", included: true },
  { label: "Progress sync (unlimited devices)", included: true },
  { label: "Highlights & notes (unlimited)", included: true },
  { label: "Export highlights", included: true },
  { label: "Reading stats & streaks", included: true },
  { label: "Priority support", included: true },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      className="bg-gradient-to-b from-[#f5eadc] to-[#faf3ea] py-28"
      aria-labelledby="pricing-heading"
      id="pricing"
    >
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="text-center">
          <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#8B6B57]">
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="mt-3 font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold leading-tight text-[#2C1A0E] md:text-5xl"
          >
            Simple, honest pricing.
          </h2>
          <p className="mt-4 font-[family-name:var(--font-landing-sans)] text-sm text-[#5C3D2A]">
            Start free. Upgrade when you&apos;re ready.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="mt-8 inline-flex items-center gap-3">
            <span
              className={cn(
                "font-[family-name:var(--font-landing-sans)] text-sm font-medium transition-colors duration-200",
                !annual ? "text-[#2C1A0E]" : "text-[#8B6B57]"
              )}
            >
              Monthly
            </span>
            <button
              role="switch"
              aria-checked={annual}
              aria-label="Toggle annual billing"
              onClick={() => setAnnual((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200",
                annual
                  ? "border-[#9B4A2B] bg-[#9B4A2B]"
                  : "border-[rgba(155,74,43,0.3)] bg-[rgba(155,74,43,0.08)]"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                  annual ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
            <span
              className={cn(
                "font-[family-name:var(--font-landing-sans)] text-sm font-medium transition-colors duration-200",
                annual ? "text-[#2C1A0E]" : "text-[#8B6B57]"
              )}
            >
              Annual
              <span className="ml-1.5 inline-flex items-center rounded-full bg-[#9B4A2B]/10 px-2 py-0.5 text-xs font-semibold text-[#9B4A2B]">
                Save 35%
              </span>
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-[rgba(155,74,43,0.15)] bg-[rgba(253,248,240,0.9)] p-8">
            <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#8B6B57]">
              Free
            </p>
            <p className="mt-3 font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold text-[#2C1A0E]">
              $0
            </p>
            <p className="font-[family-name:var(--font-landing-sans)] text-sm text-[#8B6B57]">forever</p>
            <Link
              href="/sign-up"
              className="mt-6 flex w-full items-center justify-center rounded-full border border-[rgba(155,74,43,0.3)] bg-transparent py-3 font-[family-name:var(--font-landing-sans)] text-sm font-semibold text-[#2C1A0E] transition-colors hover:bg-[rgba(155,74,43,0.06)]"
            >
              Get started free
            </Link>
            <ul className="mt-8 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-3 font-[family-name:var(--font-landing-sans)] text-sm"
                >
                  {f.included ? (
                    <Check className="h-4 w-4 shrink-0 text-[#9B4A2B]" aria-hidden="true" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-[rgba(155,74,43,0.3)]" aria-hidden="true" />
                  )}
                  <span className={f.included ? "text-[#5C3D2A]" : "text-[#8B6B57]"}>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-[#9B4A2B] bg-[rgba(253,248,240,0.9)] p-8 shadow-[0_8px_32px_rgba(155,74,43,0.16)]">
            <div className="flex items-center justify-between">
              <p className="font-[family-name:var(--font-landing-sans)] text-xs font-semibold uppercase tracking-widest text-[#9B4A2B]">
                Bookly Pro
              </p>
              <span className="rounded-full bg-[#9B4A2B] px-3 py-1 font-[family-name:var(--font-landing-sans)] text-xs font-semibold text-white">
                Most Popular
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <p className="font-[family-name:var(--font-landing-display),Georgia,serif] text-4xl font-semibold text-[#2C1A0E]">
                {annual ? "$3.25" : "$4.99"}
              </p>
              <span className="font-[family-name:var(--font-landing-sans)] text-sm text-[#8B6B57]">/ month</span>
            </div>
            <p className="font-[family-name:var(--font-landing-sans)] text-xs text-[#8B6B57]">
              {annual ? "Billed annually at $39 / year" : "or $39 / year — save 35%"}
            </p>
            <Link
              href="/sign-up"
              className="mt-6 flex w-full items-center justify-center rounded-full bg-[#9B4A2B] py-3 font-[family-name:var(--font-landing-sans)] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(155,74,43,0.28)] transition-colors hover:bg-[#C4763A]"
            >
              Start Pro free trial
            </Link>
            <p className="mt-3 rounded-full border border-[#9B4A2B]/20 bg-[#9B4A2B]/5 px-4 py-1.5 text-center font-[family-name:var(--font-landing-sans)] text-xs font-medium text-[#9B4A2B]">
              Currently available for free (beta)
            </p>
            <ul className="mt-8 space-y-3">
              {PRO_FEATURES.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-3 font-[family-name:var(--font-landing-sans)] text-sm text-[#5C3D2A]"
                >
                  <Check className="h-4 w-4 shrink-0 text-[#9B4A2B]" aria-hidden="true" />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
