import { beforeEach, describe, expect, it } from "vitest";

import { adminFirestoreFor } from "@/lib/firebase/admin-app";
import { firestoreDoc, resetV2Data } from "@/test/v2-reset";

import { publish } from "./publish";
import { getSection, saveDraft } from "./repository";

const editor = { email: "editor@example.com" };

const studyJams = {
  id: "",
  type: "cards",
  title: "Study Jams",
  source: { kind: "items" },
  placement: { app: { slot: "homeCard", order: 10 }, web: { slot: "homeSection", order: 10 } },
  enabled: true,
};

beforeEach(async () => {
  await resetV2Data();
});

describe("modules", () => {
  it("publishes a cards module with its items inlined into bundles/home", async () => {
    const saved = await saveDraft("modules", { items: [studyJams] }, 1, editor);
    expect((saved.draft.items as { id: string }[])[0].id).toBe("study-jams");
    await publish("modules", 1, editor);
    expect(await firestoreDoc("modules/study-jams")).toMatchObject({ title: "Study Jams", enabled: true });

    const items = await getSection("module-study-jams");
    await saveDraft(
      "module-study-jams",
      {
        items: [
          { title: "Week 1: Gemini", order: 10 },
          { title: "Week 2: Agents", url: "https://g.dev/jams", order: 20 },
        ],
      },
      items.draftVersion,
      editor,
    );
    await publish("module-study-jams", items.version, editor);
    const home = (await firestoreDoc<{ modules: { id: string; items?: { title: string }[] }[] }>("bundles/home"))!;
    expect(home.modules).toHaveLength(1);
    expect(home.modules[0].items?.map((item) => item.title)).toEqual(["Week 1: Gemini", "Week 2: Agents"]);
  });

  it("deletes a module's items with the module", async () => {
    await saveDraft("modules", { items: [studyJams] }, 1, editor);
    await publish("modules", 1, editor);
    const items = await getSection("module-study-jams");
    await saveDraft("module-study-jams", { items: [{ title: "Week 1", order: 10 }] }, items.draftVersion, editor);
    await publish("module-study-jams", items.version, editor);

    const registry = await getSection("modules");
    await saveDraft("modules", { items: [] }, registry.draftVersion, editor);
    await publish("modules", registry.version, editor);
    expect(await firestoreDoc("modules/study-jams")).toBeNull();
    expect((await adminFirestoreFor().collection("moduleItems/study-jams/items").get()).size).toBe(0);
    expect((await firestoreDoc<{ modules: unknown[] }>("bundles/home"))?.modules).toEqual([]);
  });

  it("refuses a page module without a path", async () => {
    const page = { ...studyJams, placement: { ...studyJams.placement, web: { slot: "page", order: 10 } } };
    await saveDraft("modules", { items: [page] }, 1, editor);
    await expect(publish("modules", 1, editor)).rejects.toMatchObject({ code: "invalid" });
  });
});
