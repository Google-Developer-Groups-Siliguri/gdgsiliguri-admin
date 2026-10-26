import type { Blog } from "@/lib/schema/v2";

export const HASHNODE_RSS_URL = "https://gdgsiliguri.hashnode.dev/rss.xml";

const WORDS_PER_MINUTE = 200;
const MAX_BRIEF = 300;

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export type FeedPost = Omit<Blog, "pinned" | "updatedAt">;

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos|#39);/g, (entity) => XML_ENTITIES[entity]);
}

function unwrapCdata(value: string): string {
  return value.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

function readTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeEntities(unwrapCdata(match[1])).trim() : "";
}

function readAll(xml: string, tag: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g")), (match) =>
    decodeEntities(unwrapCdata(match[1])).trim(),
  ).filter(Boolean);
}

function plainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function brief(text: string): string {
  if (text.length <= MAX_BRIEF) return text;
  return `${text.slice(0, MAX_BRIEF - 1).replace(/\s+\S*$/, "")}…`;
}

export function slugFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
}

function parseItem(item: string): FeedPost | null {
  const content = readTag(item, "content:encoded");
  const metadata = item.replace(/<content:encoded>[\s\S]*?<\/content:encoded>/, "");
  const url = readTag(metadata, "link");
  const id = slugFromUrl(url);
  const publishedAt = Date.parse(readTag(metadata, "pubDate"));
  if (!id || !url.startsWith("https://") || Number.isNaN(publishedAt)) return null;
  const cover = metadata.match(/<enclosure[^>]*\surl="([^"]+)"/)?.[1];
  const words = plainText(content).split(" ").filter(Boolean).length;
  const tags = readAll(metadata, "category");
  return {
    id,
    title: plainText(readTag(metadata, "title")),
    brief: brief(plainText(readTag(metadata, "description")) || plainText(content)),
    url,
    ...(cover?.startsWith("https://") ? { cover: { url: cover, alt: "" } } : {}),
    author: { name: readTag(metadata, "dc:creator") || "GDG Siliguri" },
    publishedAt: new Date(publishedAt).toISOString(),
    ...(words ? { readMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)) } : {}),
    ...(tags.length ? { tags } : {}),
    source: "hashnode",
  };
}

export function parseHashnodeRss(xml: string): FeedPost[] {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g), (match) => parseItem(match[1])).filter(
    (post): post is FeedPost => post !== null,
  );
}
