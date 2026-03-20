"use client";

import { useEffect, useRef } from "react";
import type { Book, Rendition } from "epubjs";

interface EpubReaderProps {
  packageOpfUrl: string;
  initialCfi?: string;
  onProgress?: (input: { cfi: string; progress?: number }) => void;
}

/**
 * Resolve a URL relative to a base URL string.
 * Returns the original url if it's already absolute or a data URI.
 */
function resolveUrl(url: string, base: string): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:") || url.includes("://")) {
    return url;
  }
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/**
 * epub.js's continuous manager uses srcdoc iframes, which ignore <base href>.
 * This hook rewrites all relative resource URLs to absolute before the document
 * is injected into the iframe, so images/CSS/fonts load correctly from Supabase.
 */
function injectAbsoluteUrls(
  doc: ParentNode,
  section?: { url?: string },
): void {
  const base = section?.url;
  if (!base) return;

  // img src
  doc.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", resolveUrl(src, base));
  });

  // SVG image xlink:href and href
  doc.querySelectorAll("image").forEach((img) => {
    const xlinkHref = img.getAttribute("xlink:href");
    if (xlinkHref) img.setAttribute("xlink:href", resolveUrl(xlinkHref, base));
    const href = img.getAttribute("href");
    if (href) img.setAttribute("href", resolveUrl(href, base));
  });

  // link[rel=stylesheet] href
  doc.querySelectorAll("link[rel='stylesheet'][href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (href) link.setAttribute("href", resolveUrl(href, base));
  });

  // Inline CSS background-image URLs (crude but effective)
  doc.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    const replaced = style.replace(/url\(['"]?([^'")]+)['"]?\)/g, (_match, u: string) => {
      return `url("${resolveUrl(u, base)}")`;
    });
    if (replaced !== style) el.setAttribute("style", replaced);
  });

  // source[src] inside picture/video/audio
  doc.querySelectorAll("source[src]").forEach((src) => {
    const s = src.getAttribute("src");
    if (s) src.setAttribute("src", resolveUrl(s, base));
  });
}

export function EpubReader({ packageOpfUrl, initialCfi, onProgress }: EpubReaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const lastLocationRef = useRef<{ cfi: string; progress?: number } | null>(null);

  useEffect(() => {
    if (!packageOpfUrl || !rootRef.current) return;

    const el = rootRef.current;
    let cancelled = false;
    let locationSaveEnabled = false;

    const scheduleProgressFlush = () => {
      if (!onProgress || !locationSaveEnabled) return;
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        if (lastLocationRef.current) {
          onProgress(lastLocationRef.current);
        }
      }, 2500);
    };

    const flushProgressNow = () => {
      if (!onProgress || !locationSaveEnabled || !lastLocationRef.current) return;
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      onProgress(lastLocationRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushProgressNow();
      }
    };
    window.addEventListener("pagehide", flushProgressNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void (async () => {
      const epubModule = await import("epubjs");
      if (cancelled) return;
      const book = epubModule.default(packageOpfUrl) as Book;
      bookRef.current = book;

      await book.ready;
        if (cancelled || !el) {
          book.destroy();
          bookRef.current = null;
          return;
        }

        // fullsize + scrolled continuous scroll — the outer page scrolls through all chapters.
        type RenderOpts = NonNullable<Parameters<Book["renderTo"]>[1]> & {
          fullsize?: boolean;
        };
        const renderOpts: RenderOpts = {
          manager: "continuous",
          flow: "scrolled",
          width: "100%",
          height: "100%",
          spread: "none",
          allowScriptedContent: true,
        };
        const rendition = book.renderTo(el, renderOpts) as Rendition;
        renditionRef.current = rendition;

        // The continuous manager uses srcdoc iframes which ignore <base href>,
        // so relative image/CSS URLs break. We fix this by rewriting all relative
        // resource attributes to absolute URLs in a content hook, before the
        // srcdoc is written into the iframe.
        rendition.hooks.content.register((viewLike: unknown) => {
          try {
            const view = viewLike as
              | { document?: ParentNode; section?: { url?: string } }
              | undefined;
            const doc = view?.document;
            if (!doc || typeof (doc as ParentNode).querySelectorAll !== "function") {
              return;
            }
            injectAbsoluteUrls(doc, view?.section);
          } catch {
            // Don't fail reader render because of optional URL rewriting.
          }
        });

        // Clean reading styles injected into every chapter.
        rendition.themes.default({
          "body, html": {
            margin: "0 !important",
            padding: "0 !important",
            "background-color": "transparent !important",
          },
          body: {
            "max-width": "680px",
            margin: "0 auto !important",
            padding: "24px 32px !important",
            "font-size": "18px",
            "line-height": "1.75",
            "font-family": "Georgia, 'Times New Roman', serif",
            color: "#1a1a1a",
          },
          p: {
            "margin-top": "0",
            "margin-bottom": "1em",
          },
          "img, svg, image": {
            "max-width": "100%",
            height: "auto",
            display: "block",
            margin: "1em auto",
          },
        });

        // Generate locations once so we can map CFI -> percentage.
        // Keep this async and non-blocking so first paint remains fast.
        void book.locations
          .generate(1024)
          .then(() => {
            locationSaveEnabled = true;
          })
          .catch(() => {
            locationSaveEnabled = true;
          });

        rendition.on("relocated", (location: { start?: { cfi?: string } }) => {
          const cfi = location.start?.cfi;
          if (!cfi) return;
          let progress: number | undefined;
          try {
            const fraction = book.locations.percentageFromCfi(cfi);
            if (Number.isFinite(fraction)) {
              progress = Math.min(100, Math.max(0, Number((fraction * 100).toFixed(2))));
            }
          } catch {
            progress = undefined;
          }
          lastLocationRef.current = { cfi, progress };
          scheduleProgressFlush();
        });

        // Resume from server-synced CFI when available, else start at cover.
        const startCfi = initialCfi?.trim();
        if (startCfi) {
          void rendition.display(startCfi).catch(() => rendition.display(0));
        } else {
          void rendition.display(0);
        }
    })().catch(() => {
      if (!cancelled && el) {
        el.innerHTML =
          '<p style="padding:24px;color:#e74c3c">Failed to load book. The file may be corrupted.</p>';
      }
    });

    return () => {
      cancelled = true;
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flushProgressNow();
      window.removeEventListener("pagehide", flushProgressNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      bookRef.current?.destroy();
      bookRef.current = null;
      renditionRef.current = null;
      lastLocationRef.current = null;
    };
  }, [initialCfi, onProgress, packageOpfUrl]);

  return <div className="epub-reader-host" ref={rootRef} />;
}
