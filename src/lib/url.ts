export function isHttpsUrl(value: string): boolean {
  if (!value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function suggestUrlFix(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || isHttpsUrl(trimmed)) return trimmed === value ? null : trimmed;
  const withoutScheme = trimmed.replace(/^(https?:)?\/\//i, "").replace(/^https?:/i, "");
  const candidate = `https://${withoutScheme}`;
  return isHttpsUrl(candidate) ? candidate : null;
}
