import type {
  Blog,
  CommunityEvent,
  Edition,
  EditionBundle,
  EditionsBundle,
  Faq,
  HomeBundle,
  ModuleDoc,
  ModuleItem,
  ShowcaseItem,
  SiteConfig,
  Speaker,
  TeamMember,
  Testimonial,
} from "@/lib/schema/v2";
import { SPONSOR_TIERS } from "@/lib/schema/v2";
import { editionBundle, editionsBundle, homeBundle } from "@/lib/schema/v2/bundles";
import { isItemModule } from "@/lib/schema/v2/modules";
import type { EditionContent } from "@/lib/legacy/to-rtdb";
import { sortSessions } from "@/lib/legacy/to-rtdb";
import type { BundleId } from "@/lib/sections/registry";
import { toMillis } from "@/lib/time/tz";

export type BundleReader = {
  site(): Promise<SiteConfig>;
  editions(): Promise<Edition[]>;
  editionContent(year: number): Promise<EditionContent>;
  team(): Promise<TeamMember[]>;
  events(): Promise<CommunityEvent[]>;
  testimonials(): Promise<Testimonial[]>;
  faqs(): Promise<Faq[]>;
  blogs(): Promise<Blog[]>;
  showcase(): Promise<ShowcaseItem[]>;
  modules(): Promise<ModuleDoc[]>;
  moduleItems(moduleId: string): Promise<ModuleItem[]>;
  sourceVersions(): Promise<Record<string, number>>;
};

export type BundleMeta = { generatedAt: string };

const MAX_HOME_EVENTS = 50;
const MAX_HOME_BLOGS = 10;
const MAX_FEATURED_SHOWCASE = 6;
const MAX_INLINE_ITEMS = 30;
const ROLE_ORDER = ["organizer", "volunteer", "alumni"];

function strip<T extends { updatedAt?: string }>(item: T): Omit<T, "updatedAt"> {
  return Object.fromEntries(Object.entries(item).filter(([key]) => key !== "updatedAt")) as Omit<T, "updatedAt">;
}

const HOME_EDITION_LISTS = ["sponsors", "partners", "faqs"];

function feedsHome(id: string, activeEdition: number): boolean {
  const edition = /^edition-(\d{4})(?:-(\w+))?$/.exec(id);
  if (!edition || !edition[2]) return true;
  return Number(edition[1]) === activeEdition && HOME_EDITION_LISTS.includes(edition[2]);
}

const byOrder = <T extends { order: number }>(items: T[]) => [...items].sort((a, b) => a.order - b.order);

export function sortSponsors<T extends { tier: string; order: number }>(sponsors: T[]): T[] {
  const rank = (tier: string) => {
    const index = (SPONSOR_TIERS as readonly string[]).indexOf(tier);
    return index < 0 ? SPONSOR_TIERS.length : index;
  };
  return [...sponsors].sort((a, b) => rank(a.tier) - rank(b.tier) || a.order - b.order);
}

export function sortTeam<T extends { role: string; order: number }>(team: T[]): T[] {
  const rank = (role: string) => {
    const index = ROLE_ORDER.indexOf(role);
    return index < 0 ? ROLE_ORDER.length : index;
  };
  return [...team].sort((a, b) => rank(a.role) - rank(b.role) || a.order - b.order);
}

export function latestBlogs(blogs: Blog[], limit = MAX_HOME_BLOGS): Blog[] {
  return [...blogs]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || toMillis(b.publishedAt) - toMillis(a.publishedAt))
    .slice(0, limit);
}

function versionsFor(all: Record<string, number>, test: (id: string) => boolean): Record<string, number> {
  return Object.fromEntries(Object.entries(all).filter(([id]) => test(id)));
}

async function bundleModules(read: BundleReader, modules: ModuleDoc[]) {
  const sorted = [...modules].sort((a, b) => a.placement.web.order - b.placement.web.order || a.id.localeCompare(b.id));
  return Promise.all(
    sorted.map(async (module) => {
      const base = strip(module);
      if (!isItemModule(module.type)) return base;
      const items = byOrder(await read.moduleItems(module.id));
      return items.length <= MAX_INLINE_ITEMS ? { ...base, items: items.map(strip) } : base;
    }),
  );
}

function homeEdition(edition: Edition): HomeBundle["edition"] {
  const {
    year,
    title,
    theme,
    summary,
    timeZone,
    startAt,
    endAt,
    registration,
    venue,
    banner,
    badges,
    sections,
    tracks,
  } = edition;
  return Object.fromEntries(
    Object.entries({
      year,
      title,
      theme,
      summary,
      timeZone,
      startAt,
      endAt,
      registration,
      venue,
      banner,
      badges,
      sections,
      tracks,
    }).filter(([, value]) => value !== undefined),
  ) as HomeBundle["edition"];
}

