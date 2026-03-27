/**
 * This route returns the entry URL that Foliate.js should open for a specific
 * book in the signed-in user's library. It verifies ownership, derives the
 * OPF-relative path, and maps it to the protected content proxy endpoint.
 */
import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { handleCommonApiError } from "@/lib/api/books/errors";
import { fetchOwnedBook } from "@/lib/api/books/books";

function buildBookOpfAssetUrl(bookId: string, row: Record<string, unknown>): string | null {
  const prefix =
    typeof row.extracted_storage_prefix === "string" ? row.extracted_storage_prefix.trim() : "";
  if (!prefix) return null;

  const opfPathRaw =
    typeof row.package_opf_storage_path === "string" && row.package_opf_storage_path.trim()
      ? row.package_opf_storage_path.trim()
      : typeof row.storage_path === "string"
        ? row.storage_path.trim()
        : "";
  if (!opfPathRaw) return null;

  const prefixedPath = `${prefix}/`;
  if (!opfPathRaw.startsWith(prefixedPath)) return null;

  const relativePath = opfPathRaw.slice(prefixedPath.length);
  if (!relativePath) return null;

  const encodedPath = relativePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  if (!encodedPath) return null;

  return `/api/books/${bookId}/content/${encodedPath}`;
}

export async function GET(_request: Request, props: RouteContext<"/api/books/[id]/reader">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const { data: row, error } = await fetchOwnedBook(
      supabase,
      id,
      profileId,
      "id, storage_path, package_opf_storage_path, extracted_storage_prefix"
    );

    if (error || !row) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const url = buildBookOpfAssetUrl(id, row as Record<string, unknown>);
    if (!url) {
      return NextResponse.json({ error: "Book reader entry is unavailable" }, { status: 400 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    return handleCommonApiError(error);
  }
}
