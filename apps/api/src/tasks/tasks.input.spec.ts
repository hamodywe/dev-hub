import { describe, expect, it } from 'vitest';
import { taskInput } from './tasks.input.js';

describe('task details validation', () => {
  const item = { id: 'step-1', text: 'Review the mobile layout', done: false };

  it('preserves partial update semantics and accepts a minimal task', () => {
    expect(taskInput({ title: ' Task ', stageId: 1 }, true)).toEqual({
      title: 'Task',
      stageId: 1,
    });
    expect(taskInput({ priority: 'urgent' }, false)).toEqual({
      priority: 'urgent',
    });
    expect(() => taskInput({ priority: 'urgent' }, true)).toThrow();
    expect(() => taskInput({}, false)).toThrow();
  });

  it.each(['low', 'medium', 'high', 'urgent'])(
    'accepts %s priority',
    (priority) => {
      expect(taskInput({ priority }, false).priority).toBe(priority);
    },
  );

  it.each(['critical', '', 'HIGH', null, 1, true])(
    'rejects invalid priority %s',
    (priority) => {
      expect(() => taskInput({ priority }, false)).toThrow();
    },
  );

  it.each(['2028-02-29', '2026-09-07', '0001-01-01', '9999-12-31'])(
    'preserves calendar date %s without a timezone shift',
    (dueDate) => {
      expect(taskInput({ dueDate }, false).dueDate).toBe(dueDate);
    },
  );

  it.each([
    '2026-02-29',
    '2026-02-30',
    '2026-04-31',
    '2026-13-01',
    '2026-00-01',
    '2026-01-00',
    '0000-01-01',
    '2026-9-7',
    '2026-09-07T00:00:00Z',
    '',
    20260907,
  ])('rejects invalid date %s', (dueDate) => {
    expect(() => taskInput({ dueDate }, false)).toThrow();
  });

  it('allows clearing a date and checklist', () => {
    expect(taskInput({ dueDate: null, checklist: [] }, false)).toEqual({
      dueDate: null,
      checklist: [],
    });
  });

  it('preserves checklist order, completion, and bounded text', () => {
    const checklist = [
      item,
      { id: 'step-2', text: 'س'.repeat(500), done: true },
    ];
    expect(taskInput({ checklist }, false).checklist).toEqual(checklist);
    const max = Array.from({ length: 100 }, (_, i) => ({
      ...item,
      id: `step-${i}`,
    }));
    expect(taskInput({ checklist: max }, false).checklist).toHaveLength(100);
    expect(() =>
      taskInput({ checklist: [...max, { ...item, id: 'extra' }] }, false),
    ).toThrow();
  });

  it('rejects duplicate normalized IDs', () => {
    expect(() =>
      taskInput({ checklist: [item, { ...item, id: ' step-1 ' }] }, false),
    ).toThrow();
  });

  it.each([
    null,
    {},
    [null],
    [{ ...item, id: '' }],
    [{ ...item, id: 'a'.repeat(81) }],
    [{ ...item, text: ' ' }],
    [{ ...item, text: 'a'.repeat(501) }],
    [{ ...item, done: 'false' }],
    [{ id: 'step-1', text: 'Missing completion' }],
    [{ ...item, authorId: 1 }],
  ])('rejects malformed checklist %#', (checklist) => {
    expect(() => taskInput({ checklist }, false)).toThrow();
  });

  it('keeps server-owned fields and existing task field constraints protected', () => {
    for (const value of [
      { createdById: 2 },
      { commentCount: 9 },
      { title: '' },
      { stageId: 0 },
      { assigneeId: 0 },
      { archived: 'true' },
      { sortOrder: -1 },
    ])
      expect(() => taskInput(value, false)).toThrow();
    expect(
      taskInput({ assigneeId: null, archived: false, sortOrder: 0 }, false),
    ).toEqual({ assigneeId: null, archived: false, sortOrder: 0 });
  });
});
