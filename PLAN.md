# GDG Siliguri Admin (CMS): Build Plan

You are building **GDG Siliguri Admin**, a private content-management website for the GDG Siliguri community. Organizers sign in and edit everything the public website (gdgsiliguri.com) shows: DevFest details, schedule, speakers, sponsors, partners, team, FAQs, reviews and community events. Every section can be turned on or off, like in a CMS. Content is published to **Firebase Realtime Database** (which the public site reads) and kept, with history, in **Cloud Firestore**.

Read this whole file before writing any code. Work through the phases in order. Stop at the checkpoints marked **🛑 Ask the user**.

---

## 1. Context you must understand first

### 1.1 The public website (do not modify it)
- Repo: `/Users/debajitmallick/Personal/Projects/gdg-siliguri-website`, branch `dev`. Netlify deploys `dev` to gdgsiliguri.com.
- Angular 20. It reads Realtime Database over **unauthenticated REST**: `GET {databaseURL}/<path>.json`. See `src/app/services/data.service.ts` on the `dev` branch.
- The site is **pre-rendered to static HTML at build time** (`outputMode: "static"`). Data is baked into the pages when Netlify builds. **Changing the database does not change the live site until Netlify rebuilds it.** The admin therefore needs a "Rebuild website" action (Phase 6).
- Ask the user whether `proposals/website-fresh-data.md` has been applied to the website. If it has, the site re-fetches data in the browser after load, so published changes show on the next page visit. A rebuild then only refreshes the pre-rendered HTML for search engines and link previews. In that case, change the post-publish banner to "Published. Visitors see it on their next visit." and keep "Rebuild website" as a secondary action.
- Treat the website repo as read-only. You may read it to confirm field names. If the website itself needs a change, write it down for the user instead of making it.

### 1.2 The data contract
`seed/rtdb-export.json` (next to this file) is a full snapshot of the production Realtime Database. Use it as the source of truth for field names, value formats and ordering. **The admin must write exactly this shape back, or the live site breaks.**

| Section key (admin) | RTDB path | Shape | Used by the site for |
|---|---|---|---|
| `eventDetails` | `/eventDetails` | object (no `enabled`) | DevFest hero, banners, tickets, venue, perks, social links |
| `schedule` | `/schedule` | `{ enabled, data: ScheduleItem[] }` | DevFest schedule page |
| `speakers` | `/speakers` | `{ enabled, data: Member[] }` | DevFest speakers |
| `sponsors` | `/sponsors` | `{ enabled, platinum?: Sponsor[], gold?: Sponsor[], silver?: Sponsor[] }` | Sponsors by tier |
| `communityPartners` | `/communityPartners` | `{ enabled, data: Partner[] }` | Community partners |
| `devfestFaqs` | `/FAQs` | `{ enabled, data: FAQ[] }` | DevFest FAQ |
| `gdgFaqs` | `/home/gdgFAQs` | `{ enabled, data: FAQ[] }` | Home page FAQ |
| `teams` | `/teams` | `{ enabled, data: Member[] }` | Organizers and volunteers (home and DevFest team) |
| `feedbacks` | `/feedbacks` | `{ enabled, data: Feedback[] }` | Reviews carousel |
| `events` | `/events` | `{ enabled, data: CommunityEvent[] }` | Events page. **Currently `null` in production**: the admin creates it. |

Item shapes (all strings unless noted; empty string `""` means "not set" and must be preserved, not turned into `null`):

```ts
type Member = { name; designation; description; profilePictureURL; githubURL; linkedInURL; twitterURL }
// teams: designation is "Organizer" | "Volunteer"
// speakers: designation is a track: "AI" | "App" | "Cloud" | "Web" (it picks the frame in eventDetails.frames.speakers)
type ScheduleItem = { startTime: "08:00 AM"; endTime: "10:00 AM"; durationInMins: "120" /* string! */; timeZone: "IST"; title; subTitle /* speaker name or "" */; image /* speaker photo URL or "" */ }
type Sponsor = { sponsorName; icon; socialMediaLink }
type Partner = { communityName; icon; socialMediaLink }
type FAQ = { question; answer }
type Feedback = { name; eventAttended /* e.g. "@Devfest'22" */; feedbackTitle; feedbackDescription }
type CommunityEvent = { id; name; tagline; description; thumbnail; coverImg; registrationDate; eventDate; registrationLink; speakers: { name; imageUrl; description }[] }
type EventDetails = {
  bannerDescription; communityDescription; communityEmail; communityJoinLink;
  eventDateTime: "2025-11-16 08:00:00.000"; registrationExpiryDateTime: "2025-11-12 08:00:00.000";
  eventMode: boolean; eventTicketURL;
  bannerImages: { large; long; medium; small; aisummit };
  eventVenue: { name; imageURL; mapsURL; mapsURLweb /* Google Maps embed URL */ };
  frames: { speakers: { AI; App; Cloud; Web; default } };
  perks: { enabled: boolean; data: string[] };
  pointsToNote: { enabled: boolean; data: string[] };
  socialMediaLinks: { name; url; image }[];
}
```

