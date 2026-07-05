import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignWorkspace } from "@/components/campaigns/campaign-workspace";
import { camelizeRow, camelizeRows } from "@/lib/utils/mappers";
import type { Campaign, Expense, Task, Profile } from "@/db/schema";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!rawProfile) redirect("/login");
  const profile = camelizeRow<Profile>(rawProfile);

  const { data: rawCampaign } = await supabase.from("campaigns").select("*").eq("id", id).single();
  if (!rawCampaign) notFound();
  const campaign = camelizeRow<Campaign>(rawCampaign);

  const [{ data: rawExpenses }, { data: rawTasks }, { data: memberRows }] = await Promise.all([
    supabase.from("expenses").select("*").eq("campaign_id", id).order("date", { ascending: true }),
    supabase.from("tasks").select("*").eq("campaign_id", id).order("created_at", { ascending: true }),
    supabase.from("campaign_members").select("user_id, profiles(*)").eq("campaign_id", id),
  ]);

  const expenses = camelizeRows<Expense>(rawExpenses);
  const tasks = camelizeRows<Task>(rawTasks);

  const members: Profile[] = (memberRows ?? [])
    .map((m: unknown) => camelizeRow<Profile>((m as { profiles: Record<string, unknown> }).profiles))
    .filter(Boolean);

  // Ensure current user always appears in assignee/reviewer dropdowns even
  // if the members join hasn't caught up yet.
  if (!members.find((m) => m.id === profile.id)) members.push(profile);

  const canApprove = ["admin", "manager"].includes(profile.role);

  return (
    <CampaignWorkspace
      campaign={campaign}
      expenses={expenses}
      tasks={tasks}
      members={members}
      currentUser={{ id: user.id, email: user.email ?? "", role: profile.role }}
      canApprove={canApprove}
    />
  );
}
