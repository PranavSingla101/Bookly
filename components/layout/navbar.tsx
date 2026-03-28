"use client";

import { useThemeStore } from "@/store/useThemeStore";
import { Search, LayoutGrid, Settings, Sun, Moon, Library } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <nav
      className="fixed top-6 left-1/2 z-50 flex h-14 w-[90%] max-w-3xl -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-zinc-900/80 px-4 shadow-2xl backdrop-blur-md md:gap-4 md:px-5"
      aria-label="Library navigation"
    >
      <div className="flex shrink-0 items-center">
        <Link
          href="/library"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-white"
          aria-label="Library home"
        >
          <Library className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search library…"
          className="h-9 w-full rounded-full bg-white/5 py-1.5 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none ring-0 transition-colors focus:bg-white/[0.07] focus-visible:outline-none"
          aria-label="Search library"
        />
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="text-zinc-400 transition-colors hover:text-white"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-[1.125rem] w-[1.125rem]" /> : <Moon className="h-[1.125rem] w-[1.125rem]" />}
        </button>
        <button
          type="button"
          className="text-zinc-400 transition-colors hover:text-white"
          title="View layout"
          aria-label="View layout"
        >
          <LayoutGrid className="h-[1.125rem] w-[1.125rem]" />
        </button>
        <button
          type="button"
          className="text-zinc-400 transition-colors hover:text-white"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-[1.125rem] w-[1.125rem]" />
        </button>
      </div>
    </nav>
  );
}
