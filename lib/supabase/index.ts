// Server-only. Never import this barrel in client components.
export { createSupabaseAdminClient } from "./server";
export { ensureBookStorageBuckets } from "./ensureBookBuckets";
export { removeStorageFolderPrefix } from "./storageTree";
