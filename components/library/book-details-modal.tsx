"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, Accordion } from "radix-ui";
import {
  ChevronDownIcon,
  DownloadIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import type { Book } from "@/types/books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBytes, formatDateTime } from "@/lib/format/bookUi";
import { BooksApiError, updateBookMetadata } from "@/lib/api/books/client";

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

function safeDownloadFilename(name: string | null | undefined): string {
  const base = name?.trim() || "book.epub";
  return base.replace(/[<>:"/\\|?*]+/g, "_");
}

export interface BookDetailsModalProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookUpdated: (book: Book) => void;
  onDelete: (id: string) => void;
}

export function BookDetailsModal({
  book,
  open,
  onOpenChange,
  onBookUpdated,
  onDelete,
}: BookDetailsModalProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(book.title);
  const [draftAuthor, setDraftAuthor] = useState(book.author ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftTitle(book.title);
    setDraftAuthor(book.author ?? "");
    setEditing(false);
    setSaveError(null);
  }, [open, book.id, book.title, book.author]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const { book: next } = await updateBookMetadata({
        bookId: book.id,
        title: draftTitle.trim() || "Untitled",
        author: draftAuthor.trim() ? draftAuthor.trim() : null,
      });
      onBookUpdated(next);
      setEditing(false);
    } catch (e) {
      const msg =
        e instanceof BooksApiError ? e.message : e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }, [book.id, draftAuthor, draftTitle, onBookUpdated]);

  const handleDelete = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Remove “${book.title}” from your library?`)
    ) {
      return;
    }
    onDelete(book.id);
    onOpenChange(false);
  }, [book.id, book.title, onDelete, onOpenChange]);

  const displayTitle = editing ? draftTitle : book.title;
  const displayAuthor = editing ? draftAuthor : book.author ?? "";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px]"
          )}
        />
        <Dialog.Content
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex max-h-[min(90vh,720px)] w-[min(100vw-1.5rem,520px)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5 duration-200"
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Description className="sr-only">
            Metadata, series, and description for this EPUB in your library.
          </Dialog.Description>

          <div className="relative flex shrink-0 items-center justify-center border-b border-zinc-800/90 px-12 py-4">
            <Dialog.Title className="text-base font-semibold tracking-tight text-zinc-100">
              Book Details
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Close"
              >
                <XIcon className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="flex gap-4">
              <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/10">
                {book.coverData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverData} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-zinc-500">
                    No cover
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {editing ? (
                  <div className="space-y-2">
                    <Input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 text-zinc-100"
                      placeholder="Title"
                      aria-label="Book title"
                    />
                    <Input
                      value={draftAuthor}
                      onChange={(e) => setDraftAuthor(e.target.value)}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 text-zinc-100"
                      placeholder="Author"
                      aria-label="Author"
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setDraftTitle(book.title);
                          setDraftAuthor(book.author ?? "");
                          setEditing(false);
                          setSaveError(null);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold leading-snug text-zinc-50">{displayTitle}</h3>
                    <p className="text-sm text-zinc-400">{displayAuthor || "Unknown author"}</p>
                  </>
                )}
                {saveError ? (
                  <p className="text-xs text-red-400" role="alert">
                    {saveError}
                  </p>
                ) : null}
                {!editing ? (
                  <div className="flex items-center gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="flex size-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                      aria-label="Edit title and author"
                    >
                      <PencilIcon className="size-[18px]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex size-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-950/60 hover:text-red-300"
                      aria-label="Delete book"
                    >
                      <Trash2Icon className="size-[18px]" />
                    </button>
                    <a
                      href={`/api/books/${book.id}/epub`}
                      download={safeDownloadFilename(book.fileName)}
                      className="flex size-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                      aria-label="Download EPUB"
                    >
                      <DownloadIcon className="size-[18px]" />
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

            <Accordion.Root type="multiple" className="mt-6 space-y-2">
              <Accordion.Item
                value="metadata"
                className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-900/40"
              >
                <Accordion.Header className="flex">
                  <Accordion.Trigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-200 outline-none hover:bg-zinc-800/50 [&[data-state=open]>svg]:rotate-180">
                    Metadata
                    <ChevronDownIcon className="size-4 shrink-0 text-zinc-500 transition-transform duration-200" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden border-t border-zinc-800/80">
                  <div className="p-4">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <MetaCell label="Publisher" value="—" />
                      <MetaCell label="Published Date" value="—" />
                      <MetaCell label="Updated Date" value={formatDateTime(book.updatedAt)} />
                      <MetaCell label="Added Date" value={formatDateTime(book.createdAt)} />
                      <MetaCell label="Language" value="—" />
                      <MetaCell label="Subjects" value="—" />
                      <MetaCell label="Format" value="EPUB" />
                      <MetaCell label="File Size" value={formatBytes(book.fileSize)} />
                      <MetaCell label="Identifier" value={book.id} />
                    </dl>
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item
                value="series"
                className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-900/40"
              >
                <Accordion.Header className="flex">
                  <Accordion.Trigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-200 outline-none hover:bg-zinc-800/50 [&[data-state=open]>svg]:rotate-180">
                    Series
                    <ChevronDownIcon className="size-4 shrink-0 text-zinc-500 transition-transform duration-200" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden border-t border-zinc-800/80">
                  <div className="p-4">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <MetaCell label="Series name" value="—" />
                      <MetaCell label="Series index" value="—" />
                    </dl>
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item
                value="description"
                className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-900/40"
              >
                <Accordion.Header className="flex">
                  <Accordion.Trigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-200 outline-none hover:bg-zinc-800/50 [&[data-state=open]>svg]:rotate-180">
                    Description
                    <ChevronDownIcon className="size-4 shrink-0 text-zinc-500 transition-transform duration-200" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden border-t border-zinc-800/80">
                  <p className="p-4 text-sm leading-relaxed text-zinc-400">
                    No description is stored for this title yet. EPUBs are opened with Foliate; extended
                    metadata may be added in a future update.
                  </p>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
