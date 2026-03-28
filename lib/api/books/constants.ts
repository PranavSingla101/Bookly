/**
 * This file defines shared constants for books APIs, including the storage
 * bucket name and accepted progress bounds used by progress parsing logic.
 */
export const BOOKS_BUCKET = "books";
/** Raw packaged EPUB files (one object per book). */
export const EPUBS_BUCKET = "epubs";
/** Optimized cover images (WebP/JPEG). */
export const COVERS_BUCKET = "covers";
export const MIN_PROGRESS = 0;
export const MAX_PROGRESS = 100;
