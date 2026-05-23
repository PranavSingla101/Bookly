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
    console.log("[annotations API] PATCH update request for book:", id, "annotation:", annotationId, "profile:", profileId);

    const parsed = await parseAnnotationPatchInput(request);
    if (!parsed.ok) {
      console.error("[annotations API] PATCH parsed failed:", parsed.error);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const update = parsed.data;
    console.log("[annotations API] PATCH parsed update payload:", update);

    const { data, error } = await supabase
      .from("book_annotations")
      .update(update)
      .eq("id", annotationId)
      .eq("book_id", id)
      .eq("profile_id", profileId)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[annotations API] PATCH update error or no data found:", error);
      return NextResponse.json({ error: "Annotation not found or update failed" }, { status: 404 });
    }

    console.log("[annotations API] PATCH update success for ID:", data.id);
    return NextResponse.json({ annotation: data });
  } catch (error) {
    console.error("[annotations API] Unexpected error in PATCH handler:", error);
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
    console.log("[annotations API] DELETE request for book:", id, "annotation:", annotationId, "profile:", profileId);

    const { error } = await supabase
      .from("book_annotations")
      .delete()
      .eq("id", annotationId)
      .eq("book_id", id)
      .eq("profile_id", profileId);

    if (error) {
      console.error("[annotations API] DELETE failed:", error);
      return NextResponse.json({ error: "Failed to delete annotation" }, { status: 500 });
    }

    console.log("[annotations API] DELETE success for ID:", annotationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[annotations API] Unexpected error in DELETE handler:", error);
    return handleCommonApiError(error);
  }
}
