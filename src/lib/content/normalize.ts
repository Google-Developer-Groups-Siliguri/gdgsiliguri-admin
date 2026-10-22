const LINK_FIELD = /(URL|Url|Link|link|^icon$|^image$|^thumbnail$|^coverImg$|^url$|^mapsURLweb$)/;

export function isLinkField(field: string): boolean {
  return LINK_FIELD.test(field);
}

export function normalizeForSave<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => normalizeForSave(entry)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([field, entry]) => [
        field,
        typeof entry === "string" && isLinkField(field) ? entry.trim() : normalizeForSave(entry),
      ]),
    ) as T;
  }
  return value;
}
