import { z } from "zod";

export const expenseCategoryValues = ["ads", "influencer", "content", "tools", "events", "misc"] as const;

export const expenseSchema = z.object({
  campaignId: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.enum(expenseCategoryValues),
  description: z.string().max(500).optional().or(z.literal("")),
  receipt: z.string().max(300).optional().or(z.literal("")),
  date: z.string().min(1, "Date is required"),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const expenseReviewSchema = z.object({
  expenseId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});
