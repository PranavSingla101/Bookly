/**
 * This page hosts the in-app EPUB reader for a selected library book. It asks
 * the API for the correct OPF entry URL and then loads Foliate's reader UI in
 * an iframe, with simple loading and error states for clarity.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { fetchBookReaderEntry } from "@/lib/books/api";

export default function BookReaderPage() {
  const params = useParams<{ id: string }>();
  const bookId = params?.id;
  const [readerAssetUrl, setReaderAssetUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;

    void fetchBookReaderEntry(bookId)
      .then((result) => {
        if (cancelled) return;
        setReaderAssetUrl(result.url);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to open reader";
        setErrorMessage(message);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const readerSrc = useMemo(() => {
    if (!readerAssetUrl) return null;
    return `/foliate-js/reader.html?url=${encodeURIComponent(readerAssetUrl)}`;
  }, [readerAssetUrl]);

  if (errorMessage) {
    return <div className="reader-status">{errorMessage}</div>;
  }

  if (!readerSrc) {
    return <div className="reader-status">Opening book...</div>;
  }

  return (
    <iframe
      title="Book reader"
      src={readerSrc}
      className="book-reader-frame"
      allow="fullscreen"
      loading="eager"
    />
  );
}
