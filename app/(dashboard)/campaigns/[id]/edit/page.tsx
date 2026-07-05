import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { Card, CardContent } from "@/components/ui/card";
import { camelizeRow } from "@/lib/utils/mappers";
import type { Campaign, Profile } from "@/db/schema";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = camelizeRow<Profile>(rawProfile);
  if (!profile || !["admin", "manager"].includes(profile.role)) redirect(`/campaigns/${id}`);

  const { data: rawCampaign } = await supabase.from("campaigns").select("*").eq("id", id).single();
  if (!rawCampaign) notFound();
  const campaign = camelizeRow<Campaign>(rawCampaign);

  return (
    <div className="mx-auto max-w-xl px-8 py-10">
      <h1 className="font-display text-2xl font-semibold">Edit campaign</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">Update scope, timeline, or budget.</p>
      <Card>
        <CardContent className="pt-6">
          <CampaignForm campaign={campaign} />
        </CardContent>
      </Card>
    </div>
  );
}
