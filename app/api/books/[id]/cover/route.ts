/**
 * Streams the shelf cover image from the `covers` bucket for the authenticated owner.
 */
import { NextResponse } from "next/server";
import { COVERS_BUCKET } from "@/lib/api/books/constants";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { handleCommonApiError } from "@/lib/api/books/errors";
import { fetchOwnedBook } from "@/lib/api/books/books";

function guessImageType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export async function GET(_request: Request, props: RouteContext<"/api/books/[id]/cover">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const { data: row, error } = await fetchOwnedBook(
      supabase,
      id,
      profileId,
      "id, cover_storage_path"
    );

    if (error || !row) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const path =
      typeof row.cover_storage_path === "string" ? row.cover_storage_path.trim() : "";
    if (!path) {
      return NextResponse.json({ error: "Cover is unavailable for this book" }, { status: 404 });
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from(COVERS_BUCKET)
      .download(path);

    if (downloadError || !blob) {
      return NextResponse.json({ error: "Cover not found" }, { status: 404 });
    }

    const type = blob.type || guessImageType(path);

    return new NextResponse(blob, {
      headers: {
        "content-type": type,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleCommonApiError(error);
  }
}
