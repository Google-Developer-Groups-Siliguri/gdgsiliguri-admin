# GDG Siliguri Admin

A private content-management site for [gdgsiliguri.com](https://gdgsiliguri.com). Organizers sign in
with Google and edit everything the public site shows: DevFest details, schedule, speakers,
sponsors, partners, team, FAQs, reviews and community events. Every section can be turned on or off.

- **Live content** is published to the Firebase Realtime Database, which the public site reads.
- **Drafts, history and the activity log** are kept in Cloud Firestore.
- Built with Next.js (App Router), Tailwind CSS and a Material 3 component kit in
  `src/components/m3`.

## How publishing works

1. **Edit** a section. Changes stay in your browser until you **Save draft**. The live site does not
   change.
2. **Publish** validates the draft and writes the whole section to the Realtime Database in one
   `set()`. Firestore then records the published copy, a new revision and an audit entry.
3. **It's live.** gdgsiliguri.com loads its pre-rendered pages, then fetches the latest data from the
   Realtime Database in the browser, so visitors see the change on their next page load. No rebuild
   is needed. A Netlify deploy only refreshes the pre-rendered HTML that search engines and link
   previews read; start one in Netlify (Deploys → Trigger deploy) after big content changes.

Other things to know:

- **Enabled switch:** publishes immediately, flipping only `enabled` on the live data. Unpublished
  draft edits stay in the draft.
- **History:** opens past revisions; **Load into draft** restores one for review. It does not
  publish.
- **Empty sections:** an enabled section can't be published with no items. Turn it off instead.
  Empty arrays are never written, because the Realtime Database would drop the key.
- **Concurrent publishing:** if two people publish the same section, the second gets "Someone else
  published this section, so reload".

## Roles

| Role   | Can do |
|--------|--------|
| owner  | Everything, plus add, remove and change admins. The last owner can't be removed or demoted. |
| editor | Edit, publish and turn sections on or off. |

Owners manage admins at **Settings → Admins**. To create the first owner, use the script below.

## Local setup

Requirements: Node 22, and JDK 21 for the Firebase emulators (`brew install openjdk@21`;
`scripts/emulators.sh` finds it).

```bash
npm install
cp env.example .env.local     # then fill in the values
npm run check:env             # validates .env.local without printing secrets
npm run check:env:live        # also asks Google to accept the service account
```

Develop against the emulators, never production:

```bash
npm run emulators                                                    # terminal 1: auth, firestore, database, UI on :4000
NEXT_PUBLIC_USE_EMULATORS=true npm run seed:emulator                 # loads seed/rtdb-export.json and imports it
NEXT_PUBLIC_USE_EMULATORS=true npm run admins:add -- --email you@gmail.com --role owner
NEXT_PUBLIC_USE_EMULATORS=true npm run dev                           # http://localhost:3000
```

With `NEXT_PUBLIC_USE_EMULATORS=true`, the app uses the demo project `demo-gdg-siliguri`, so it
can't reach production. In the emulator's Google sign-in popup, choose **Add new account** and enter
the email you added.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint; route types plus `tsc` |
| `npm test` | Unit tests (schemas, serializers, helpers) |
| `npm run test:integration` | Repository tests against the emulators, in their own namespace |
| `npm run test:e2e` | Playwright against its own dev server on :3200 and emulator namespace `e2e` |
| `npm run emulators` | Firebase emulators, saving data to `.emulator-data` |
| `npm run seed:emulator` | Loads the production snapshot into the emulators and imports it. `-- --migrate` also builds Firestore v2 from it; `-- --v2` loads `schema/examples` instead; `-- --rtdb <file> --firestore <file>` reloads a backup |
| `npm run backup` / `backup:prod` | Writes the RTDB root and every Firestore document to `backups/` |
| `npm run migrate:v2` | Builds Firestore v2 from RTDB and prints a report (dry run; `--apply` writes, `--report-file` saves Markdown, `--ios-url` sets the App Store link if there is one) |
| `npm run verify:parity` | Compares RTDB with what Firestore v2 would generate; fails on anything not in `scripts/parity-allowlist.json`. Read-only |
| `npm run sync:legacy` | Regenerates every legacy RTDB node from Firestore (`--pending` only retries failed ones) |
| `npm run move:cms` | Copies `admins`, `settings/site` and `auditLog` under `cms/root` (dry run; `--apply` copies) |
| `npm run schema:export` / `schema:check` | Writes `schema/v2/*.schema.json` for the website and app; the check fails when they are stale |
| `npm run fix:content` | Fixes the known content bugs listed in the migration plan (dry run; `--apply` publishes) |
| `npm run cleanup:e2e` | Removes E2E test rows from every section and lists `e2e-test` images in ImageKit (dry run; `--apply` publishes) |
| `npm run import:rtdb` | Copies each RTDB section into Firestore if missing (`--force` replaces) |
| `npm run admins:add -- --email … --role owner\|editor` | Adds or updates an admin |
| `npm run theme:generate` | Regenerates `src/app/theme.css` from the gdgsiliguri.com palette |
| `npm run check:env` | Validates environment variables without printing them |

Scripts that write data refuse to touch production unless `NEXT_PUBLIC_USE_EMULATORS` is not
`true` **and** you pass `--production`.

## Image uploads

Image fields have an **Upload image** button. Files (PNG, JPEG, WebP, GIF or SVG, up to 5 MB) are
uploaded by the server to ImageKit using `IMAGEKIT_PRIVATE_KEY`. PNG and JPEG files are
converted to WebP (quality 85, transparency kept) before upload; the other formats are stored as
they are. They go into fixed folders:
`teams/`, `speakers/<year>/`, `Sponsors/`, `community-partners/<year>/`, `logos-and-banners/` and
`events/<year>/`. ImageKit's upload API rejects folder names with spaces, so the older
`community partners/` and `Logos and Banners/` folders get no new uploads. Pasting an image URL
always works too.

## Recovery

- **Undo a bad publish:** open the section → History → **Load into draft** on an earlier version →
  Publish.
- **Take a backup:** `npm run backup:prod` writes `backups/rtdb-<timestamp>.json` (the RTDB root)
  and `backups/firestore-<timestamp>.json` (every Firestore document, keyed by path, with
  `{"$timestamp": …}` and `{"$geopoint": […]}` markers). Run it before any production write.
- **Check a backup:** load it into the emulators with
  `npm run seed:emulator -- --rtdb backups/rtdb-….json --firestore backups/firestore-….json`.
- **Restore the whole Realtime Database from a backup:** in the Firebase console, open Realtime
  Database → ⋮ → Import JSON at the root, choose the file, then run
  `npm run import:rtdb -- --production --force` so Firestore matches.
- **Locked out:** run `npm run admins:add -- --email you@gmail.com --role owner --production`
  with the production credentials in `.env.local` and `NEXT_PUBLIC_USE_EMULATORS=false`.

## Pre-migration clean-up (Phase 0)

Run once against production, in this order, before the Firestore v2 migration. Each script prints
its plan first; read it, then repeat with `--apply`. Both skip a section that has unpublished
draft edits, so publish or discard those first.

```
npm run backup:prod
npm run fix:content -- --production          # AM/PM, durations, speaker name, swapped links, venue, typos
npm run fix:content -- --production --apply
npm run cleanup:e2e -- --production          # the six E2E rows, plus e2e-test images to delete by hand
npm run cleanup:e2e -- --production --apply
```

`fix:content` runs first because the stricter maps-embed check would otherwise block publishing
event details. Afterwards, refresh `seed/rtdb-export.json` from a production export (see
`seed/README.md`).

Owner checks before the migration:

- Firestore `(default)` database location: _not recorded yet_ (Console → Firestore → Settings).
  If it does not exist, create it in `asia-south1`; it can't be changed later.
- The deployed RTDB rules match `database.rules.json`.
- The Netlify build hook is set in the production environment.

## App settings, modules, blogs and showcase

- **Settings → App** (owners): the mobile app's force-update builds, store links, hidden modules and
  maintenance banner, published to `site/app`. Raising the minimum build blocks older installs.
- **Modules**: extra sections without code changes. Cards, gallery and links modules get their own
  item editor under Modules; text modules keep their Markdown on the module. Publishing the list
  rebuilds the bundles; deleting a module also deletes its items.
- **Community → Blogs**: posts come from the Hashnode RSS feed. **Sync now** fetches them, the
  dashboard syncs again when the last sync is more than 6 hours old (`BLOG_AUTO_SYNC=false` turns
  that off), and a scheduler can `POST /api/cron/blogs` with the `X-Cron-Secret` header set to
  `CRON_SECRET`. Pins survive syncs; hidden posts are not re-added.
- **Community → Showcase**: attendee projects from the Google Form (`integrations/google-form`)
  wait here for review. Approving publishes them without any contact details; owners manage the
  form secret at **Settings → Showcase form**. `npm run retention` removes contact details 60 days
  after the edition and prunes old revisions.

## Firestore v2 migration (production runbook)

Run by an owner, after the Phase 0 clean-up, with production credentials in `.env.local` and
`NEXT_PUBLIC_USE_EMULATORS=false`. Every step was rehearsed on the emulators from the uncleaned
production snapshot.

```
npm run backup:prod
npm run migrate:v2 -- --production --report-file migration-report.md   # dry run
#   read the report with the organisers: unmatched speakers, AM/PM anomalies, carried-over sections
npm run migrate:v2 -- --production --apply
npm run verify:parity -- --production       # only the allow-listed differences below
npm run move:cms -- --production --apply
firebase deploy --only firestore:rules,firestore:indexes -P prod
# deploy the admin build with the v2 pipeline
npm run sync:legacy -- --production         # RTDB takes the 2026 shape
# publish one harmless change (e.g. FAQ wording), then check RTDB, bundles/home and the website
```

Expected `verify:parity` differences before `sync:legacy`: `/schedule`, `/speakers` and `/sponsors`
lose the 2025 lineup (it moves to `editions/2025`), `/eventDetails.registrationExpiryDateTime`
falls back to the 2026 start because registration is pending, and `/home/pastDevfests` is new.
URL cache-busters (`?updatedAt=`) and stray spaces are dropped; they show as "cosmetic". After
`sync:legacy`, parity is exact.

`migrate:v2` refuses to run twice; `--force` backs up and replaces the v2 data. Once
`sync:legacy` has rewritten RTDB, RTDB no longer holds the 2025 lineup, so a forced re-run also
needs `--from-file backups/rtdb-<timestamp>.json` from before the migration.

Rolling back: RTDB was never stopped, so redeploy the previous admin build. The v2 data stays
unused.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, unit tests, the schema check, the integration
tests and Playwright against the emulators on every pull request. A nightly job runs
`verify:parity -- --production` with the read-only service account in the `GCP_SA_READONLY`
secret (roles: Firebase Realtime Database Viewer and Cloud Datastore Viewer) and opens an issue if
RTDB and Firestore drift apart. Deploy commands always name the project: `-P prod`.

## Project layout

```
src/app/(app)/         signed-in pages (dashboard, section editors, settings)
src/app/login/         Google sign-in
src/app/api/           session and upload route handlers
src/components/m3/     Material 3 components
src/components/editor/ shared editor kit (list editor, sortable lists, form fields)
src/components/editors/ one editor per section
src/lib/content/       schemas, section map, repository, publish workflow
src/lib/auth/          session cookies and roles
scripts/               emulator, import and admin scripts
seed/rtdb-export.json  snapshot of the production Realtime Database
```
