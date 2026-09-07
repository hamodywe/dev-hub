"use client";
import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  GripVertical,
  MessageSquare,
  ListChecks,
  Plus,
  X,
  UserRound,
} from "lucide-react";
import { Input, Select, Spinner } from "../ui";
import {
  type Task,
  type Stage,
  priorities,
  stageName,
  isOverdue,
  orderedTasks,
} from "./model";

type Props = {
  tasks: Task[];
  allTasks: Task[];
  stages: Stage[];
  writable: boolean;
  busy: boolean;
  list: boolean;
  onOpen: (task: Task) => void;
  onMove: (task: Task, stageId: number, position?: number) => Promise<void>;
  onCreate: (title: string, stageId: number) => Promise<boolean>;
};
export function TaskMetadata({
  task,
  stages,
}: {
  task: Task;
  stages: Stage[];
}) {
  const priority =
    priorities.find((p) => p.value === task.priority) ?? priorities[2];
  const checklist = task.checklist ?? [];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={`rounded-md px-2 py-1 font-medium ${priority.style}`}>
        {priority.label}
      </span>
      {task.dueDate && (
        <time
          dateTime={task.dueDate}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${isOverdue(task, stages) ? "bg-rose-400/10 text-rose-300" : "text-muted"}`}
        >
          <CalendarDays className="size-3.5" />
          {new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("ar-IQ", {
            day: "numeric",
            month: "short",
          })}
          {isOverdue(task, stages) && " · متأخر"}
        </time>
      )}
      {!!checklist.length && (
        <span
          aria-label={`الخطوات المكتملة ${checklist.filter((c) => c.done).length} من ${checklist.length}`}
          className="inline-flex items-center gap-1 text-muted"
        >
          <ListChecks className="size-3.5" />
          {checklist.filter((c) => c.done).length}/{checklist.length}
        </span>
      )}
      {!!task.commentCount && (
        <span
          className="inline-flex items-center gap-1 text-muted"
          aria-label={`${task.commentCount} تعليق`}
        >
          <MessageSquare className="size-3.5" />
          {task.commentCount}
        </span>
      )}
    </div>
  );
}
function TaskCard({
  task,
  stages,
  writable,
  busy,
  onOpen,
  onMove,
}: Pick<Props, "stages" | "writable" | "busy" | "onOpen" | "onMove"> & {
  task: Task;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: `task-${task.id}`,
    data: { task },
    disabled: !writable || busy || task.archived,
  });
  return (
    <article
      ref={setNodeRef}
      data-task-id={task.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group rounded-xl border bg-bg p-3.5 shadow-sm ${isDragging ? "opacity-30 border-brand" : isOver ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-brand/40"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">#{task.id}</span>
        {writable && !task.archived && (
          <button
            ref={setActivatorNodeRef}
            style={{ touchAction: "none" }}
            {...attributes}
            {...listeners}
            disabled={busy}
            aria-label={`سحب التاسك: ${task.title}`}
            className="-me-1 grid size-9 touch-none place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-brand"
          >
            <GripVertical className="size-4" />
          </button>
        )}
      </div>
      <button
        onClick={() => onOpen(task)}
        className="mb-3 block w-full text-start focus-visible:outline-2 focus-visible:outline-brand"
      >
        <h3 className="text-base font-semibold leading-7 break-words">
          {task.title}
        </h3>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
            {task.description}
          </p>
        )}
      </button>
      <TaskMetadata task={task} stages={stages} />
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand-2">
          {task.assignee ? (
            (task.assignee.displayName || task.assignee.username).slice(0, 1)
          ) : (
            <UserRound className="size-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted">
          {task.assignee?.displayName ||
            task.assignee?.username ||
            (task.assigneeId ? "حساب معطّل" : "بدون مسؤول")}
        </span>
      </div>
      {writable && !task.archived && (
        <Select
          aria-label={`نقل التاسك: ${task.title}`}
          className="mt-3 min-h-9 py-1 text-sm"
          value={task.stageId}
          disabled={busy}
          onChange={(e) => void onMove(task, Number(e.target.value))}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {stageName(s)}
            </option>
          ))}
        </Select>
      )}
    </article>
  );
}
function Column({
  stage,
  items,
  props,
}: {
  stage: Stage;
  items: Task[];
  props: Props;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { stageId: stage.id },
    disabled: !props.writable || props.busy,
  });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() && (await props.onCreate(title.trim(), stage.id))) {
      setTitle("");
      setAdding(false);
    }
  }
  return (
    <section
      ref={setNodeRef}
      data-stage-id={stage.id}
      aria-label={`مرحلة ${stageName(stage)}`}
      className={`flex min-h-[340px] w-[min(320px,85vw)] shrink-0 flex-col rounded-2xl border p-3 xl:flex-1 xl:min-w-[280px] ${isOver ? "border-brand bg-brand/10" : "border-line bg-surface/70"}`}
    >
      <header className="mb-3 flex min-h-10 items-center gap-2 px-1">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <h2 className="flex-1 text-base font-bold">{stageName(stage)}</h2>
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-sm text-muted">
          {items.length}
        </span>
        {props.writable && (
          <button
            disabled={props.busy}
            onClick={() => setAdding(true)}
            aria-label={`إضافة تاسك إلى ${stageName(stage)}`}
            className="grid size-9 place-items-center rounded-lg hover:bg-white/5"
          >
            <Plus className="size-4" />
          </button>
        )}
      </header>
      <SortableContext
        items={items.map((t) => `task-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-3">
          {items.map((task) => (
            <TaskCard key={task.id} task={task} {...props} />
          ))}
          {!items.length && !adding && (
            <div
              className={`grid min-h-40 place-content-center gap-2 rounded-xl border border-dashed text-center text-sm ${isOver ? "border-brand text-brand-2" : "border-line text-muted"}`}
            >
              <ListChecks className="mx-auto size-6 opacity-60" />
              <span>{isOver ? "أفلت التاسك هنا" : "لا توجد تاسكات هنا"}</span>
            </div>
          )}
        </div>
      </SortableContext>
      {props.writable &&
        (adding ? (
          <form
            onSubmit={create}
            className="mt-3 space-y-2 rounded-xl border border-brand/50 bg-bg p-3"
          >
            <Input
              autoFocus
              aria-label={`عنوان تاسك جديد في ${stageName(stage)}`}
              placeholder="شنو المطلوب إنجازه؟"
              required
              maxLength={200}
              value={title}
              disabled={props.busy}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setAdding(false);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                disabled={props.busy || !title.trim()}
                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {props.busy && <Spinner />}إضافة
              </button>
              <button
                type="button"
                aria-label="إلغاء الإضافة"
                disabled={props.busy}
                onClick={() => setAdding(false)}
                className="grid size-10 place-items-center rounded-lg border border-line"
              >
                <X className="size-4" />
              </button>
            </div>
          </form>
        ) : (
          <button
            disabled={props.busy}
            onClick={() => setAdding(true)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-muted hover:bg-white/5 hover:text-fg"
          >
            <Plus className="size-4" />
            إضافة تاسك
          </button>
        ))}
    </section>
  );
}
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (args.pointerCoordinates)
    return hits.filter((h) => String(h.id).startsWith("task-")).length
      ? hits.filter((h) => String(h.id).startsWith("task-"))
      : hits;
  return closestCenter(args);
};
export function TaskBoard(props: Props) {
  const [active, setActive] = useState<Task | null>(null);
  const keyboardTarget = useRef<{ stageId: number; position: number } | null>(
    null,
  );
  const keyboardCoordinates: KeyboardCoordinateGetter = (
    event,
    { active: id, context },
  ) => {
    if (
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)
    )
      return;
    const task = props.allTasks.find((t) => `task-${t.id}` === id);
    if (!task || !context.collisionRect) return;
    event.preventDefault();
    const previous = keyboardTarget.current ?? {
      stageId: task.stageId,
      position: task.sortOrder,
    };
    let stageId = previous.stageId;
    let position = previous.position;
    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      const index =
        props.stages.findIndex((s) => s.id === stageId) +
        (event.code === "ArrowLeft" ? 1 : -1);
      if (!props.stages[index]) return;
      stageId = props.stages[index].id;
    } else position += event.code === "ArrowDown" ? 1 : -1;
    const peers = orderedTasks(props.allTasks, stageId).filter(
      (t) => t.id !== task.id,
    );
    position = Math.max(0, Math.min(position, peers.length));
    keyboardTarget.current = { stageId, position };
    const target = peers[Math.min(position, peers.length - 1)];
    const rect = context.droppableRects.get(
      target ? `task-${target.id}` : `stage-${stageId}`,
    );
    if (!rect) return;
    return {
      x: rect.left + (rect.width - context.collisionRect.width) / 2,
      y: rect.top + (rect.height - context.collisionRect.height) / 2,
    };
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );
  function dragEnd({ active: dragged, over }: DragEndEvent) {
    setActive(null);
    const keyboard = keyboardTarget.current;
    keyboardTarget.current = null;
    if (props.busy) return;
    const task = props.allTasks.find((t) => `task-${t.id}` === dragged.id);
    if (!task || task.archived) return;
    if (keyboard) {
      void props.onMove(task, keyboard.stageId, keyboard.position);
      return;
    }
    if (!over || over.id === dragged.id) return;
    const overTask = props.allTasks.find((t) => `task-${t.id}` === over.id);
    const stageId =
      overTask?.stageId ?? Number(String(over.id).replace("stage-", ""));
    if (!props.stages.some((s) => s.id === stageId)) return;
    const peers = orderedTasks(props.allTasks, stageId).filter(
      (t) => t.id !== task.id,
    );
    const targetIndex = overTask
      ? peers.findIndex((t) => t.id === overTask.id)
      : peers.length;
    const movingDown =
      overTask &&
      task.stageId === stageId &&
      task.sortOrder < overTask.sortOrder;
    void props.onMove(
      task,
      stageId,
      Math.max(0, targetIndex + (movingDown ? 1 : 0)),
    );
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(e) => {
        keyboardTarget.current = null;
        setActive(
          props.allTasks.find((t) => `task-${t.id}` === e.active.id) ?? null,
        );
      }}
      onDragCancel={() => {
        keyboardTarget.current = null;
        setActive(null);
      }}
      onDragEnd={dragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "اضغط المسافة لالتقاط التاسك، الأسهم لتحريكه، المسافة للإفلات، وEscape للإلغاء. يمكنك أيضاً النقل من قائمة المرحلة.",
        },
        announcements: {
          onDragStart: () => "تم التقاط التاسك",
          onDragOver: ({ over }) =>
            over ? "يمكن إفلات التاسك هنا" : "خارج منطقة الإفلات",
          onDragEnd: ({ over }) => (over ? "انتهى السحب" : "تم إلغاء السحب"),
          onDragCancel: () => "تم إلغاء السحب",
        },
      }}
    >
      {props.list ? (
        <div className="space-y-3">
          {props.tasks.length ? (
            props.tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-line bg-surface/60 p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => props.onOpen(task)}
                    className="min-w-0 flex-1 text-start text-base font-semibold"
                  >
                    {task.title}
                  </button>
                  <span className="text-sm text-muted">
                    {task.assignee?.displayName ||
                      task.assignee?.username ||
                      "بدون مسؤول"}
                  </span>
                  {props.writable && !task.archived ? (
                    <Select
                      className="w-auto min-w-36"
                      aria-label={`نقل التاسك: ${task.title}`}
                      value={task.stageId}
                      disabled={props.busy}
                      onChange={(e) =>
                        void props.onMove(task, Number(e.target.value))
                      }
                    >
                      {props.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {stageName(s)}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="text-sm text-muted">
                      {stageName(
                        props.stages.find((s) => s.id === task.stageId)!,
                      )}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <TaskMetadata task={task} stages={props.stages} />
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-line p-12 text-center text-muted">
              لا توجد تاسكات تطابق البحث
            </p>
          )}
        </div>
      ) : (
        <div
          role="region"
          aria-label="لوحة مراحل التاسكات"
          tabIndex={0}
          className="flex items-stretch gap-4 overflow-x-auto pb-5"
        >
          {props.stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              items={props.tasks
                .filter((t) => t.stageId === stage.id)
                .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)}
              props={props}
            />
          ))}
        </div>
      )}
      <DragOverlay>
        {active ? (
          <div
            dir="rtl"
            className="rounded-xl border border-brand bg-surface p-4 shadow-2xl"
          >
            <p className="mb-3 text-base font-bold">{active.title}</p>
            <TaskMetadata task={active} stages={props.stages} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
