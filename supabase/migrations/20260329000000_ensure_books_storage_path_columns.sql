-- Idempotent repair: upload API requires these columns; apply if an older DB never ran 20260328000000.
alter table public.books
  add column if not exists epub_storage_path text,
  add column if not exists cover_storage_path text;

comment on column public.books.epub_storage_path is
  'Object path in the epubs bucket (e.g. profile_id/book_id.epub).';

comment on column public.books.cover_storage_path is
  'Object path in the covers bucket (e.g. profile_id/book_id.webp).';

insert into storage.buckets (id, name, public)
values ('epubs', 'epubs', false), ('covers', 'covers', false), ('books', 'books', false)
on conflict (id) do nothing;
