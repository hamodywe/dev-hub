// Run only against a disposable local DB: CMS_TEST_ALLOW_MUTATIONS=true TEST_API_URL=http://127.0.0.1:4311/api node test/cms.integration.mjs
import assert from 'node:assert/strict';
const base = process.env.TEST_API_URL ?? 'http://127.0.0.1:4311/api';
if (
  process.env.CMS_TEST_ALLOW_MUTATIONS !== 'true' ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)
)
  throw Error('Explicit opt-in and a local API are required');
const suffix = Date.now().toString(36);
let checks = 0;
async function request(
  path,
  { method = 'GET', body, token, expected = 200 } = {},
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  assert.equal(
    res.status,
    expected,
    `${method} ${path}: ${res.status} ${text}`,
  );
  checks++;
  return data;
}
const login = await request('/auth/login', {
  method: 'POST',
  body: {
    username: process.env.ADMIN_USER ?? 'review',
    password: process.env.ADMIN_PASSWORD ?? 'review-local-password',
  },
  expected: 201,
});
const owner = login.token,
  ownerId = login.user.id;
assert.equal(login.user.role, 'owner');
const me = await request('/auth/me', { token: owner });
assert.deepEqual(Object.keys(me).sort(), [
  'active',
  'displayName',
  'id',
  'permissions',
  'role',
  'username',
]);
await request('/tasks', { expected: 401 });
const worker = await request('/users', {
  method: 'POST',
  token: owner,
  body: {
    username: 'worker-' + suffix,
    password: 'review-test-password',
    displayName: 'Task worker',
    role: 'admin',
    permissions: ['tasks:write'],
  },
  expected: 201,
});
assert(worker.permissions.includes('tasks:read'));
assert(!JSON.stringify(worker).includes('password'));
const wlogin = await request('/auth/login', {
  method: 'POST',
  body: { username: worker.username, password: 'review-test-password' },
  expected: 201,
});
const wt = wlogin.token;
await request('/tasks', { token: wt });
for (const path of [
  '/users',
  '/articles/admin/all',
  '/services/admin/all',
  '/projects/admin/all',
  '/messages',
  '/settings/admin',
])
  await request(path, { token: wt, expected: 403 });
await request('/settings', {
  method: 'PUT',
  token: wt,
  body: { phone: 'forbidden' },
  expected: 403,
});
const manager = await request('/users', {
  method: 'POST',
  token: owner,
  body: {
    username: 'manager-' + suffix,
    password: 'review-test-password',
    role: 'admin',
    permissions: ['users:write'],
  },
  expected: 201,
});
const ml = await request('/auth/login', {
  method: 'POST',
  body: { username: manager.username, password: 'review-test-password' },
  expected: 201,
});
await request('/users', {
  method: 'POST',
  token: ml.token,
  body: {
    username: 'escalation-' + suffix,
    password: 'review-test-password',
    role: 'owner',
  },
  expected: 403,
});
await request('/users/' + ownerId, {
  method: 'PATCH',
  token: ml.token,
  body: { displayName: 'takeover' },
  expected: 403,
});
await request('/users/' + worker.id, {
  method: 'PATCH',
  token: ml.token,
  body: { permissions: [] },
  expected: 403,
});
await request('/users/' + manager.id, {
  method: 'PATCH',
  token: ml.token,
  body: { permissions: ['users:write', 'settings:write'] },
  expected: 403,
});
for (const body of [
  { active: false },
  { role: 'admin' },
  { permissions: ['settings:read'] },
])
  await request('/users/' + ownerId, {
    method: 'PATCH',
    token: owner,
    body,
    expected: 400,
  });
