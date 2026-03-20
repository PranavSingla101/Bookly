"use client";

import Link from "next/link";
import { Book as BookStore } from "@/store/useBookStore";
import { Button } from "@/components/ui/button";

interface BookCardProps {
  book: BookStore;
  onDelete: (id: string) => void;
}

export function BookCard({ book, onDelete }: BookCardProps) {
  return (
    <div className="book-card">
      {/* Cover */}
      <div className="book-card-cover">
        {book.readerUrl ? (
          <Link href={`/library/${book.id}/read`} className="book-card-cover-link">
            {book.coverData ? (
              <img
                src={book.coverData}
                alt={book.title}
                className="book-card-cover-img"
              />
            ) : (
              <div className="book-card-cover-placeholder">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="book-card-cover-placeholder-icon"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                <span className="book-card-cover-placeholder-title">{book.title}</span>
              </div>
            )}
          </Link>
        ) : book.coverData ? (
          <img
            src={book.coverData}
            alt={book.title}
            className="book-card-cover-img"
          />
        ) : (
          <div className="book-card-cover-placeholder">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="book-card-cover-placeholder-icon"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <span className="book-card-cover-placeholder-title">{book.title}</span>
          </div>
        )}

        <div className="book-card-overlay">
          {book.readerUrl ? (
            <Button type="button" variant="secondary" size="sm" className="book-card-read-btn" asChild>
              <Link href={`/library/${book.id}/read`}>Read</Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(book.id);
            }}
            className="book-card-delete-btn"
          >
            Remove
          </Button>
        </div>
      </div>

      {/* Title & meta */}
      <div className="book-card-info">
        <span className="book-card-title" title={book.title}>
          {book.title}
        </span>
        {typeof book.readingProgress === "number" ? (
          <span className="text-xs text-muted-foreground">{Math.round(book.readingProgress)}% read</span>
        ) : null}
      </div>
    </div>
  );
}
