import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type IndexField = { fieldPath: string; order?: string };
type Index = { collectionGroup: string; fields: IndexField[] };

const { indexes } = JSON.parse(
  readFileSync("firestore.indexes.json", "utf8"),
) as { indexes: Index[] };

const AUDIT_FILTERS = [
  ["sectionId"],
  ["actorEmail"],
  ["sectionId", "actorEmail"],
  ["action"],
];

describe("firestore.indexes.json", () => {
  it.each(AUDIT_FILTERS)(
    "covers the audit log filtered by %s and ordered by at",
    (...filters) => {
      const wanted = [
        ...filters.map((fieldPath) => ({ fieldPath, order: "ASCENDING" })),
        { fieldPath: "at", order: "DESCENDING" },
      ];
      expect(
        indexes
          .filter((index) => index.collectionGroup === "auditLog")
          .map((index) => index.fields),
      ).toContainEqual(wanted);
    },
  );
});