Rules that follow from this:
1. **Preserve unknown fields.** Validate with Zod using `.passthrough()` (or the equivalent in the installed Zod version), so a field the admin doesn't know about (for example `eventMode`, `frames`) survives a round trip.
2. **Array order is display order.** Every list editor supports drag-to-reorder.
3. **Write each section with a whole-node `set()`**, never a partial `update()` of array indexes. RTDB stores arrays as objects with numeric keys, and partial writes leave stale indexes behind.
4. **Empty arrays disappear in RTDB.** Writing `[]` deletes the key, and the site may then read `undefined`. When a list would become empty, warn in the UI and suggest turning the section off instead. Never write `data: []`.
5. Keep date/time strings in the exact formats above. Use proper pickers in the UI, but serialize back to these strings.

---

## 2. Ground rules (safety)

- **Never write to the production Realtime Database or Firestore during development.** Use the Firebase Emulator Suite (Auth, Firestore, Realtime Database), seeded from `seed/rtdb-export.json`. Point at production only in Phase 8, after the user approves.
- **Before the first production write**, export a full backup of production RTDB to `backups/rtdb-<timestamp>.json` (git-ignored) and tell the user where it is.
- Never commit secrets. Keep the service account, Netlify hook URL and ImageKit private key in `.env.local` (git-ignored). Commit only `.env.example` with empty values.
- Check with the user before anything outward-facing: creating a GitHub repo, pushing, deploying security rules, deploying the app, or writing to production.
- Follow the user's global Claude instructions (for example, no code comments; temp files outside the repo).

---

## 3. 🛑 Ask the user before Phase 2

Collect these, and tell the user exactly where each goes:
1. **Firebase project**: probably `devfest-siliguri` (the RTDB is `devfest-siliguri-default-rtdb`). Confirm, and get the web app config (apiKey, authDomain, projectId, databaseURL, storageBucket, messagingSenderId, appId).
2. **Service account JSON** for the Admin SDK (Firebase console → Project settings → Service accounts → Generate new private key). Store it as env vars, not as a committed file.
3. **Owner email(s)**: the Google accounts that get the `owner` role at bootstrap.
4. **Netlify build hook URL** (Netlify → Site configuration → Build & deploy → Build hooks, branch `dev`). Can wait until Phase 6.
5. **ImageKit** (optional, Phase 7): URL endpoint, public key and private key. All current images are hosted on `ik.imagekit.io/gdgsiliguri1`.
6. Whether Firestore is already enabled in the project (if not, the user enables it in Native mode and chooses a region, ideally `asia-south1`).

---

## 4. Tech stack (fixed choices)

- **Next.js**, latest stable, App Router, TypeScript (strict), `src/` directory. Scaffold with `npx create-next-app@latest`, then read the installed version's docs for anything version-specific. For example, the route guard file is `proxy.ts` in Next.js 16+ and was `middleware.ts` before.
- **Tailwind CSS**, the version create-next-app installs (v4: CSS-first `@theme` config).
- **Material 3 (Material You) design**, implemented with Tailwind (see §7). Use `@material/material-color-utilities` to generate the colour scheme and Material Symbols (Rounded) for icons. Build components yourself on accessible headless primitives (Radix UI or Base UI) styled to the M3 spec. **Do not** use MUI or `@material/web`: they fight Tailwind and React server rendering.
- **Firebase**: `firebase` (client SDK, used only for Google sign-in) and `firebase-admin` (all reads and writes, server-side only).
- **Forms and validation**: `react-hook-form`, `zod` and `@hookform/resolvers`. The same Zod schemas validate on the client and in server actions.
- **Drag and drop**: `@dnd-kit/core` and `@dnd-kit/sortable`.
- **Testing**: Vitest (schemas and serializers), Playwright (end to end, against emulators), `firebase-tools` emulators.
- Package manager: npm. Node 22.

---

## 5. Architecture

