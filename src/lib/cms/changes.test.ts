import { describe, expect, it } from "vitest";

import { describeChanges, humanize } from "./changes";

describe("describeChanges", () => {
  it("names changed fields of a single doc, one level into objects", () => {
    const published = { title: "DevFest 2026", timeZone: "Asia/Kolkata", sections: { speakers: true, faqs: true } };
    const draft = { title: "DevFest Siliguri 2026", timeZone: "Asia/Kolkata", sections: { speakers: true, faqs: false } };
    expect(describeChanges(published, draft)).toEqual([
      { kind: "changed", label: "Title" },
      { kind: "changed", label: "Sections → Faqs" },
    ]);
  });

  it("reports nothing when the draft matches", () => {
    expect(describeChanges({ title: "A", updatedAt: "x" }, { title: "A", updatedAt: "y" })).toEqual([]);
  });

  it("lists added, removed and edited items by name", () => {
    const published = {
      items: [
        { id: "a", name: "Asha", bio: "Old" },
        { id: "b", name: "Bikram" },
      ],
    };
    const draft = {
      items: [
        { id: "a", name: "Asha", bio: "New" },
        { id: "c", name: "Chandni" },
      ],
    };
    expect(describeChanges(published, draft)).toEqual([
      { kind: "changed", label: "Asha", fields: ["Bio"] },
      { kind: "added", label: "Chandni" },
      { kind: "removed", label: "Bikram" },
    ]);
  });

  it("notices a reorder on its own", () => {
    const published = { items: [{ id: "a", name: "A" }, { id: "b", name: "B" }] };
    const draft = { items: [{ id: "b", name: "B" }, { id: "a", name: "A" }] };
    expect(describeChanges(published, draft)).toEqual([{ kind: "changed", label: "Order of items" }]);
  });
});

describe("humanize", () => {
  it("turns keys into labels", () => {
    expect(humanize("registrationUrl")).toBe("Registration url");
    expect(humanize("call_for_speakers")).toBe("Call for speakers");
  });
});
