"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, LayoutGrid, List as ListIcon, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BudgetVsSpendChart } from "@/components/charts/budget-vs-spend-chart";
import { ExpenseBreakdownChart } from "@/components/charts/expense-breakdown-chart";
import { ExpenseList } from "@/components/campaigns/expense-list";
import { ExpenseForm } from "@/components/campaigns/expense-form";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskListView } from "@/components/kanban/task-list";
import { TaskForm } from "@/components/kanban/task-form";
import { useRealtimeCampaign } from "@/lib/hooks/use-realtime-campaign";
import { usePresence } from "@/lib/hooks/use-presence";
import {
  totalSpend,
  remainingBudgetPct,
  burnRateDaily,
  calculateROI,
  performanceScore,
  isOverBudgetThreshold,
  formatCurrency,
  formatPercent,
} from "@/lib/utils/finance";
import type { Campaign, Expense, Task, Profile } from "@/db/schema";

const CATEGORY_LABELS: Record<string, string> = {
  ads: "Ads",
  influencer: "Influencer",
  content: "Content",
  tools: "Tools",
  events: "Events",
  misc: "Misc",
};

export function CampaignWorkspace({
  campaign,
  expenses,
  tasks,
  members,
  currentUser,
  canApprove,
}: {
  campaign: Campaign;
  expenses: Expense[];
  tasks: Task[];
  members: Profile[];
  currentUser: { id: string; email: string; role: string };
  canApprove: boolean;
}) {
  useRealtimeCampaign(campaign.id);
  const onlineUsers = usePresence(campaign.id, currentUser);
  const [taskView, setTaskView] = useState<"kanban" | "list">("kanban");

  const spend = totalSpend(expenses);
  const remainingPct = remainingBudgetPct(campaign, expenses);
  const burn = burnRateDaily(campaign, expenses);
  const roi = calculateROI(campaign, expenses);
  const score = performanceScore(campaign, expenses, tasks);
  const overBudget = isOverBudgetThreshold(campaign, expenses);

  const approvedExpenses = expenses.filter((e) => e.status === "approved");

  const budgetSpendSeries = useMemo(() => {
    const sorted = [...approvedExpenses].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const target = Number(campaign.targetBudget);
    if (!sorted.length) {
      return [
        { date: campaign.startDate, budget: target, spend: 0 },
        { date: campaign.endDate, budget: target, spend: 0 },
      ];
    }
    return sorted.map((e) => {
      running += Number(e.amount);
      return { date: e.date, budget: target, spend: Math.round(running) };
    });
  }, [approvedExpenses, campaign.targetBudget, campaign.startDate, campaign.endDate]);

  const expenseBreakdown = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const e of approvedExpenses) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
    }
    return Array.from(byCategory.entries()).map(([category, amount]) => ({
      category: CATEGORY_LABELS[category] ?? category,
      amount,
    }));
  }, [approvedExpenses]);

  return (
    <div className="space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{campaign.title}</h1>
            <Badge className="capitalize">{campaign.status}</Badge>
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{campaign.description}</p>
        </div>
        <div className="flex items-center gap-3">
          {canApprove && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/campaigns/${campaign.id}/edit`}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
          )}
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-success" />
              {onlineUsers.length} online now
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Spend</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-data text-xl font-semibold">{formatCurrency(spend)}</p>
            <p className="text-xs text-muted-foreground">of {formatCurrency(Number(campaign.targetBudget))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Budget remaining</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            <p className={`font-data text-xl font-semibold ${overBudget ? "text-warning" : ""}`}>{formatPercent(remainingPct)}</p>
            <Progress value={Math.max(0, 100 - remainingPct)} indicatorClassName={overBudget ? "bg-warning" : "bg-primary"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Daily burn rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-data text-xl font-semibold">{formatCurrency(burn)}</p>
            <p className="text-xs text-muted-foreground">per day, average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Projected ROI</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={`font-data text-xl font-semibold ${roi >= 0 ? "text-success" : "text-destructive"}`}>{formatPercent(roi)}</p>
            <p className="text-xs text-muted-foreground">{campaign.leadsGenerated} leads · {campaign.conversions} conv.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Performance score</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-data text-xl font-semibold">{score}/100</p>
            <p className="text-xs text-muted-foreground">budget, tasks, ROI</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="mb-4 flex justify-end">
            <ExpenseForm campaignId={campaign.id} />
          </div>
          <ExpenseList
            expenses={expenses}
            profiles={members}
            canApprove={canApprove}
            campaignId={campaign.id}
            currentUserId={currentUser.id}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-1 rounded-md bg-secondary p-1">
              <Button
                size="sm"
                variant={taskView === "kanban" ? "default" : "ghost"}
                className="h-7 px-2"
                onClick={() => setTaskView("kanban")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={taskView === "list" ? "default" : "ghost"}
                className="h-7 px-2"
                onClick={() => setTaskView("list")}
              >
                <ListIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            <TaskForm campaignId={campaign.id} members={members} />
          </div>
          {taskView === "kanban" ? (
            <KanbanBoard tasks={tasks} profiles={members} canApprove={canApprove} campaignId={campaign.id} />
          ) : (
            <TaskListView tasks={tasks} profiles={members} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
