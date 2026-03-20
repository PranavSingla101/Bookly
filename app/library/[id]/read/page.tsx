"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EpubReader } from "@/components/library/epub-reader";
import { BooksApiError, fetchBook, updateBookProgress } from "@/lib/books/api";
import { Button } from "@/components/ui/button";
import { useBookStore } from "@/store/useBookStore";

function ReadBookContent({ id }: { id: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readingCfi, setReadingCfi] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const updateBook = useBookStore((state) => state.updateBook);
  const syncInFlightRef = useRef(false);
  const pendingProgressRef = useRef<{ cfi: string; progress?: number } | null>(null);
  const readingUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchBook(id)
      .then(({ book }) => {
        if (cancelled) return;
        setTitle(book.title);
        setReaderUrl(book.readerUrl ?? null);
        setReadingCfi(book.readingCfi ?? null);
        readingUpdatedAtRef.current = book.readingUpdatedAt ?? null;
        if (!book.readerUrl) {
          setError(
            "This book has no unpacked reader URL. Apply the Supabase migration and re-upload the EPUB."
          );
        }
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof BooksApiError && e.status === 401) {
          setError("Sign in to read this book.");
          return;
        }
        setError("Could not load this book.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const syncProgress = useCallback(
    async (payload: { cfi: string; progress?: number }) => {
      if (!payload.cfi) return;

      pendingProgressRef.current = payload;
      if (syncInFlightRef.current) {
        return;
      }

      while (pendingProgressRef.current) {
        const next = pendingProgressRef.current;
        pendingProgressRef.current = null;
        syncInFlightRef.current = true;
        try {
          const { book } = await updateBookProgress({
            bookId: id,
            cfi: next.cfi,
            progress: next.progress,
            updatedAt: readingUpdatedAtRef.current ?? undefined,
          });
          setReadingCfi(book.readingCfi ?? null);
          readingUpdatedAtRef.current = book.readingUpdatedAt ?? null;
          updateBook(id, {
            readingCfi: book.readingCfi,
            readingProgress: book.readingProgress,
            readingUpdatedAt: book.readingUpdatedAt,
          });
        } catch (e) {
          // Conflict (stale) or temporary network errors: keep reading locally.
          if (e instanceof BooksApiError && e.status === 409) {
            continue;
          }
        } finally {
          syncInFlightRef.current = false;
        }
      }
    },
    [id, updateBook]
  );

  return (
    <div className="epub-read-page">
      <header className="epub-read-toolbar">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/library")}>
          ← Library
        </Button>
        <span className="epub-read-title truncate" title={title}>
          {title || "…"}
        </span>
      </header>

      {loading ? (
        <p className="epub-read-status">Opening book…</p>
      ) : error ? (
        <p className="epub-read-status epub-read-error">{error}</p>
      ) : readerUrl ? (
        <EpubReader packageOpfUrl={readerUrl} initialCfi={readingCfi ?? undefined} onProgress={syncProgress} />
      ) : null}
    </div>
  );
}

export default function ReadBookPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;

  if (!id) {
    return (
      <div className="epub-read-page">
        <header className="epub-read-toolbar">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/library")}>
            ← Library
          </Button>
        </header>
        <p className="epub-read-status epub-read-error">Missing book id.</p>
      </div>
    );
  }

  return <ReadBookContent key={id} id={id} />;
}
