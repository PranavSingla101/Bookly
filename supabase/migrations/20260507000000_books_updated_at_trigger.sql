-- Auto-update books.updated_at on every row change.
-- This ensures library sort-by-recently-read works correctly because
-- saving reading progress (which updates reading_cfi, reading_progress)
-- also bumps updated_at without the application layer having to set it.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS books_set_updated_at ON public.books;
CREATE TRIGGER books_set_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
