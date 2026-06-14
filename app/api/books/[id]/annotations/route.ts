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

    const { data: book, error: bookError } = await fetchOwnedBook(supabase, id, profileId, "id");

    if (bookError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("book_annotations")
      .select("*")
      .eq("book_id", id)
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load annotations" }, { status: 500 });
    }

    return NextResponse.json({ annotations: data ?? [] });
  } catch (error) {
    return handleCommonApiError(error);
  }
}

export async function POST(request: Request, props: RouteContext<"/api/books/[id]/annotations">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const parsed = await parseAnnotationCreateInput(request);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { cfiRange, annotationType, payload } = parsed.data;

    const { data: book, error: bookError } = await fetchOwnedBook(supabase, id, profileId, "id");

    if (bookError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
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
      return NextResponse.json({ error: "Failed to create annotation" }, { status: 500 });
    }

    return NextResponse.json({ annotation: data }, { status: 201 });
  } catch (error) {
    return handleCommonApiError(error);
  }
}
