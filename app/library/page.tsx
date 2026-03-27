/**
 * This page shows the user's cloud library grid and manages core book actions:
 * initial fetch, EPUB upload, and book removal. It hydrates the Zustand store
 * from API data and renders the library card interface.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useBookStore } from "@/store/useBookStore";
import { BookCard } from "@/components/library/book-card";
import { AddBookCard } from "@/components/library/add-book-card";
import { Navbar } from "@/components/layout/navbar";
import { buildBookFromEpubUpload } from "@/lib/epub";
import { BooksApiError, deleteBook, fetchBooks, uploadBook } from "@/lib/books/api";

export default function LibraryPage() {
  const books = useBookStore((state) => state.books);
  const setBooks = useBookStore((state) => state.setBooks);
  const addBook = useBookStore((state) => state.addBook);
  const removeBook = useBookStore((state) => state.removeBook);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetchBooks()
      .then(({ books: cloudBooks }) => {
        if (cancelled) return;
        setBooks(cloudBooks);
      })
      .catch((error) => {
        if (error instanceof BooksApiError && error.status === 401) {
          if (!cancelled) {
            setBooks([]);
          }
          return;
        }
        console.error("Failed to hydrate cloud library:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setBooks]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const metadata = await buildBookFromEpubUpload(file);
      const { book } = await uploadBook({
        file,
        title: metadata.title,
        author: metadata.author,
        coverData: metadata.coverData,
      });
      addBook(book);
    } catch (error) {
      console.error("Failed to process uploaded file:", error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveBook = (id: string) => {
    removeBook(id);
    void deleteBook(id).catch((error) => {
      console.warn("Book delete encountered an issue:", error);
    });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="library-page">
      <input
        type="file"
        accept=".epub"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      <Navbar onAddBook={triggerFileUpload} fileInputRef={fileInputRef} />

      <div className="library-grid-container">
        <div className="library-grid">
          {isLoading && books.length === 0 ? (
            <div className="text-sm text-muted-foreground">Loading your library...</div>
          ) : null}
          {books.map((book) => (
            <BookCard key={book.id} book={book} onDelete={handleRemoveBook} />
          ))}
          <AddBookCard onClick={triggerFileUpload} />
        </div>
      </div>
    </div>
  );
}
