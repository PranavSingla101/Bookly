/**
 * Hosts the Foliate EPUB reader iframe. Fetches the book record (including
 * last CFI) in parallel with the reader entry URL, injects the CFI for
 * position restore, and wires a postMessage bridge for progress sync and
 * annotation CRUD so the iframe never needs direct API access.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  fetchBook,
  fetchBookAnnotations,
  fetchBookReaderEntry,
  updateBookProgress,
  createBookAnnotation,
  deleteBookAnnotation,
} from "@/lib/books/api";

export default function BookReaderPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const bookId = params?.id;

  const [readerAssetUrl, setReaderAssetUrl] = useState<string | null>(null);
  const [initialCfi, setInitialCfi] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  /** Last CFI we sent to the server — skip duplicate syncs. */
  const lastSyncedCfiRef = useRef<string | null>(null);
  /** Dismiss timer for the restore-error toast. */
  const restoreErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch book data + reader entry in parallel ────────────────────────────
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;

    void Promise.all([fetchBookReaderEntry(bookId), fetchBook(bookId)])
      .then(([readerResult, bookResult]) => {
        if (cancelled) return;
        setReaderAssetUrl(readerResult.url);
        setInitialCfi(bookResult.book.readingCfi ?? null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[book reader] fetch failed", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to open reader"
        );
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // ─── postMessage bridge (progress + annotations) ───────────────────────────
  useEffect(() => {
    if (!bookId) return;

    const handler = async (event: MessageEvent) => {
      const { data } = event;
      if (!data?.type) return;

      // Progress sync from Foliate relocate event
      if (data.type === "bookly:progress") {
        const { cfi, progress, updatedAt } = data as {
          cfi: string;
          progress: number;
          updatedAt: string;
        };
        if (!cfi || cfi === lastSyncedCfiRef.current) return;
        lastSyncedCfiRef.current = cfi;
        updateBookProgress({ bookId, cfi, progress, updatedAt }).catch((err) => {
          console.warn("[reader] Progress sync failed:", err);
        });
        return;
      }

      // CFI restore failure notification from reader.js
      if (data.type === "bookly:restore-failed") {
        if (restoreErrorTimerRef.current) clearTimeout(restoreErrorTimerRef.current);
        setRestoreError(
          "Reading progress could not be restored. Starting from the beginning."
        );
        restoreErrorTimerRef.current = setTimeout(() => setRestoreError(null), 5000);
        return;
      }

      // Annotation create (highlight or note)
      if (data.type === "bookly:annotation-create") {
        const { cfiRange, annotationType, payload } = data as {
          cfiRange: string;
          annotationType: string;
          payload: Record<string, unknown>;
        };
        createBookAnnotation({ bookId, cfiRange, type: annotationType, payload }).catch(
          (err) => console.warn("[reader] Annotation save failed:", err)
        );
        return;
      }

      // Bookmark creation (point CFI, no range)
      if (data.type === "bookly:bookmark-create") {
        const { cfi } = data as { cfi: string };
        createBookAnnotation({
          bookId,
          cfiRange: cfi,
          type: "bookmark",
          payload: { label: "Bookmark" },
        }).catch((err) => console.warn("[reader] Bookmark save failed:", err));
        return;
      }

      // Annotation deletion
      if (data.type === "bookly:annotation-delete") {
        const { id, cfiRange } = data as { id: string; cfiRange: string };
        deleteBookAnnotation(bookId, id).catch((err) =>
          console.warn("[reader] Annotation delete failed:", err)
        );
        // Tell the reader iframe to remove the rendered highlight
        iframeRef.current?.contentWindow?.postMessage(
          { type: "bookly:remove-annotation", cfiRange },
          "*"
        );
        return;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [bookId]);

  // ─── Load existing annotations once the iframe is ready ───────────────────
  const handleIframeLoad = useCallback(async () => {
    if (!bookId) return;
    try {
      const { annotations } = await fetchBookAnnotations(bookId);
      iframeRef.current?.contentWindow?.postMessage(
        { type: "bookly:load-annotations", annotations },
        "*"
      );
    } catch (err) {
      console.warn("[reader] Failed to load annotations:", err);
    }
  }, [bookId]);

  // ─── Build reader iframe src ───────────────────────────────────────────────
  const readerSrc = useMemo(() => {
    if (!readerAssetUrl) return null;
    const q = new URLSearchParams();
    const epubUrl =
      typeof window !== "undefined"
        ? new URL(readerAssetUrl, window.location.origin).href
        : readerAssetUrl;
    q.set("url", epubUrl);
    q.set("return", "/library");

    // Reading mode params forwarded from URL
    const readerMode = searchParams.get("mode");
    if (readerMode === "paginated" || readerMode === "scrolled" || readerMode === "continuous") {
      q.set("mode", readerMode);
    }
    const flow = searchParams.get("flow");
    if (
      flow === "paginated" ||
      flow === "pages" ||
      flow === "scroll" ||
      flow === "scrolled"
    ) {
      q.set("flow", flow);
    }
    const continuousScroll = searchParams.get("continuousScroll");
    if (
      continuousScroll === "0" ||
      continuousScroll === "false" ||
      continuousScroll === "off"
    ) {
      q.set("continuousScroll", "0");
    } else if (
      continuousScroll === "1" ||
      continuousScroll === "true" ||
      continuousScroll === "on"
    ) {
      q.set("continuousScroll", "1");
    }

    // Pass last known CFI so Foliate can restore position
    if (initialCfi) {
      q.set("cfi", initialCfi);
    }

    return `/foliate-js/reader.html?${q.toString()}`;
  }, [readerAssetUrl, searchParams, initialCfi]);

  // ─── Error state ───────────────────────────────────────────────────────────
  if (errorMessage) {
    return (
      <div className="reader-status">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <p style={{ color: "#a1a1aa", margin: 0 }}>{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              background: "#3f3f46",
              color: "#e4e4e7",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Retry
          </button>
          <a
            href="/library"
            style={{ color: "#71717a", fontSize: "0.875rem" }}
          >
            ← Back to Library
          </a>
        </div>
      </div>
    );
  }

  if (!readerSrc) {
    return <div className="reader-status">Opening book…</div>;
  }

  return (
    <div className="book-reader-shell">
      {restoreError && (
        <div
          role="alert"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "#27272a",
            color: "#e4e4e7",
            padding: "0.6rem 1.1rem",
            borderRadius: "0.6rem",
            fontSize: "0.82rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {restoreError}
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Book reader"
        src={readerSrc}
        className="book-reader-frame"
        allow="fullscreen"
        loading="eager"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
