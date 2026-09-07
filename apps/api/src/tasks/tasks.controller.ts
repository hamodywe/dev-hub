import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  Query,
  UseGuards,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { tasks, taskStages, taskComments, users } from '../db/schema.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RequirePermissions } from '../auth/permissions.js';
import { object, str, int, nonEmpty } from '../common/input.js';
import { taskInput } from './tasks.input.js';

const profileFields = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  active: users.active,
};
type Tx = Parameters<Parameters<DbService['db']['transaction']>[0]>[0];
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly dbs: DbService) {}
  private lock(tx: Tx) {
    return tx.execute(sql`SELECT pg_advisory_xact_lock(762912)`);
  }

  @Get('assignees')
  @RequirePermissions('tasks:read')
  assignees() {
    return this.dbs.db
      .select(profileFields)
      .from(users)
      .where(eq(users.active, true))
      .orderBy(asc(users.displayName), asc(users.id));
  }
  @Get('stages')
  @RequirePermissions('tasks:read')
  stages() {
    return this.dbs.db
      .select()
      .from(taskStages)
      .orderBy(asc(taskStages.sortOrder), asc(taskStages.id));
  }
  @Post('stages')
  @RequirePermissions('tasks:write')
  async createStage(@Body() body: unknown) {
    const data = this.stageInput(body, true);
    return this.dbs.db.transaction(async (tx) => {
      await this.lock(tx);
      const rows = await tx
        .select()
        .from(taskStages)
        .orderBy(asc(taskStages.sortOrder), asc(taskStages.id));
      if (rows.length >= 100)
        throw new BadRequestException('Maximum 100 stages');
      const [stage] = await tx
        .insert(taskStages)
        .values({ name: data.name!, ...data })
        .returning();
      const ids = rows.map((r) => r.id);
      ids.splice(
        Math.min(data.sortOrder ?? ids.length, ids.length),
        0,
        stage.id,
      );
      await this.orderStages(tx, ids);
      return { ...stage, sortOrder: ids.indexOf(stage.id) };
    });
  }
  @Put('stages/reorder')
  @RequirePermissions('tasks:write')
  async reorderStages(@Body() body: unknown) {
    const raw = object(body, ['ids']);
    if (!Array.isArray(raw.ids) || raw.ids.length > 100)
      throw new BadRequestException('Invalid stage IDs');
    const ids: number[] = raw.ids.map((v) => int(v, 1));
    return this.dbs.db.transaction(async (tx) => {
      await this.lock(tx);
      const rows = await tx.select({ id: taskStages.id }).from(taskStages);
      if (
        new Set(ids).size !== ids.length ||
        ids.length !== rows.length ||
        rows.some((r) => !ids.includes(r.id))
      )
        throw new BadRequestException('Supply every stage ID exactly once');
      await this.orderStages(tx, ids);
      return tx
        .select()
        .from(taskStages)
        .orderBy(asc(taskStages.sortOrder), asc(taskStages.id));
    });
  }
  @Put('stages/:id')
  @RequirePermissions('tasks:write')
  async updateStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const data = this.stageInput(body, false);
    return this.dbs.db.transaction(async (tx) => {
      await this.lock(tx);
      const rows = await tx
        .select()
        .from(taskStages)
        .orderBy(asc(taskStages.sortOrder), asc(taskStages.id));
      if (!rows.some((r) => r.id === id)) throw new NotFoundException();
      await tx.update(taskStages).set(data).where(eq(taskStages.id, id));
      if (data.sortOrder !== undefined) {
        const ids = rows.map((r) => r.id).filter((v) => v !== id);
        ids.splice(Math.min(data.sortOrder, ids.length), 0, id);
        await this.orderStages(tx, ids);
      }
      const [stage] = await tx
        .select()
        .from(taskStages)
        .where(eq(taskStages.id, id));
      return stage;
    });
  }
  @Patch('stages/:id')
  @RequirePermissions('tasks:write')
  patchStage(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.updateStage(id, body);
  }
  @Delete('stages/:id')
  @RequirePermissions('tasks:write')
  async deleteStage(@Param('id', ParseIntPipe) id: number) {
    return this.dbs.db.transaction(async (tx) => {
      await this.lock(tx);
      const rows = await tx
        .select()
        .from(taskStages)
        .orderBy(asc(taskStages.sortOrder), asc(taskStages.id));
      if (!rows.some((r) => r.id === id)) throw new NotFoundException();
      if (rows.length <= 1)
        throw new ConflictException('At least one stage is required');
      const [used] = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.stageId, id))
        .limit(1);
      if (used)
        throw new ConflictException(
          'Stage contains tasks, including archived tasks. Move them first.',
        );
      await tx.delete(taskStages).where(eq(taskStages.id, id));
      await this.orderStages(
        tx,
        rows.filter((r) => r.id !== id).map((r) => r.id),
      );
      return { ok: true };
    });
  }
  @Get()
  @RequirePermissions('tasks:read')
  async list(@Query('includeArchived') includeArchived?: string) {
    const rows = await this.dbs.db
      .select()
      .from(tasks)
      .where(includeArchived === '1' ? undefined : eq(tasks.archived, false))
      .orderBy(asc(tasks.stageId), asc(tasks.sortOrder), asc(tasks.id));
    return this.withProfiles(rows);
  }
  @Post()
  @RequirePermissions('tasks:write')
  create(@Req() req: any, @Body() body: unknown) {
    return this.save(req.user.id, undefined, taskInput(body, true));
  }
  @Get(':id/comments')
  @RequirePermissions('tasks:read')
  async comments(@Param('id', ParseIntPipe) id: number) {
    await this.requireTask(id);
    return this.dbs.db
      .select({
        id: taskComments.id,
        taskId: taskComments.taskId,
        authorId: taskComments.authorId,
        body: taskComments.body,
        createdAt: taskComments.createdAt,
        author: profileFields,
      })
      .from(taskComments)
      .innerJoin(users, eq(users.id, taskComments.authorId))
      .where(eq(taskComments.taskId, id))
      .orderBy(asc(taskComments.createdAt), asc(taskComments.id));
  }
  @Post(':id/comments')
  @RequirePermissions('tasks:write')
  async comment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const text = str(object(body, ['body']).body, 10000, true);
    return this.dbs.db.transaction(async (tx) => {
      await this.lock(tx);
      const [task] = await tx.select().from(tasks).where(eq(tasks.id, id));
      if (!task) throw new NotFoundException();
      if (task.archived)
        throw new ConflictException('Archived tasks cannot receive comments');
      const [comment] = await tx
        .insert(taskComments)
        .values({ taskId: id, authorId: req.user.id, body: text })
        .returning();
      const [author] = await tx
        .select(profileFields)
        .from(users)
        .where(eq(users.id, req.user.id));
      return { ...comment, author };
    });
  }
  @Get(':id')
  @RequirePermissions('tasks:read')
  async one(@Param('id', ParseIntPipe) id: number) {
    const row = await this.requireTask(id);
    const [task] = await this.withProfiles([row]);
    return { ...task, comments: await this.comments(id) };
  }
  @Put(':id')
  @RequirePermissions('tasks:write')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.save(req.user.id, id, taskInput(body, false));
  }
  @Patch(':id')
  @RequirePermissions('tasks:write')
  patch(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.update(req, id, body);
  }
  @Delete(':id')
  @RequirePermissions('tasks:write')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.save(req.user.id, id, { archived: true });
    return { ok: true };
  }

  private stageInput(body: unknown, create: boolean) {
    const raw = object(body, [
      'name',
      'nameAr',
      'nameCkb',
      'color',
      'sortOrder',
    ]);
    const d: Record<string, any> = {};
    for (const k of ['name', 'nameAr', 'nameCkb'])
      if (raw[k] !== undefined) d[k] = str(raw[k], 120, k === 'name');
    if (create && !d.name)
      throw new BadRequestException('Stage name is required');
    if (raw.color !== undefined) {
      d.color = str(raw.color, 7);
      if (!/^#[0-9a-fA-F]{6}$/.test(d.color))
        throw new BadRequestException('Invalid stage color');
    }
    if (raw.sortOrder !== undefined) d.sortOrder = int(raw.sortOrder);
    nonEmpty(d);
    return d;
  }
  private async orderStages(tx: Tx, ids: number[]) {
    for (const [i, id] of ids.entries())
      await tx
        .update(taskStages)
        .set({ sortOrder: i })
        .where(eq(taskStages.id, id));
  }
  private async requireTask(id: number) {
    const [task] = await this.dbs.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));
    if (!task) throw new NotFoundException();
    return task;
  }
  private async withProfiles(rows: (typeof tasks.$inferSelect)[]) {
    if (!rows.length) return [];
    const ids = [
      ...new Set(
        rows.flatMap((r) =>
          r.assigneeId ? [r.createdById, r.assigneeId] : [r.createdById],
        ),
      ),
    ];
    const [people, counts] = await Promise.all([
      this.dbs.db
        .select(profileFields)
        .from(users)
        .where(inArray(users.id, ids)),
      this.dbs.db
        .select({ taskId: taskComments.taskId, count: count() })
        .from(taskComments)
        .where(
          inArray(
            taskComments.taskId,
            rows.map((r) => r.id),
          ),
        )
        .groupBy(taskComments.taskId),
    ]);
    const map = new Map(people.map((p) => [p.id, p]));
    const commentCounts = new Map(counts.map((c) => [c.taskId, c.count]));
    return rows.map((r) => ({
      ...r,
      commentCount: commentCounts.get(r.id) ?? 0,
      assignee: r.assigneeId ? (map.get(r.assigneeId) ?? null) : null,
      createdBy: map.get(r.createdById),
    }));
  }
  private async save(
    actorId: number,
    id: number | undefined,
    data: Record<string, any>,
  ) {
    const row = await this.dbs.db.transaction(async (tx) => {
      await this.lock(tx);
      const [old] =
        id === undefined
          ? []
          : await tx.select().from(tasks).where(eq(tasks.id, id));
      if (id !== undefined && !old) throw new NotFoundException();
      const stageId = data.stageId ?? old?.stageId;
      const [stage] = await tx
        .select()
        .from(taskStages)
        .where(eq(taskStages.id, stageId));
      if (!stage) throw new BadRequestException('Stage does not exist');
      if (data.assigneeId != null) {
        const [assignee] = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, data.assigneeId), eq(users.active, true)));
        if (!assignee)
          throw new BadRequestException('Assignee must be an active user');
      }
      let saved: typeof tasks.$inferSelect;
      if (old) {
        [saved] = await tx
          .update(tasks)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(tasks.id, old.id))
          .returning();
      } else {
        [saved] = await tx
          .insert(tasks)
          .values({ title: data.title, stageId, createdById: actorId, ...data })
          .returning();
      }
      for (const currentStage of new Set(
        [old?.stageId, stageId].filter(
          (v): v is number => typeof v === 'number',
        ),
      )) {
        const peers = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(eq(tasks.stageId, currentStage), eq(tasks.archived, false)),
          )
          .orderBy(asc(tasks.sortOrder), asc(tasks.id));
        const ids = peers.map((p) => p.id).filter((v) => v !== saved.id);
        if (currentStage === saved.stageId && !saved.archived) {
          const position =
            data.sortOrder ??
            (old && old.stageId === stageId && !old.archived
              ? old.sortOrder
              : ids.length);
          ids.splice(Math.min(position, ids.length), 0, saved.id);
        }
        for (const [position, peerId] of ids.entries())
          await tx
            .update(tasks)
            .set({ sortOrder: position })
            .where(eq(tasks.id, peerId));
        if (currentStage === saved.stageId && !saved.archived)
          saved.sortOrder = ids.indexOf(saved.id);
      }
      return saved;
    });
    const [task] = await this.withProfiles([row]);
    return task;
  }
}
