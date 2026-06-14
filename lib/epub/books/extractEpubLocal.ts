// Local-only EPUB parsing with Foliate (no network). Returns metadata + raw cover blob.

import { assertValidEpubFileForUpload, EpubValidationError } from "../validateEpubFile";
import type { EpubUploadMetadata } from "@/types/epub";

function pickDcText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const t = value.trim();
    return t || undefined;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const first = Object.values(value as Record<string, unknown>).find(
      (v) => typeof v === "string" && v.trim().length > 0
    );
    return typeof first === "string" ? first.trim() : undefined;
  }
  return undefined;
}

function metadataFromFilename(file: File): Pick<EpubUploadMetadata, "title" | "author"> {
  const bareName = file.name.replace(/\.[^/.]+$/, "").trim();
  const title = bareName || "Untitled";
  const parts = bareName
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    title,
    author: parts.length > 1 ? parts.slice(1).join(" - ") : undefined,
  };
}

type FoliateEpubInstance = {
  metadata?: {
    title?: unknown;
    author?: Array<{ name?: unknown }>;
  };
  getCover?: () => Promise<Blob | null>;
  destroy?: () => void;
};

/**
 * Parses the EPUB in-browser using Foliate (metadata + cover blob). Call
 * `destroy()` on the Foliate book in `finally` to release internal blob URLs.
 */
export async function extractEpubLocal(file: File): Promise<EpubUploadMetadata> {
  await assertValidEpubFileForUpload(file);

  const fallback = metadataFromFilename(file);

  const { makeBook, UnsupportedTypeError } = await import("../../../packages/foliate-js/view.js");

  let book: FoliateEpubInstance | undefined;
  try {
    try {
      book = (await makeBook(file)) as FoliateEpubInstance;
    } catch (e) {
      if (e instanceof UnsupportedTypeError) {
        throw new EpubValidationError("This file could not be opened as an EPUB.");
      }
      const message = e instanceof Error ? e.message : "Failed to parse EPUB";
      throw new EpubValidationError(message);
    }

    const meta = book.metadata;
    const titleFromMeta = pickDcText(meta?.title);
    const authorFromMeta = meta?.author?.[0] ? pickDcText(meta.author[0].name) : undefined;

    let coverBlob: Blob | null = null;
    try {
      const cover = book.getCover ? await book.getCover() : null;
      if (cover && cover.size > 0) {
        coverBlob = cover;
      }
    } catch {
      // No cover — shelf will use placeholder
    }

    return {
      title: titleFromMeta ?? fallback.title,
      author: authorFromMeta ?? fallback.author,
      coverBlob,
    };
  } finally {
    book?.destroy?.();
  }
}
