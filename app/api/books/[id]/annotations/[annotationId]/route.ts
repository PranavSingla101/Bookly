import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";

interface AnnotationPatchBody {
  cfiRange?: unknown;
  type?: unknown;
  payload?: unknown;
}

export async function PATCH(
  request: Request,
  props: RouteContext<"/api/books/[id]/annotations/[annotationId]">
) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id, annotationId } = await props.params;

    let body: AnnotationPatchBody;
    try {
      body = (await request.json()) as AnnotationPatchBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const update: {
      cfi_range?: string;
      annotation_type?: string;
      payload?: object;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.cfiRange === "string" && body.cfiRange.trim()) {
      update.cfi_range = body.cfiRange.trim();
    }
    if (typeof body.type === "string" && body.type.trim()) {
      update.annotation_type = body.type.trim();
    }
    if (body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)) {
      update.payload = body.payload as object;
    }

    const { data, error } = await supabase
      .from("book_annotations")
      .update(update)
      .eq("id", annotationId)
      .eq("book_id", id)
      .eq("profile_id", profileId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Annotation not found or update failed" }, { status: 404 });
    }

    return NextResponse.json({ annotation: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  props: RouteContext<"/api/books/[id]/annotations/[annotationId]">
) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id, annotationId } = await props.params;

    const { error } = await supabase
      .from("book_annotations")
      .delete()
      .eq("id", annotationId)
      .eq("book_id", id)
      .eq("profile_id", profileId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete annotation" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
