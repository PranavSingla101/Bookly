/**
 * This route handles read, delete, and reading-progress updates for one owned
 * book. It centralizes ownership checks and coordinates book row updates plus
 * related storage cleanup when a book is removed.
 */
import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { BOOKS_BUCKET } from "@/lib/api/books/constants";
import { handleCommonApiError } from "@/lib/api/books/errors";
import { fetchOwnedBook } from "@/lib/api/books/books";
import { parseProgressInput } from "@/lib/api/books/progress";
import { mapDbBookToBookDto } from "@/lib/books/dto";
import { removeStorageFolderPrefix } from "@/lib/supabase/storageTree";

export async function GET(_request: Request, props: RouteContext<"/api/books/[id]">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const { data: row, error } = await fetchOwnedBook(supabase, id, profileId);

    if (error || !row) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ book: mapDbBookToBookDto(row) });
  } catch (error) {
    return handleCommonApiError(error);
  }
}

export async function DELETE(_request: Request, props: RouteContext<"/api/books/[id]">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const { data: existing, error: fetchError } = await fetchOwnedBook(supabase, id, profileId);

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const { error: dbDeleteError } = await supabase
      .from("books")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);

    if (dbDeleteError) {
      return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
    }

    const prefix =
      typeof existing.extracted_storage_prefix === "string"
        ? existing.extracted_storage_prefix.trim()
        : "";

    if (prefix) {
      await removeStorageFolderPrefix(supabase, BOOKS_BUCKET, prefix);
    } else if (
      typeof existing.storage_path === "string" &&
      existing.storage_path.toLowerCase().endsWith(".opf")
    ) {
      const opfPrefix = existing.storage_path.split("/").slice(0, -1).join("/");
      if (opfPrefix) {
        await removeStorageFolderPrefix(supabase, BOOKS_BUCKET, opfPrefix);
      }
    } else if (existing.storage_path) {
      await supabase.storage.from(BOOKS_BUCKET).remove([existing.storage_path]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleCommonApiError(error);
  }
}

export async function PATCH(request: Request, props: RouteContext<"/api/books/[id]">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const parsed = await parseProgressInput(request);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { cfi, progress, clientUpdatedAt } = parsed.data;

    const { data: current, error: fetchError } = await fetchOwnedBook(
      supabase,
      id,
      profileId,
      "id, profile_id, reading_updated_at"
    );

    if (fetchError || !current) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const serverUpdatedAt =
      typeof current.reading_updated_at === "string" ? new Date(current.reading_updated_at) : null;
    if (
      clientUpdatedAt &&
      serverUpdatedAt &&
      !Number.isNaN(serverUpdatedAt.getTime()) &&
      serverUpdatedAt.getTime() > clientUpdatedAt.getTime()
    ) {
      return NextResponse.json({ error: "Reading progress is stale" }, { status: 409 });
    }

    const nextUpdatedAt = new Date().toISOString();
    const { data: updatedRow, error: updateError } = await supabase
      .from("books")
      .update({
        reading_cfi: cfi,
        reading_progress: progress,
        reading_updated_at: nextUpdatedAt,
      })
      .eq("id", id)
      .eq("profile_id", profileId)
      .select("*")
      .single();

    if (updateError || !updatedRow) {
      return NextResponse.json({ error: "Failed to update book progress" }, { status: 500 });
    }

    return NextResponse.json({ book: mapDbBookToBookDto(updatedRow) });
  } catch (error) {
    return handleCommonApiError(error);
  }
}
