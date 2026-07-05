"use client";

import { useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import { Clock, Lock, ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateTaskStatus, approveTask } from "@/lib/actions/tasks";
import type { Task, Profile } from "@/db/schema";

const COLUMNS: { id: Task["status"]; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "in_review", label: "In review" },
  { id: "done", label: "Done" },
];

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

function TaskCard({ task, assignee, canApprove, campaignId }: { task: Task; assignee?: Profile; canApprove: boolean; campaignId: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const locked = task.requiresApproval && task.approvalStatus === "pending";

  async function handleApproval(approved: boolean) {
    const result = await approveTask(task.id, campaignId, approved);
    if (!result.success) toast.error(result.error);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`space-y-2 rounded-md border bg-card p-3 shadow-sm ${isDragging ? "opacity-50" : ""} ${locked ? "border-warning/50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <Badge variant={PRIORITY_VARIANT[task.priority]} className="shrink-0 capitalize">
          {task.priority}
        </Badge>
      </div>
      {task.description && <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{assignee?.fullName ?? assignee?.email ?? "Unassigned"}</span>
        {task.dueDate && (
          <span className="flex items-center gap-1 font-data">
            <Clock className="h-3 w-3" /> {task.dueDate}
          </span>
        )}
      </div>
      {locked && (
        <div className="flex items-center justify-between rounded-md bg-warning/10 px-2 py-1.5">
          <span className="flex items-center gap-1 text-xs text-warning">
            <Lock className="h-3 w-3" /> Needs approval
          </span>
          {canApprove && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleApproval(true)}>
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleApproval(false)}>
                <ShieldX className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Column({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex min-h-[300px] flex-col gap-2 rounded-lg border bg-secondary/30 p-3 ${isOver ? "ring-2 ring-primary" : ""}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function KanbanBoard({
  tasks,
  profiles,
  canApprove,
  campaignId,
}: {
  tasks: Task[];
  profiles: Profile[];
  canApprove: boolean;
  campaignId: string;
}) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as Task["status"];
    const taskId = active.id as string;
    const task = localTasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previous = localTasks;
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    const result = await updateTaskStatus(taskId, campaignId, newStatus);
    if (!result.success) {
      setLocalTasks(previous);
      toast.error(result.error);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => (
          <Column key={col.id} id={col.id} label={col.label}>
            {localTasks
              .filter((t) => t.status === col.id)
              .map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  assignee={t.assigneeId ? profileMap.get(t.assigneeId) : undefined}
                  canApprove={canApprove}
                  campaignId={campaignId}
                />
              ))}
          </Column>
        ))}
      </div>
    </DndContext>
  );
}
