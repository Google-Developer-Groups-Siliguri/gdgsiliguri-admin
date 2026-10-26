import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { strict } from "@/lib/schema/v2";

import { parseHashnodeRss, slugFromUrl } from "./hashnode";

const xml = readFileSync(new URL("./fixtures/hashnode-rss.xml", import.meta.url), "utf8");

describe("parseHashnodeRss", () => {
  const posts = parseHashnodeRss(xml);

  it("maps each valid item to a blog doc and drops broken ones", () => {
    expect(posts.map((post) => post.id)).toEqual([
      "getting-started-with-gemini-in-flutter",
      "devfest-siliguri-2025-recap",
    ]);
    expect(posts[0]).toEqual({
      id: "getting-started-with-gemini-in-flutter",
      title: "Getting started with Gemini in Flutter",
      brief: "A step-by-step guide to calling the Gemini API from a Flutter app & shipping it.",
      url: "https://gdgsiliguri.hashnode.dev/getting-started-with-gemini-in-flutter",
      cover: { url: "https://cdn.hashnode.com/res/hashnode/image/upload/v1/gemini.png", alt: "" },
      author: { name: "Amarjit Mallick" },
      publishedAt: "2026-09-30T12:30:00.000Z",
      readMinutes: 1,
      tags: ["flutter", "gemini"],
      source: "hashnode",
    });
  });

  it("falls back to the post text for an empty description", () => {
    expect(posts[1].brief).toBe("Twelve sessions, seven speakers and a lot of chai.");
  });

  it("produces docs that pass the strict blog schema", () => {
    for (const post of posts) expect(strict.blog.safeParse({ ...post, pinned: false }).success).toBe(true);
  });

  it("caps the brief at 300 characters", () => {
    const long = xml.replace("A step-by-step guide", "word ".repeat(100));
    expect(parseHashnodeRss(long)[0].brief.length).toBeLessThanOrEqual(300);
  });

  it("takes the slug from the URL path", () => {
    expect(slugFromUrl("https://gdgsiliguri.hashnode.dev/a-b-c?x=1")).toBe("a-b-c");
    expect(slugFromUrl("nope")).toBe("");
  });
});
