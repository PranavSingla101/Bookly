import { isPkZipMagic } from "./epubZipMagic";

export const EPUB_MIME = "application/epub+zip";

/** MIME types browsers commonly send for EPUB or unknown binary uploads */
const ALLOWED_CLIENT_MIME_TYPES = new Set([
  "",
  EPUB_MIME,
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
]);

export class EpubValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EpubValidationError";
  }
}

function normalizeClientMimeType(type: string): string {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Client-side checks before Foliate parses the file: extension, declared MIME, ZIP magic.
 */
export async function assertValidEpubFileForUpload(file: File): Promise<void> {
  const name = file.name.trim();
  if (!name.toLowerCase().endsWith(".epub")) {
    throw new EpubValidationError("Only .epub files are supported.");
  }

  const mime = normalizeClientMimeType(file.type);
  if (!ALLOWED_CLIENT_MIME_TYPES.has(mime)) {
    throw new EpubValidationError(
      `Invalid file type (${file.type || "unknown"}). Expected ${EPUB_MIME} or a known binary upload type.`
    );
  }

  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!isPkZipMagic(head)) {
    throw new EpubValidationError("This file is not a valid EPUB (ZIP) archive.");
  }
}