await request('/users/' + ownerId, {
  method: 'DELETE',
  token: owner,
  expected: 400,
});
await request('/users/' + ownerId, {
  method: 'PUT',
  token: owner,
  body: {
    username: me.username,
    displayName: me.displayName,
    role: me.role,
    permissions: me.permissions,
    active: me.active,
  },
});
const allUsers = await request('/users', { token: owner });
assert(!JSON.stringify(allUsers).includes('passwordHash'));
const stageA = await request('/tasks/stages', {
  method: 'POST',
  token: wt,
  body: {
    name: 'Review ' + suffix,
    nameAr: 'مراجعة',
    nameCkb: 'پێداچوونەوە',
    color: '#6366F1',
    sortOrder: 0,
  },
  expected: 201,
});
const stageB = await request('/tasks/stages', {
  method: 'POST',
  token: wt,
  body: { name: 'Second ' + suffix, color: '#717F95' },
  expected: 201,
});
const stages = await request('/tasks/stages', { token: wt });
const reversed = stages.map((s) => s.id).reverse();
const reordered = await request('/tasks/stages/reorder', {
  method: 'PUT',
  token: wt,
  body: { ids: reversed },
});
assert.deepEqual(
  reordered.map((s) => s.id),
  reversed,
);
assert.deepEqual(
  reordered.map((s) => s.sortOrder),
  reordered.map((_, i) => i),
);
await request('/tasks/stages/reorder', {
  method: 'PUT',
  token: wt,
  body: { ids: [stageA.id, stageA.id] },
  expected: 400,
});
await request('/tasks', {
  method: 'POST',
  token: wt,
  body: { title: 'Bad stage', stageId: 999999 },
  expected: 400,
});
await request('/tasks', {
  method: 'POST',
  token: wt,
  body: { title: 'Bad assignee', stageId: stageA.id, assigneeId: 999999 },
  expected: 400,
});
const task = await request('/tasks', {
  method: 'POST',
  token: wt,
  body: {
    title: 'Task ' + suffix,
    description: 'Details',
    stageId: stageA.id,
    assigneeId: worker.id,
    priority: 'high',
    dueDate: '2028-02-29',
    checklist: [{ id: 'review', text: 'Review mobile', done: false }],
  },
  expected: 201,
});
assert.equal(task.createdBy.id, worker.id);
assert.equal(task.assignee.id, worker.id);
assert.equal(task.priority, 'high');
assert.equal(task.dueDate, '2028-02-29');
assert.deepEqual(task.checklist, [
  { id: 'review', text: 'Review mobile', done: false },
]);
assert.equal(task.commentCount, 0);
for (const body of [
  { priority: 'critical' },
  { dueDate: '2026-02-30' },
  { checklist: [{ id: 'review', text: 'Review mobile', done: 'false' }] },
]) {
  await request('/tasks/' + task.id, {
    method: 'PATCH',
    token: wt,
    body,
    expected: 400,
  });
}
const comment = await request('/tasks/' + task.id + '/comments', {
  method: 'POST',
  token: wt,
  body: { body: 'A review note' },
  expected: 201,
});
assert.equal(comment.author.id, worker.id);
await request('/tasks/' + task.id + '/comments', {
  method: 'POST',
  token: wt,
  body: { body: 'forged', authorId: ownerId },
  expected: 400,
});
await request('/tasks/stages/' + stageA.id, {
  method: 'DELETE',
  token: wt,
  expected: 409,
});
const parallel = await Promise.all(
  Array.from({ length: 6 }, (_, i) =>
    request('/tasks', {
      method: 'POST',
      token: wt,
      body: {
        title: 'Concurrent ' + i + ' ' + suffix,
        stageId: stageA.id,
        sortOrder: 0,
      },
      expected: 201,
    }),
  ),
);
const board = await request('/tasks', { token: wt });
assert.equal(board.find((t) => t.id === task.id).commentCount, 1);
assert(
  parallel.every(
    (t) =>
      t.priority === 'medium' && t.dueDate === null && t.checklist.length === 0,
  ),
);
const group = board.filter((t) => t.stageId === stageA.id);
assert.deepEqual(
  group.map((t) => t.sortOrder),
  group.map((_, i) => i),
);
const moved = await request('/tasks/' + task.id, {
  method: 'PATCH',
  token: wt,
  body: { stageId: stageB.id, sortOrder: 0, assigneeId: ownerId },
});
assert.equal(moved.stageId, stageB.id);
assert.equal(moved.assignee.id, ownerId);
assert.equal(moved.priority, 'high');
assert.equal(moved.dueDate, '2028-02-29');
assert.deepEqual(moved.checklist, task.checklist);
const updatedDetails = await request('/tasks/' + task.id, {
  method: 'PATCH',
  token: wt,
  body: {
    priority: 'urgent',
    dueDate: null,
    checklist: [{ id: 'review', text: 'Review mobile', done: true }],
  },
});
assert.equal(updatedDetails.priority, 'urgent');
assert.equal(updatedDetails.dueDate, null);
assert.equal(updatedDetails.checklist[0].done, true);
assert.equal(updatedDetails.commentCount, 1);
assert.equal(
  (await request('/tasks/' + task.id, { token: wt })).comments[0].id,
  comment.id,
);
await request('/users/' + worker.id, {
  method: 'PATCH',
  token: owner,
  body: { permissions: [] },
});
await request('/tasks', { token: wt, expected: 403 });
await request('/users/' + worker.id, {
  method: 'PATCH',
  token: owner,
  body: { permissions: ['tasks:read'] },
});
await request('/tasks', { token: wt });
await request('/tasks', {
  method: 'POST',
  token: wt,
  body: { title: 'Denied', stageId: stageA.id },
  expected: 403,
});
await request('/users/' + worker.id, {
  method: 'PATCH',
  token: owner,
  body: { active: false },
});
await request('/auth/me', { token: wt, expected: 401 });
await request('/auth/login', {
  method: 'POST',
  body: { username: worker.username, password: 'review-test-password' },
  expected: 401,
});
await request('/tasks/' + task.id, {
  method: 'PATCH',
  token: owner,
  body: { assigneeId: worker.id },
  expected: 400,
});
const assignees = await request('/tasks/assignees', { token: owner });
assert(!assignees.some((u) => u.id === worker.id));
const detail = await request('/tasks/' + task.id, { token: owner });
assert.equal(detail.comments[0].author.id, worker.id);
assert.equal(detail.comments[0].author.active, false);
await request('/tasks/' + task.id, { method: 'DELETE', token: owner });
assert(
  !(await request('/tasks', { token: owner })).some((t) => t.id === task.id),
);
assert.equal(
  (await request('/tasks/' + task.id + '/comments', { token: owner }))[0].id,
  comment.id,
);
await request('/tasks/' + task.id + '/comments', {
  method: 'POST',
  token: owner,
  body: { body: 'late' },
  expected: 409,
});
assert(
  (await request('/tasks?includeArchived=1', { token: owner })).some(
    (t) => t.id === task.id && t.archived,
  ),
);
await request('/tasks/' + task.id, {
  method: 'PATCH',
  token: owner,
  body: { archived: false },
});
assert(
  (await request('/tasks', { token: owner })).some((t) => t.id === task.id),
);
assert.equal(
  (await request('/tasks/' + task.id, { token: owner })).comments[0].id,
  comment.id,
);
await request('/tasks/' + task.id, { method: 'DELETE', token: owner });
const originals = await request('/articles');
assert(originals.length > 0);
const { category, publishedAt, sources, translations } = originals[0];
const articleBody = {
  slug: 'review-' + suffix,
  category,
  publishedAt,
  sources,
  translations,
  published: false,
  sortOrder: 999,
};
const article = await request('/articles', {
  method: 'POST',
  token: owner,
  body: articleBody,
  expected: 201,
});
await request('/articles/' + article.slug, { expected: 404 });
assert(
  (await request('/articles/admin/all', { token: owner })).some(
    (a) => a.id === article.id,
  ),
);
await request('/articles/' + article.id + '/visibility', {
  method: 'PATCH',
  token: owner,
  body: { published: true },
});
await request('/articles/' + article.slug);
const blank = structuredClone(articleBody);
blank.translations.ckb.title = '';
await request('/articles/' + article.id, {
  method: 'PUT',
  token: owner,
  body: { ...blank, published: true },
  expected: 400,
});
await request('/articles/' + article.id, {
  method: 'PUT',
  token: owner,
  body: blank,
});
await request('/articles/' + article.id + '/visibility', {
  method: 'PATCH',
  token: owner,
  body: { published: true },
  expected: 400,
});
const unsafe = structuredClone(articleBody);
unsafe.sources[0].url = 'javascript:alert(1)';
await request('/articles', {
  method: 'POST',
  token: owner,
  body: unsafe,
  expected: 400,
});
await request('/articles/' + article.id, { method: 'DELETE', token: owner });
await request('/articles/admin/' + article.id, { token: owner, expected: 404 });
const svc = await request('/services', {
  method: 'POST',
  token: owner,
  body: {
    title: 'خدمة',
    titleEn: 'Service',
    titleCkb: 'خزمەت',
    description: 'وصف',
    descriptionEn: 'Description',
    descriptionCkb: 'وردەکاری',
  },
  expected: 201,
});
assert.equal(svc.published, false);
assert(!(await request('/services')).some((s) => s.id === svc.id));
await request('/services/' + svc.id + '/visibility', {
  method: 'PATCH',
  token: owner,
  body: { published: true },
});
assert((await request('/services')).some((s) => s.id === svc.id));
await request('/services/' + svc.id + '/visibility', {
  method: 'PATCH',
  token: owner,
  body: { published: false },
});
await request('/services/' + svc.id, { method: 'DELETE', token: owner });
const project = await request('/projects', {
  method: 'POST',
  token: owner,
  body: {
    title: 'مشروع',
    titleEn: 'Project',
    titleCkb: 'پڕۆژە',
    description: 'وصف',
    descriptionEn: 'Description',
    descriptionCkb: 'وردەکاری',
    slug: 'project-' + suffix,
    clientEn: 'English client',
  },
  expected: 201,
});
assert.equal(project.clientEn, 'English client');
assert.equal(project.published, false);
await request('/projects/' + project.id + '/visibility', {
  method: 'PATCH',
  token: owner,
  body: { published: true },
});
await request('/projects/' + project.slug);
await request('/projects/' + project.id + '/visibility', {
  method: 'PATCH',
  token: owner,
  body: { published: false },
});
await request('/projects/' + project.slug, { expected: 404 });
await request('/projects', {
  method: 'POST',
  token: owner,
  body: { title: 'bad', liveUrl: 'javascript:alert(1)' },
  expected: 400,
});
await request('/projects/' + project.id, { method: 'DELETE', token: owner });
await request('/settings', {
  method: 'PUT',
  token: owner,
  body: {
    socialLinks: [
      {
        id: 'bad',
        platform: 'github',
        label: 'GitHub',
        enabled: true,
        url: 'https://user:pass@example.com',
      },
    ],
  },
  expected: 400,
});
await request('/settings', {
  method: 'PUT',
  token: owner,
  body: { team: [{ id: 'bad', name: 'Bad', github: 'javascript:alert(1)' }] },
  expected: 400,
});
for (const t of parallel)
  await request('/tasks/' + t.id, { method: 'DELETE', token: owner });
await request('/users/' + manager.id, { method: 'DELETE', token: owner });
console.log(
  JSON.stringify(
    {
      status: 'PASS',
      httpAssertions: checks,
      additionalAssertions:
        'identity secrecy, privilege normalization, object attribution, publication, ordering and preservation',
      createdArchivedTaskIds: [task.id, ...parallel.map((t) => t.id)],
    },
    null,
    2,
  ),
);
