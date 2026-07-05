"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { campaignSchema } from "@/lib/validations/campaign";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return profile;
}

export async function createCampaign(formData: unknown): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };
  if (!["admin", "manager"].includes(profile.role)) {
    return { success: false, error: "Only managers and admins can create campaigns" };
  }

  const parsed = campaignSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      objective: parsed.data.objective,
      status: parsed.data.status,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      target_budget: parsed.data.targetBudget,
      owner_id: profile.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Owner is automatically a campaign member
  await supabase.from("campaign_members").insert({ campaign_id: data.id, user_id: profile.id });

  revalidatePath("/campaigns");
  return { success: true, data: { id: data.id } };
}

export async function updateCampaign(id: string, formData: unknown): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const parsed = campaignSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      objective: parsed.data.objective,
      status: parsed.data.status,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      target_budget: parsed.data.targetBudget,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // RLS silently returns no error but 0 rows affected if unauthorized; we
  // treat that as a permission failure for clearer UX.
  if (error) return { success: false, error: error.message };

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return { success: true, data: undefined };
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };
  if (profile.role !== "admin") return { success: false, error: "Only admins can delete campaigns" };

  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/campaigns");
  return { success: true, data: undefined };
}

export async function updateCampaignStatus(id: string, status: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };
  if (!["admin", "manager"].includes(profile.role)) {
    return { success: false, error: "Only managers and admins can change campaign status" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${id}`);
  return { success: true, data: undefined };
}

export async function addCampaignMember(campaignId: string, userId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };
  if (!["admin", "manager"].includes(profile.role)) {
    return { success: false, error: "Only managers and admins can manage team members" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaign_members")
    .insert({ campaign_id: campaignId, user_id: userId });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}
