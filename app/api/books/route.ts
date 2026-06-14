/**
 * This route returns the authenticated user's full books collection from the
 * database.
 */
import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { handleCommonApiError } from "@/lib/api/books/errors";
import { mapDbBookToBookDto } from "@/lib/api/books/dto";

export async function GET() {
  try {
    const { supabase, profileId } = await requireUserProfile();
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false });

    if (error) {
      const body: { error: string; detail?: string } = { error: "Failed to fetch books" };
      if (process.env.NODE_ENV === "development") {
        body.detail = error.message;
      }
      return NextResponse.json(body, { status: 500 });
    }

    return NextResponse.json({
      books: (data ?? []).map((row) => mapDbBookToBookDto(row)),
    });
  } catch (error) {
    return handleCommonApiError(error);
  }
}
