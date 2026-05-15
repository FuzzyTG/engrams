import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseTopic } from "../src/parser.js";

describe("parseTopic", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "engrams-parser-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("parses valid frontmatter with all fields", async () => {
    const filePath = join(dir, "topic.md");
    writeFileSync(
      filePath,
      [
        "---",
        "title: API responses use snake_case",
        "created: 2026-03-15",
        "origin: backend",
        "last_seen: 2026-05-10",
        "weight: 3",
        "participants: [backend, frontend]",
        "evergreen: true",
        "---",
        "",
        "All API responses use snake_case field names.",
      ].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.file, "topic.md");
    assert.equal(topic!.title, "API responses use snake_case");
    assert.equal(topic!.created, "2026-03-15");
    assert.equal(topic!.origin, "backend");
    assert.equal(topic!.last_seen, "2026-05-10");
    assert.equal(topic!.weight, 3);
    assert.deepEqual(topic!.participants, ["backend", "frontend"]);
    assert.equal(topic!.evergreen, true);
    assert.equal(topic!.body, "All API responses use snake_case field names.");
  });

  it("returns null for files without frontmatter", async () => {
    const filePath = join(dir, "no-frontmatter.md");
    writeFileSync(filePath, "Just some plain text.\n");

    const topic = await parseTopic(filePath);
    assert.equal(topic, null);
  });

  it("returns null for files with unclosed frontmatter", async () => {
    const filePath = join(dir, "unclosed.md");
    writeFileSync(
      filePath,
      ["---", "title: Unclosed", "weight: 1", ""].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.equal(topic, null);
  });

  it("returns null when title is missing", async () => {
    const filePath = join(dir, "no-title.md");
    writeFileSync(
      filePath,
      ["---", "weight: 2", "origin: backend", "---", "Body text."].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.equal(topic, null);
  });

  it("returns null for non-existent file", async () => {
    const topic = await parseTopic(join(dir, "does-not-exist.md"));
    assert.equal(topic, null);
  });

  it("defaults weight to 0 when not present", async () => {
    const filePath = join(dir, "no-weight.md");
    writeFileSync(
      filePath,
      ["---", "title: Minimal topic", "---", "Body here."].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.weight, 0);
  });

  it("defaults evergreen to false when not present", async () => {
    const filePath = join(dir, "not-evergreen.md");
    writeFileSync(
      filePath,
      ["---", "title: Temp topic", "weight: 1", "---", "Body."].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.evergreen, false);
  });

  it("handles empty participants array", async () => {
    const filePath = join(dir, "empty-participants.md");
    writeFileSync(
      filePath,
      [
        "---",
        "title: Solo topic",
        "participants: []",
        "---",
        "Body.",
      ].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.deepEqual(topic!.participants, []);
  });

  it("handles quoted string values", async () => {
    const filePath = join(dir, "quoted.md");
    writeFileSync(
      filePath,
      [
        "---",
        'title: "Topic with: colon"',
        "weight: 2",
        "---",
        "Body.",
      ].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.title, "Topic with: colon");
  });

  it("trims body content", async () => {
    const filePath = join(dir, "padded-body.md");
    writeFileSync(
      filePath,
      ["---", "title: Padded", "---", "", "  Body content.  ", "", ""].join(
        "\n",
      ),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.body, "Body content.");
  });

  it("handles quoted commas inside array elements", async () => {
    const filePath = join(dir, "quoted-comma.md");
    writeFileSync(
      filePath,
      [
        "---",
        'title: Comma test',
        'participants: ["Alice, Bob", Charlie]',
        "---",
        "Body.",
      ].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.deepEqual(topic!.participants, ["Alice, Bob", "Charlie"]);
  });

  it("parses frontmatter with CRLF line endings", async () => {
    const filePath = join(dir, "crlf.md");
    writeFileSync(
      filePath,
      ["---", "title: CRLF topic", "weight: 4", "---", "Body."].join("\r\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.title, "CRLF topic");
    assert.equal(topic!.weight, 4);
  });

  it("returns basename for file field, not full path", async () => {
    const filePath = join(dir, "deep-dive.md");
    writeFileSync(
      filePath,
      ["---", "title: Deep dive", "---", "Body."].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.file, "deep-dive.md");
  });

  it("warns on missing required fields but still returns topic", async () => {
    const filePath = join(dir, "minimal.md");
    writeFileSync(
      filePath,
      ["---", "title: Only title", "---", "Body."].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.title, "Only title");
    assert.equal(topic!.weight, 0);
    assert.equal(topic!.evergreen, false);
    assert.deepEqual(topic!.participants, []);
  });

  it("warns on invalid date format but still returns topic", async () => {
    const filePath = join(dir, "bad-date.md");
    writeFileSync(
      filePath,
      [
        "---",
        "title: Bad date topic",
        "created: yesterday",
        "last_seen: 2026/05/10",
        "---",
        "Body.",
      ].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.equal(topic!.created, "yesterday");
    assert.equal(topic!.last_seen, "2026/05/10");
  });

  it("handles block-style YAML lists", async () => {
    const filePath = join(dir, "block-list.md");
    writeFileSync(
      filePath,
      [
        "---",
        "title: Block list topic",
        "participants:",
        "  - backend",
        "  - frontend",
        "  - infra",
        "---",
        "Body.",
      ].join("\n"),
    );

    const topic = await parseTopic(filePath);
    assert.notEqual(topic, null);
    assert.deepEqual(topic!.participants, ["backend", "frontend", "infra"]);
  });
});
