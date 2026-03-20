-- Reading sync metadata and optional annotation primitives for EPUB books.
alter table public.books
  add column if not exists reading_cfi text,
  add column if not exists reading_progress numeric(5, 2),
  add column if not exists reading_updated_at timestamptz;

comment on column public.books.reading_cfi is
  'Latest canonical EPUB CFI location for cross-device resume.';

comment on column public.books.reading_progress is
  'Optional cached progress percentage [0,100] computed client-side from CFI.';

comment on column public.books.reading_updated_at is
  'Timestamp used for last-write-wins conflict resolution of reading state.';

create table if not exists public.book_annotations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cfi_range text not null,
  annotation_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists book_annotations_profile_book_idx
  on public.book_annotations(profile_id, book_id);

create index if not exists book_annotations_book_idx
  on public.book_annotations(book_id);

alter table public.book_annotations enable row level security;

drop policy if exists "book_annotations_select_own" on public.book_annotations;
create policy "book_annotations_select_own"
  on public.book_annotations
  for select
  using (profile_id = (select auth.uid()));

drop policy if exists "book_annotations_insert_own" on public.book_annotations;
create policy "book_annotations_insert_own"
  on public.book_annotations
  for insert
  with check (profile_id = (select auth.uid()));

drop policy if exists "book_annotations_update_own" on public.book_annotations;
create policy "book_annotations_update_own"
  on public.book_annotations
  for update
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "book_annotations_delete_own" on public.book_annotations;
create policy "book_annotations_delete_own"
  on public.book_annotations
  for delete
  using (profile_id = (select auth.uid()));
