/**
 * This route lists and creates annotations for a single owned book. It checks
 * that the book belongs to the signed-in profile and then returns or inserts
 * annotation records scoped to that same profile and book.
 */
import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { handleCommonApiError } from "@/lib/api/books/errors";
import { fetchOwnedBook } from "@/lib/api/books/books";
import { parseAnnotationCreateInput } from "@/lib/api/books/annotations";

export async function GET(_request: Request, props: RouteContext<"/api/books/[id]/annotations">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;
    console.log("[annotations API] GET request for book:", id, "profile:", profileId);

    const { data: book, error: bookError } = await fetchOwnedBook(supabase, id, profileId, "id");

    if (bookError || !book) {
      console.error("[annotations API] GET book not found or error:", bookError);
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("book_annotations")
      .select("*")
      .eq("book_id", id)
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[annotations API] GET annotations select error:", error);
      return NextResponse.json({ error: "Failed to load annotations" }, { status: 500 });
    }

    console.log("[annotations API] GET annotations success, count:", data?.length ?? 0);
    return NextResponse.json({ annotations: data ?? [] });
  } catch (error) {
    console.error("[annotations API] Unexpected error in GET handler:", error);
    return handleCommonApiError(error);
  }
}

export async function POST(request: Request, props: RouteContext<"/api/books/[id]/annotations">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;
    console.log("[annotations API] POST create request for book:", id, "profile:", profileId);

    const parsed = await parseAnnotationCreateInput(request);
    if (!parsed.ok) {
      console.error("[annotations API] POST parse failed:", parsed.error);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { cfiRange, annotationType, payload } = parsed.data;
    console.log("[annotations API] POST parsed input payload:", { cfiRange, annotationType, payload });

    const { data: book, error: bookError } = await fetchOwnedBook(supabase, id, profileId, "id");

    if (bookError || !book) {
      console.error("[annotations API] POST book not found or error:", bookError);
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    console.log("[annotations API] POST inserting to Supabase 'book_annotations'...");
    const { data, error } = await supabase
      .from("book_annotations")
      .insert({
        book_id: id,
        profile_id: profileId,
        cfi_range: cfiRange,
        annotation_type: annotationType,
        payload,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("[annotations API] POST insert error or no data returned:", error);
      return NextResponse.json({ error: "Failed to create annotation" }, { status: 500 });
    }

    console.log("[annotations API] POST create success. New ID:", data.id);
    return NextResponse.json({ annotation: data }, { status: 201 });
  } catch (error) {
    console.error("[annotations API] Unexpected error in POST handler:", error);
    return handleCommonApiError(error);
  }
}
