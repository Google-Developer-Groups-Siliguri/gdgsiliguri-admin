import { readdirSync, readFileSync } from "node:fs";

import { fromExampleJson } from "../../../../scripts/lib/example-json";

import { fromFirestore } from "./convert";

export const EXAMPLES_DIR = new URL("../../../../schema/examples/", import.meta.url);

export function exampleNames(): string[] {
  return readdirSync(EXAMPLES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""));
}

export function readExample<T = Record<string, unknown>>(name: string): T {
  const raw = JSON.parse(readFileSync(new URL(`${name}.json`, EXAMPLES_DIR), "utf8"));
  return fromFirestore<T>(fromExampleJson(raw));
}
