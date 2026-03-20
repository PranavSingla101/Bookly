import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";

interface AnnotationBody {
  cfiRange?: unknown;
  type?: unknown;
  payload?: unknown;
}

export async function GET(_request: Request, props: RouteContext<"/api/books/[id]/annotations">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function POST(request: Request, props: RouteContext<"/api/books/[id]/annotations">) {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { id } = await props.params;

    let body: AnnotationBody;
    try {
      body = (await request.json()) as AnnotationBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const cfiRange = typeof body.cfiRange === "string" ? body.cfiRange.trim() : "";
    const annotationType = typeof body.type === "string" ? body.type.trim() : "";
    if (!cfiRange || !annotationType) {
      return NextResponse.json({ error: "Missing cfiRange or type" }, { status: 400 });
    }

    const payload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? body.payload
        : {};

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
