export type Profile = { id: number; username: string; displayName: string };
export type Stage = {
  id: number;
  name: string;
  nameAr: string;
  nameCkb: string;
  color: string;
  sortOrder: number;
};
export type ChecklistItem = { id: string; text: string; done: boolean };
export type Task = {
  id: number;
  title: string;
  description: string;
  stageId: number;
  assigneeId: number | null;
  sortOrder: number;
  archived: boolean;
  priority: string;
  dueDate: string | null;
  checklist: ChecklistItem[];
  commentCount?: number;
  assignee?: Profile | null;
  createdBy?: Profile | null;
  createdAt: string;
  updatedAt: string;
  comments?: {
    id: number;
    body: string;
    createdAt: string;
    author: Profile | null;
  }[];
};
export const priorities = [
  { value: "urgent", label: "عاجلة", style: "bg-rose-400/10 text-rose-300" },
  { value: "high", label: "عالية", style: "bg-orange-400/10 text-orange-300" },
  {
    value: "medium",
    label: "متوسطة",
    style: "bg-indigo-400/10 text-indigo-300",
  },
  { value: "low", label: "منخفضة", style: "bg-slate-400/10 text-slate-300" },
];
export const stageName = (stage: Stage) => stage.nameAr || stage.name;
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isDone(stage?: Stage) {
  return (
    (!!stage &&
      /^(done|complete[d]?|مكتمل|منجز|تم الإنجاز)$/i.test(stage.name.trim())) ||
    (!!stage && /^(مكتمل|منجز|تم الإنجاز)$/.test(stage.nameAr.trim()))
  );
}
export function isOverdue(task: Task, stages: Stage[], today = localDate()) {
  return (
    !task.archived &&
    !!task.dueDate &&
    task.dueDate < today &&
    !isDone(stages.find((s) => s.id === task.stageId))
  );
}
export function orderedTasks(tasks: Task[], stageId: number) {
  return tasks
    .filter((t) => t.stageId === stageId && !t.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}
// Normalize only the affected active columns; archived tasks retain their positions.
export function moveTask(
  tasks: Task[],
  id: number,
  stageId: number,
  position: number,
) {
  const task = tasks.find((t) => t.id === id);
  if (!task || task.archived) return tasks;
  const target = orderedTasks(tasks, stageId).filter((t) => t.id !== id);
  target.splice(Math.max(0, Math.min(position, target.length)), 0, {
    ...task,
    stageId,
  });
  const changes = new Map(
    target.map((t, sortOrder) => [t.id, { ...t, sortOrder }]),
  );
  if (task.stageId !== stageId)
    orderedTasks(tasks, task.stageId)
      .filter((t) => t.id !== id)
      .forEach((t, sortOrder) => changes.set(t.id, { ...t, sortOrder }));
  return tasks.map((t) => changes.get(t.id) ?? t);
}
