/**
 * This DTO mapper translates database book rows into frontend-friendly book
 * objects. It isolates null-to-undefined conversion and keeps response shaping
 * consistent for all book API responses.
 */
import type { Book } from "@/store/useBookStore";

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
  reading_cfi?: string | null;
  reading_progress?: number | null;
  reading_updated_at?: string | null;
}

export function mapDbBookToBookDto(row: DbBookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author ?? undefined,
    coverData: row.cover_data ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
