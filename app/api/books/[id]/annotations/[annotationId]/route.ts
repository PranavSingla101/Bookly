/**
 * This route updates or deletes a single annotation belonging to a specific
 * book for the authenticated user. It enforces ownership through profile and
 * book filters before mutating rows in the annotations table.
 */
import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { handleCommonApiError } from "@/lib/api/books/errors";
import { parseAnnotationPatchInput } from "@/lib/api/books/annotations";

export async function PATCH(
  request: Request,
  props: RouteContext<"/api/books/[id]/annotations/[annotationId]">
) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id, annotationId } = await props.params;

    const parsed = await parseAnnotationPatchInput(request);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const update = parsed.data;

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
    return handleCommonApiError(error);
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
    return handleCommonApiError(error);
  }
}
