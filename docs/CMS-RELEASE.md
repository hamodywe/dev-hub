# CMS release runbook

This release adds database-backed articles, task stages and comments, account permissions, multilingual settings, and editable company social links. Deploy the API and its migrations before serving the new web build. Use [CMS.md](CMS.md) for editor workflows and [CONTENT.md](CONTENT.md) for publication rules.

## Migration inventory

The API calls Drizzle's migrator during `DbService.onModuleInit`, before accepting requests. Its image includes the SQL files and `drizzle/meta/_journal.json`. Only pending tracked migrations run; do not execute these files manually or reset the migration journal.

| Order | File in `apps/api/drizzle/` | Main effect |
| --- | --- | --- |
| 1 | `0000_init.sql` | Initial users, settings, projects, services and messages tables |
| 2 | `0001_i18n.sql` | English project and service fields |
| 3 | `0002_sorani_and_contact.sql` | Sorani fields and recognized seed translations, approved contact details, founder seed data and original media-path repairs |
| 4 | `0003_cms_workspace.sql` | Account roles, permissions, active state and token versions; English project clients; service visibility; articles, task stages, tasks and comments; durable seed marker |
| 5 | `0004_company_socials.sql` | One-time legacy company social-link conversion and missing localized founder names/GitHub links |
| 6 | `0005_template_client_translation.sql` | English default client label for the six recognized upstream templates, preserving custom clients/translations |
| 7 | `0006_task_details.sql` | Task priority, optional calendar due date and bounded checklist data |

`0003` upgrades every existing user to `owner`, sets its display name from its username, and leaves the existing username and `password_hash` untouched. New accounts default to `admin`. Review owner access after migration. `ADMIN_USER` and `ADMIN_PASSWORD` only bootstrap an empty users table; environment changes do not reset existing accounts.

`0003` imports the four initial articles once. The `cms_seed_runs` marker prevents a normal restart from restoring deleted demo projects or services after their seed upgrade completes. `SEED_DEMO=false` disables demo project/service seeding and legacy seed upgrades, but does not skip SQL migrations or the initial account/settings bootstrap.

`0005` only fills a blank English client when both the upstream template slug and original Arabic demo-client label match. Template releases v3, v4 and v5 have separate durable markers; a historical seed version also preserves prior deletions when upgrading an older deployment. New templates appear once in Our work and can be edited, hidden or deleted through the project CMS.

`0004` preserves an existing `socialLinks` field, including `[]` and disabled entries. For legacy fixed social fields it replaces recognized demo accounts with the company profiles while retaining custom links. Founder defaults fill missing fields; saved fields override them, including an empty GitHub link. Empty team arrays remain empty. These new migrations do not change project `live_url` or `repo_url` values.

## Prepare and verify a backup

1. Record the current application revision/image references, environment configuration, database name, persistent uploads location and rollback owner. Store secrets through the existing secret manager, outside this document and shell history. Keep the current `JWT_SECRET` unless intentionally invalidating every session.
2. Pause CMS edits and other writes, including the public contact form, for the backup and migration window. Use the reverse proxy's maintenance mode or stop public traffic. Do not run this release's mutating tests against production.
3. Back up both PostgreSQL and uploaded files. The following example uses the existing Compose containers and their configured database variables; it does not include credentials:

```bash
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/cms-before-release.dump
docker compose exec -T api tar -C /app/uploads -czf - . > backups/uploads-before-release.tar.gz
```

Use a new backup directory for each release and keep a protected copy outside the deployment host. If API is stopped, take the uploads archive from the persistent volume through the platform's volume-backup mechanism.

4. Check that both files are nonempty and readable. Restore the database dump and uploads archive into a separate local or staging environment, then confirm that representative projects, settings and images can be read. A successful dump command alone does not establish that recovery works.
5. Confirm that the target deployment retains its existing database and uploads volumes. Do not run `docker compose down -v` or substitute a fresh database for an upgrade.

## Build and deploy

Install dependencies using the committed lockfiles. Build both images before changing the running release:

```bash
docker compose build api web
```

For a non-Docker deployment, build `apps/api` and `apps/web` with their package scripts and include the API's `drizzle/` directory in the runtime artifact. Use the runtime versions selected by the project Dockerfiles and package metadata. A web build must be able to obtain the configured font assets.

With maintenance mode active, deploy in this order:

```bash
docker compose stop web
docker compose up -d db
docker compose up -d --no-deps api
docker compose logs --tail=100 api
docker compose ps
```

Start one upgraded API instance first so its pending migrations finish before scaling other replicas. Wait for `Database ready & migrated`, the API listening message and a healthy API container. The Compose health check reads `/api/settings`; also confirm `/api/articles` returns a valid JSON list. On a managed platform, use its equivalent image rollout and health checks in the same order.