```
Browser (admin UI, React)
  │  Google sign-in (Firebase client SDK) → ID token
  ▼
Next.js server (Node runtime)
  ├─ POST /api/session  verify ID token, check Firestore admins/{email}, set HttpOnly session cookie
  ├─ proxy.ts / middleware.ts  redirect to /login without a valid session cookie
  └─ Server Actions  verify session and role → validate with Zod → write via Admin SDK
        ├─ Firestore: drafts, published mirror, revisions, audit log, admins, settings
        └─ Realtime Database: published content (exact shape from §1.2)
                                     │
Netlify build hook ◄── "Rebuild website" ┘   gdgsiliguri.com re-prerenders from RTDB
```

- **All data access goes through the server with the Admin SDK.** The browser never reads or writes Firestore or RTDB directly. Security rules can therefore deny all client writes (§6.3).
- **Draft → Publish workflow per section**
  - *Save draft*: writes `content/{sectionKey}.draft` in Firestore only. The live site is unchanged.
  - *Publish*: validates, then writes RTDB `{path}` with `set()`, and in Firestore copies the draft to `content/{sectionKey}.published` and adds a revision. Do the RTDB write first; if the Firestore write fails, retry it, and surface the error if the retry also fails.
  - *Enable/disable toggle* (sections list and section header): one action that updates `enabled` in the draft and publishes it immediately, after a confirmation dialog.
  - *Discard draft*: resets the draft to the published state.
  - *Revert*: loads a past revision into the draft (it does not auto-publish).
  - Optimistic concurrency: each `content` doc has a `version` number. Publishing with a stale version fails with "Someone else published this section, so reload".
- After publishing, show a persistent banner: "Published. The live site updates after a rebuild." with a **Rebuild website** button.

### 5.1 Firestore model
```
admins/{email}            { email, role: "owner" | "editor", displayName?, photoURL?, addedBy, addedAt, lastLoginAt? }
content/{sectionKey}      { rtdbPath, draft, published, version, draftUpdatedAt, draftUpdatedBy, publishedAt, publishedBy }
content/{sectionKey}/revisions/{autoId}  { data, version, publishedAt, publishedBy, note? }
auditLog/{autoId}         { at, actorEmail, action: "save_draft"|"publish"|"toggle"|"revert"|"rebuild"|"admin_add"|"admin_remove"|"admin_role", sectionKey?, summary }
settings/site             { lastRebuildAt?, lastRebuildBy? }
```
`sectionKey` is one of the keys in §1.2. Map keys to RTDB paths in one shared constant.

### 5.2 Initial import
`npm run import:rtdb` (Admin SDK) reads every RTDB path from §1.2 and, for each section with no Firestore doc, creates `content/{sectionKey}` with `draft = published = <RTDB value>` and `version = 1`. For `/events`, which is `null`, create `{ enabled: false, data: [] }` in Firestore only. Do not write it to RTDB until the user adds an event. The import is idempotent: it never overwrites existing docs unless `--force` is passed.

---

## 6. Auth, roles and security rules

### 6.1 Sign-in
- Google sign-in only (`signInWithPopup`, with a fallback to redirect on mobile).
- Send the ID token to `POST /api/session`. The server verifies it, checks that `admins/{email}` exists, creates a session cookie with `createSessionCookie` (5 days, HttpOnly, Secure, SameSite=Lax), and updates `lastLoginAt`. If the email isn't in `admins`, reject with a friendly "You are not an admin. Ask an organizer to add you." screen, and sign the user out of the client SDK.
- `POST /api/session/logout` clears the cookie and revokes refresh tokens.
- The route guard protects everything except `/login` and `/api/session*`. Every server action re-verifies the cookie (`verifySessionCookie(cookie, true)`) and re-reads the role. Never trust the client.

### 6.2 Roles
- **owner**: everything, plus managing admins (add, remove, change role). An owner can't remove the last owner.
- **editor**: edit, publish and toggle content, and trigger a rebuild. Can't manage admins.
- Bootstrap script: `npm run admins:add -- --email someone@gmail.com --role owner`.

