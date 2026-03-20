"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddBookCardProps {
  onClick: () => void;
}

export function AddBookCard({ onClick }: AddBookCardProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      className="add-book-card"
      title="Add a new book"
    >
      <div className="add-book-card-inner">
        <Plus size={32} strokeWidth={1.5} />
      </div>
    </Button>
  );
}
