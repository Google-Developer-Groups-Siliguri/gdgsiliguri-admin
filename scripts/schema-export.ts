import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { z } from "zod";

import { editionBundle, editionsBundle, homeBundle } from "../src/lib/schema/v2/bundles";
import { SCHEMA_VERSION, strict } from "../src/lib/schema/v2";

const OUT_DIR = new URL("../schema/v2/", import.meta.url);

const withoutId = <T extends z.ZodObject>(schema: T) => schema.omit({ id: true } as never);

const DOCS: Record<string, z.ZodType> = {
  "site-config": strict.siteConfig,
  "site-app": strict.siteAppBase,
  edition: strict.editionBase,
  session: withoutId(strict.sessionBase),
  speaker: withoutId(strict.speaker),
  sponsor: withoutId(strict.sponsor),
  partner: withoutId(strict.partner),
  faq: withoutId(strict.faq),
  "team-member": withoutId(strict.teamMember),
  "community-event": withoutId(strict.communityEventBase),
  testimonial: withoutId(strict.testimonial),
  blog: withoutId(strict.blog),
  showcase: withoutId(strict.showcaseItem),
  module: withoutId(strict.moduleDocBase),
  "module-item-cards": withoutId(strict.cardItem),
  "module-item-gallery": withoutId(strict.galleryItem),
  "module-item-links": withoutId(strict.linkItem),
  "bundle-home": homeBundle,
  "bundle-edition": editionBundle,
  "bundle-editions": editionsBundle,
};

function title(name: string): string {
  return name.replace(/(^|-)(\w)/g, (_, __, letter: string) => letter.toUpperCase());
}

export function renderSchemas(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(DOCS).map(([name, schema]) => {
      const json = {
        $id: `https://gdgsiliguri.com/schema/v2/${name}.schema.json`,
        title: title(name),
        "x-schema-version": SCHEMA_VERSION,
        ...z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }),
      };
      return [`${name}.schema.json`, `${JSON.stringify(json, null, 2)}\n`];
    }),
  );
}

function committed(): Record<string, string> {
  try {
    return Object.fromEntries(
      readdirSync(OUT_DIR)
        .filter((file) => file.endsWith(".schema.json"))
        .map((file) => [file, readFileSync(new URL(file, OUT_DIR), "utf8")]),
    );
  } catch {
    return {};
  }
}

function committedVersion(files: Record<string, string>): number | null {
  const first = Object.values(files)[0];
  return first ? (JSON.parse(first)["x-schema-version"] as number) : null;
}

function main() {
  const next = renderSchemas();
  const current = committed();
  const changed = Object.keys({ ...next, ...current }).filter((file) => next[file] !== current[file]);

  if (process.argv.includes("--check")) {
    if (changed.length === 0) {
      console.log("schema/v2 is up to date.");
      return;
    }
    const bumped = committedVersion(current) !== SCHEMA_VERSION;
    console.error(`schema/v2 is out of date: ${changed.join(", ")}`);
    console.error(
      bumped
        ? "Run npm run schema:export and commit the result."
        : "Run npm run schema:export, commit the result, and bump SCHEMA_VERSION if clients must change.",
    );
    process.exit(1);
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [file, content] of Object.entries(next)) writeFileSync(new URL(file, OUT_DIR), content);
  console.log(`Wrote ${Object.keys(next).length} schemas to schema/v2 (${changed.length} changed).`);
}

main();
