import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageScript = readFileSync(
  resolve(packageRoot, "scripts/package-standalone.sh"),
  "utf8",
);

describe("standalone installer packaging", () => {
  it("persists configured topics path with supported OpenClaw config command", () => {
    assert.ok(
      packageScript.includes('read -rp "Path to your knowledge topics directory: " ENGRAMS_PATH'),
    );
    assert.ok(packageScript.includes('if [ -n "$ENGRAMS_PATH" ]; then'));
    assert.ok(
      packageScript.includes(
        '"$OPENCLAW_BIN" config set "plugins.entries.engrams.config.path" "$ENGRAMS_PATH"',
      ),
    );
    assert.equal(
      packageScript.includes('"$OPENCLAW_BIN" plugins config engrams path "$ENGRAMS_PATH"'),
      false,
    );

    const installIndex = packageScript.indexOf('plugins install "$ARTIFACT_DIR"');
    const configIndex = packageScript.indexOf(
      'config set "plugins.entries.engrams.config.path" "$ENGRAMS_PATH"',
    );
    assert.ok(installIndex >= 0, "plugin install command should be present");
    assert.ok(configIndex > installIndex, "path should be persisted after plugin install flow");
  });
});
