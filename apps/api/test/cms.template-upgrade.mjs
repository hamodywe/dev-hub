// Build first. Requires an EMPTY disposable local review DB. Never use a live DB.
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import bcrypt from 'bcryptjs';
import { NestFactory } from '@nestjs/core';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
} from 'node:fs/promises';

const target = new URL(process.env.DATABASE_URL);
if (
  process.env.CMS_TEST_ALLOW_MUTATIONS !== 'true' ||
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !target.pathname.includes('review') ||
  target.pathname === '/devshub_review'
)
  throw Error('Empty disposable local review DB required');

const originalTemplates = [
  'template-company',
  'template-lawyer',
  'template-photographer',
  'template-restaurant',
  'template-clinic',
  'template-realestate',
];
const additionalTemplates = [
  'template-clinic-nawa',
  'template-realestate-sukn',
  'template-gym',
  'template-appliances',
  'template-phones',
];
const sectorTemplates = ['template-academy', 'template-hotel', 'template-architecture'];
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const temp = await mkdtemp('dist/review-template-upgrade-');
try {
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'",
      )
    ).rows[0].n,
    0,
    'DB must be empty before any fixture mutation',
  );
  const journal = JSON.parse(
    await readFile('drizzle/meta/_journal.json', 'utf8'),
  );
  const translationIndex = journal.entries.findIndex(
    (e) => e.tag === '0005_template_client_translation',
  );
  assert(translationIndex > 0, 'Client translation migration must exist');
  const earlier = journal.entries.slice(0, translationIndex);
  await mkdir(`${temp}/meta`);
  await writeFile(
    `${temp}/meta/_journal.json`,
    JSON.stringify({ ...journal, entries: earlier }),
  );
  for (const entry of earlier)
    await copyFile(`drizzle/${entry.tag}.sql`, `${temp}/${entry.tag}.sql`);
  await migrate(drizzle(pool), { migrationsFolder: temp });
  let firstBoot = true;
  process.env.SEED_DEMO = 'true';
  process.env.JWT_SECRET = 'local-template-upgrade-review-secret';
  const { AppModule } = await import('../dist/app.module.js');
  async function boot() {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
      abortOnError: false,
    });
    await app.close();
  }
  const projectRows = async () =>
    (await pool.query('SELECT * FROM projects ORDER BY slug')).rows;
  const userRows = async () =>
    (await pool.query('SELECT * FROM users ORDER BY id')).rows;
  const settingsData = async () =>
    (await pool.query('SELECT data FROM settings WHERE id=1')).rows[0].data;
  const markerRows = async () =>
    (await pool.query('SELECT * FROM cms_seed_runs ORDER BY key')).rows;

  for (const scenario of [
    { version: 3, markerPresent: false },
    { version: 3, markerPresent: true },
    { version: 4, markerPresent: false },
    { version: 5, markerPresent: false },
    { version: 3, markerPresent: false, emptyProjects: true },
  ]) {
    // Only the already-verified disposable DB is reset between independent cases.
    await pool.query(
      'TRUNCATE task_comments,tasks,projects,services,settings,users,cms_seed_runs RESTART IDENTITY',
    );
    const passwordHash = await bcrypt.hash('upstream-owner-custom-password', 4);
    await pool.query(
      `INSERT INTO users (username,password_hash,display_name,role,permissions,active,token_version)
       VALUES ($1,$2,$3,'owner','[]',true,7)`,
      ['upstream-owner', passwordHash, 'Existing owner'],
    );
    const customSettings = {
      seedVersion: scenario.version,
      siteName: 'User-owned company',
      heroTitleEn: 'Existing English heading',
      heroTitleCkb: 'ناونیشانی تایبەت',
      phone: 'custom contact before upgrade',
      email: 'owner@example.test',
      socialLinks: [],
      socials: {
        github: '',
        linkedin: '',
        facebook: '',
        twitter: '',
        instagram: '',
      },
      team: [
        {
          id: 'custom-founder',
          name: 'Custom founder',
          nameAr: 'اسم خاص',
          nameEn: 'Custom founder',
          nameCkb: 'ناوی تایبەت',
          github: '',
        },
      ],
      clients: ['عميل خاص'],
      clientsEn: [''],
      clientsCkb: ['کڕیاری تایبەت'],
    };
    await pool.query('INSERT INTO settings (id,data) VALUES (1,$1)', [
      customSettings,
    ]);
    await pool.query(
      "INSERT INTO services (title,published) VALUES ('Custom hidden service',false)",
    );
    for (const slug of originalTemplates) {
      await pool.query(
        `INSERT INTO projects (slug,title,title_en,title_ckb,published,live_url,client)
         VALUES ($1,$2,$3,$4,true,$5,'قالب جاهز — DevsHub.cc')`,
        [
          slug,
          `عنوان ${slug}`,
          `Existing ${slug}`,
          `پڕۆژە ${slug}`,
          `/demos/${slug.slice('template-'.length)}/en`,
        ],
      );
    }
    await pool.query(
      "INSERT INTO projects (slug,title,title_en,published) VALUES ('user-owned-project','مشروع خاص','Custom project',false)",
    );
    await pool.query(
      "UPDATE projects SET client_en='Custom legal client' WHERE slug='template-lawyer'",
    );
    await pool.query(
      "UPDATE projects SET client='عميل مخصص' WHERE slug IN ('template-company','template-photographer')",
    );
    await pool.query(
      "UPDATE projects SET client='قالب جاهز — DevsHub.cc' WHERE slug='user-owned-project'",
    );
    // These are real CMS decisions made before installing this release.
    await pool.query("DELETE FROM projects WHERE slug='template-clinic'");
    await pool.query(
      `UPDATE projects SET title='عنوان معدل',title_en='Edited corporate title',
       description='Custom editorial copy',published=false,sort_order=71,
       cover_image='/uploads/custom-cover.webp',gallery=$1::jsonb
       WHERE slug='template-company'`,
      [JSON.stringify(['/uploads/second.webp', '/uploads/first.webp'])],
    );
    if (scenario.markerPresent) {
      await pool.query(
        "INSERT INTO cms_seed_runs (key) VALUES ('legacy-demo-v2'),('template-sites-v3')",
      );
    }
    if (scenario.emptyProjects) await pool.query('DELETE FROM projects');
    const existingProjects = await projectRows();
    const expectedExistingProjects = existingProjects.map((project) =>
      firstBoot &&
      ['template-restaurant', 'template-realestate'].includes(project.slug)
        ? { ...project, client_en: 'DevsHub.cc template' }
        : project,
    );
    const existingUsers = await userRows();
    const existingServices = (
      await pool.query('SELECT * FROM services ORDER BY id')
    ).rows;
    await boot();

    const upgradedProjects = await projectRows();
    assert.equal(
      (
        await pool.query(
          'SELECT count(*)::int n FROM drizzle.__drizzle_migrations',
        )
      ).rows[0].n,
      journal.entries.length,
    );
    firstBoot = false;
    assert(
      !upgradedProjects.some((p) => p.slug === 'template-clinic'),
      'Upstream v3 deletion must not be resurrected',
    );
    for (const project of expectedExistingProjects) {
      assert.deepEqual(
        upgradedProjects.find((p) => p.slug === project.slug),
        project,
        `Existing project retained: ${project.slug}`,
      );
    }
    assert.deepEqual(
      await userRows(),
      existingUsers,
      'Owner hash, token version and account fields retained',
    );
    assert.deepEqual(
      (await pool.query('SELECT * FROM services ORDER BY id')).rows,
      existingServices,
    );
    assert.deepEqual(
      await settingsData(),
      { ...customSettings, seedVersion: 5 },
      'Only seedVersion may change during this upgrade',
    );
    assert.deepEqual(
      (await markerRows()).map((m) => m.key),
      ['legacy-demo-v2', 'template-sites-v3', 'template-sites-v4', 'template-sites-v5'],
    );

    const additions = upgradedProjects.filter(
      (p) => !existingProjects.some((old) => old.slug === p.slug),
    );
    assert.deepEqual(
      additions.map((p) => p.slug).sort(),
      [...(scenario.version === 3 ? additionalTemplates : []), ...(scenario.version < 5 ? sectorTemplates : [])].sort(),
      'Only unapplied template releases are added; v4 and v5 deletions remain deleted',
    );
    if (scenario.version === 3) {
      for (const slug of additionalTemplates) {
        const project = additions.find((p) => p.slug === slug);
        assert(
          project.published &&
            project.title &&
            project.title_en &&
            project.title_ckb,
        );
        assert.equal(
          project.live_url,
          `/demos/${slug.slice('template-'.length)}/ar`,
        );
      }
      await pool.query("DELETE FROM projects WHERE slug='template-phones'");
      await pool.query(
        "UPDATE projects SET title_en='User-edited gym',published=false,sort_order=88 WHERE slug='template-gym'",
      );
    }
    const afterSave = {
      ...(await settingsData()),
      phone: 'custom contact after upgrade',
      socialLinks: [],
    };
    await pool.query('UPDATE settings SET data=$1 WHERE id=1', [afterSave]);
    const savedProjects = await projectRows();
    const completedMarkers = await markerRows();
    for (let restart = 0; restart < 2; restart++) {
      await boot();
      assert.deepEqual(
        await projectRows(),
        savedProjects,
        'Restart must preserve deletions, IDs, hidden state and edited templates',
      );
      assert.deepEqual(await settingsData(), afterSave);
      assert.deepEqual(await userRows(), existingUsers);
      assert.deepEqual(
        await markerRows(),
        completedMarkers,
        'Release completion markers must remain durable',
      );
    }
    await pool.query('DELETE FROM projects');
    await boot();
    assert.deepEqual(
      await projectRows(),
      [],
      'Deleting all projects after v5 must never re-trigger default or template seeds',
    );
    assert.deepEqual(await settingsData(), afterSave);
    assert.deepEqual(await userRows(), existingUsers);
    console.log(
      `PASS: seedVersion ${scenario.version}, legacy marker ${scenario.markerPresent ? 'present' : 'absent'}${scenario.emptyProjects ? ', all upstream projects deleted' : ''}: upstream deletion/edit/visibility/password/settings preserved; additions and restart deletion rules verified.`,
    );
  }
} finally {
  await rm(temp, { recursive: true, force: true });
  await pool.end();
}
