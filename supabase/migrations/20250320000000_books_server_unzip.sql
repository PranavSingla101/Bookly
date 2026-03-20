-- Server-side EPUB extraction: store unzipped tree in Storage and point epub.js at package.opf.
alter table public.books
  add column if not exists extracted_storage_prefix text,
  add column if not exists package_opf_storage_path text;

-- New uploads keep the raw .epub only as extracted files; no single storage_path object.
alter table public.books
  alter column storage_path drop not null;

comment on column public.books.extracted_storage_prefix is
  'Supabase Storage path prefix for the unzipped EPUB directory (e.g. profile_id/book_id).';

comment on column public.books.package_opf_storage_path is
  'Full object path to package.opf inside the books bucket (for public reader URLs).';