### 6.3 Security rules (🛑 show the user the current rules and the diff before deploying)
Realtime Database: public read only on the paths the site uses, and no client writes (the Admin SDK bypasses rules):
```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "FAQs": { ".read": true },
    "communityPartners": { ".read": true },
    "eventDetails": { ".read": true },
    "events": { ".read": true },
    "feedbacks": { ".read": true },
    "home": { ".read": true },
    "schedule": { ".read": true },
    "speakers": { ".read": true },
    "sponsors": { ".read": true },
    "teams": { ".read": true }
  }
}
```
Firestore: deny all client access.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```
Before proposing these, fetch the current production rules: either from the Firebase console (Realtime Database → Rules, or Firestore → Rules) or, for RTDB, from the REST endpoint `{databaseURL}/.settings/rules.json` using an Admin SDK access token. If the current rules allow public writes, tell the user prominently, because anyone could then deface the live site today.

---

## 7. UI and UX: Material 3 with Tailwind

### 7.1 Theme
- Generate the M3 colour scheme from the gdgsiliguri.com website palette (`src/m3e-tokens.css` in the website repo), so the admin matches the site's Material 3 Expressive design. Roles the website doesn't define are derived with `@material/material-color-utilities`. Emit every colour role (primary, on-primary, primary-container, on-primary-container, secondary…, tertiary…, error…, surface, surface-dim, surface-bright, surface-container-lowest…highest, on-surface, on-surface-variant, outline, outline-variant, inverse-surface, inverse-on-surface, inverse-primary, scrim, shadow) as CSS variables for light and dark. Map them into Tailwind's `@theme` so classes like `bg-surface-container`, `text-on-surface-variant` and `bg-primary-container` exist.
- Add the four GDG brand colours as static extras, for chips and accents only: blue `#4285F4`, red `#EA4335`, yellow `#FBBC04`, green `#34A853`.
- Dark mode follows the system by default, with a toggle in the top app bar (persisted in a cookie to avoid a flash on load).
- **Type scale**: the M3 roles (display, headline, title, body and label, each in L/M/S) as Tailwind utilities. Fonts match the website: Urbanist for display, headline and title roles, Manrope for body and label roles, via `next/font/google`. Shapes (cookie, clover, sunny…) and spring easings are copied from the website's tokens.
- **Shape**: M3 corner tokens: extra-small 4px, small 8px, medium 12px, large 16px, extra-large 28px, full.
- **Elevation**: levels 0–5 using M3 tonal surface containers plus subtle shadows; **state layers** (hover 8%, focus/pressed 10%) via a reusable utility.
- **Motion**: M3 standard and emphasized easing curves and durations as CSS variables. Respect `prefers-reduced-motion`.

### 7.2 Component kit (`src/components/m3/`)
Build these following the M3 specs (m3.material.io), with keyboard and screen-reader support:
Button (filled, tonal, outlined, text, elevated), Icon button, FAB / extended FAB, Text field (filled and outlined; label, supporting text, error, character counter), Select / Menu, Switch, Checkbox, Chip (assist, filter, input), Card (elevated, filled, outlined), List and list item, Dialog (basic and full-screen on mobile), Snackbar, Navigation rail (desktop), Navigation drawer (modal on mobile), Top app bar (small), Tabs, Progress indicators (linear and circular), Divider, Badge, Tooltip, Date picker and Time picker (they output the string formats in §1.2), Segmented button, Image-URL field with live preview.

### 7.3 Layout and navigation
- **Desktop (≥ 840px)**: navigation rail plus a content pane. **Mobile**: top app bar with a modal navigation drawer. It must be fully usable at 360px width.
- Navigation groups:
  - **Overview**: Dashboard
  - **DevFest**: Event details, Schedule, Speakers, Sponsors, Community partners, DevFest FAQ
  - **Community**: Events, Team, Home FAQ, Reviews
  - **Settings**: Admins (owner only), Activity log, Rebuild website
- Every section page has the same header: title, an **Enabled** switch (except Event details), a status chip (`Published` / `Draft changes` / `Disabled`), and **Discard**, **Save draft** and **Publish** buttons. History opens in a side sheet.
- List sections: sortable list with drag handles. Each row shows an avatar or image thumbnail, primary text and supporting text; actions are edit, duplicate and delete (delete asks for confirmation). Editing opens a dialog (full-screen on mobile). There is a search field and an "Add" FAB.
- **Unsaved-changes guard** when leaving a page with a dirty draft.
- Image fields show a preview and flag broken URLs (the image fails to load).

