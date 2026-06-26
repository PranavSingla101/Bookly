/**
 * This helper contains shared database access for fetching a single owned book
 * row by book id and profile id. It keeps ownership filtering consistent across
 * API routes that operate on individual books.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbBookRow } from "./dto";

export async function fetchOwnedBook(
  supabase: SupabaseClient,
  bookId: string,
  profileId: string,
  select = "*"
): Promise<{ data: DbBookRow | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from("books")
    .select(select)
    .eq("id", bookId)
    .eq("profile_id", profileId)
    .single();

  return { data: data as DbBookRow | null, error };
}
