"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validations/task";
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

export async function createTask(formData: unknown): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const parsed = taskSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // High-priority tasks require manager/admin sign-off before they're actionable.
  const requiresApproval = parsed.data.priority === "high" && profile.role === "member";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      campaign_id: parsed.data.campaignId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      assignee_id: parsed.data.assigneeId || null,
      due_date: parsed.data.dueDate || null,
      priority: parsed.data.priority,
      status: parsed.data.status,
      estimated_hours: parsed.data.estimatedHours,
      requires_approval: requiresApproval,
      approval_status: requiresApproval ? "pending" : "approved",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/campaigns/${parsed.data.campaignId}`);
  return { success: true, data: { id: data.id } };
}

/** Moves a task between kanban columns. Optimistic on the client; this just persists it. */
export async function updateTaskStatus(id: string, campaignId: string, status: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  // Block moving a still-pending high-priority task into progress/done.
  const { data: task } = await supabase.from("tasks").select("requires_approval, approval_status").eq("id", id).single();
  if (task?.requires_approval && task.approval_status === "pending" && status !== "todo") {
    return { success: false, error: "This task needs manager approval before it can move forward" };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function approveTask(id: string, campaignId: string, approved: boolean): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };
  if (!["admin", "manager"].includes(profile.role)) {
    return { success: false, error: "Only managers and admins can approve tasks" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ approval_status: approved ? "approved" : "rejected" })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}

export async function deleteTask(id: string, campaignId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: undefined };
}