Inspect the Drizzle migration record and compare it with the six entries in the committed journal. For this release, all six SQL migrations should be applied exactly once. Check for an active owner without reading or logging password hashes:

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) AS applied_migrations FROM drizzle.__drizzle_migrations;"'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT role, active, count(*) FROM users GROUP BY role, active;"'
```

If migration or health checks fail, keep the web service in maintenance and inspect the failure before continuing. Do not delete migration records to force a rerun.

Deploy the new web image only after API verification:

```bash
docker compose up -d --no-deps web
docker compose ps
```

Confirm `API_URL` points to the upgraded API and `NEXT_PUBLIC_SITE_URL` matches the public canonical origin. Preserve the existing original project screenshots, galleries and demo URLs. The API image's startup command copies only missing seed assets into `uploads/seed`; retain the uploads volume across image replacements.

## Release smoke checks

Use an existing authorized owner account and a separate account with limited permissions. Keep production checks read-only where possible; perform save/delete/security tests on the isolated verification environment described below.

- Open `/ar`, `/en`, `/ckb`, their project indexes/details, and blog indexes/details on mobile and desktop. Check text direction, Tajawal for Arabic, Noto Sans Arabic for Sorani, Latin brand geometry, navigation, images and original demo links.
- Sign in with an existing account and confirm its role and accessible sections. Confirm a limited account cannot read or change unrelated sections through either the UI or direct API requests.
- On staging, verify drafts remain private, publication requires complete translations, hiding removes the public detail route, and a subsequent page request reflects saves. Verify article sources, related links and sitemap entries.
- Clear a staging contact value or social-link list, save, reload the CMS and public page, and confirm it stays cleared. Test a custom address and ensure its map link follows that address. Check founder names and links in all three locales.
- Exercise task assignment, comments, custom stages, ordering, archive/restore and the restriction on deleting a stage with active or archived tasks.
- Verify password change/reset and account deactivation revoke prior sessions. A permissions edit must apply to the next protected request.
- Restart staging API after deleting or hiding seeded content and confirm the state persists. Restore any deliberately changed staging fixtures before using them for later comparisons.

The web API client uses `cache: "no-store"`, so publication updates apply on the next server request across web replicas. Revalidation calls remain available but are not the source of freshness. An already-open browser page needs reloading; there is no push update channel. Missing optional translations stay omitted, and explicit `""`/`[]` values must not restore defaults or content from another language.

## Isolated verification commands

Run these from the repository root. Install dependencies first:

```bash
pnpm --dir apps/api install --frozen-lockfile
pnpm --dir apps/web install --frozen-lockfile
pnpm --dir apps/api exec vitest run src/common/input.spec.ts
pnpm --dir apps/api lint
pnpm --dir apps/api build
pnpm --dir apps/web test
pnpm --dir apps/web lint
pnpm --dir apps/web exec tsc --noEmit
pnpm --dir apps/web build
```

The focused API command above runs the CMS input/permission unit suite. The old `test/app.e2e-spec.ts` is a Nest starter test, not the CMS integration release gate.

For CMS integration, start a separate API on a loopback port with `DATABASE_URL` pointing to a disposable database. Supply `ADMIN_USER` and `ADMIN_PASSWORD` through the test environment for an owner in that database; do not put credentials into this document or command history. The script changes users, settings, publication states and tasks, and requires explicit mutation opt-in:

```bash
CMS_TEST_ALLOW_MUTATIONS=true TEST_API_URL=http://127.0.0.1:4311/api pnpm --dir apps/api test:cms
```

For the standalone public locale check, run an isolated web server connected to that test API. Set `PUBLIC_QA_URL` to its local origin and `PLAYWRIGHT_MODULE` to an installed Playwright module path. A compatible Chromium/Chrome installation is required. The script launches its own headless browser and checks language, font selection, visible text, image loads, overflow and logo geometry across locale indexes and linked detail pages:

```bash
node apps/web/tests/verify-public-locales.mjs
```

Review the resulting JSON and exit status. Record actual test results and any exceptions in the release record; this runbook does not certify a deployment merely because commands are listed.

## Recovery

Keep writes paused if the new API cannot serve the migrated schema. Prefer fixing the forward deployment while preserving the database. There are no automatic down migrations in this release.

If a full rollback is necessary, restore the verified pre-release database and uploads backup into the recovery environment and deploy the matching previous API and web revisions before reopening traffic. Account for writes made after the snapshot; restoring it discards those later changes. Do not run the previous unrestricted API against newly created limited-permission accounts: that API predates the permission model. Confirm owner login, published content and uploaded media after recovery, then reopen traffic deliberately.
