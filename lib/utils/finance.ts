import type { Campaign, Expense, Task } from "@/db/schema";

const APPROVED = "approved";

/** Total approved spend for a campaign. Pending/rejected expenses don't count toward burn. */
export function totalSpend(expenses: Pick<Expense, "amount" | "status">[]): number {
  return expenses
    .filter((e) => e.status === APPROVED)
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

/** Average daily spend since the campaign's start date (or first expense date, whichever is later). */
export function burnRateDaily(
  campaign: Pick<Campaign, "startDate">,
  expenses: Pick<Expense, "amount" | "status">[]
): number {
  const spend = totalSpend(expenses);
  const start = new Date(campaign.startDate);
  const now = new Date();
  const days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86_400_000));
  return spend / days;
}

/** Percentage of target budget remaining. Can go negative if overspent. */
export function remainingBudgetPct(
  campaign: Pick<Campaign, "targetBudget">,
  expenses: Pick<Expense, "amount" | "status">[]
): number {
  const target = Number(campaign.targetBudget);
  if (target <= 0) return 0;
  const spend = totalSpend(expenses);
  return ((target - spend) / target) * 100;
}

/** Estimated value of leads/conversions if no explicit revenue figure is tracked. */
function estimatedRevenue(campaign: Pick<Campaign, "revenueValue" | "leadsGenerated" | "conversions">): number {
  const explicit = Number(campaign.revenueValue);
  if (explicit > 0) return explicit;
  // Mock valuation: a lead is worth $50, a conversion $400, when no real revenue is logged.
  return campaign.leadsGenerated * 50 + campaign.conversions * 400;
}

/** ROI % = (Revenue - Spend) / Spend * 100 */
export function calculateROI(
  campaign: Pick<Campaign, "revenueValue" | "leadsGenerated" | "conversions">,
  expenses: Pick<Expense, "amount" | "status">[]
): number {
  const spend = totalSpend(expenses);
  if (spend <= 0) return 0;
  const revenue = estimatedRevenue(campaign);
  return ((revenue - spend) / spend) * 100;
}

export function isOverBudgetThreshold(
  campaign: Pick<Campaign, "targetBudget">,
  expenses: Pick<Expense, "amount" | "status">[],
  thresholdPct = 85
): boolean {
  const target = Number(campaign.targetBudget);
  if (target <= 0) return false;
  const spend = totalSpend(expenses);
  return (spend / target) * 100 >= thresholdPct;
}

/**
 * Weighted Performance Score (0-100):
 *  - 40% budget adherence (penalizes overspend, rewards controlled burn)
 *  - 35% task completion rate
 *  - 25% ROI (normalized, capped)
 */
export function performanceScore(
  campaign: Pick<Campaign, "targetBudget" | "revenueValue" | "leadsGenerated" | "conversions">,
  expenses: Pick<Expense, "amount" | "status">[],
  tasks: Pick<Task, "status">[]
): number {
  const target = Number(campaign.targetBudget);
  const spend = totalSpend(expenses);
  const spendRatio = target > 0 ? spend / target : 0;
  // Adherence peaks at spendRatio <= 1, decays if overspent.
  const budgetAdherence = spendRatio <= 1 ? 100 - spendRatio * 20 : Math.max(0, 80 - (spendRatio - 1) * 100);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50; // neutral if no tasks yet

  const roi = calculateROI(campaign, expenses);
  const normalizedRoi = Math.max(0, Math.min(100, 50 + roi / 4)); // 0% ROI -> 50, +200% ROI -> 100

  const score = budgetAdherence * 0.4 + taskCompletion * 0.35 + normalizedRoi * 0.25;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value
  );
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
