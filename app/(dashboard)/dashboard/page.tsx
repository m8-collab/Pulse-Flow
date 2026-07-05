import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoiBarChart } from "@/components/charts/roi-bar-chart";
import { ExpenseBreakdownChart } from "@/components/charts/expense-breakdown-chart";
import { TaskCompletionChart } from "@/components/charts/task-completion-chart";
import { BudgetVsSpendChart } from "@/components/charts/budget-vs-spend-chart";
import { camelizeRows } from "@/lib/utils/mappers";
import { totalSpend, calculateROI, formatCurrency, formatPercent } from "@/lib/utils/finance";
import type { Campaign, Expense, Task } from "@/db/schema";
import { AlertTriangle, TrendingUp, Wallet, ListChecks } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  ads: "Ads",
  influencer: "Influencer",
  content: "Content",
  tools: "Tools",
  events: "Events",
  misc: "Misc",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: rawCampaigns }, { data: rawExpenses }, { data: rawTasks }] = await Promise.all([
    supabase.from("campaigns").select("*"),
    supabase.from("expenses").select("*"),
    supabase.from("tasks").select("*"),
  ]);

  const campaigns = camelizeRows<Campaign>(rawCampaigns);
  const expenses = camelizeRows<Expense>(rawExpenses);
  const tasks = camelizeRows<Task>(rawTasks);

  const approvedExpenses = expenses.filter((e) => e.status === "approved");
  const totalBudget = campaigns.reduce((s, c) => s + Number(c.targetBudget), 0);
  const totalSpendAll = totalSpend(approvedExpenses);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const overBudgetCount = campaigns.filter((c) => {
    const spend = totalSpend(approvedExpenses.filter((e) => e.campaignId === c.id));
    const target = Number(c.targetBudget);
    return target > 0 && spend / target >= 0.85;
  }).length;

  const completedTasks = tasks.filter((t) => t.status === "done").length;

  // Budget vs spend across the portfolio, cumulative by date
  const budgetSpendSeries = (() => {
    const sorted = [...approvedExpenses].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    if (!sorted.length) return [{ date: "Start", budget: totalBudget, spend: 0 }];
    return sorted.map((e) => {
      running += Number(e.amount);
      return { date: e.date, budget: totalBudget, spend: Math.round(running) };
    });
  })();

  // ROI per campaign
  const roiData = campaigns.map((c) => ({
    name: c.title.length > 18 ? c.title.slice(0, 16) + "…" : c.title,
    roi: calculateROI(c, approvedExpenses.filter((e) => e.campaignId === c.id)),
  }));

  // Expense breakdown by category, portfolio-wide
  const expenseBreakdown = (() => {
    const byCategory = new Map<string, number>();
    for (const e of approvedExpenses) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
    }
    return Array.from(byCategory.entries()).map(([category, amount]) => ({
      category: CATEGORY_LABELS[category] ?? category,
      amount,
    }));
  })();

  // Task completion trend, cumulative by creation date
  const taskTrend = (() => {
    const sorted = [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let total = 0;
    let done = 0;
    const byDate = new Map<string, { total: number; completed: number }>();
    for (const t of sorted) {
      total += 1;
      if (t.status === "done") done += 1;
      const date = t.createdAt.slice(0, 10);
      byDate.set(date, { total, completed: done });
    }
    return Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v }));
  })();

  return (
    <div className="space-y-6 px-8 py-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live view across every campaign in your workspace.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle>Total budget</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-data text-2xl font-semibold">{formatCurrency(totalBudget)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalSpendAll)} spent so far</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle>Active campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-data text-2xl font-semibold">{activeCampaigns}</p>
            <p className="text-xs text-muted-foreground">of {campaigns.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle>Over 85% budget</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-data text-2xl font-semibold text-warning">{overBudgetCount}</p>
            <p className="text-xs text-muted-foreground">campaigns need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle>Tasks completed</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-data text-2xl font-semibold">{completedTasks}</p>
            <p className="text-xs text-muted-foreground">of {tasks.length} total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget vs. spend</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetVsSpendChart data={budgetSpendSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ROI per campaign</CardTitle>
          </CardHeader>
          <CardContent>
            {roiData.length ? (
              <RoiBarChart data={roiData} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No campaigns yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length ? (
              <ExpenseBreakdownChart data={expenseBreakdown} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No approved expenses yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Task completion trend</CardTitle>
          </CardHeader>
          <CardContent>
            {taskTrend.length ? (
              <TaskCompletionChart data={taskTrend} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No tasks yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
