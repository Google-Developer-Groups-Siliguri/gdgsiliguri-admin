export function valueAtPath(root: unknown, path: string): unknown {
  return path
    .split("/")
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[segment] : undefined,
      root,
    );
}
