const KEEP_EMPTY = new Set(["alt"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

export function stripEmpty<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => stripEmpty(entry)) as T;
  if (!isPlainObject(value)) return value;
  const entries = Object.entries(value)
    .map(
      ([key, entry]) =>
        [key, typeof entry === "string" && !KEEP_EMPTY.has(key) ? entry.trim() : stripEmpty(entry)] as const,
    )
    .filter(
      ([key, entry]) =>
        entry !== undefined &&
        (entry !== "" || KEEP_EMPTY.has(key)) &&
        !(isPlainObject(entry) && Object.keys(entry).length === 0),
    );
  return Object.fromEntries(entries) as T;
}

export function defaultAlt<T>(value: T, fields: Record<string, string>): T {
  if (!isPlainObject(value)) return value;
  const next: Record<string, unknown> = { ...value };
  for (const [mediaField, nameField] of Object.entries(fields)) {
    const media = next[mediaField];
    const name = next[nameField];
    if (isPlainObject(media) && typeof media.url === "string" && media.url && !media.alt && typeof name === "string") {
      next[mediaField] = { ...media, alt: name.trim() };
    }
  }
  return next as T;
}
