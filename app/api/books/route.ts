import { NextResponse } from "next/server";
import { appendFile } from "node:fs/promises";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { mapDbBookToBookDto } from "@/lib/books/dto";

const DEBUG_LOG_PATH = "C:/Users/LENOVO/Documents/project/elib/debug-books.log";

async function logDebug(message: string) {
  try {
    await appendFile(DEBUG_LOG_PATH, `${new Date().toISOString()} ${message}\n`);
  } catch (error) {
    console.error("[books-debug-log-write-failed]", error);
  }
}

export async function GET() {
  try {
    const { supabase, profileId } = await requireUserProfile();
    await logDebug(`GET /api/books profile=${profileId}`);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("profile_id", profileId)
      .order("updated_at", { ascending: false });

    if (error) {
      await logDebug(`GET /api/books query_error=${error.message}`);
      const body: { error: string; detail?: string } = { error: "Failed to fetch books" };
      if (process.env.NODE_ENV === "development") {
        body.detail = error.message;
      }
      return NextResponse.json(body, { status: 500 });
    }

    await logDebug(`GET /api/books success count=${(data ?? []).length}`);
    return NextResponse.json({
      books: (data ?? []).map((row) => mapDbBookToBookDto(row)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[api/books] unexpected", error);

    if (message === "UNAUTHORIZED") {
      await logDebug("GET /api/books unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (message === "PROFILE_RESOLUTION_FAILED") {
      await logDebug("GET /api/books profile_resolution_failed");
      return NextResponse.json(
        { error: "Failed to resolve user profile. Check Supabase table permissions." },
        { status: 500 }
      );
    }

    await logDebug(`GET /api/books unexpected_error=${message}`);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
