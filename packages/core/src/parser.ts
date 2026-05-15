import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Topic } from "./types.js";

/**
 * Parse a simple YAML value from a frontmatter line.
 * Handles strings (optionally quoted), numbers, booleans, and arrays.
 */
function parseYamlValue(raw: string): string | number | boolean | string[] {
  const trimmed = raw.trim();

  // Inline array: [a, b, c]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1);
    if (inner.trim() === "") return [];
    const items: string[] = [];
    let current = "";
    let inQuote: string | null = null;
    for (const ch of inner) {
      if (inQuote) {
        if (ch === inQuote) {
          inQuote = null;
        } else {
          current += ch;
        }
      } else if (ch === '"' || ch === "'") {
        inQuote = ch;
      } else if (ch === ",") {
        items.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    items.push(current.trim());
    return items.filter((s) => s !== "");
  }

  // Boolean
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // Number (integer or float)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  // Quoted string — strip quotes
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Plain string
  return trimmed;
}

/**
 * Parse YAML frontmatter from a topic markdown file.
 *
 * Returns a `Topic` object, or `null` when the file has no valid frontmatter
 * (a warning is logged to stderr in that case).
 */
export async function parseTopic(filePath: string): Promise<Topic | null> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    console.warn(`engrams: could not read file: ${filePath}`, err);
    return null;
  }

  content = content.replace(/\r\n/g, "\n");

  // Frontmatter must start with "---" on the very first line.
  if (!content.startsWith("---")) {
    console.warn(`engrams: missing frontmatter in ${filePath}`);
    return null;
  }

  // Find the closing delimiter.
  const closingIndex = content.indexOf("\n---", 3);
  if (closingIndex === -1) {
    console.warn(`engrams: unclosed frontmatter in ${filePath}`);
    return null;
  }

  const fmStart = content.indexOf("\n", 3) + 1;
  const frontmatterBlock = content.slice(fmStart, closingIndex);
  const body = content.slice(closingIndex + 4).trim(); // skip "\n---"

  // Parse key: value lines
  const fields: Record<string, string | number | boolean | string[]> = {};
  let currentListKey: string | null = null;
  for (const line of frontmatterBlock.split("\n")) {
    const trimmedLine = line.trim();
    if (trimmedLine === "" || trimmedLine.startsWith("#")) {
      currentListKey = null;
      continue;
    }

    // Block-style list item: "- value"
    if (trimmedLine.startsWith("- ") && currentListKey) {
      const item = trimmedLine.slice(2).trim().replace(/^["']|["']$/g, "");
      const existing = fields[currentListKey];
      if (Array.isArray(existing)) {
        existing.push(item);
      }
      continue;
    }

    currentListKey = null;
    const colonIndex = trimmedLine.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmedLine.slice(0, colonIndex).trim();
    const value = trimmedLine.slice(colonIndex + 1).trim();

    // Key with no value followed by "- item" lines
    if (value === "") {
      fields[key] = [];
      currentListKey = key;
      continue;
    }

    fields[key] = parseYamlValue(trimmedLine.slice(colonIndex + 1));
  }

  // Validate required fields
  if (typeof fields.title !== "string" || fields.title === "") {
    console.warn(`engrams: missing or invalid title in ${filePath}`);
    return null;
  }

  const warnings: string[] = [];
  if (fields.created === undefined) warnings.push("created");
  if (fields.origin === undefined) warnings.push("origin");
  if (fields.last_seen === undefined) warnings.push("last_seen");
  if (fields.weight === undefined) warnings.push("weight");
  if (fields.participants === undefined) warnings.push("participants");
  if (fields.evergreen === undefined) warnings.push("evergreen");
  if (warnings.length > 0) {
    console.warn(
      `engrams: missing fields in ${filePath}, using defaults: ${warnings.join(", ")}`,
    );
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const created = String(fields.created ?? "");
  const lastSeen = String(fields.last_seen ?? "");
  if (created !== "" && !datePattern.test(created)) {
    console.warn(`engrams: invalid date format for 'created' in ${filePath}: ${created}`);
  }
  if (lastSeen !== "" && !datePattern.test(lastSeen)) {
    console.warn(`engrams: invalid date format for 'last_seen' in ${filePath}: ${lastSeen}`);
  }

  return {
    file: basename(filePath),
    title: fields.title as string,
    created,
    origin: String(fields.origin ?? ""),
    lastSeen,
    weight: typeof fields.weight === "number" ? fields.weight : 0,
    participants: Array.isArray(fields.participants)
      ? fields.participants
      : [],
    evergreen: fields.evergreen === true,
    body,
  };
}
