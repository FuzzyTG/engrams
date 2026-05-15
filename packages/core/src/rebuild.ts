import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { INDEX_FILE_NAME } from "./constants.js";
import { parseTopic } from "./parser.js";
import type { IndexEntry } from "./types.js";

/**
 * Scan all `.md` files in `engramsPath`, parse their frontmatter, and write
 * `engrams.json` — a JSON array of `IndexEntry` sorted by weight descending.
 *
 * Files that fail to parse are skipped with a warning.
 */
export async function rebuildIndex(engramsPath: string): Promise<void> {
  const entries: IndexEntry[] = [];

  let files: string[];
  try {
    files = await readdir(engramsPath);
  } catch (err) {
    console.error(`engrams: could not read directory: ${engramsPath}`, err);
    throw err;
  }

  const mdFiles = files.filter((f) => f.endsWith(".md"));

  for (const file of mdFiles) {
    const filePath = join(engramsPath, file);
    const topic = await parseTopic(filePath);

    if (topic === null) {
      // parseTopic already logged the warning
      continue;
    }

    entries.push({
      file: topic.file,
      title: topic.title,
      weight: topic.weight,
      origin: topic.origin,
      last_seen: topic.last_seen,
      participants: topic.participants,
      evergreen: topic.evergreen,
    });
  }

  // Sort by weight descending
  entries.sort((a, b) => b.weight - a.weight || a.file.localeCompare(b.file));

  const outPath = join(engramsPath, INDEX_FILE_NAME);
  try {
    await writeFile(outPath, JSON.stringify(entries, null, 2) + "\n", "utf-8");
  } catch (err) {
    console.error(`engrams: failed to write ${outPath}`, err);
  }
}
