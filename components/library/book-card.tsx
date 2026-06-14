/**
 * Library book card: framed cover on top; title, progress, and settings sit below with
 * no panel (transparent, inherits page background). Cover links to Foliate; gear opens details.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import type { Book } from "@/types/books";
import { BookDetailsModal } from "@/components/library/book-details-modal";
import { formatReadingPercent } from "@/lib/format/bookUi";

interface BookCardProps {
  book: Book;
  onDelete: (id: string) => void;
  onBookUpdated: (book: Book) => void;
}

export function BookCard({ book, onDelete, onBookUpdated }: BookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="group flex w-full flex-col transition-transform duration-200 group-hover:-translate-y-0.5">
      <Link
        href={`/library/${book.id}/read`}
        className="relative block aspect-[2/3] w-full shrink-0 overflow-hidden rounded-xl border shadow-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        aria-label={`Open ${book.title} in reader`}
      >
        {book.coverData && !coverFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverData}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 opacity-40"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <span className="line-clamp-3 text-[10px] font-medium leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
              {book.title}
            </span>
          </div>
        )}
      </Link>

      <div className="flex min-h-0 flex-col gap-2 bg-transparent px-0 pt-3">
        <p
          className="min-w-0 truncate text-sm font-semibold leading-snug"
          style={{ color: 'var(--color-text-primary)' }}
          title={book.title}
        >
          {book.title}
        </p>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
            {formatReadingPercent(book.readingProgress)}
          </span>
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Book details"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDetailsOpen(true);
            }}
          >
            <Settings className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <BookDetailsModal
        book={book}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onBookUpdated={onBookUpdated}
        onDelete={onDelete}
      />
    </div>
  );
}
