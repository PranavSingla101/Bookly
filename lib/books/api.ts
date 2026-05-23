/**
 * This module provides client-side API helpers for the books domain, including
 * library fetch/upload/delete, reading progress sync, annotation CRUD, and the
 * reader-entry request used to launch Foliate for a specific book.
 */
import type { Book } from "@/store/useBookStore";

interface BooksResponse {
  books: Book[];
}

interface UploadBookResponse {
  book: Book;
}

interface SingleBookResponse {
  book: Book;
}

interface ProgressUpdateResponse {
  book: Book;
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

interface AnnotationsResponse {
  annotations: BookAnnotation[];
}

interface AnnotationResponse {
  annotation: BookAnnotation;
}

interface ReaderEntryResponse {
  url: string;
}

export class BooksApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BooksApiError";
    this.status = status;
  }
}

/** True when `fetch` was aborted via `AbortController` (user cancel or navigation). */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const json = (await response.json()) as { error?: string; detail?: string };
    const base = json.error ?? fallback;
    return json.detail ? `${base} (${json.detail})` : base;
  } catch {
    return fallback;
  }
}

export async function fetchBook(bookId: string) {
  const response = await fetch(`/api/books/${bookId}`, { cache: "no-store" });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to load book"),
      response.status
    );
  }
  return (await response.json()) as SingleBookResponse;
}

export async function fetchBookReaderEntry(bookId: string) {
  const response = await fetch(`/api/books/${bookId}/reader`, { cache: "no-store" });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to load reader entry"),
      response.status
    );
  }
  return (await response.json()) as ReaderEntryResponse;
}

export async function fetchBooks() {
  const response = await fetch("/api/books", { cache: "no-store" });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to load books"),
      response.status
    );
  }
  return (await response.json()) as BooksResponse;
}

export async function uploadBook(input: {
  file: File;
  title: string;
  author?: string;
  /** Compressed cover image (e.g. WebP); omit when the EPUB has no cover. */
  coverBlob?: Blob | null;
  /** Filename for the cover part (e.g. cover.webp). */
  coverFilename?: string;
  /** Pass to cancel the upload (e.g. user leaves the page or clicks Cancel). */
  signal?: AbortSignal;
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("title", input.title);
  if (input.author) formData.append("author", input.author);
  if (input.coverBlob && input.coverBlob.size > 0) {
    formData.append("cover", input.coverBlob, input.coverFilename ?? "cover.webp");
  }

  const response = await fetch("/api/books/upload", {
    method: "POST",
    body: formData,
    signal: input.signal,
  });

  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to upload book"),
      response.status
    );
  }
  return (await response.json()) as UploadBookResponse;
}

export async function deleteBook(bookId: string) {
  const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to delete book"),
      response.status
    );
  }
}

export async function updateBookMetadata(input: {
  bookId: string;
  title?: string;
  author?: string | null;
}) {
  const body: { title?: string; author?: string | null } = {};
  if (input.title !== undefined) body.title = input.title;
  if (input.author !== undefined) body.author = input.author;

  const response = await fetch(`/api/books/${input.bookId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to update book"),
      response.status
    );
  }
  return (await response.json()) as SingleBookResponse;
}

export async function updateBookProgress(input: {
  bookId: string;
  cfi: string;
  progress?: number;
  updatedAt?: string;
  keepalive?: boolean;
}) {
  const response = await fetch(`/api/books/${input.bookId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      cfi: input.cfi,
      progress: input.progress,
      updatedAt: input.updatedAt,
    }),
    keepalive: input.keepalive,
  });

  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to sync book progress"),
      response.status
    );
  }
  return (await response.json()) as ProgressUpdateResponse;
}

export async function fetchBookAnnotations(bookId: string) {
  const response = await fetch(`/api/books/${bookId}/annotations`, { cache: "no-store" });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to load annotations"),
      response.status
    );
  }
  return (await response.json()) as AnnotationsResponse;
}

export async function createBookAnnotation(input: {
  bookId: string;
  cfiRange: string;
  type: string;
  payload?: Record<string, unknown>;
  keepalive?: boolean;
}) {
  const response = await fetch(`/api/books/${input.bookId}/annotations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      cfiRange: input.cfiRange,
      type: input.type,
      payload: input.payload ?? {},
    }),
    keepalive: input.keepalive,
  });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to create annotation"),
      response.status
    );
  }
  return (await response.json()) as AnnotationResponse;
}

export async function updateBookAnnotation(
  bookId: string,
  annotationId: string,
  payload: Record<string, unknown>,
  keepalive?: boolean
): Promise<void> {
  const response = await fetch(`/api/books/${bookId}/annotations/${annotationId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      payload,
    }),
    keepalive,
  });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to update annotation"),
      response.status
    );
  }
}

export async function deleteBookAnnotation(bookId: string, annotationId: string, keepalive?: boolean) {
  const response = await fetch(`/api/books/${bookId}/annotations/${annotationId}`, {
    method: "DELETE",
    keepalive,
  });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to delete annotation"),
      response.status
    );
  }
}
