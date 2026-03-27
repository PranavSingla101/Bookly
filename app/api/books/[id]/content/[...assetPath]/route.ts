/**
 * This route serves extracted EPUB assets (OPF/xhtml/css/images) to the reader
 * for a single owned book. It validates the current user, sanitizes the asset
 * path, and streams the corresponding object from Supabase storage.
 */
import { NextResponse } from "next/server";
import { BOOKS_BUCKET } from "@/lib/api/books/constants";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { handleCommonApiError } from "@/lib/api/books/errors";
import { fetchOwnedBook } from "@/lib/api/books/books";

function normalizeAssetPath(segments: string[]): string | null {
  if (segments.length === 0) return null;

  const sanitized: string[] = [];
  for (const segment of segments) {
    const value = decodeURIComponent(segment).trim();
    if (!value || value === "." || value === "..") return null;
    if (value.includes("/") || value.includes("\\")) return null;
    sanitized.push(value);
  }

  return sanitized.join("/");
}

export async function GET(
  _request: Request,
  props: RouteContext<"/api/books/[id]/content/[...assetPath]">
) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id, assetPath } = await props.params;
    const normalizedRelativePath = normalizeAssetPath(assetPath);
    if (!normalizedRelativePath) {
      return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
    }

    const { data: row, error } = await fetchOwnedBook(
      supabase,
      id,
      profileId,
      "id, extracted_storage_prefix"
    );

    if (error || !row) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const prefix =
      typeof row.extracted_storage_prefix === "string" ? row.extracted_storage_prefix.trim() : "";
    if (!prefix) {
      return NextResponse.json({ error: "Book content is unavailable" }, { status: 400 });
    }

    const storageObjectPath = `${prefix}/${normalizedRelativePath}`;
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BOOKS_BUCKET)
      .download(storageObjectPath);

    if (downloadError || !blob) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return new NextResponse(blob, {
      headers: {
        "content-type": blob.type || "application/octet-stream",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleCommonApiError(error);
  }
}
