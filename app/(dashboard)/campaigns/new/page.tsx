import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/campaigns");
  }

  return (
    <div className="mx-auto max-w-xl px-8 py-10">
      <h1 className="font-display text-2xl font-semibold">New campaign</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">Set the scope and budget — you can adjust everything later.</p>
      <Card>
        <CardContent className="pt-6">
          <CampaignForm />
        </CardContent>
      </Card>
    </div>
  );
}