export async function buildHomeBundle(read: BundleReader, { generatedAt }: BundleMeta): Promise<HomeBundle> {
  const site = await read.site();
  const [editions, content, team, events, testimonials, faqs, blogs, showcase, modules, versions] = await Promise.all([
    read.editions(),
    read.editionContent(site.activeEdition),
    read.team(),
    read.events(),
    read.testimonials(),
    read.faqs(),
    read.blogs(),
    read.showcase(),
    read.modules(),
    read.sourceVersions(),
  ]);
  const edition = content.doc;
  const shown = site.sections;
  const active = site.activeEdition;
  const homeModules = modules.filter(
    (module) => module.enabled && (module.edition === undefined || module.edition === active),
  );

  const bundle = {
    schemaVersion: 2,
    generatedAt,
    sourceVersions: versionsFor(versions, (id) => feedsHome(id, active)),
    site: strip(site),
    edition: homeEdition(edition),
    sponsors: edition.sections.sponsors ? sortSponsors(content.sponsors).map(strip) : [],
    partners: edition.sections.partners ? byOrder(content.partners).map(strip) : [],
    editionFaqs: edition.sections.faqs ? byOrder(content.faqs).map(strip) : [],
    faqs: shown.faqs ? byOrder(faqs).map(strip) : [],
    testimonials: shown.testimonials ? byOrder(testimonials.filter((item) => item.featured)).map(strip) : [],
    team: shown.team ? sortTeam(team.filter((member) => member.active)).map(strip) : [],
    events: shown.events
      ? [...events]
          .sort((a, b) => toMillis(b.startAt) - toMillis(a.startAt))
          .slice(0, MAX_HOME_EVENTS)
          .map(strip)
      : [],
    blogs: shown.blogs ? latestBlogs(blogs).map(strip) : [],
    showcaseFeatured: shown.showcase
      ? byOrder(showcase.filter((item) => item.featured))
          .slice(0, MAX_FEATURED_SHOWCASE)
          .map(strip)
      : [],
    modules: await bundleModules(read, homeModules),
    pastEditions: shown.pastEditions
      ? editions
          .filter((item) => item.year !== active)
          .sort((a, b) => b.year - a.year)
          .map(({ year, title, highlight, banner, startAt }) =>
            highlight === undefined ? { year, title, banner, startAt } : { year, title, highlight, banner, startAt },
          )
      : [],
  };
  return homeBundle.parse(bundle);
}

export async function buildEditionBundle(
  read: BundleReader,
  year: number,
  { generatedAt }: BundleMeta,
): Promise<EditionBundle> {
  const [content, showcase, modules, versions] = await Promise.all([
    read.editionContent(year),
    read.showcase(),
    read.modules(),
    read.sourceVersions(),
  ]);
  const { doc, speakers } = content;
  const people = new Map<string, Speaker>(speakers.map((speaker) => [speaker.id, speaker]));
  const sessions = doc.sections.schedule ? sortSessions(content.sessions) : [];
  const sessionIdsBySpeaker = new Map<string, string[]>();
  for (const session of sessions) {
    for (const id of session.speakerIds)
      sessionIdsBySpeaker.set(id, [...(sessionIdsBySpeaker.get(id) ?? []), session.id]);
  }

  const bundle = {
    schemaVersion: 2,
    generatedAt,
    sourceVersions: versionsFor(
      versions,
      (id) => id.startsWith(`edition-${year}`) || id === "modules" || id.startsWith("module-"),
    ),
    edition: strip(doc),
    sessions: sessions.map((session) => ({
      ...strip(session),
      speakers: session.speakerIds.flatMap((id) => {
        const speaker = people.get(id);
        if (!speaker) return [];
        return [
          Object.fromEntries(
            Object.entries({ id, name: speaker.name, headline: speaker.headline, photo: speaker.photo }).filter(
              ([, value]) => value !== undefined,
            ),
          ) as EditionBundle["sessions"][number]["speakers"][number],
        ];
      }),
    })),
    speakers: doc.sections.speakers
      ? byOrder(speakers).map((speaker) => ({
          ...strip(speaker),
          sessionIds: sessionIdsBySpeaker.get(speaker.id) ?? [],
        }))
      : [],
    sponsors: doc.sections.sponsors ? sortSponsors(content.sponsors).map(strip) : [],
    partners: doc.sections.partners ? byOrder(content.partners).map(strip) : [],
    faqs: doc.sections.faqs ? byOrder(content.faqs).map(strip) : [],
    showcase: byOrder(showcase.filter((item) => item.edition === year)).map(strip),
    modules: await bundleModules(
      read,
      modules.filter((module) => module.enabled && module.edition === year),
    ),
  };
  return editionBundle.parse(bundle);
}

export async function buildEditionsBundle(read: BundleReader, { generatedAt }: BundleMeta): Promise<EditionsBundle> {
  const [editions, versions] = await Promise.all([read.editions(), read.sourceVersions()]);
  const bundle = {
    schemaVersion: 2,
    generatedAt,
    sourceVersions: versionsFor(versions, (id) => /^edition-\d{4}$/.test(id)),
    items: [...editions]
      .sort((a, b) => b.year - a.year)
      .map((edition) =>
        Object.fromEntries(
          Object.entries({
            year: edition.year,
            title: edition.title,
            theme: edition.theme,
            highlight: edition.highlight,
            startAt: edition.startAt,
            endAt: edition.endAt,
            banner: edition.banner,
            venueName: edition.venue.name,
          }).filter(([, value]) => value !== undefined),
        ),
      ),
  };
  return editionsBundle.parse(bundle);
}

export type AnyBundle = HomeBundle | EditionBundle | EditionsBundle;

export async function buildBundle(id: BundleId, read: BundleReader, meta: BundleMeta): Promise<AnyBundle> {
  if (id === "home") return buildHomeBundle(read, meta);
  if (id === "editions") return buildEditionsBundle(read, meta);
  return buildEditionBundle(read, Number(id.slice("edition-".length)), meta);
}

export function bundlePath(id: BundleId): string {
  return `bundles/${id}`;
}
