-- This migration adds columns needed for server-side EPUB extraction metadata.
-- It allows books to reference an extracted storage prefix and package.opf path
-- so the web reader can stream unzipped assets directly from storage.
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
