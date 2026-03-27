/**
 * This file defines shared TypeScript types for EPUB metadata extracted during
 * upload/parsing. It provides a small contract used by UI and upload helpers.
 */
export interface EpubMetadata {
  title?: string;
  author?: string;
  coverData?: string;
}

