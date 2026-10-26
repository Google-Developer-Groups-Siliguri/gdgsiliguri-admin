# Example documents

[← README](../../README.md)

JSON can't express Firestore types, so the examples use these markers:

| Marker | Firestore type |
|---|---|
| `{ "$timestamp": "2026-11-14T08:00:00+05:30" }` | `Timestamp` |
| `{ "$geopoint": [26.7402775, 88.4556026] }` | `GeoPoint` |

`scripts/lib/example-json.ts` in the admin (ADM-42) converts these markers, so the examples double as emulator seed data and test fixtures.

| File | Path |
|---|---|
| `site-config.json` | `site/config` |
| `site-app.json` | `site/app` |
| `edition-2026.json` | `editions/2026` |
| `session.json` | `editions/2026/sessions/supercharge-app-dev-with-gen-ai-utilery-1000` |
| `speaker.json` | `editions/2026/speakers/satish-vj` |
| `sponsor.json` | `editions/2026/sponsors/google-for-developers` |
| `team-member.json` | `team/debajit-mallick` |
| `event.json` | `events/build-with-ai-siliguri` |
| `testimonial.json` | `testimonials/{auto}` |
| `blog.json` | `blogs/{slug}` |
| `module-showcase.json` | `modules/project-showcase` |
| `showcase.json` | `showcase/{auto}` |
| `showcase-submission.json` | `cms/root/showcaseSubmissions/{auto}` |
| `bundle-home.json` | `bundles/home` (trimmed) |
| `bundle-edition-2026.json` | `bundles/edition-2026` (trimmed) |
