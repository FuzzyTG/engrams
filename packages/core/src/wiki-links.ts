import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";

export function resolveWikiLinks(body: string, basePath: string): string {
  const normalizedBase = resolve(basePath) + sep;

  return body.replace(/\[\[([^\]]+)\]\]/g, (_match, relativePath: string) => {
    const absolute = resolve(basePath, relativePath);

    if (!absolute.startsWith(normalizedBase)) {
      console.warn(
        `engrams: wiki-link escapes base path: [[${relativePath}]]`,
      );
      return `[[${relativePath}]]`;
    }

    if (existsSync(absolute)) {
      return absolute;
    }

    console.warn(
      `engrams: wiki-link target not found: [[${relativePath}]] (resolved to ${absolute})`,
    );
    return `[[${relativePath}]]`;
  });
}
