import type { SupabaseClient } from "@supabase/supabase-js";
import { BOOKS_BUCKET, COVERS_BUCKET, EPUBS_BUCKET } from "@/lib/api/books/constants";

const BOOK_STORAGE_BUCKETS = [BOOKS_BUCKET, EPUBS_BUCKET, COVERS_BUCKET] as const;

/**
 * Creates private storage buckets used by the books API if they are missing.
 * Relying on migrations alone breaks when a remote project has not applied SQL;
 * the service role can create buckets idempotently at runtime.
 */
export async function ensureBookStorageBuckets(supabase: SupabaseClient): Promise<void> {
  for (const id of BOOK_STORAGE_BUCKETS) {
    const { data } = await supabase.storage.getBucket(id);
    if (data) continue;

    const { error: createError } = await supabase.storage.createBucket(id, { public: false });
    if (!createError) continue;

    const { data: afterRace } = await supabase.storage.getBucket(id);
    if (afterRace) continue;

    throw new Error(`Failed to ensure storage bucket "${id}": ${createError.message}`);
  }
}
