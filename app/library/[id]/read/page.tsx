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
  updateBookAnnotation,
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
  const [isSavingAndClosing, setIsSavingAndClosing] = useState(false);
  const [isOpeningAndRestoring, setIsOpeningAndRestoring] = useState(true);

  // Safety timeout: automatically dismiss the opening overlay after 6 seconds to prevent get-stuck scenarios
  useEffect(() => {
    if (!isOpeningAndRestoring) return;
    const timer = setTimeout(() => {
      console.warn("[reader] Opening overlay safety timeout reached, forcing dismissal");
      setIsOpeningAndRestoring(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [isOpeningAndRestoring]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  /** Last CFI we sent to the server — skip duplicate syncs. */
  const lastSyncedCfiRef = useRef<string | null>(null);
  /** Dismiss timer for the restore-error toast. */
  const restoreErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cachedAnnotationsRef = useRef<import("@/lib/books/api").BookAnnotation[] | null>(null);

  // ─── Fetch book data + reader entry in parallel ────────────────────────────
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;

    // Graceful fallback: annotations failure doesn't kill the reader
    const safeAnnotations = fetchBookAnnotations(bookId).catch(() => ({ annotations: [] }));

    void Promise.all([fetchBookReaderEntry(bookId), fetchBook(bookId), safeAnnotations])
      .then(([readerResult, bookResult, annotationsResult]) => {
        if (cancelled) return;

        // Cache for reuse in handleIframeLoad — avoids a second fetch
        cachedAnnotationsRef.current = annotationsResult.annotations;

        // Pick resume CFI: most recent bookmark > last read position > null
        const mostRecentBookmark = annotationsResult.annotations
          .find((a) => a.annotation_type === "bookmark");

        setReaderAssetUrl(readerResult.url);
        setInitialCfi(mostRecentBookmark?.cfi_range ?? bookResult.book.readingCfi ?? null);
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

      // Close and save progress notification from reader.js
      if (data.type === "bookly:close") {
        const { cfi, progress, updatedAt, returnUrl } = data as {
          cfi: string | null;
          progress: number;
          updatedAt: string;
          returnUrl: string;
        };

        setIsSavingAndClosing(true);

        const navigateToReturn = () => {
          window.location.assign(returnUrl);
        };

        if (cfi) {
          // 3-second safety timeout so user is never stuck if the network hangs
          const timeoutId = setTimeout(() => {
            console.warn("[reader] Close progress sync timed out, navigating");
            navigateToReturn();
          }, 3000);

          updateBookProgress({ bookId, cfi, progress, updatedAt, keepalive: true })
            .then(() => {
              clearTimeout(timeoutId);
              navigateToReturn();
            })
            .catch((err) => {
              console.warn("[reader] Close progress sync failed:", err);
              clearTimeout(timeoutId);
              navigateToReturn();
            });
        } else {
          navigateToReturn();
        }
        return;
      }

      // CFI restore failure notification from reader.js
      if (data.type === "bookly:restore-failed") {
        if (restoreErrorTimerRef.current) clearTimeout(restoreErrorTimerRef.current);
        setRestoreError(
          "Reading progress could not be restored. Starting from the beginning."
        );
        restoreErrorTimerRef.current = setTimeout(() => setRestoreError(null), 5000);
        setIsOpeningAndRestoring(false);
        return;
      }

      // Iframe reader is fully ready to render annotations
      if (data.type === "bookly:reader-ready") {
        handleIframeLoad();
        setIsOpeningAndRestoring(false);
        return;
      }

      // Annotation create (highlight or note)
      if (data.type === "bookly:annotation-create") {
        const { cfiRange, annotationType, payload } = data as {
          cfiRange: string;
          annotationType: string;
          payload: Record<string, unknown>;
        };
        createBookAnnotation({ bookId, cfiRange, type: annotationType, payload, keepalive: true })
          .then((result) => {
            if (cachedAnnotationsRef.current) {
              cachedAnnotationsRef.current = [result.annotation, ...cachedAnnotationsRef.current];
            }
            iframeRef.current?.contentWindow?.postMessage(
              { type: "bookly:annotation-saved", cfiRange, annotation: result.annotation },
              "*"
            );
          })
          .catch((err) => console.warn("[reader] Annotation save failed:", err));
        return;
      }

      // Annotation update (color change from annotation popup)
      if (data.type === "bookly:annotation-update") {
        const { id, payload: newPayload } = data as {
          id: string;
          payload: Record<string, unknown>;
        };
        updateBookAnnotation(bookId, id, newPayload, true)
          .then(() => {
            if (cachedAnnotationsRef.current) {
              cachedAnnotationsRef.current = cachedAnnotationsRef.current.map((a) =>
                a.id === id ? { ...a, payload: { ...a.payload, ...newPayload } } : a
              );
            }
          })
          .catch((err) => console.warn("[reader] Annotation update failed:", err));
        return;
      }

      // Bookmark creation (point CFI, no range)
      if (data.type === "bookly:bookmark-create") {
        const { cfi, yOffset } = data as { cfi: string; yOffset: number };
        createBookAnnotation({
          bookId,
          cfiRange: cfi,
          type: "bookmark",
          payload: { label: "Bookmark", yOffset },
          keepalive: true,
        })
          .then((result) => {
            if (cachedAnnotationsRef.current) {
              cachedAnnotationsRef.current = [result.annotation, ...cachedAnnotationsRef.current];
            }
            iframeRef.current?.contentWindow?.postMessage(
              { type: "bookly:bookmark-saved", annotation: result.annotation },
              "*"
            );
          })
          .catch((err) => console.warn("[reader] Bookmark save failed:", err));
        return;
      }

      // Bookmark update
      if (data.type === "bookly:bookmark-update") {
        const { id, payload } = data as {
          id: string;
          payload: Record<string, unknown>;
        };
        updateBookAnnotation(bookId, id, payload, true)
          .then(() => {
            if (cachedAnnotationsRef.current) {
              cachedAnnotationsRef.current = cachedAnnotationsRef.current.map((a) =>
                a.id === id ? { ...a, payload: { ...a.payload, ...payload } } : a
              );
            }
          })
          .catch((err) => console.warn("[reader] Bookmark update failed:", err));
        return;
      }

      // Annotation deletion
      if (data.type === "bookly:annotation-delete") {
        const { id, cfiRange } = data as { id: string; cfiRange: string };
        deleteBookAnnotation(bookId, id, true)
          .then(() => {
            if (cachedAnnotationsRef.current) {
              cachedAnnotationsRef.current = cachedAnnotationsRef.current.filter((a) => a.id !== id);
            }
          })
          .catch((err) => console.warn("[reader] Annotation delete failed:", err));
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
      // Reuse cached annotations if available; only re-fetch if the ref was cleared
      const { annotations } = cachedAnnotationsRef.current !== null
        ? { annotations: cachedAnnotationsRef.current }
        : await fetchBookAnnotations(bookId);

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
      {isSavingAndClosing && (
        <div
          role="alert"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "#0d0a08", // Solid dark background to completely fill the sides and hide reader content
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
          }}
        >
          {/* Beautiful spinning circle using accent primary */}
          <div
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "50%",
              border: "3px solid #2c2118",
              borderTopColor: "#b5703a",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ color: "#f2ede6", fontFamily: "var(--font-sans)", fontSize: "0.95rem", letterSpacing: "0.02em" }}>
            Saving reading progress...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      {isOpeningAndRestoring && (
        <div
          role="alert"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "#0d0a08", // Absolute solid deep background so there is no flash of cover page
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
          }}
        >
          {/* Beautiful spinning circle matching the theme and saving progress overlay */}
          <div
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "50%",
              border: "3px solid #2c2118",
              borderTopColor: "#b5703a",
              animation: "spin-loader 1s linear infinite",
            }}
          />
          <p style={{ color: "#f2ede6", fontFamily: "var(--font-sans)", fontSize: "0.95rem", letterSpacing: "0.02em" }}>
            Opening book...
          </p>
          <style>{`
            @keyframes spin-loader {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
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
