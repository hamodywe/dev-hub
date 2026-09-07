import { BadRequestException } from '@nestjs/common';
import { bool, int, nonEmpty, object, str } from '../common/input.js';
import type { TaskChecklistItem, TaskPriority } from '../db/schema.js';

const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function taskInput(body: unknown, create: boolean) {
  const raw = object(body, [
    'title',
    'description',
    'stageId',
    'assigneeId',
    'sortOrder',
    'archived',
    'priority',
    'dueDate',
    'checklist',
  ]);
  const data: Record<string, any> = {};
  if (raw.title !== undefined) data.title = str(raw.title, 200, true);
  if (raw.description !== undefined)
    data.description = str(raw.description, 20000);
  if (raw.stageId !== undefined) data.stageId = int(raw.stageId, 1);
  if (raw.assigneeId !== undefined)
    data.assigneeId = raw.assigneeId === null ? null : int(raw.assigneeId, 1);
  if (raw.sortOrder !== undefined) data.sortOrder = int(raw.sortOrder);
  if (raw.archived !== undefined) data.archived = bool(raw.archived);
  if (raw.priority !== undefined) {
    if (!priorities.includes(raw.priority))
      throw new BadRequestException('Invalid task priority');
    data.priority = raw.priority;
  }
  if (raw.dueDate !== undefined) {
    if (raw.dueDate === null) {
      data.dueDate = null;
    } else {
      const value = str(raw.dueDate, 10, true);
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        value.startsWith('0000-') ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
      )
        throw new BadRequestException(
          'Due date must be a valid YYYY-MM-DD date',
        );
      data.dueDate = value;
    }
  }
  if (raw.checklist !== undefined) {
    if (!Array.isArray(raw.checklist) || raw.checklist.length > 100)
      throw new BadRequestException('Checklist must contain at most 100 items');
    const ids = new Set<string>();
    data.checklist = raw.checklist.map((value: unknown): TaskChecklistItem => {
      const item = object(value, ['id', 'text', 'done']);
      const id = str(item.id, 80, true);
      if (ids.has(id))
        throw new BadRequestException('Checklist item IDs must be unique');
      ids.add(id);
      return { id, text: str(item.text, 500, true), done: bool(item.done) };
    });
  }
  if (create && (!data.title || !data.stageId))
    throw new BadRequestException('Title and stageId are required');
  nonEmpty(data);
  return data;
}
