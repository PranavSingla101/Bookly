"use client";

import { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Settings, LogOut, Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";

export function UserSettingsDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push("/");
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
        style={{ color: "var(--lib-text-secondary)" }}
        title="Settings"
        aria-label="Settings menu"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Settings className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border shadow-xl backdrop-blur-md"
          style={{
            borderColor: "var(--lib-border)",
            background: "var(--lib-navbar-bg)",
          }}
        >
          {user && (
            <div
              className="border-b px-4 py-3"
              style={{ borderColor: "var(--lib-border)" }}
            >
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--lib-text-primary)" }}
              >
                {user.fullName || user.primaryEmailAddress?.emailAddress}
              </p>
              {user.fullName && user.primaryEmailAddress?.emailAddress && (
                <p
                  className="truncate text-xs"
                  style={{ color: "var(--lib-text-muted)" }}
                >
                  {user.primaryEmailAddress.emailAddress}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            style={{ color: "var(--lib-text-secondary)" }}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          <div style={{ borderTop: "1px solid var(--lib-border)" }} />

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
