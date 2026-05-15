import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveWikiLinks } from "../src/wiki-links.js";

describe("resolveWikiLinks", () => {
  let basePath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), "engrams-wikilinks-"));
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it("replaces wiki-link with absolute path when file exists", () => {
    const subdir = join(basePath, "docs");
    mkdirSync(subdir, { recursive: true });
    const target = join(subdir, "guide.md");
    writeFileSync(target, "Guide content.");

    const body = "See [[docs/guide.md]] for details.";
    const result = resolveWikiLinks(body, basePath);

    assert.equal(result, `See ${target} for details.`);
  });

  it("leaves wiki-link as-is when file does not exist", () => {
    const body = "See [[missing/file.md]] for details.";
    const result = resolveWikiLinks(body, basePath);

    assert.equal(result, "See [[missing/file.md]] for details.");
  });

  it("resolves multiple wiki-links in the same body", () => {
    const file1 = join(basePath, "a.md");
    const file2 = join(basePath, "b.md");
    writeFileSync(file1, "A");
    writeFileSync(file2, "B");

    const body = "Ref [[a.md]] and [[b.md]].";
    const result = resolveWikiLinks(body, basePath);

    assert.equal(result, `Ref ${file1} and ${file2}.`);
  });

  it("handles body with no wiki-links", () => {
    const body = "No links in this text.";
    const result = resolveWikiLinks(body, basePath);

    assert.equal(result, "No links in this text.");
  });

  it("handles mix of existing and missing links", () => {
    const existing = join(basePath, "exists.md");
    writeFileSync(existing, "Content");

    const body = "[[exists.md]] and [[gone.md]]";
    const result = resolveWikiLinks(body, basePath);

    assert.equal(result, `${existing} and [[gone.md]]`);
  });

  it("handles nested directory paths", () => {
    const nested = join(basePath, "OpenClaw", "Learning-Companion-Guide.md");
    mkdirSync(join(basePath, "OpenClaw"), { recursive: true });
    writeFileSync(nested, "Guide content.");

    const body = "See [[OpenClaw/Learning-Companion-Guide.md]].";
    const result = resolveWikiLinks(body, basePath);

    assert.equal(result, `See ${nested}.`);
  });

  it("blocks path traversal outside base path", () => {
    const body = "See [[../../etc/passwd]] for details.";
    const result = resolveWikiLinks(body, basePath);

    assert.equal(result, "See [[../../etc/passwd]] for details.");
  });
});
