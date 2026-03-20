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

export class BooksApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BooksApiError";
    this.status = status;
  }
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
  coverData?: string;
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("title", input.title);
  if (input.author) formData.append("author", input.author);
  if (input.coverData) formData.append("coverData", input.coverData);

  const response = await fetch("/api/books/upload", {
    method: "POST",
    body: formData,
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

export async function updateBookProgress(input: {
  bookId: string;
  cfi: string;
  progress?: number;
  updatedAt?: string;
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
  });

  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to sync reading progress"),
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
  });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to create annotation"),
      response.status
    );
  }
  return (await response.json()) as AnnotationResponse;
}

export async function updateBookAnnotation(input: {
  bookId: string;
  annotationId: string;
  cfiRange?: string;
  type?: string;
  payload?: Record<string, unknown>;
}) {
  const response = await fetch(`/api/books/${input.bookId}/annotations/${input.annotationId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      cfiRange: input.cfiRange,
      type: input.type,
      payload: input.payload,
    }),
  });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to update annotation"),
      response.status
    );
  }
  return (await response.json()) as AnnotationResponse;
}

export async function deleteBookAnnotation(bookId: string, annotationId: string) {
  const response = await fetch(`/api/books/${bookId}/annotations/${annotationId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new BooksApiError(
      await parseErrorMessage(response, "Failed to delete annotation"),
      response.status
    );
  }
}
