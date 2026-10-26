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
import { lenient, strict } from "@/lib/schema/v2";
import { fromFirestore } from "@/lib/schema/v2/convert";

import type { BundleReader } from "./bundles";
import { ContentError } from "./errors";
import { sectionsRef } from "./paths";

type Doc = Record<string, unknown>;

type Parser = { parse(value: unknown): unknown; safeParse(value: unknown): { success: boolean } };
type SchemaKey = { [K in keyof typeof lenient]: (typeof lenient)[K] extends Parser ? K : never }[keyof typeof lenient];

const DOC_SCHEMAS: [RegExp, SchemaKey][] = [
  [/^site\/config$/, "siteConfig"],
  [/^site\/app$/, "siteApp"],
  [/^editions\/\d{4}$/, "edition"],
  [/^editions\/\d{4}\/sessions$/, "session"],
  [/^editions\/\d{4}\/speakers$/, "speaker"],
  [/^editions\/\d{4}\/sponsors$/, "sponsor"],
  [/^editions\/\d{4}\/partners$/, "partner"],
  [/^editions\/\d{4}\/faqs$/, "faq"],
  [/^team$/, "teamMember"],
  [/^events$/, "communityEvent"],
  [/^testimonials$/, "testimonial"],
  [/^faqs$/, "faq"],
  [/^blogs$/, "blog"],
  [/^showcase$/, "showcaseItem"],
  [/^modules$/, "moduleDoc"],
];

const schemaKeyFor = (path: string) => DOC_SCHEMAS.find(([pattern]) => pattern.test(path))?.[1];

function parsePublic(path: string, value: Doc): Doc {
  const key = schemaKeyFor(path);
  return key ? (lenient[key].parse(value) as Doc) : value;
}

// Collections such as events predate v2 and still hold documents the old app reads. Publishing and the
// migration only write documents that pass the strict schema, so anything else is not v2 content.
function isV2Doc(path: string, value: Doc): boolean {
  const key = schemaKeyFor(path);
  if (!key || strict[key].safeParse(value).success) return true;
  console.warn(`Skipping ${path}/${String(value.id)}: not a v2 document`);
  return false;
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
      return snapshot.docs
        .map((entry) => ({ ...fromFirestore<Doc>(entry.data()), id: entry.id }))
        .filter((value) => isV2Doc(path, value))
        .map((value) => parsePublic(path, value) as Doc & { id: string });
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
