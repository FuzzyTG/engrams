#!/usr/bin/env node
import { rebuildIndex } from "./rebuild.js";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: engrams-rebuild <engrams-directory>");
  process.exit(1);
}

rebuildIndex(dir).catch((err) => {
  console.error(err);
  process.exit(1);
});
