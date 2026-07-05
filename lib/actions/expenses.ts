"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema, expenseReviewSchema } from "@/lib/validations/expense";
import type { ActionResult } from "./campaigns";

async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return profile;
}

export async function logExpense(formData: unknown): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const parsed = expenseSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      campaign_id: parsed.data.campaignId,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description || null,
      receipt: parsed.data.receipt || null,
      date: parsed.data.date,
      submitted_by: profile.id,
      // Managers/admins logging their own expenses are auto-approved; members require review.
      status: ["admin", "manager"].includes(profile.role) ? "approved" : "pending",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/campaigns/${parsed.data.campaignId}`);
  return { success: true, data: { id: data.id } };
}

export async function reviewExpense(formData: unknown): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };
  if (!["admin", "manager"].includes(profile.role)) {
    return { success: false, error: "Only managers and admins can approve or reject expenses" };
  }

  const parsed = expenseReviewSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: "Invalid review payload" };

  const supabase = await createClient();
  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("campaign_id")
    .eq("id", parsed.data.expenseId)
    .single();
  if (fetchError || !expense) return { success: false, error: "Expense not found" };

  const { error } = await supabase
    .from("expenses")
    .update({ status: parsed.data.status, reviewed_by: profile.id })
    .eq("id", parsed.data.expenseId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/campaigns/${expense.campaign_id}`);
  return { success: true, data: undefined };
}

export async function deleteExpense(id: string, campaignId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}
