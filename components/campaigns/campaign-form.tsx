"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { campaignSchema, type CampaignFormValues, objectiveValues, campaignStatusValues } from "@/lib/validations/campaign";
import { createCampaign, updateCampaign } from "@/lib/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Campaign } from "@/db/schema";

const OBJECTIVE_LABELS: Record<string, string> = {
  lead_gen: "Lead Generation",
  brand_awareness: "Brand Awareness",
  sales: "Sales",
  engagement: "Engagement",
  retention: "Retention",
};

export function CampaignForm({ campaign }: { campaign?: Campaign }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: campaign
      ? {
          title: campaign.title,
          description: campaign.description ?? "",
          objective: campaign.objective,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          targetBudget: Number(campaign.targetBudget),
        }
      : { objective: "lead_gen", status: "draft" },
  });

  async function onSubmit(values: CampaignFormValues) {
    const result = campaign ? await updateCampaign(campaign.id, values) : await createCampaign(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(campaign ? "Campaign updated" : "Campaign created");
    router.push(campaign ? `/campaigns/${campaign.id}` : `/campaigns/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} placeholder="Q3 Product Launch" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register("description")}
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="What is this campaign trying to achieve?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Objective</Label>
          <Select value={watch("objective")} onValueChange={(v) => setValue("objective", v as CampaignFormValues["objective"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {objectiveValues.map((o) => (
                <SelectItem key={o} value={o}>
                  {OBJECTIVE_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as CampaignFormValues["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campaignStatusValues.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
          {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="targetBudget">Target budget (USD)</Label>
        <Input id="targetBudget" type="number" step="0.01" {...register("targetBudget")} placeholder="25000" />
        {errors.targetBudget && <p className="text-xs text-destructive">{errors.targetBudget.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : campaign ? "Save changes" : "Create campaign"}
      </Button>
    </form>
  );
}
