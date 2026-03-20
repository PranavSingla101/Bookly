import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recursively delete all objects under a folder prefix in a Supabase Storage bucket.
 */
export async function removeStorageFolderPrefix(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<void> {
  const root = prefix.replace(/\/+$/, "");

  const walk = async (path: string): Promise<void> => {
    const { data: items, error } = await supabase.storage.from(bucket).list(path, { limit: 1000 });
    if (error || !items?.length) {
      return;
    }

    const filePaths: string[] = [];

    for (const item of items) {
      const full = path ? `${path}/${item.name}` : item.name;
      const size = (item.metadata as { size?: unknown } | null | undefined)?.size;
      const isFile = typeof size === "number";

      if (isFile) {
        filePaths.push(full);
      } else {
        await walk(full);
      }
    }

    if (filePaths.length > 0) {
      await supabase.storage.from(bucket).remove(filePaths);
    }
  };

  await walk(root);
}
