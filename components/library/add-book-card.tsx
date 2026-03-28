"use client";

import { Plus } from "lucide-react";

interface AddBookCardProps {
  onClick: () => void;
  disabled?: boolean;
}

export function AddBookCard({ onClick, disabled }: AddBookCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Add a new book"
      aria-label="Add a new book"
      aria-busy={disabled ? true : undefined}
      className="group flex aspect-[2/3] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700/50 bg-transparent text-zinc-500 transition-all hover:bg-zinc-800/30 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-40"
    >
      <Plus className="h-8 w-8 stroke-[1.5] transition-colors group-hover:text-zinc-400" />
    </button>
  );
}
