# Flexible tasks and template previews

The task board now supports pointer/touch dragging, keyboard movement, durable card ordering, quick creation in a column, undo after movement, priorities, calendar deadlines, checklist progress, comment counts, search/filter controls and board/list views. Existing task assignment, custom stages, permissions and archive/restore are retained. On mobile the secondary filters open from the filter button; stage selectors provide a direct alternative to dragging.

Task details wait for their current server response before enabling edits, preventing a stale read from overwriting checklist changes. Drag updates are optimistic and roll back on a failed save. Only affected active columns are renumbered; archived cards retain their metadata. Deadline comparisons use local calendar dates. The existing standard Done/Completed/مكتمل/منجز stages exclude cards from overdue indicators; custom completion names should use these names to receive the same behavior.

## Deployment

Deploy the API before the web build through the existing server workflow. Pending migration `0006_task_details.sql` runs automatically at API startup and adds priority, due date and checklist fields without replacing existing task content. Keep the existing database, uploads, credentials and JWT configuration. Follow the existing backup/recovery procedure in `CMS-RELEASE.md`.

Template seed marker `template-sites-v5` inserts only the academy, hotel and architecture templates on eligible existing demo installations. Previous edits, hidden records, intentional deletions, owner accounts and settings are preserved. Installations with `SEED_DEMO=false` keep their seed preference; their static previews remain available in the template gallery.

## New previews

- `/demos/academy/ar` and `/demos/academy/en`: FORMA, a Bauhaus-inspired creative academy with course filters and course selection.
- `/demos/hotel/ar` and `/demos/hotel/en`: SAHA, an Art Deco boutique hotel with room choice and night/price calculations.
- `/demos/architecture/ar` and `/demos/architecture/en`: AXIS, a Swiss-style architecture studio with project filters and exterior/interior/plan views.

These are interactive demonstration websites. Their forms show an explicit demonstration response and do not transmit bookings or inquiries. Gallery covers are screenshots of the actual pages. Placeholder `example.com`, invalid and local preview destinations no longer appear as public preview buttons; custom valid destinations remain unchanged. New seed data no longer inserts the nine old example.com URLs.

## Verification

- API build, lint and 65 unit checks passed.
- 103 HTTP integration assertions passed, including permissions, ordering, archive/restore, comments and validation/persistence of the new fields.
- Existing-data migration rehearsal passed; active and archived records preserve their prior values.
- Web build, TypeScript, lint and 47 tests passed.
- Browser tests confirmed creation, quick add, checklist/comments, pointer and touch dragging, undo, failed-save rollback, keyboard movement, filters, list view, reload persistence and a 390px mobile layout without page overflow. The drag handle explicitly disables native touch scrolling so the global button touch rule cannot cancel mobile drags.
- All six new demo pages were verified in Arabic/English at mobile/desktop sizes, including form flows and no unintended network writes.
- Separate fresh/upgrade/lifecycle database checks confirmed safe v5 seeding and deletion/edit preservation.

The public production audit checked 22 existing demo pages, 20 portfolio details, four articles and 69 images. The confirmed preview issue was nine links to example.com. Verification used separate local databases; no production task or CMS data was modified by the checks.