### 7.4 Pages
1. **/login**: centered card with the GDG Siliguri logo and a "Sign in with Google" button; error states for non-admins.
2. **/ (Dashboard)**: a card per section (enabled state, item count, last published at/by, draft badge); quick toggles; "Rebuild website" card with the last rebuild time; recent activity (last 10 audit entries); the countdown to `eventDateTime` and whether registration (`registrationExpiryDateTime`) is open.
3. **/devfest/event-details**: a tabbed form: *General* (bannerDescription, communityDescription, eventMode, eventDateTime, registrationExpiryDateTime, eventTicketURL), *Banners* (bannerImages.* with previews; aisummit is optional), *Venue* (name, imageURL, mapsURL, mapsURLweb with a live embed preview), *Speaker frames* (frames.speakers.*), *Perks* and *Points to note* (each with its own enabled switch and a sortable string list), *Community and social* (communityEmail, communityJoinLink, socialMediaLinks as a sortable list of name/url/image).
4. **/devfest/schedule**: sortable list; the editor has start/end time pickers. `durationInMins` is computed automatically and stored as a string. Optionally pick a speaker from `/speakers` to fill subTitle and image. Warn about overlapping slots and an end time before the start time.
5. **/devfest/speakers**: Member editor with a track select (AI/App/Cloud/Web) and a preview with the frame from Event details.
6. **/devfest/sponsors**: three tier tabs (Platinum, Gold, Silver), each a sortable list. Allow moving a sponsor between tiers. An empty tier is omitted from the write (see rule 4).
7. **/devfest/partners**, **/devfest/faq**, **/community/faq**, **/community/reviews**: straightforward sortable editors.
8. **/community/team**: Member editor with a designation segmented button (Organizer/Volunteer) and a filter chip to show either group.
9. **/community/events**: list of `CommunityEvent`; the editor has a slug-style `id` (auto from name, editable, unique), dates, images and a nested sortable speakers list.
10. **/settings/admins** (owner): table of admins, an invite-by-email dialog (adds an `admins` doc; the person can sign in right away), role change, and remove.
11. **/settings/activity**: paginated audit log with filters by section and person.
12. **/settings/rebuild**: a button that POSTs the Netlify build hook (server-side; the URL is never sent to the browser), records `settings/site.lastRebuildAt/By`, and adds an audit entry. Rate-limit it to one per 2 minutes.

### 7.5 Validation (shared Zod schemas)
- URLs must be absolute `https://` (but allow `""` where a field is optional). Show a "Fix it" action that adds `https://` to values like `Twitter.com/debuisalive`.
- Required fields: names, titles, questions/answers, sponsor/partner name and icon.
- Times: `hh:mm AM/PM`. Datetimes: `YYYY-MM-DD HH:mm:ss.SSS`.
- Show warnings, not errors, for suspicious data (see §10).

---

## 8. Phases

Commit at the end of each phase with a clear message. Run lint, typecheck and tests before each commit.

**Phase 0: Scaffold.** Create the project in this folder (`/Users/debajitmallick/Personal/Projects/gdg-siliguri-admin`); `PLAN.md` and `seed/` are already here. `git init`; add `.gitignore` (`.env*` except `.env.example`, `backups/`, `.firebase/`, emulator data). Install the dependencies from §4. Add `firebase.json` with emulators (auth 9099, firestore 8080, database 9000, UI 4000) and the rules files. npm scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `emulators` (with `--import`/`--export-on-exit` to `./.emulator-data`), `seed:emulator`, `import:rtdb`, `admins:add`.
*Done when:* `npm run dev` serves a placeholder page, and `npm run emulators` starts all three emulators.

**Phase 1: Design system.** Theme generation script → CSS variables → Tailwind `@theme`; fonts; the M3 component kit from §7.2; a hidden `/dev/components` gallery showing every component in light and dark.
*Done when:* the gallery looks right in both themes at 360px and 1280px, and every interactive component is keyboard-operable.

**🛑 Ask the user for the inputs in §3.**

**Phase 2: Firebase wiring and auth.** `src/lib/firebase/client.ts` and `src/lib/firebase/admin.ts` (singletons; Admin SDK credentials from env vars; use the emulators when `NEXT_PUBLIC_USE_EMULATORS=true`); the session endpoints; the route guard; `requireAdmin(role?)` for server actions; the login page; the `admins:add` script.
*Done when:* against the emulators, an allowlisted Google test user can sign in and out, a non-allowlisted user is rejected, and protected routes redirect to `/login`.

