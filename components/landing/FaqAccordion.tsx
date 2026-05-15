"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Which file formats does Bookly support?",
    a: "Bookly supports EPUB files (.epub). We're focused on delivering the best possible EPUB reading experience before expanding to other formats.",
  },
  {
    q: "Does Bookly work offline?",
    a: "Currently, Bookly requires an internet connection to load and sync your library. Offline reading support is on our roadmap.",
  },
  {
    q: "Can I import my existing highlights from Kindle or Apple Books?",
    a: "Not yet — but import tools are planned. You can start capturing new highlights in Bookly today, and we'll offer migration when it's ready.",
  },
  {
    q: "Is my reading data private?",
    a: "Yes. Your books, highlights, and reading progress are stored in your private account and are never shared with or sold to third parties.",
  },
  {
    q: "Can I cancel my Pro plan anytime?",
    a: "Absolutely. Cancel from your account settings at any time. There are no lock-in periods or cancellation fees.",
  },
  {
    q: "Is there a student discount?",
    a: "We're actively working on student and educator pricing. Sign up to be notified when it launches.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-[rgba(155,74,43,0.12)]">
      {faqs.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              className="flex w-full items-center justify-between py-5 text-left"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="pr-6 font-[family-name:var(--font-landing-display),Georgia,serif] text-lg font-semibold text-[#2C1A0E]">
                {item.q}
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-[#9B4A2B] transition-transform duration-300",
                  isOpen && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "max-h-48 pb-5" : "max-h-0"
              )}
            >
              <p className="font-[family-name:var(--font-landing-sans)] text-sm leading-relaxed text-[#5C3D2A]">
                {item.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
