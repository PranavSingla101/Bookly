import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function requireUserProfile() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  const supabase = createSupabaseAdminClient();
  // Avoid relying on an upsert conflict target that may be missing in DB schema.
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[requireUserProfile] failed to query profiles", selectError);
    throw new Error("PROFILE_RESOLUTION_FAILED");
  }

  if (existingProfile?.id) {
    return { supabase, clerkUserId: userId, profileId: existingProfile.id as string };
  }

  const { data: createdProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({ clerk_user_id: userId })
    .select("id")
    .single();

  if (insertError || !createdProfile?.id) {
    console.error("[requireUserProfile] failed to create profile", insertError);
    throw new Error("PROFILE_RESOLUTION_FAILED");
  }

  return { supabase, clerkUserId: userId, profileId: createdProfile.id as string };
}
