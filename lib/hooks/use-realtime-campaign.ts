"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to live Postgres changes (expenses, tasks, campaign row itself)
 * scoped to one campaign, so every connected user's screen updates the
 * instant a teammate logs an expense, approves it, or moves a task.
 */
export function useRealtimeCampaign(campaignId: string) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `campaign_id=eq.${campaignId}` },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `campaign_id=eq.${campaignId}` },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns", filter: `id=eq.${campaignId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, router]);
}
