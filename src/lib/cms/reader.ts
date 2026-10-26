import type { DocumentReference, Firestore, Query, Transaction } from "firebase-admin/firestore";

import type { LegacySources } from "@/lib/legacy/to-rtdb";
import type {
  Blog,
  CommunityEvent,
  Edition,
  Faq,
  ModuleDoc,
  ModuleItem,
  Partner,
  Session,
  ShowcaseItem,
  SiteConfig,
  Speaker,
  Sponsor,
  TeamMember,
  Testimonial,
} from "@/lib/schema/v2";
import { lenient } from "@/lib/schema/v2";
import { fromFirestore } from "@/lib/schema/v2/convert";

import type { BundleReader } from "./bundles";
import { ContentError } from "./errors";
import { sectionsRef } from "./paths";

type Doc = Record<string, unknown>;

const DOC_SCHEMAS: [RegExp, { parse(value: unknown): unknown }][] = [
  [/^site\/config$/, lenient.siteConfig],
  [/^site\/app$/, lenient.siteApp],
  [/^editions\/\d{4}$/, lenient.edition],
  [/^editions\/\d{4}\/sessions$/, lenient.session],
  [/^editions\/\d{4}\/speakers$/, lenient.speaker],
  [/^editions\/\d{4}\/sponsors$/, lenient.sponsor],
  [/^editions\/\d{4}\/partners$/, lenient.partner],
  [/^editions\/\d{4}\/faqs$/, lenient.faq],
  [/^team$/, lenient.teamMember],
  [/^events$/, lenient.communityEvent],
  [/^testimonials$/, lenient.testimonial],
  [/^faqs$/, lenient.faq],
  [/^blogs$/, lenient.blog],
  [/^showcase$/, lenient.showcaseItem],
  [/^modules$/, lenient.moduleDoc],
];

function parsePublic(path: string, value: Doc): Doc {
  const schema = DOC_SCHEMAS.find(([pattern]) => pattern.test(path))?.[1];
  return schema ? (schema.parse(value) as Doc) : value;
}

export type Overrides = Map<string, Doc | Doc[]>;

export type FirestoreReader = BundleReader & {
  doc(path: string): Promise<Doc | null>;
  collection(path: string): Promise<(Doc & { id: string })[]>;
  legacySources(): Promise<LegacySources>;
};

type ReaderOptions = { tx?: Transaction; overrides?: Overrides; versions?: Record<string, number> };

export function createReader(db: Firestore, { tx, overrides = new Map(), versions = {} }: ReaderOptions = {}) {
  const cache = new Map<string, Promise<unknown>>();
  const memo = <T>(key: string, load: () => Promise<T>): Promise<T> => {
    if (!cache.has(key)) cache.set(key, load());
    return cache.get(key) as Promise<T>;
  };
  const getDoc = (ref: DocumentReference) => (tx ? tx.get(ref) : ref.get());
  const getQuery = (query: Query) => (tx ? tx.get(query) : query.get());

  const doc = (path: string) =>
    memo(`doc:${path}`, async () => {
      if (overrides.has(path)) return overrides.get(path) as Doc;
      const snapshot = await getDoc(db.doc(path));
      return snapshot.exists ? parsePublic(path, fromFirestore<Doc>(snapshot.data())) : null;
    });

  const collection = (path: string) =>
    memo(`collection:${path}`, async () => {
      if (overrides.has(path)) return overrides.get(path) as (Doc & { id: string })[];
      const snapshot = await getQuery(db.collection(path));
      return snapshot.docs.map(
        (entry) => parsePublic(path, { ...fromFirestore<Doc>(entry.data()), id: entry.id }) as Doc & { id: string },
      );
    });

  const required = async <T>(path: string, message: string) => {
    const value = await doc(path);
    if (!value) throw new ContentError(message, "not_imported");
    return value as T;
  };

  const site = () => required<SiteConfig>("site/config", "Publish the site settings first.");

  const editions = () =>
    memo("editions", async () => {
      const listed = await collection("editions");
      const years = new Set(listed.map((entry) => entry.id));
      for (const path of overrides.keys()) {
        const match = /^editions\/(\d{4})$/.exec(path);
        if (match) years.add(match[1]);
      }
      const docs = await Promise.all([...years].map((year) => doc(`editions/${year}`)));
      return docs.filter((entry): entry is Doc => entry !== null) as Edition[];
    });

  const editionContent = (year: number) =>
    memo(`edition:${year}`, async () => {
      const base = `editions/${year}`;
      const [edition, sessions, speakers, sponsors, partners, faqs] = await Promise.all([
        required<Edition>(base, `Publish the DevFest ${year} event details first.`),
        collection(`${base}/sessions`),
        collection(`${base}/speakers`),
        collection(`${base}/sponsors`),
        collection(`${base}/partners`),
        collection(`${base}/faqs`),
      ]);
      return {
        doc: edition,
        sessions: sessions as Session[],
        speakers: speakers as Speaker[],
        sponsors: sponsors as Sponsor[],
        partners: partners as Partner[],
        faqs: faqs as Faq[],
      };
    });

  const sourceVersions = () =>
    memo("versions", async () => {
      const snapshot = await getQuery(sectionsRef(db));
      return { ...Object.fromEntries(snapshot.docs.map((entry) => [entry.id, entry.data().version])), ...versions };
    });

  const reader: FirestoreReader = {
    doc,
    collection,
    site,
    editions,
    editionContent,
    team: () => collection("team") as Promise<TeamMember[]>,
    events: () => collection("events") as Promise<CommunityEvent[]>,
    testimonials: () => collection("testimonials") as Promise<Testimonial[]>,
    faqs: () => collection("faqs") as Promise<Faq[]>,
    blogs: () => collection("blogs") as Promise<Blog[]>,
    showcase: () => collection("showcase") as Promise<ShowcaseItem[]>,
    modules: () => collection("modules") as Promise<ModuleDoc[]>,
    moduleItems: (moduleId) => collection(`moduleItems/${moduleId}/items`) as Promise<ModuleItem[]>,
    sourceVersions,
    async legacySources() {
      const config = await site();
      const [active, allEditions, team, testimonials, faqs, events] = await Promise.all([
        editionContent(config.activeEdition),
        editions(),
        reader.team(),
        reader.testimonials(),
        reader.faqs(),
        reader.events(),
      ]);
      return { site: config, active, editions: allEditions, team, testimonials, faqs, events };
    },
  };
  return reader;
}
