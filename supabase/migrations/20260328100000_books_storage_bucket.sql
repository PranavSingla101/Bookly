-- Extracted EPUB assets (OPF spine, HTML, images) live under this private bucket.
insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do nothing;
