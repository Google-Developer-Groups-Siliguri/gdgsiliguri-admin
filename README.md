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
3. **Rebuild the website.** gdgsiliguri.com is pre-rendered into static pages by Netlify, so visitors
   see the content from the last build. Refreshing the page is not enough. The **Rebuild website**
   page lists sections published since the last rebuild. Start a deploy in Netlify (Deploys →
   Trigger deploy → Deploy site), then press **Mark as rebuilt**. If `NETLIFY_BUILD_HOOK_URL` is
   set, the page shows a one-click rebuild button instead.

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
| editor | Edit, publish, turn sections on or off, mark rebuilds. |

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
| `npm run seed:emulator` | Loads the production snapshot into the emulators and imports it |
| `npm run import:rtdb` | Copies each RTDB section into Firestore if missing (`--force` replaces) |
| `npm run admins:add -- --email … --role owner\|editor` | Adds or updates an admin |
| `npm run theme:generate` | Regenerates `src/app/theme.css` from the seed colour |
| `npm run check:env` | Validates environment variables without printing them |

Scripts that write data refuse to touch production unless `NEXT_PUBLIC_USE_EMULATORS` is not
`true` **and** you pass `--production`.

## Image uploads

Image fields have an **Upload image** button. Files (PNG, JPEG, WebP, GIF or SVG, up to 5 MB) are
uploaded by the server to ImageKit using `IMAGEKIT_PRIVATE_KEY`. They go into fixed folders that
match the existing ones: `teams/`, `speakers/<year>/`, `Sponsors/`, `community partners/<year>/`,
`Logos and Banners/` and `events/<year>/`. Pasting an image URL always works too.

## Recovery

- **Undo a bad publish:** open the section → History → **Load into draft** on an earlier version →
  Publish → rebuild.
- **Restore the whole Realtime Database from a backup:** backups are written to
  `backups/rtdb-<timestamp>.json` before the first production write. In the Firebase console,
  open Realtime Database → ⋮ → Import JSON at the root, choose the file, then run
  `npm run import:rtdb -- --production --force` so Firestore matches, and rebuild the site.
- **Locked out:** run `npm run admins:add -- --email you@gmail.com --role owner --production`
  with the production credentials in `.env.local` and `NEXT_PUBLIC_USE_EMULATORS=false`.

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
