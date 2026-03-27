/**
 * This Zustand store manages client-side library state, including book list
 * hydration and local CRUD helpers. Persistence keeps the latest library data
 * available between sessions while cloud APIs remain source of truth.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Book {
  id: string;
  title: string;
  author?: string;
  coverData?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BookState {
  books: Book[];
  setBooks: (books: Book[]) => void;
  addBook: (book: Book) => void;
  removeBook: (id: string) => void;
  updateBook: (id: string, patch: Partial<Book>) => void;
}

export const useBookStore = create<BookState>()(
  persist(
    (set) => ({
      books: [],
      setBooks: (books) => set({ books }),
      addBook: (book) => set((state) => ({ books: [...state.books, book] })),
      removeBook: (id) => set((state) => ({ books: state.books.filter((b) => b.id !== id) })),
      updateBook: (id, patch) =>
        set((state) => ({
          books: state.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
    }),
    {
      name: 'book-storage-v2', // v2 starts fresh after cloud-first migration
      partialize: (state) => ({
        books: state.books,
      }),
    }
  )
);
