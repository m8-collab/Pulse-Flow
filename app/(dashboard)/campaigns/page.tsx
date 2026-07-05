import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { CampaignFilters } from "@/components/campaigns/campaign-filters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { camelizeRows } from "@/lib/utils/mappers";
import type { Campaign, Expense } from "@/db/schema";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status, search } = await searchParams;
  const supabase = await createClient();

  const { data: profile } = await supabase.auth.getUser().then(async ({ data }) =>
    data.user ? supabase.from("profiles").select("role").eq("id", data.user.id).single() : { data: null }
  );

  let query = supabase.from("campaigns").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data: rawCampaigns } = await query;
  const campaigns = camelizeRows<Campaign>(rawCampaigns);
  const campaignIds = campaigns.map((c) => c.id);

  const { data: rawExpenses } = campaignIds.length
    ? await supabase.from("expenses").select("*").in("campaign_id", campaignIds)
    : { data: [] };
  const expenses = camelizeRows<Expense>(rawExpenses);

  const expensesByCampaign = new Map<string, Expense[]>();
  for (const e of expenses) {
    const list = expensesByCampaign.get(e.campaignId) ?? [];
    list.push(e);
    expensesByCampaign.set(e.campaignId, list);
  }

  const canCreate = profile?.role && ["admin", "manager"].includes(profile.role);

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="mr-1 h-4 w-4" /> New campaign
            </Link>
          </Button>
        )}
      </div>

      <div className="mb-6">
        <Suspense>
          <CampaignFilters />
        </Suspense>
      </div>

      {!campaigns.length ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          No campaigns match yet. {canCreate && "Create the first one to get moving."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} expenses={expensesByCampaign.get(c.id) ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
