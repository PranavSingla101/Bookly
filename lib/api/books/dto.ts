/**
 * This DTO mapper translates database book rows into frontend-friendly book
 * objects. It isolates null-to-undefined conversion and keeps response shaping
 * consistent for all book API responses.
 */
import type { Book } from "@/types/books";

/** Row shape from `books` (works with `select("*")` before/after optional columns are migrated). */
export interface DbBookRow {
  id: string;
  title: string;
  author: string | null;
  cover_data: string | null;
  created_at: string;
  updated_at: string;
  storage_path?: string | null;
  package_opf_storage_path?: string | null;
  /** Path inside `epubs` bucket when using raw-EPUB reader mode. */
  epub_storage_path?: string | null;
  /** Path inside `covers` bucket for shelf thumbnail. */
  cover_storage_path?: string | null;
  reading_cfi?: string | null;
  reading_progress?: number | null;
  reading_updated_at?: string | null;
  file_size?: number | null;
  file_name?: string | null;
  mime_type?: string | null;
}

export function mapDbBookToBookDto(row: DbBookRow): Book {
  const coverFromStorage = row.cover_storage_path
    ? `/api/books/${row.id}/cover`
    : undefined;

  return {
    id: row.id,
    title: row.title,
    author: row.author ?? undefined,
    coverData: coverFromStorage ?? row.cover_data ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readingCfi:
      typeof row.reading_cfi === "string" && row.reading_cfi.trim()
        ? row.reading_cfi
        : null,
    readingProgress:
      typeof row.reading_progress === "number" && Number.isFinite(row.reading_progress)
        ? row.reading_progress
        : null,
    fileSize: typeof row.file_size === "number" ? row.file_size : null,
    fileName: typeof row.file_name === "string" ? row.file_name : null,
    mimeType: typeof row.mime_type === "string" ? row.mime_type : null,
  };
}