**Phase 3: Data layer.** Zod schemas for every section (§1.2), with passthrough. `sections.ts` maps section keys to RTDB paths and schemas. Repository functions: `getSection`, `saveDraft`, `publish` (version check, RTDB `set`, Firestore mirror, revision, audit), `toggleEnabled`, `discardDraft`, `revertToRevision`, `listRevisions`, `listAudit`. `seed:emulator` loads `seed/rtdb-export.json` into the RTDB emulator, then runs the import (§5.2) against the emulator Firestore.
*Done when:* Vitest round-trip tests pass for every section: parse the seed → serialize → deep-equal to the seed. This includes unknown fields, `""` values and string `durationInMins`. Publish and concurrency tests pass against the emulators.

**Phase 4: App shell and dashboard.** Navigation rail/drawer, top app bar, theme toggle, the section header component, a snackbar system, and the dashboard (§7.4 item 2).

**Phase 5: Section editors.** Build in this order: Team → DevFest FAQ / Home FAQ → Reviews → Partners → Sponsors → Speakers → Schedule → Event details → Events. Each has the full draft/publish/toggle/history flow and the validation from §7.5.
*Done when:* each editor can be changed and published in the emulator, the RTDB emulator JSON keeps the same shape as the seed, and Playwright covers at least one create/edit/reorder/delete/publish flow plus the toggle.

**Phase 6: Settings.** Admin management, activity log, rebuild website (Netlify hook), the post-publish banner.

**Phase 7 (optional): Image upload.** On image fields, an "Upload" button that sends the file to a server route, which uploads it to ImageKit with the private key and returns the URL. Use the existing folder conventions: `teams/`, `speakers/<year>/`, `Sponsors/`, `community partners/<year>/`, `Logos and Banners/`. Pasting a URL must keep working.

**Phase 8: Production hookup (🛑 needs explicit user approval at each step).**
1. Back up production RTDB (§2).
2. Show the current versus proposed security rules (§6.3); deploy them only after approval.
3. Run `import:rtdb` against production Firestore.
4. Bootstrap the owner(s) with `admins:add`.
5. Do a smoke test against production: change one harmless thing (for example, toggle `feedbacks` off and back on), verify the RTDB JSON is still identical to the backup apart from that field, trigger one rebuild, and check gdgsiliguri.com.

**Phase 9: Deploy the admin app (🛑 ask the user to choose).** Recommended: **Firebase App Hosting** (native Next.js support, same project), with secrets in Cloud Secret Manager via `apphosting.yaml`. The alternative is Vercel. Add the deployed domain (for example `admin.gdgsiliguri.com`) to Firebase Auth authorized domains. Write a `README.md` covering local setup, emulators, scripts, adding an admin, and how publishing and rebuilding work.

---

## 9. Testing checklist

- Unit (Vitest): every schema; time and date serializers; `durationInMins` computation; the URL "fix it" helper; the empty-array guard; the section key → path map.
- Integration (emulators): publish writes RTDB and Firestore consistently; a stale version is rejected; revert; toggle; an editor can't call admin-management actions (server-side check, not just hidden UI).
- E2E (Playwright, emulators, Auth emulator test user): login, gate redirect, one full editor flow per list type, reorder persists, the mobile viewport (360×800) works.
- Before Phase 8: `npm run build` succeeds with zero type errors and zero lint errors.

---

## 10. Known data issues in production (surface them, don't silently fix)

The admin's validation should flag these, so organizers can fix them through the UI:
- `schedule[4]` "Panel Discussion": `12:10 AM`–`12:40 AM` (should probably be PM).
- `schedule[9]` subTitle "Nitin Praksh" (typo), and `schedule[10]` "Panel Discussion" has `durationInMins: "15"` but spans 04:30–05:00 PM.
- `communityPartners[0]` (JGEC) and `[1]` (AOT): their `socialMediaLink` values look swapped.
- `teams` "Debajyoti Sarkar": `twitterURL` is `Twitter.com/debuisalive` (no scheme).
- Some URLs have trailing spaces (for example, Hrishab Biswas's LinkedIn and Twitter). Trim on save.
- `events` is `null`, and the live site's build logs an error because of it. Publishing the first event (with `enabled: true`) fixes this.

---

## 11. Definition of done

- An owner can sign in with Google, invite an editor, and the editor can edit, publish and toggle every section listed in §1.2.
- Published data in RTDB matches the contract exactly; the public site renders correctly after a rebuild.
- Firestore holds drafts, published mirrors, revision history and an audit log for every change.
- The UI follows Material 3 (dynamic colour roles, type scale, shapes, state layers, light and dark) built with Tailwind, and works from 360px wide to desktop.
- No secrets in git; security rules deny all client writes; all writes are server-side with role checks.
- README explains setup, operations and recovery (restore a backup, revert a revision).
