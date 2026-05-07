/**
 * This page shows the user's cloud library grid and manages core book actions:
 * initial fetch, EPUB upload, and book removal. It hydrates the Zustand store
 * from API data and renders the library card interface.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBookStore } from "@/store/useBookStore";
import { BookCard } from "@/components/library/book-card";
import { AddBookCard } from "@/components/library/add-book-card";
import { Navbar } from "@/components/layout/navbar";
import {
  compressCoverForUpload,
  EpubValidationError,
  extractEpubLocal,
} from "@/lib/epub";
import {
  BooksApiError,
  deleteBook,
  fetchBooks,
  isAbortError,
  uploadBook,
} from "@/lib/books/api";

type UploadPhase = "idle" | "extracting" | "compressing_cover" | "uploading";

export default function LibraryPage() {
  const books = useBookStore((state) => state.books);
  const setBooks = useBookStore((state) => state.setBooks);
  const addBook = useBookStore((state) => state.addBook);
  const removeBook = useBookStore((state) => state.removeBook);
  const updateBook = useBookStore((state) => state.updateBook);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewObjectUrlRef = useRef<string | null>(null);
  /** Aborts the in-flight `uploadBook` fetch when the user cancels or the page unmounts. */
  const uploadAbortRef = useRef<AbortController | null>(null);
  /** Avoids setState after unmount when upload finishes or is aborted mid-flight. */
  const mountedRef = useRef(true);
  /** When a new upload starts, older async runs skip `finally` UI reset. */
  const uploadSessionIdRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchBooks()
      .then(({ books: cloudBooks }) => {
        if (cancelled) return;
        // Sort by most recently read/updated — books touched by progress sync float to top
        const sorted = [...cloudBooks].sort((a, b) => {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        });
        setBooks(sorted);
      })
      .catch((error) => {
        if (error instanceof BooksApiError && error.status === 401) {
          if (!cancelled) {
            setBooks([]);
          }
          return;
        }
        console.error("Failed to hydrate cloud library:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setBooks]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      uploadAbortRef.current?.abort();
      uploadAbortRef.current = null;
    };
  }, []);

  const revokeCoverPreview = () => {
    if (coverPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(coverPreviewObjectUrlRef.current);
      coverPreviewObjectUrlRef.current = null;
    }
    setCoverPreviewUrl(null);
  };

  const finishUploadUi = useCallback(() => {
    revokeCoverPreview();
    if (mountedRef.current) {
      setUploadPhase("idle");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    uploadAbortRef.current = null;
  }, [revokeCoverPreview]);

  const handleCancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
  }, []);

  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel free-tier body limit

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      setUploadError(
        `File too large (${sizeMb} MB). Maximum upload size is 4 MB. ` +
        `Try compressing the EPUB or upgrading the hosting plan.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    uploadSessionIdRef.current += 1;
    const sessionId = uploadSessionIdRef.current;

    uploadAbortRef.current?.abort();
    const uploadController = new AbortController();
    uploadAbortRef.current = uploadController;

    if (mountedRef.current) {
      setUploadError(null);
    }
    revokeCoverPreview();

    try {
      if (mountedRef.current) setUploadPhase("extracting");
      const extracted = await extractEpubLocal(file);
      if (!mountedRef.current) return;

      let coverBlob: Blob | null = null;
      let coverFilename = "cover.webp";
      if (extracted.coverBlob && extracted.coverBlob.size > 0) {
        if (mountedRef.current) setUploadPhase("compressing_cover");
        const compressed = await compressCoverForUpload(extracted.coverBlob);
        if (!mountedRef.current) return;
        coverBlob = compressed.blob;
        coverFilename = `cover.${compressed.ext}`;
        const preview = URL.createObjectURL(compressed.blob);
        coverPreviewObjectUrlRef.current = preview;
        if (mountedRef.current) setCoverPreviewUrl(preview);
      }

      if (mountedRef.current) setUploadPhase("uploading");
      const { book } = await uploadBook({
        file,
        title: extracted.title ?? "Untitled",
        author: extracted.author,
        coverBlob,
        coverFilename,
        signal: uploadController.signal,
      });
      if (!mountedRef.current) return;
      addBook(book);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      if (!mountedRef.current) return;
      const message =
        error instanceof EpubValidationError
          ? error.message
          : error instanceof BooksApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to process uploaded file";
      setUploadError(message);
      console.error("Failed to process uploaded file:", error);
    } finally {
      if (uploadSessionIdRef.current !== sessionId) return;
      finishUploadUi();
    }
  };

  const handleRemoveBook = (id: string) => {
    removeBook(id);
    void deleteBook(id).catch((error) => {
      console.warn("Book delete encountered an issue:", error);
    });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const uploadStatusLabel =
    uploadPhase === "extracting"
      ? "Extracting metadata and cover…"
      : uploadPhase === "compressing_cover"
        ? "Optimizing cover image…"
        : uploadPhase === "uploading"
          ? "Uploading EPUB…"
          : null;

  return (
    <div className="min-h-screen transition-colors" style={{ background: 'var(--lib-bg)', color: 'var(--lib-text-primary)' }}>
      <input
        type="file"
        accept=".epub,application/epub+zip"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
        disabled={uploadPhase !== "idle"}
      />

      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-36 md:px-8 md:pt-40">
        {uploadError ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          >
            {uploadError}
          </div>
        ) : null}
        {uploadPhase !== "idle" ? (
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--lib-text-secondary)' }} aria-live="polite">
            {coverPreviewUrl ? (
              <img
                src={coverPreviewUrl}
                alt=""
                className="h-14 w-10 shrink-0 rounded border object-cover"
                style={{ borderColor: 'var(--lib-border)' }}
              />
            ) : null}
            <span className="min-w-0 flex-1">{uploadStatusLabel}</span>
            {uploadPhase === "uploading" ? (
              <button
                type="button"
                onClick={handleCancelUpload}
                className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ borderColor: 'var(--lib-border)', background: 'var(--lib-card-bg)', color: 'var(--lib-text-primary)' }}
              >
                Cancel upload
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {isLoading && books.length === 0 ? (
            <div className="col-span-full text-sm" style={{ color: 'var(--lib-text-muted)' }}>Loading your library…</div>
          ) : null}
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onDelete={handleRemoveBook}
              onBookUpdated={(next) => updateBook(next.id, next)}
            />
          ))}
          <AddBookCard onClick={triggerFileUpload} disabled={uploadPhase !== "idle"} />
        </div>
      </main>
    </div>
  );
}
