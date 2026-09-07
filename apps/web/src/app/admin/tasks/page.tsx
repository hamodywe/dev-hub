"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  LayoutGrid,
  List,
  Undo2,
  Search,
  CalendarDays,
  SlidersHorizontal,
  X,
  MessageSquare,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { useAdmin } from "@/components/admin/AdminSession";
import {
  Card,
  Confirm,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Textarea,
  useToast,
} from "@/components/admin/ui";

import { TaskBoard, TaskMetadata } from "@/components/admin/tasks/TaskBoard";
import {
  type Profile,
  type Stage,
  type Task,
  type ChecklistItem,
  priorities,
  stageName,
  moveTask,
  orderedTasks,
  isOverdue,
  isDone,
  localDate,
} from "@/components/admin/tasks/model";
const newTask = {
  title: "",
  description: "",
  stageId: 0,
  assigneeId: "",
  priority: "medium",
  dueDate: "",
  checklist: [] as ChecklistItem[],
};
const newStage = { name: "", nameAr: "", nameCkb: "", color: "#6366F1" };
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const outline =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-brand/50 disabled:opacity-50";

export default function AdminTasks() {
  const { user, can } = useAdmin();
  const writable = can("tasks:write");
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [listView, setListView] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [checkText, setCheckText] = useState("");
  const [undo, setUndo] = useState<{
    taskId: number;
    stageId: number;
    sortOrder: number;
  } | null>(null);
  const mutation = useRef(false);
  const detailRequest = useRef(0);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [form, setForm] = useState(newTask);
  const [detail, setDetail] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [stageDialog, setStageDialog] = useState(false);
  const [stageEditing, setStageEditing] = useState<number | null>(null);
  const [stageForm, setStageForm] = useState(newStage);
  const [deleting, setDeleting] = useState<{
    kind: "task" | "stage";
    id: number;
  } | null>(null);
  const load = useCallback(async () => {
    try {
      const [items, columns, assignees] = await Promise.all([
        clientApi<Task[]>("/tasks?includeArchived=1"),
        clientApi<Stage[]>("/tasks/stages"),
        clientApi<Profile[]>("/tasks/assignees"),
      ]);
      setTasks(items);
      setStages(columns.sort((a, b) => a.sortOrder - b.sortOrder));
      setPeople(assignees);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      clientApi<Task[]>("/tasks?includeArchived=1"),
      clientApi<Stage[]>("/tasks/stages"),
      clientApi<Profile[]>("/tasks/assignees"),
    ])
      .then(([items, columns, assignees]) => {
        if (active) {
          setTasks(items);
          setStages(columns.sort((a, b) => a.sortOrder - b.sortOrder));
          setPeople(assignees);
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);

  function edit(task: Task | "new", stageId?: number) {
    detailRequest.current++;
    setDetail(null);
    setCheckText("");
    setEditing(task);
    setForm(
      task === "new"
        ? {
            ...newTask,
            stageId: stageId ?? stages[0]?.id ?? 0,
            assigneeId: String(user.id),
          }
        : {
            priority: task.priority ?? "medium",
            dueDate: task.dueDate ?? "",
            checklist: task.checklist ?? [],
            title: task.title,
            description: task.description,
            stageId: task.stageId,
            assigneeId: task.assigneeId == null ? "" : String(task.assigneeId),
          },
    );
  }
  async function saveTask(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    try {
      await clientApi(editing === "new" ? "/tasks" : `/tasks/${editing.id}`, {
        method: editing === "new" ? "POST" : "PUT",
        json: {
          ...form,
          dueDate: form.dueDate || null,
          assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        },
      });
      setEditing(null);
      toast("success", "تم حفظ التاسك");
      await load();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function showTask(task: Task) {
    const request = ++detailRequest.current;
    setComment("");
    setDetail(task);
    setDetailLoading(true);
    try {
      const fresh = await clientApi<Task>(`/tasks/${task.id}`);
      if (request === detailRequest.current) setDetail(fresh);
    } catch (e) {
      if (request === detailRequest.current) {
        setDetail(null);
        toast("error", (e as Error).message);
      }
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }
  async function move(
    task: Task,
    stageId: number,
    sortOrder?: number,
    undoing = false,
  ) {
    if (!tasks || mutation.current || busy || task.archived) return;
    const position =
      sortOrder ??
      orderedTasks(tasks, stageId).filter((t) => t.id !== task.id).length;
    if (stageId === task.stageId && position === task.sortOrder) return;
    const previous = tasks;
    mutation.current = true;
    setBusy(true);
    setTasks(moveTask(tasks, task.id, stageId, position));
    try {
      await clientApi(`/tasks/${task.id}`, {
        method: "PATCH",
        json: { stageId, sortOrder: position },
      });
      setUndo(
        undoing
          ? null
          : {
              taskId: task.id,
              stageId: task.stageId,
              sortOrder: task.sortOrder,
            },
      );
      await load();
      if (detail?.id === task.id) await showTask(task);
    } catch (e) {
      setTasks(previous);
      toast("error", (e as Error).message);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function quickCreate(title: string, stageId: number) {
    if (mutation.current || busy) return false;
    mutation.current = true;
    setBusy(true);
    try {
      const saved = await clientApi<Task>("/tasks", {
        method: "POST",
        json: { title, stageId, priority: "medium", assigneeId: user.id },
      });
      setTasks((current) => [...(current ?? []), saved]);
      toast("success", "تمت إضافة التاسك");
      return true;
    } catch (e) {
      toast("error", (e as Error).message);
      return false;
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function toggleCheck(id: string) {
    if (!detail || detailLoading || busy || detail.archived) return;
    detailRequest.current++;
    const previous = detail;
    const checklist = (detail.checklist ?? []).map((item) =>
      item.id === id ? { ...item, done: !item.done } : item,
    );
    setDetail({ ...detail, checklist });
    setBusy(true);
    try {
      const saved = await clientApi<Task>(`/tasks/${detail.id}`, {
        method: "PATCH",
        json: { checklist },
      });
      setDetail({ ...saved, comments: detail.comments });
      setTasks(
        (current) =>
          current?.map((t) => (t.id === saved.id ? saved : t)) ?? null,
      );
    } catch (e) {
      setDetail(previous);
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || !comment.trim()) return;
    setBusy(true);
    try {
      await clientApi(`/tasks/${detail.id}/comments`, {
        method: "POST",
        json: { body: comment.trim() },
      });
      await showTask(detail);
      await load();
      toast("success", "تمت إضافة التعليق");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveStage(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await clientApi(
        stageEditing ? `/tasks/stages/${stageEditing}` : "/tasks/stages",
        {
          method: stageEditing ? "PUT" : "POST",
          json: {
            ...stageForm,
            name: stageForm.name.trim() || stageForm.nameAr.trim(),
          },
        },
      );
      setStageEditing(null);
      setStageForm(newStage);
      toast("success", "تم حفظ المرحلة");
      await load();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reorder(index: number, direction: number) {
    const ordered = [...stages];
    [ordered[index], ordered[index + direction]] = [
      ordered[index + direction],
      ordered[index],
    ];
    setBusy(true);
    try {
      await clientApi("/tasks/stages/reorder", {
        method: "PUT",
        json: { ids: ordered.map((s) => s.id) },
      });
      await load();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    detailRequest.current++;
    setBusy(true);
    try {
      await clientApi(
        deleting.kind === "stage"
          ? `/tasks/stages/${deleting.id}`
          : `/tasks/${deleting.id}`,
        { method: "DELETE" },
      );
      setDeleting(null);
      setDetail(null);
      toast(
        "success",
        deleting.kind === "task" ? "تمت أرشفة التاسك" : "تم حذف المرحلة",
      );
      await load();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const visible = (tasks ?? []).filter(
    (task) =>
      (filter === "archived" ? task.archived : !task.archived) &&
      (filter === "all" ||
        filter === "archived" ||
        (filter === "mine"
          ? task.assigneeId === user.id
          : task.assigneeId == null)) &&
      (!priorityFilter || task.priority === priorityFilter) &&
      (!dateFilter ||
        (dateFilter === "overdue"
          ? isOverdue(task, stages)
          : task.dueDate === localDate() &&
            !isDone(stages.find((s) => s.id === task.stageId)))) &&
      `${task.title} ${task.description} ${task.assignee?.displayName ?? ""}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="التاسكات"
        actions={
          writable && (
            <>
              <button className={outline} onClick={() => setStageDialog(true)}>
                <Settings2 className="size-4" /> المراحل
              </button>
              <button
                className={button}
                disabled={busy || !stages.length}
                onClick={() => edit("new")}
              >
                <Plus className="size-4" /> تاسك جديد
              </button>
            </>
          )
        }
      />
      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <span className="rounded-xl border border-line bg-surface px-3 py-2">
          {(tasks ?? []).filter((t) => !t.archived).length} تاسك
        </span>
        <button
          aria-pressed={filter === "mine"}
          onClick={() => setFilter(filter === "mine" ? "all" : "mine")}
          className={`rounded-xl border px-3 py-2 ${filter === "mine" ? "border-brand bg-brand/10 text-brand-2" : "border-line text-muted"}`}
        >
          المسندة إليّ ·{" "}
          {
            (tasks ?? []).filter((t) => !t.archived && t.assigneeId === user.id)
              .length
          }
        </button>
        <button
          aria-pressed={dateFilter === "overdue"}
          onClick={() =>
            setDateFilter(dateFilter === "overdue" ? "" : "overdue")
          }
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${dateFilter === "overdue" ? "border-rose-400/50 bg-rose-400/10 text-rose-300" : "border-line text-muted"}`}
        >
          <CalendarDays className="size-4" />
          المتأخرة · {(tasks ?? []).filter((t) => isOverdue(t, stages)).length}
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/50 p-3">
        <div className="relative min-w-[140px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-3 size-4 text-muted" />
          <Input
            className="ps-9"
            aria-label="البحث في التاسكات"
            placeholder="ابحث بالعنوان، الوصف أو المسؤول..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`grid size-10 place-items-center rounded-xl border sm:hidden ${filtersOpen || priorityFilter || dateFilter || filter !== "all" ? "border-brand text-brand-2" : "border-line text-muted"}`}
          aria-label="إظهار الفلاتر"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <SlidersHorizontal className="size-4" />
        </button>
        <Select
          className={`${filtersOpen ? "block" : "hidden"} order-2 w-auto flex-1 sm:order-none sm:block sm:flex-none`}
          aria-label="تصفية التاسكات"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">كل التاسكات</option>
          <option value="mine">المسندة إليّ</option>
          <option value="unassigned">بدون مسؤول</option>
          <option value="archived">الأرشيف</option>
        </Select>
        <Select
          className={`${filtersOpen ? "block" : "hidden"} order-2 w-auto flex-1 sm:order-none sm:block sm:flex-none`}
          aria-label="تصفية حسب الأولوية"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">كل الأولويات</option>
          {priorities.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select
          className={`${filtersOpen ? "block" : "hidden"} order-2 w-auto flex-1 sm:order-none sm:block sm:flex-none`}
          aria-label="تصفية حسب الموعد"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="">كل المواعيد</option>
          <option value="today">اليوم</option>
          <option value="overdue">المتأخرة</option>
        </Select>
        <div
          className="flex rounded-xl border border-line p-1"
          aria-label="طريقة العرض"
        >
          <button
            className={`grid size-9 place-items-center rounded-lg ${!listView ? "bg-brand/20 text-brand-2" : "text-muted"}`}
            aria-label="عرض اللوحة"
            aria-pressed={!listView}
            onClick={() => setListView(false)}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            className={`grid size-9 place-items-center rounded-lg ${listView ? "bg-brand/20 text-brand-2" : "text-muted"}`}
            aria-label="عرض القائمة"
            aria-pressed={listView}
            onClick={() => setListView(true)}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>
      <div className="mb-4 flex min-h-7 flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>
          {filter === "archived"
            ? "التاسكات المؤرشفة — افتح التاسك لاستعادته"
            : "اسحب من ⋮⋮ لترتيب التاسكات، أو انقلها من قائمة المرحلة."}
        </span>
        <span
          role="status"
          aria-live="polite"
          className="flex items-center gap-2"
        >
          {busy ? (
            <>
              <Spinner />
              جارٍ الحفظ...
            </>
          ) : (
            `${visible.length} تاسك ظاهر`
          )}
        </span>
      </div>
      {undo && (
        <div
          role="status"
          className="mb-4 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-sm"
        >
          <span className="flex-1">تم نقل التاسك وحفظ الترتيب</span>
          <button
            disabled={busy}
            onClick={() => {
              const task = tasks?.find((t) => t.id === undo.taskId);
              if (task) void move(task, undo.stageId, undo.sortOrder, true);
            }}
            className="flex min-h-9 items-center gap-2 font-semibold text-brand-2"
          >
            <Undo2 className="size-4" />
            تراجع
          </button>
          <button
            aria-label="إخفاء إشعار النقل"
            onClick={() => setUndo(null)}
            className="p-2"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {(search || filter !== "all" || priorityFilter || dateFilter) &&
        !visible.length &&
        tasks && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-4 text-sm">
            <span>لا توجد تاسكات تطابق الفلاتر الحالية.</span>
            <button
              className="font-semibold text-brand-2"
              onClick={() => {
                setSearch("");
                setFilter("all");
                setPriorityFilter("");
                setDateFilter("");
              }}
            >
              مسح الفلاتر
            </button>
          </div>
        )}
      {error ? (
        <Card>
          <p role="alert" className="text-danger">
            {error}
          </p>
          <button className={`${outline} mt-4`} onClick={load}>
            إعادة المحاولة
          </button>
        </Card>
      ) : !tasks ? (
        <Spinner />
      ) : !stages.length ? (
        <Empty text="ابدأ بإضافة أول مرحلة للعمل من زر المراحل" />
      ) : (
        <TaskBoard
          tasks={visible}
          allTasks={tasks}
          stages={stages}
          writable={writable && filter !== "archived"}
          busy={busy}
          list={listView}
          onOpen={showTask}
          onMove={move}
          onCreate={quickCreate}
        />
      )}
      <Modal
        open={!!editing}
        title={editing === "new" ? "تاسك جديد" : "تعديل التاسك"}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
        wide
      >
        <form onSubmit={saveTask} className="space-y-4">
          <Field label="عنوان التاسك">
            <Input
              required
              autoFocus
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="الوصف ومعايير الإنجاز">
            <Textarea
              rows={5}
              maxLength={10000}
              placeholder="ما المطلوب؟ متى نعتبر التاسك منجزاً؟"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المرحلة">
              <Select
                aria-label="المرحلة"
                required
                value={form.stageId}
                onChange={(e) =>
                  setForm({ ...form, stageId: Number(e.target.value) })
                }
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {stageName(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="المسؤول">
              <Select
                aria-label="المسؤول"
                value={form.assigneeId}
                onChange={(e) =>
                  setForm({ ...form, assigneeId: e.target.value })
                }
              >
                <option value="">بدون مسؤول</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName || p.username}
                    {p.id === user.id ? " (أنا)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الأولوية">
              <Select
                aria-label="الأولوية"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="موعد التسليم (اختياري)">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </Field>
          </div>
          <fieldset className="space-y-3 rounded-xl border border-line p-4">
            <legend className="px-2 text-sm font-semibold">
              خطوات الإنجاز (اختياري)
            </legend>
            {form.checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`إنجاز ${item.text}`}
                  className="size-4 accent-indigo-500"
                  checked={item.done}
                  onChange={() =>
                    setForm({
                      ...form,
                      checklist: form.checklist.map((c) =>
                        c.id === item.id ? { ...c, done: !c.done } : c,
                      ),
                    })
                  }
                />
                <span
                  className={`flex-1 text-sm ${item.done ? "text-muted line-through" : ""}`}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  aria-label={`حذف الخطوة ${item.text}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      checklist: form.checklist.filter((c) => c.id !== item.id),
                    })
                  }
                  className="grid size-9 place-items-center text-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                aria-label="خطوة جديدة"
                placeholder="أضف خطوة واضحة..."
                value={checkText}
                maxLength={500}
                onChange={(e) => setCheckText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (checkText.trim() && form.checklist.length < 100) {
                      setForm({
                        ...form,
                        checklist: [
                          ...form.checklist,
                          {
                            id: crypto.randomUUID(),
                            text: checkText.trim(),
                            done: false,
                          },
                        ],
                      });
                      setCheckText("");
                    }
                  }
                }}
              />
              <button
                type="button"
                className={outline}
                disabled={!checkText.trim() || form.checklist.length >= 100}
                onClick={() => {
                  setForm({
                    ...form,
                    checklist: [
                      ...form.checklist,
                      {
                        id: crypto.randomUUID(),
                        text: checkText.trim(),
                        done: false,
                      },
                    ],
                  });
                  setCheckText("");
                }}
              >
                إضافة
              </button>
            </div>
          </fieldset>
          <div className="flex justify-end border-t border-line pt-4">
            <button className={button} disabled={busy}>
              {busy && <Spinner />} حفظ التاسك
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!detail}
        title={detail?.title ?? "تفاصيل التاسك"}
        onClose={() => {
          if (!busy) {
            detailRequest.current++;
            setDetail(null);
          }
        }}
        wide
      >
        {detailLoading ? (
          <div
            role="status"
            className="flex items-center gap-3 py-8 text-muted"
          >
            <Spinner />
            تحميل تفاصيل التاسك...
          </div>
        ) : (
          detail && (
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-brand/10 px-3 py-1 text-xs text-brand-2">
                  {stages.find((s) => s.id === detail.stageId) &&
                    stageName(stages.find((s) => s.id === detail.stageId)!)}
                </span>
                <span className="text-xs text-muted">
                  المسؤول:{" "}
                  {detail.assignee?.displayName ||
                    detail.assignee?.username ||
                    "بدون مسؤول"}
                </span>
                {writable && (
                  <div className="ms-auto flex gap-2">
                    {detail.archived ? (
                      <button
                        className={outline}
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await clientApi(`/tasks/${detail.id}`, {
                              method: "PATCH",
                              json: { archived: false },
                            });
                            setDetail(null);
                            toast("success", "تمت استعادة التاسك");
                            await load();
                          } catch (e) {
                            toast("error", (e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <ArchiveRestore className="size-4" /> استعادة
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => edit(detail)}
                          className={outline}
                        >
                          <Pencil className="size-4" /> تعديل
                        </button>
                        <button
                          className="grid size-10 place-items-center rounded-xl border border-line text-danger"
                          aria-label="أرشفة التاسك"
                          onClick={() =>
                            setDeleting({ kind: "task", id: detail.id })
                          }
                        >
                          <Archive className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="mb-4">
                <TaskMetadata task={detail} stages={stages} />
              </div>
              {writable && !detail.archived && (
                <Field label="نقل إلى مرحلة">
                  <Select
                    disabled={busy}
                    value={detail.stageId}
                    onChange={(e) => void move(detail, Number(e.target.value))}
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {stageName(s)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <p className="whitespace-pre-wrap text-sm leading-8 text-muted">
                {detail.description || "لم يُضف وصف بعد."}
              </p>
              {!!detail.checklist?.length && (
                <fieldset className="mt-5 space-y-3 rounded-xl border border-line p-4">
                  <legend className="px-2 text-sm font-bold">
                    خطوات الإنجاز ·{" "}
                    {detail.checklist.filter((c) => c.done).length}/
                    {detail.checklist.length}
                  </legend>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{
                        width: `${(detail.checklist.filter((c) => c.done).length / detail.checklist.length) * 100}%`,
                      }}
                    />
                  </div>
                  {detail.checklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-10 cursor-pointer items-center gap-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-5 accent-indigo-500"
                        checked={item.done}
                        disabled={busy || !writable || detail.archived}
                        onChange={() => void toggleCheck(item.id)}
                      />
                      <span
                        className={item.done ? "text-muted line-through" : ""}
                      >
                        {item.text}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="mb-4 flex items-center gap-2 font-bold">
                  <MessageSquare className="size-4 text-brand-2" /> التعليقات
                  والمستجدات
                </h3>
                <div className="space-y-3">
                  {detail.comments?.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-line p-4"
                    >
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                        <span className="font-semibold">
                          {entry.author?.displayName ||
                            entry.author?.username ||
                            "حساب سابق"}
                        </span>
                        <time dateTime={entry.createdAt} className="text-muted">
                          {new Date(entry.createdAt).toLocaleString("ar-IQ")}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {entry.body}
                      </p>
                    </div>
                  ))}
                  {!detail.comments?.length && (
                    <p className="text-sm text-muted">
                      ابدأ بتحديث عن التقدم أو أضف مشكلة تحتاج مناقشة.
                    </p>
                  )}
                </div>
                {writable && !detail.archived && (
                  <form onSubmit={addComment} className="mt-5 space-y-3">
                    <Field label="تعليق جديد">
                      <Textarea
                        required
                        maxLength={10000}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="شارك تحديثاً، سؤالاً، أو عائقاً..."
                      />
                    </Field>
                    <button
                      disabled={busy || !comment.trim()}
                      className={button}
                    >
                      {busy && <Spinner />} إضافة تعليق
                    </button>
                  </form>
                )}
              </div>
            </div>
          )
        )}
      </Modal>
      <Modal
        open={stageDialog}
        title="مراحل العمل"
        onClose={() => {
          if (!busy) setStageDialog(false);
        }}
        wide
      >
        <p className="mb-5 text-sm leading-7 text-muted">
          خصّص المراحل حسب طريقة عمل الفريق. انقل التاسكات من المرحلة قبل حذفها.
        </p>
        <div className="mb-6 space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 rounded-xl border border-line p-3"
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="flex-1 text-sm font-semibold">
                {stageName(stage)}
              </span>
              <button
                disabled={busy || index === 0}
                aria-label={`تقديم ${stageName(stage)}`}
                onClick={() => reorder(index, -1)}
                className="p-2 disabled:opacity-20"
              >
                <ArrowUp className="size-4" />
              </button>
              <button
                disabled={busy || index === stages.length - 1}
                aria-label={`تأخير ${stageName(stage)}`}
                onClick={() => reorder(index, 1)}
                className="p-2 disabled:opacity-20"
              >
                <ArrowDown className="size-4" />
              </button>
              <button
                aria-label={`تعديل ${stageName(stage)}`}
                onClick={() => {
                  setStageEditing(stage.id);
                  setStageForm({
                    name: stage.name,
                    nameAr: stage.nameAr,
                    nameCkb: stage.nameCkb,
                    color: stage.color,
                  });
                }}
                className="p-2"
              >
                <Pencil className="size-4" />
              </button>
              <button
                disabled={busy}
                aria-label={`حذف ${stageName(stage)}`}
                className="p-2 text-danger"
                onClick={() => setDeleting({ kind: "stage", id: stage.id })}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <form
          onSubmit={saveStage}
          className="space-y-4 border-t border-line pt-5"
        >
          <h3 className="font-semibold">
            {stageEditing ? "تعديل المرحلة" : "إضافة مرحلة"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم المرحلة بالعربية">
              <Input
                required
                maxLength={80}
                value={stageForm.nameAr}
                onChange={(e) =>
                  setStageForm({ ...stageForm, nameAr: e.target.value })
                }
              />
            </Field>
            <Field label="اسم المرحلة بالإنكليزية (اختياري)">
              <Input
                lang="en"
                dir="ltr"
                maxLength={80}
                value={stageForm.name}
                onChange={(e) =>
                  setStageForm({ ...stageForm, name: e.target.value })
                }
              />
            </Field>
            <Field label="اسم المرحلة بالكوردية (اختياري)">
              <Input
                lang="ckb"
                maxLength={80}
                value={stageForm.nameCkb}
                onChange={(e) =>
                  setStageForm({ ...stageForm, nameCkb: e.target.value })
                }
              />
            </Field>
            <Field label="لون المرحلة">
              <Input
                type="color"
                className="h-11 p-1"
                value={stageForm.color}
                onChange={(e) =>
                  setStageForm({ ...stageForm, color: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <button className={button} disabled={busy}>
              {busy && <Spinner />} حفظ المرحلة
            </button>
            {stageEditing && (
              <button
                type="button"
                className={outline}
                onClick={() => {
                  setStageEditing(null);
                  setStageForm(newStage);
                }}
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>
      </Modal>
      <Confirm
        open={!!deleting}
        title={deleting?.kind === "stage" ? "حذف المرحلة؟" : "أرشفة التاسك؟"}
        text={
          deleting?.kind === "stage"
            ? "يجب نقل جميع التاسكات إلى مرحلة أخرى أولاً."
            : "سيُنقل التاسك إلى الأرشيف مع حفظ جميع تعليقاته. يمكنك استعادته من فلتر الأرشيف."
        }
        confirmLabel={
          deleting?.kind === "task" ? "أرشفة التاسك" : "حذف المرحلة"
        }
        loading={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
