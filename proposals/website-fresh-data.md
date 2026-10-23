# Proposal: show fresh data on gdgsiliguri.com without a rebuild

**Status:** proposed, not applied. The change is in `website-fresh-data.patch` (next to this file). It applies cleanly to the website repo's `dev` branch and has been tested on a copy of it.

## The problem

gdgsiliguri.com is pre-rendered: when Netlify builds the site, it fetches everything from the Realtime Database and bakes it into static HTML. The browser then reuses that baked-in data instead of asking the database again. So when an organizer changes something (now, or later from the admin CMS), the live site keeps showing the old data until someone triggers a new Netlify build.

## The change

The page still loads instantly with the pre-built data. Then, once it has finished loading, it asks the database once per section for the latest data, and updates the screen only if something changed.

- **No visual change in the normal case.** If nothing changed since the last build, the extra request returns the same data and nothing re-renders.
- **SEO is unchanged.** Search engines and link previews still get the full pre-rendered HTML.
- **It fails safe.** If the database can't be reached, the page keeps the pre-built data and logs no errors.
- **It's one request per section per visit.** Moving between pages doesn't refetch a section that's already been refreshed.
- **Blogs work the same way**, so new Hashnode posts also appear without a rebuild.

### Files touched (6 files, +79 / −42)

| File | Change |
|---|---|
| `src/app/services/data.service.ts` | The caching helper now returns the pre-built value first, then, after hydration (`ApplicationRef.whenStable()`), the fresh value if it differs. A stored `null` (like today's empty `/events`) counts as pre-built data, so it's refreshed too. The blogs feed uses the same helper. |
| `src/app/resolvers/home.resolver.ts`, `devfest.resolver.ts` | `forkJoin` → `combineLatest`. `forkJoin` waits for every stream to *complete*, which would make page navigation wait for the background refresh. `combineLatest` lets the router continue on the first values. |
| `src/app/components/organizers.component.ts` | Removed `take(1)` (it stopped listening after the first value) and unsubscribes on destroy instead. |
| `src/app/pages/events/events-page.component.ts`, `blogs/blogs-page.component.ts` | They read a one-time route snapshot. They now read the service as a signal, so they react to the refresh. |

The other components (sponsors, speakers, partners, reviews, FAQ, schedule, team, DevFest, tickets) already subscribe to the service with `async` or signals, so they update without changes.

## How it was tested

Production build (`ng build`, 8 routes pre-rendered), served as static files the way Netlify serves them, and driven with Playwright against the real database. To simulate organizer edits, the database responses were modified in the browser:

| Scenario | Result |
|---|---|
| Nothing changed | 1 background request for the section, no re-render, no errors |
| A team member renamed | New name replaces the old one on Team and on the Home organizers section |
| A Home FAQ question edited | Updated on the Home page |
| First event added to the empty `/events` | Event card appears (this case found a bug in the first draft, now fixed) |
| Database unreachable | Pre-built data stays, no errors |
| Clicking from Home to DevFest | Navigates in about 0.6 s; not blocked by the refresh |
| Pre-rendered HTML | Still contains blogs, team, venue and schedule content |

## Trade-offs and costs

- **Database reads:** every visit now downloads its page's sections once from the Realtime Database (a few KB to a few tens of KB). The Firebase free plan includes 10 GB of downloads a month, which is enough for well over 100,000 page visits. Worth watching around DevFest traffic peaks.
- **Brief swap after load:** if data changed since the last build, visitors see the old content for a moment (until the request returns, usually under a second), then the new content.
- **Rebuilds are still worth doing occasionally**, so search engines and link previews show current content. They're no longer needed for visitors to see changes.
- **Database rules:** the public read access the site already uses is all this needs. No rule changes.

## How to apply

From the website repo:

```bash
git checkout dev && git pull
git checkout -b feat/fresh-data-after-load
git apply /Users/debajitmallick/Personal/Projects/gdg-siliguri-admin/proposals/website-fresh-data.patch
npm run build
```

Then commit, push, and open a PR into `dev`. After Netlify deploys it, edit something small in the Firebase console (for example, a FAQ answer), reload gdgsiliguri.com, and it should show the edit without a rebuild.
