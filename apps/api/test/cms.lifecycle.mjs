// Build first. Requires an EMPTY disposable local review DB. Never point at a live DB.
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
} from 'node:fs/promises';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import bcrypt from 'bcryptjs';
import { NestFactory } from '@nestjs/core';

const target = new URL(process.env.DATABASE_URL);
if (
  process.env.CMS_TEST_ALLOW_MUTATIONS !== 'true' ||
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !target.pathname.includes('review')
)
  throw Error('Empty disposable local review DB required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const temp = await mkdtemp('dist/review-legacy-');
try {
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'",
      )
    ).rows[0].n,
    0,
    'DB must be empty',
  );
  const journal = JSON.parse(
    await readFile('drizzle/meta/_journal.json', 'utf8'),
  );
  await mkdir(temp + '/meta');
  await writeFile(
    temp + '/meta/_journal.json',
    JSON.stringify({ ...journal, entries: journal.entries.slice(0, 3) }),
  );
  for (const entry of journal.entries.slice(0, 3))
    await copyFile(`drizzle/${entry.tag}.sql`, `${temp}/${entry.tag}.sql`);
  await migrate(db, { migrationsFolder: temp });
  const passwordHash = await bcrypt.hash('legacy-test-password', 4);
  await pool.query(
    'INSERT INTO users (username,password_hash) VALUES ($1,$2)',
    ['legacy-owner', passwordHash],
  );
  const legacySettings = {
    siteName: 'Custom company',
    phone: 'custom contact',
    seedVersion: 2,
    socials: {
      github: 'https://github.com/iosapk',
      linkedin: 'https://linkedin.com/in/iosapk',
      twitter: 'https://x.com/iosapk',
      instagram: 'https://instagram.com/custom-brand',
    },
    team: [
      { id: 'abdulazeez-noaman', name: 'Custom founder', github: '' },
      { id: 'custom-member', name: 'Independent team member' },
    ],
  };
  await pool.query('INSERT INTO settings (id,data) VALUES (1,$1)', [
    legacySettings,
  ]);
  await pool.query(
    "INSERT INTO projects (slug,title,published) VALUES ('custom-project','User-owned project',false)",
  );
  await pool.query(
    "INSERT INTO services (title) VALUES ('User-owned service')",
  );
  process.env.SEED_DEMO = 'true';
  process.env.JWT_SECRET = 'local-lifecycle-review-secret';
  const { AppModule } = await import('../dist/app.module.js');
  async function boot() {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    await app.close();
  }
  await boot();
  const user = (await pool.query('SELECT * FROM users')).rows[0];
  assert.equal(user.role, 'owner');
  assert.equal(user.display_name, 'legacy-owner');
  assert.equal(user.password_hash, passwordHash);
  assert.equal(
    (
      await pool.query(
        'SELECT count(*)::int n FROM drizzle.__drizzle_migrations',
      )
    ).rows[0].n,
    journal.entries.length,
  );
  assert.equal(
    (await pool.query('SELECT count(*)::int n FROM projects')).rows[0].n,
    15,
  );
  assert.equal(
    (await pool.query('SELECT count(*)::int n FROM services')).rows[0].n,
    1,
  );
  assert.equal(
    (await pool.query('SELECT published FROM services')).rows[0].published,
    true,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT client_en FROM projects WHERE slug='custom-project'",
      )
    ).rows[0].client_en,
    '',
  );
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM projects WHERE slug LIKE 'template-%'",
      )
    ).rows[0].n,
    14,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT published FROM projects WHERE slug='custom-project'",
      )
    ).rows[0].published,
    false,
  );
  let data = (await pool.query('SELECT data FROM settings')).rows[0].data;
  assert.equal(data.phone, 'custom contact');
  assert.equal(data.seedVersion, 5);
  assert.equal(data.team[0].name, 'Custom founder');
  assert.equal(data.team[0].github, '');
  assert.equal(data.team[0].nameAr, 'عبدالعزيز نعمان');
  assert.equal(data.team[1].name, 'Independent team member');
  assert.deepEqual(data.socialLinks.map((l) => l.platform).sort(), [
    'facebook',
    'instagram',
    'linkedin',
  ]);
  assert.equal(
    data.socialLinks.find((l) => l.platform === 'linkedin').url,
    'https://www.linkedin.com/company/devshub-cc',
  );
  assert.equal(
    data.socialLinks.find((l) => l.platform === 'facebook').url,
    'https://www.facebook.com/dev.point.iq',
  );
  assert.equal(
    data.socialLinks.find((l) => l.platform === 'instagram').url,
    'https://instagram.com/custom-brand',
  );
  const articles = (await pool.query('SELECT id FROM articles ORDER BY id'))
    .rows;
  assert.equal(articles.length, 4);
  await pool.query('DELETE FROM articles WHERE id=$1', [articles[0].id]);
  await pool.query('UPDATE articles SET published=false WHERE id=$1', [
    articles[1].id,
  ]);
  await pool.query('DELETE FROM projects');
  await pool.query('DELETE FROM services');
  data = {
    ...data,
    phone: 'custom contact after CMS save',
    socialLinks: [],
    socials: {
      github: '',
      linkedin: '',
      facebook: '',
      twitter: '',
      instagram: '',
    },
  };
  await pool.query('UPDATE settings SET data=$1 WHERE id=1', [data]);
  await boot();
  assert.equal(
    (await pool.query('SELECT count(*)::int n FROM articles')).rows[0].n,
    3,
  );
  assert.equal(
    (
      await pool.query('SELECT published FROM articles WHERE id=$1', [
        articles[1].id,
      ])
    ).rows[0].published,
    false,
  );
  assert.equal(
    (await pool.query('SELECT count(*)::int n FROM projects')).rows[0].n,
    0,
  );
  assert.equal(
    (await pool.query('SELECT count(*)::int n FROM services')).rows[0].n,
    0,
  );
  assert.deepEqual(
    (await pool.query('SELECT data FROM settings')).rows[0].data,
    data,
  );
  console.log(
    'PASS: legacy upgrade preserves user password and custom settings/content, initializes safe company profiles and founder defaults, applies all migrations and adds 14 templates once; restart preserves deletion of all projects (including templates), visibility and explicit empty social links.',
  );
} finally {
  await rm(temp, { recursive: true, force: true });
  await pool.end();
}
