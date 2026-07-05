import { z } from "zod";

export const objectiveValues = ["lead_gen", "brand_awareness", "sales", "engagement", "retention"] as const;
export const campaignStatusValues = ["draft", "active", "paused", "completed", "cancelled"] as const;

export const campaignSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(120),
    description: z.string().max(2000).optional().or(z.literal("")),
    objective: z.enum(objectiveValues),
    status: z.enum(campaignStatusValues).default("draft"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    targetBudget: z.coerce.number().positive("Budget must be greater than 0"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type CampaignFormValues = z.infer<typeof campaignSchema>;
