import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rebuildIndex } from "../src/rebuild.js";
import type { IndexEntry } from "../src/types.js";

function writeTopic(
  dir: string,
  name: string,
  fields: Record<string, string | number | boolean | string[]>,
  body = "",
): void {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.join(", ")}]`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---");
  if (body) lines.push("", body);
  writeFileSync(join(dir, name), lines.join("\n"));
}

describe("rebuildIndex", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "engrams-rebuild-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("generates engrams.json sorted by weight descending", async () => {
    writeTopic(dir, "low.md", {
      title: "Low weight topic",
      weight: 1,
      origin: "backend",
      last_seen: "2026-05-01",
      participants: ["backend"],
      evergreen: false,
    });

    writeTopic(dir, "high.md", {
      title: "High weight topic",
      weight: 5,
      origin: "frontend",
      last_seen: "2026-05-10",
      participants: ["frontend", "backend"],
      evergreen: true,
    });

    writeTopic(dir, "mid.md", {
      title: "Mid weight topic",
      weight: 3,
      origin: "infra",
      last_seen: "2026-05-05",
      participants: ["infra"],
      evergreen: false,
    });

    await rebuildIndex(dir);

    const indexPath = join(dir, "engrams.json");
    const content = readFileSync(indexPath, "utf-8");
    const index: IndexEntry[] = JSON.parse(content);

    assert.equal(index.length, 3);
    assert.equal(index[0].title, "High weight topic");
    assert.equal(index[0].weight, 5);
    assert.equal(index[1].title, "Mid weight topic");
    assert.equal(index[1].weight, 3);
    assert.equal(index[2].title, "Low weight topic");
    assert.equal(index[2].weight, 1);
  });

  it("skips invalid files and still outputs valid ones", async () => {
    writeTopic(dir, "valid.md", {
      title: "Valid topic",
      weight: 2,
      origin: "backend",
      last_seen: "2026-05-01",
      participants: ["backend"],
      evergreen: false,
    });

    // Invalid: no frontmatter
    writeFileSync(join(dir, "invalid.md"), "Just plain text.\n");

    await rebuildIndex(dir);

    const indexPath = join(dir, "engrams.json");
    const content = readFileSync(indexPath, "utf-8");
    const index: IndexEntry[] = JSON.parse(content);

    assert.equal(index.length, 1);
    assert.equal(index[0].title, "Valid topic");
  });

  it("produces empty array for directory with no valid topics", async () => {
    writeFileSync(join(dir, "bad1.md"), "no frontmatter");
    writeFileSync(join(dir, "bad2.md"), "also no frontmatter");

    await rebuildIndex(dir);

    const indexPath = join(dir, "engrams.json");
    const content = readFileSync(indexPath, "utf-8");
    const index: IndexEntry[] = JSON.parse(content);

    assert.equal(index.length, 0);
  });

  it("produces empty array for empty directory", async () => {
    await rebuildIndex(dir);

    const indexPath = join(dir, "engrams.json");
    const content = readFileSync(indexPath, "utf-8");
    const index: IndexEntry[] = JSON.parse(content);

    assert.equal(index.length, 0);
  });

  it("maps lastSeen to last_seen in the index entry", async () => {
    writeTopic(dir, "topic.md", {
      title: "Check last_seen mapping",
      weight: 1,
      origin: "backend",
      last_seen: "2026-05-12",
      participants: ["backend"],
      evergreen: true,
    });

    await rebuildIndex(dir);

    const indexPath = join(dir, "engrams.json");
    const content = readFileSync(indexPath, "utf-8");
    const index: IndexEntry[] = JSON.parse(content);

    assert.equal(index.length, 1);
    assert.equal(index[0].last_seen, "2026-05-12");
    assert.equal(index[0].evergreen, true);
  });

  it("ignores non-.md files", async () => {
    writeTopic(dir, "topic.md", {
      title: "Markdown topic",
      weight: 1,
      origin: "backend",
      last_seen: "2026-05-01",
      participants: ["backend"],
      evergreen: false,
    });

    writeFileSync(join(dir, "notes.txt"), "Not a markdown file.\n");
    writeFileSync(join(dir, "data.json"), '{"key": "value"}\n');

    await rebuildIndex(dir);

    const indexPath = join(dir, "engrams.json");
    const content = readFileSync(indexPath, "utf-8");
    const index: IndexEntry[] = JSON.parse(content);

    assert.equal(index.length, 1);
    assert.equal(index[0].title, "Markdown topic");
  });

  it("sorts deterministically by file path when weights are equal", async () => {
    writeTopic(dir, "b-topic.md", {
      title: "B topic",
      weight: 3,
      origin: "backend",
      last_seen: "2026-05-01",
      participants: ["backend"],
      evergreen: false,
    });

    writeTopic(dir, "a-topic.md", {
      title: "A topic",
      weight: 3,
      origin: "frontend",
      last_seen: "2026-05-01",
      participants: ["frontend"],
      evergreen: false,
    });

    await rebuildIndex(dir);

    const content = readFileSync(join(dir, "engrams.json"), "utf-8");
    const index: IndexEntry[] = JSON.parse(content);

    assert.equal(index.length, 2);
    assert.ok(index[0].file < index[1].file);
  });

  it("stores basename in the file field", async () => {
    writeTopic(dir, "my-topic.md", {
      title: "Basename check",
      weight: 1,
      origin: "backend",
      last_seen: "2026-05-01",
      participants: ["backend"],
      evergreen: false,
    });

    await rebuildIndex(dir);

    const content = readFileSync(join(dir, "engrams.json"), "utf-8");
    const index: IndexEntry[] = JSON.parse(content);

    assert.equal(index[0].file, "my-topic.md");
  });

  it("throws when directory does not exist", async () => {
    await assert.rejects(
      () => rebuildIndex(join(dir, "nonexistent")),
      { code: "ENOENT" },
    );
  });
});
