/**
 * Streams the raw EPUB bytes for books stored in the `epubs` bucket (Foliate can open this URL).
 */
import { NextResponse } from "next/server";
import { EPUBS_BUCKET } from "@/lib/api/books/constants";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { handleCommonApiError } from "@/lib/api/books/errors";
import { fetchOwnedBook } from "@/lib/api/books/books";

export async function GET(_request: Request, props: RouteContext<"/api/books/[id]/epub">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const { data: row, error } = await fetchOwnedBook(
      supabase,
      id,
      profileId,
      "id, epub_storage_path"
    );

    if (error || !row) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const path =
      typeof row.epub_storage_path === "string" ? row.epub_storage_path.trim() : "";
    if (!path) {
      return NextResponse.json({ error: "EPUB file is unavailable for this book" }, { status: 400 });
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from(EPUBS_BUCKET)
      .download(path);

    if (downloadError || !blob) {
      return NextResponse.json({ error: "EPUB file not found" }, { status: 404 });
    }

    return new NextResponse(blob, {
      headers: {
        "content-type": "application/epub+zip",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleCommonApiError(error);
  }
}
