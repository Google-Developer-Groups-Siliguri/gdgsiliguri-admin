import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";

import { adminFirestoreFor } from "@/lib/firebase/admin-app";
import { resetV2Data, rtdbValue } from "@/test/v2-reset";

import { publish } from "./publish";
import { createReader } from "./reader";
import { getSection, saveDraft } from "./repository";
import { syncLegacy } from "./sync";

const preV2Event = {
  title: "DevFest Siliguri 2025",
  slug: "devfest-siliguri-2025",
  dateStart: Timestamp.fromDate(new Date("2025-11-16T03:30:00Z")),
  dateEnd: Timestamp.fromDate(new Date("2025-11-16T12:00:00Z")),
  timezone: "Asia/Kolkata",
  published: true,
  venue: { name: "Royal Sarovar Portico", imageUrl: "https://ik.imagekit.io/gdgsiliguri1/venue.png" },
};

describe("reading collections that predate v2", () => {
  beforeEach(async () => {
    await resetV2Data();
    await adminFirestoreFor().doc("events/devfest_2025").set(preV2Event);
  });

  it("leaves out documents that are not v2 content", async () => {
    const events = await createReader(adminFirestoreFor()).events();
    expect(events.map((event) => event.id)).not.toContain("devfest_2025");
  });

  it("still syncs /events to RTDB", async () => {
    const result = await syncLegacy(["events"], { email: "test" });
    expect(result.failed).toEqual([]);
    expect(JSON.stringify(await rtdbValue("events"))).not.toContain("DevFest Siliguri 2025");
  });

  it("publishes Events and keeps the old document", async () => {
    const events = await getSection("events");
    const saved = await saveDraft("events", events.draft, events.draftVersion, { email: "test" });
    const result = await publish("events", saved.version, { email: "test" });
    expect(result).toBeTruthy();
    expect((await adminFirestoreFor().doc("events/devfest_2025").get()).exists).toBe(true);
  });
});
