"use client";

import { toast } from "sonner";
import { Check, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reviewExpense, deleteExpense } from "@/lib/actions/expenses";
import { formatCurrency } from "@/lib/utils/finance";
import type { Expense, Profile } from "@/db/schema";

const STATUS_VARIANT: Record<string, "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const CATEGORY_LABELS: Record<string, string> = {
  ads: "Ads",
  influencer: "Influencer",
  content: "Content",
  tools: "Tools",
  events: "Events",
  misc: "Misc",
};

export function ExpenseList({
  expenses,
  profiles,
  canApprove,
  campaignId,
  currentUserId,
}: {
  expenses: Expense[];
  profiles: Profile[];
  canApprove: boolean;
  campaignId: string;
  currentUserId: string;
}) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  async function handleReview(expenseId: string, status: "approved" | "rejected") {
    const result = await reviewExpense({ expenseId, status });
    if (!result.success) toast.error(result.error);
    else toast.success(`Expense ${status}`);
  }

  async function handleDelete(id: string) {
    const result = await deleteExpense(id, campaignId);
    if (!result.success) toast.error(result.error);
  }

  if (!expenses.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No expenses logged yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Category</th>
            <th className="px-4 py-2.5">Description</th>
            <th className="px-4 py-2.5">Submitted by</th>
            <th className="px-4 py-2.5 text-right">Amount</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="px-4 py-2.5 font-data text-xs">{e.date}</td>
              <td className="px-4 py-2.5">{CATEGORY_LABELS[e.category]}</td>
              <td className="max-w-xs truncate px-4 py-2.5 text-muted-foreground">{e.description || "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{profileMap.get(e.submittedBy)?.fullName ?? profileMap.get(e.submittedBy)?.email ?? "—"}</td>
              <td className="px-4 py-2.5 text-right font-data">{formatCurrency(Number(e.amount))}</td>
              <td className="px-4 py-2.5">
                <Badge variant={STATUS_VARIANT[e.status]} className="capitalize">
                  {e.status}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center justify-end gap-1">
                  {canApprove && e.status === "pending" && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReview(e.id, "approved")}>
                        <Check className="h-3.5 w-3.5 text-success" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReview(e.id, "rejected")}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                  {(canApprove || (e.submittedBy === currentUserId && e.status === "pending")) && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
