// Build first. Requires an EMPTY disposable local review DB.
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { NestFactory } from '@nestjs/core';
import { readFile } from 'node:fs/promises';
import { assertPublishable } from '../dist/articles/articles.input.js';

const target = new URL(process.env.DATABASE_URL);
if (
  process.env.CMS_TEST_ALLOW_MUTATIONS !== 'true' ||
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !target.pathname.includes('review')
)
  throw Error('Empty disposable local review DB required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'",
      )
    ).rows[0].n,
    0,
  );
  process.env.SEED_DEMO = 'true';
  process.env.JWT_SECRET = 'local-fresh-review-secret';
  const { AppModule } = await import('../dist/app.module.js');
  async function boot() {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
      abortOnError: false,
    });
    await app.close();
  }
  await boot();
  const journal = JSON.parse(
    await readFile('drizzle/meta/_journal.json', 'utf8'),
  );
  assert.equal(
    (
      await pool.query(
        'SELECT count(*)::int n FROM drizzle.__drizzle_migrations',
      )
    ).rows[0].n,
    journal.entries.length,
  );
  const people = (
    await pool.query('SELECT role,active,display_name FROM users')
  ).rows;
  assert.equal(people.length, 1);
  assert.equal(people[0].role, 'owner');
  assert(people[0].active);
  assert(people[0].display_name);
  const settings = (await pool.query('SELECT data FROM settings WHERE id=1'))
    .rows[0].data;
  assert.deepEqual(
    settings.socialLinks.map((l) => l.url).sort(),
    [
      'https://www.facebook.com/dev.point.iq',
      'https://www.linkedin.com/company/devshub-cc',
    ].sort(),
  );
  assert(
    settings.team.every((t) => t.nameAr && t.nameEn && t.nameCkb && t.github),
  );
  assert.equal(settings.team[0].github, 'https://github.com/HostX0');
  assert.equal(settings.team[1].github, 'https://github.com/hamodywe');
  assert.equal(settings.email, 'info@devshub.cc');
  assert.equal(settings.phone.replaceAll(' ', ''), '+9647708540899');
  assert(settings.heroTitleCkb);
  const articles = (await pool.query('SELECT * FROM articles')).rows;
  assert.equal(articles.length, 4);
  for (const a of articles) {
    assert(a.published);
    assertPublishable(a.translations);
  }
  for (const [table, expected] of [
    ['projects', 23],
    ['services', 6],
  ]) {
    const rows = (await pool.query(`SELECT * FROM ${table}`)).rows;
    assert.equal(rows.length, expected);
    assert(
      rows.every(
        (r) =>
          r.published &&
          r.title &&
          r.title_en &&
          r.title_ckb &&
          r.description &&
          r.description_en &&
          r.description_ckb,
      ),
    );
  }
  const templateSlugs = [
    'template-company',
    'template-lawyer',
    'template-photographer',
    'template-restaurant',
    'template-clinic',
    'template-realestate',
    'template-clinic-nawa',
    'template-realestate-sukn',
    'template-gym',
    'template-appliances',
    'template-phones',
    'template-academy',
    'template-hotel',
    'template-architecture',
  ];
  assert.deepEqual(
    (
      await pool.query(
        "SELECT slug FROM projects WHERE slug LIKE 'template-%' ORDER BY slug",
      )
    ).rows.map((p) => p.slug),
    templateSlugs.sort(),
  );
  assert(
    (
      await pool.query(
        "SELECT client_en FROM projects WHERE slug LIKE 'template-%'",
      )
    ).rows.every((project) => project.client_en.trim()),
    'Every fresh template has an English client label',
  );
  assert.equal(settings.seedVersion, 5);
  assert.equal(
    (await pool.query('SELECT count(*)::int n FROM task_stages')).rows[0].n,
    3,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM cms_seed_runs WHERE key='legacy-demo-v2'",
      )
    ).rows[0].n,
    1,
  );
  const markers = (await pool.query('SELECT * FROM cms_seed_runs ORDER BY key'))
    .rows;
  assert.deepEqual(
    markers.map((m) => m.key),
    ['legacy-demo-v2', 'template-sites-v3', 'template-sites-v4', 'template-sites-v5'],
  );
  await pool.query('DELETE FROM projects');
  await boot();
  assert.equal(
    (await pool.query('SELECT count(*)::int n FROM projects')).rows[0].n,
    0,
    'All deleted portfolio/template projects must stay deleted after a fresh install restart',
  );
  assert.deepEqual(
    (await pool.query('SELECT * FROM cms_seed_runs ORDER BY key')).rows,
    markers,
  );
  console.log(
    'PASS: clean install applies all migrations, initializes an active owner, company profiles/founder translations/contact defaults, 4 published trilingual articles, 9 portfolio + 14 template projects, 6 services, 3 task stages and durable release markers; deleting all projects survives restart.',
  );
} finally {
  await pool.end();
}
