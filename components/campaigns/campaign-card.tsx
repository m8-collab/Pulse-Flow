import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, remainingBudgetPct, isOverBudgetThreshold, calculateROI } from "@/lib/utils/finance";
import type { Campaign, Expense } from "@/db/schema";
import { AlertTriangle } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  active: "success",
  paused: "warning",
  completed: "default",
  cancelled: "destructive",
};

export function CampaignCard({ campaign, expenses }: { campaign: Campaign; expenses: Expense[] }) {
  const spend = expenses.filter((e) => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0);
  const remainingPct = remainingBudgetPct(campaign, expenses);
  const spentPct = Math.min(100, Math.max(0, 100 - remainingPct));
  const overBudget = isOverBudgetThreshold(campaign, expenses);
  const roi = calculateROI(campaign, expenses);

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base font-semibold leading-snug">{campaign.title}</h3>
            <Badge variant={STATUS_VARIANT[campaign.status] ?? "secondary"} className="capitalize shrink-0">
              {campaign.status}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-data text-muted-foreground">
              <span>{formatCurrency(spend)} spent</span>
              <span>{formatCurrency(Number(campaign.targetBudget))} target</span>
            </div>
            <Progress value={spentPct} indicatorClassName={overBudget ? "bg-warning" : "bg-primary"} />
            {overBudget && (
              <p className="flex items-center gap-1 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" /> Over 85% of budget used
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Projected ROI</span>
            <span className={`font-data font-semibold ${roi >= 0 ? "text-success" : "text-destructive"}`}>
              {roi.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
