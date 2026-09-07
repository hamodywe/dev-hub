import test from "node:test";
import assert from "node:assert/strict";
import {
  moveTask,
  orderedTasks,
  isOverdue,
  localDate,
} from "../src/components/admin/tasks/model.ts";
const task = (id, stageId, sortOrder, extra = {}) => ({
  id,
  stageId,
  sortOrder,
  archived: false,
  ...extra,
});
test("drag reorder persists exact placement without losing hidden or archived cards", () => {
  const before = [
    task(1, 1, 0),
    task(2, 1, 1),
    task(3, 1, 2),
    task(4, 1, 7, { archived: true }),
    task(5, 2, 0),
  ];
  const result = moveTask(before, 1, 1, 2);
  assert.deepEqual(
    orderedTasks(result, 1).map((t) => t.id),
    [2, 3, 1],
  );
  assert.equal(result.find((t) => t.id === 4).sortOrder, 7);
  assert.deepEqual(
    orderedTasks(before, 1).map((t) => t.id),
    [1, 2, 3],
  );
  const across = moveTask(result, 3, 2, 0);
  assert.deepEqual(
    orderedTasks(across, 1).map((t) => [t.id, t.sortOrder]),
    [
      [2, 0],
      [1, 1],
    ],
  );
  assert.deepEqual(
    orderedTasks(across, 2).map((t) => [t.id, t.sortOrder]),
    [
      [3, 0],
      [5, 1],
    ],
  );
});
test("empty-column drops and undo preserve complete order", () => {
  const before = [task(1, 1, 0), task(2, 1, 1), task(3, 1, 2)];
  const moved = moveTask(before, 2, 4, 99);
  assert.deepEqual(
    orderedTasks(moved, 4).map((t) => [t.id, t.sortOrder]),
    [[2, 0]],
  );
  assert.deepEqual(moveTask(moved, 2, 1, 1), before);
  assert.equal(moveTask(before, 999, 1, 0), before);
});
test("deadline comparison uses calendar dates and excludes archived/completed tasks", () => {
  const stages = [
    { id: 1, name: "To do", nameAr: "للعمل" },
    { id: 2, name: "Done", nameAr: "مكتمل" },
  ];
  assert.equal(
    isOverdue(task(1, 1, 0, { dueDate: "2026-09-06" }), stages, "2026-09-07"),
    true,
  );
  assert.equal(
    isOverdue(task(1, 1, 0, { dueDate: "2026-09-07" }), stages, "2026-09-07"),
    false,
  );
  assert.equal(
    isOverdue(task(1, 2, 0, { dueDate: "2026-09-06" }), stages, "2026-09-07"),
    false,
  );
  assert.equal(
    isOverdue(
      task(1, 1, 0, { dueDate: "2026-09-06", archived: true }),
      stages,
      "2026-09-07",
    ),
    false,
  );
  assert.equal(localDate(new Date(2026, 0, 2, 1)), "2026-01-02");
});
