import type { Book } from "@/store/useBookStore";
import { publicBooksObjectUrl } from "@/lib/books/storagePublicUrl";

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
  const opfPath =
    row.package_opf_storage_path ??
    (typeof row.storage_path === "string" && row.storage_path.toLowerCase().endsWith(".opf")
      ? row.storage_path
      : null);

  let readerUrl: string | undefined;
  if (opfPath) {
    try {
      readerUrl = publicBooksObjectUrl(opfPath);
    } catch {
      readerUrl = undefined;
    }
  }

  return {
    id: row.id,
    title: row.title,
    author: row.author ?? undefined,
    coverData: row.cover_data ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readerUrl,
    readingCfi: row.reading_cfi ?? undefined,
    readingProgress:
      typeof row.reading_progress === "number" ? row.reading_progress : undefined,
    readingUpdatedAt: row.reading_updated_at ?? undefined,
  };
}
