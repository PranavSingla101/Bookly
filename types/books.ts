export interface Book {
  id: string;
  title: string;
  author?: string;
  coverData?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Reading progress percentage [0, 100] from the server; omit when unknown. */
  readingProgress?: number | null;
  /** Latest EPUB CFI position for cross-device resume. */
  readingCfi?: string | null;
  /** Original upload size in bytes when stored. */
  fileSize?: number | null;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface BookAnnotation {
  id: string;
  book_id: string;
  profile_id: string;
  cfi_range: string;
  annotation_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
