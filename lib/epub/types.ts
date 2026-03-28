/**
 * This file defines shared TypeScript types for EPUB metadata extracted during
 * upload/parsing. It provides a small contract used by UI and upload helpers.
 */
export interface EpubUploadMetadata {
  title: string;
  author?: string;
  /** Raw cover image from the EPUB package, before compression for storage. */
  coverBlob: Blob | null;
}
