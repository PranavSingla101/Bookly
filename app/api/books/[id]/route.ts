import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { mapDbBookToBookDto } from "@/lib/books/dto";
import { removeStorageFolderPrefix } from "@/lib/supabase/storageTree";

const BOOKS_BUCKET = "books";
const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;

export async function GET(_request: Request, props: RouteContext<"/api/books/[id]">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const { data: row, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ book: mapDbBookToBookDto(row) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, props: RouteContext<"/api/books/[id]">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const { data: existing, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

interface ProgressPatchBody {
  cfi?: unknown;
  progress?: unknown;
  updatedAt?: unknown;
}

export async function PATCH(request: Request, props: RouteContext<"/api/books/[id]">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    let body: ProgressPatchBody;
    try {
      body = (await request.json()) as ProgressPatchBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const cfi = typeof body.cfi === "string" ? body.cfi.trim() : "";
    if (!cfi) {
      return NextResponse.json({ error: "Missing cfi" }, { status: 400 });
    }

    const progress =
      typeof body.progress === "number" && Number.isFinite(body.progress)
        ? Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, body.progress))
        : null;

    const clientUpdatedAt =
      typeof body.updatedAt === "string" && body.updatedAt.trim()
        ? new Date(body.updatedAt)
        : null;
    if (clientUpdatedAt && Number.isNaN(clientUpdatedAt.getTime())) {
      return NextResponse.json({ error: "Invalid updatedAt timestamp" }, { status: 400 });
    }

    const { data: current, error: fetchError } = await supabase
      .from("books")
      .select("id, profile_id, reading_updated_at")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

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
      return NextResponse.json({ error: "Failed to update reading progress" }, { status: 500 });
    }

    return NextResponse.json({ book: mapDbBookToBookDto(updatedRow) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
