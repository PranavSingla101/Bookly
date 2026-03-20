import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function requireUserProfile() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ clerk_user_id: userId }, { onConflict: "clerk_user_id" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("PROFILE_RESOLUTION_FAILED");
  }

  return { supabase, clerkUserId: userId, profileId: data.id as string };
}
