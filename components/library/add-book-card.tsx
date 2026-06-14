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
      className="group flex aspect-[2/3] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed bg-transparent transition-all disabled:pointer-events-none disabled:opacity-40"
      style={{ borderColor: 'var(--color-card-alt-border)', color: 'var(--color-text-muted)' }}
    >
      <Plus className="h-8 w-8 stroke-[1.5] transition-colors" />
    </button>
  );
}
