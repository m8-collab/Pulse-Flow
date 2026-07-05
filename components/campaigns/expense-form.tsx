"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { expenseSchema, type ExpenseFormValues, expenseCategoryValues } from "@/lib/validations/expense";
import { logExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const CATEGORY_LABELS: Record<string, string> = {
  ads: "Ads",
  influencer: "Influencer",
  content: "Content",
  tools: "Tools",
  events: "Events",
  misc: "Misc",
};

export function ExpenseForm({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { campaignId, category: "ads", date: new Date().toISOString().slice(0, 10) },
  });

  async function onSubmit(values: ExpenseFormValues) {
    const result = await logExpense(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense logged");
    reset({ campaignId, category: "ads", date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Log expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} placeholder="500" />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v as ExpenseFormValues["category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategoryValues.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} placeholder="What was this for?" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt">Receipt reference</Label>
            <Input id="receipt" {...register("receipt")} placeholder="Invoice #, link, or note" />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Logging…" : "Log expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
