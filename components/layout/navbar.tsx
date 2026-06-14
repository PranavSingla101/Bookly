"use client";

import { Search, LayoutGrid, Library } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { UserSettingsDropdown } from "@/components/layout/user-settings-dropdown";

export function Navbar() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <nav
      className="fixed top-6 left-1/2 z-50 flex h-14 w-[90%] max-w-3xl -translate-x-1/2 items-center gap-3 rounded-full border px-4 shadow-2xl backdrop-blur-md md:gap-4 md:px-5"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
      aria-label="Library navigation"
    >
      <div className="flex shrink-0 items-center">
        <Link
          href="/library"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label="Library home"
        >
          <Library className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
          style={{ color: "var(--color-input-placeholder)" }}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search library..."
          className="h-9 w-full rounded-full py-1.5 pl-9 pr-3 text-sm outline-none ring-0 focus-visible:outline-none"
          style={{
            background: "transparent",
            color: "var(--color-input-text)",
          }}
          aria-label="Search library"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
          title="View layout"
          aria-label="View layout"
        >
          <LayoutGrid className="h-[1.125rem] w-[1.125rem]" />
        </button>
        <UserSettingsDropdown />
      </div>
    </nav>
  );
}
