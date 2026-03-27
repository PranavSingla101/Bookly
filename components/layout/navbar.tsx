"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/useThemeStore";
import { Search, Plus, LayoutGrid, MessageCircle, Menu, Sun, Moon, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface NavbarProps {
  onAddBook?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function Navbar({ onAddBook }: NavbarProps) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <nav className="navbar-container">
      <div className="navbar-inner">
        <div className="navbar-section navbar-logo">
          <Link href="/library" aria-label="Bookly home">
            <Image
              src="/bookly logo no bg.png"
              alt="Bookly logo"
              width={26}
              height={26}
              className="navbar-logo-img"
              priority
            />
          </Link>
        </div>

        {/* Search bar (center) */}
        <div className="navbar-section navbar-center">
          <div className="navbar-search-wrapper">
            <Search className="navbar-search-icon" />
            <Input type="search" placeholder="Search..." className="navbar-search-input" />
          </div>
        </div>

        <span className="navbar-pipe" aria-hidden="true">
          |
        </span>

        {/* Right side icons */}
        <div className="navbar-section navbar-actions">
          <Button
            variant="ghost"
            size="icon-sm"
            className="navbar-icon-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="navbar-icon-btn"
            onClick={onAddBook}
            title="Add Book"
          >
            <Plus size={16} />
          </Button>

          <Button variant="ghost" size="icon-sm" className="navbar-icon-btn" title="Change View">
            <LayoutGrid size={16} />
          </Button>

          <Button variant="ghost" size="icon-sm" className="navbar-icon-btn" title="Notes / Chat">
            <MessageCircle size={16} />
          </Button>

          <Button variant="ghost" size="icon-sm" className="navbar-icon-btn" title="Settings">
            <Settings size={16} />
          </Button>

          <Button variant="ghost" size="icon-sm" className="navbar-icon-btn" title="Menu">
            <Menu size={16} />
          </Button>
        </div>
      </div>
    </nav>
  );
}
