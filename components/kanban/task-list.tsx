"use client";

import { Badge } from "@/components/ui/badge";
import type { Task, Profile } from "@/db/schema";

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export function TaskListView({ tasks, profiles }: { tasks: Task[]; profiles: Profile[] }) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  if (!tasks.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No tasks yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">Task</th>
            <th className="px-4 py-2.5">Assignee</th>
            <th className="px-4 py-2.5">Due</th>
            <th className="px-4 py-2.5">Priority</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5 text-right">Est. hrs</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-2.5 font-medium">{t.title}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {t.assigneeId ? profileMap.get(t.assigneeId)?.fullName ?? profileMap.get(t.assigneeId)?.email : "Unassigned"}
              </td>
              <td className="px-4 py-2.5 font-data text-xs">{t.dueDate ?? "—"}</td>
              <td className="px-4 py-2.5">
                <Badge variant={PRIORITY_VARIANT[t.priority]} className="capitalize">
                  {t.priority}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{STATUS_LABEL[t.status]}</td>
              <td className="px-4 py-2.5 text-right font-data">{Number(t.estimatedHours).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
