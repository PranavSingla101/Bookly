const BOOKS_BUCKET = "books";

/**
 * Public URL for an object in the `books` bucket. Requires the bucket (or path) to be publicly readable
 * so epub.js can fetch the OPF and relative chapter assets.
 */
export function publicBooksObjectUrl(objectPath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.replace(
    /\/$/,
    ""
  );
  if (!base) {
    throw new Error("SUPABASE URL is required for reader URLs");
  }
  const encoded = objectPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${BOOKS_BUCKET}/${encoded}`;
}
