# CMS verification

Run from `apps/api`. The integration scripts intentionally mutate data and refuse
to run without `CMS_TEST_ALLOW_MUTATIONS=true` and a local target. Use disposable
databases only. Database scripts additionally require `review` in the database
name; fresh/lifecycle scripts reject any nonempty public schema.

- `pnpm build` and `pnpm test`: compile the API and check bounded input, safe URLs,
  publication requirements, settings compatibility and permission implication.
- `pnpm test:cms`: HTTP permission boundaries, user lifecycle, stale tokens,
  task ordering, attribution, archive/restore, content CRUD and visibility.
  Set `TEST_API_URL`, `ADMIN_USER`, `ADMIN_PASSWORD` and the mutation opt-in.
- `pnpm test:cms:races`: against a migrated disposable `DATABASE_URL`, coordinates
  real bcrypt barriers to verify password reset/change conflicts and competing
  owner demotions. The temporary users are removed afterward.
- `pnpm test:cms:fresh`: against an empty disposable `DATABASE_URL`, boots the
  compiled application and verifies every migration and complete initial data.
- `pnpm test:cms:lifecycle`: against an empty disposable `DATABASE_URL`, creates
  a pre-CMS database, adds customized legacy fixtures, upgrades, edits/deletes
  content, and boots again to prove settings and CMS decisions persist.

For local credentials, use an ignored `.env.local` and Node's `--env-file` option.
Never use production credentials or production databases for these scripts.

The HTTP suite archives its task fixtures and deactivates user fixtures so it can
verify attribution survives. Stages containing archived tasks are intentionally
retained; discard the review database when it is no longer needed.

Migrations `0003` and `0004` are forward migrations. Existing users become owners
without changing their password hashes, existing services remain published, and
the four original articles are inserted once. Demo seeding has a durable marker
so deleting all projects/services does not repopulate them on restart. Company
social conversion runs only when `socialLinks` is absent, and founder defaults
fill only missing properties, preserving custom values and explicit blanks.

Migration `0006_task_details` runs automatically through the same startup migrator.
It adds task `priority` (low/medium/high/urgent, default medium), nullable `dueDate`
(YYYY-MM-DD), and `checklist` (up to 100 unique `{ id, text, done }` items, default
empty). Existing tasks retain their stages, ordering, archive state, and comments.
Task list/detail/save responses also include a numeric `commentCount`. Partial
updates leave omitted fields unchanged; use `dueDate: null` or `checklist: []` to
clear those fields. Apply this migration before using the updated API queries;
normal application startup already does so before it listens for requests.
