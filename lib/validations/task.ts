import { z } from "zod";

export const taskPriorityValues = ["high", "medium", "low"] as const;
export const taskStatusValues = ["todo", "in_progress", "in_review", "done"] as const;

export const taskSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().min(2, "Title is required").max(150),
  description: z.string().max(1000).optional().or(z.literal("")),
  assigneeId: z.string().uuid().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  priority: z.enum(taskPriorityValues).default("medium"),
  status: z.enum(taskStatusValues).default("todo"),
  estimatedHours: z.coerce.number().min(0).default(0),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
