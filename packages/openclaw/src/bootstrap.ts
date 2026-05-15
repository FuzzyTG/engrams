import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { selectTopics, renderOutput } from "@engrams/core";
import type { IndexEntry } from "@engrams/core";
import {
  CONTEXT_FILE_NAME,
  INDEX_FILE_NAME,
  MAX_OUTPUT_BYTES,
  DEFAULT_TIME_WINDOW_HOURS,
  DEFAULT_TOP_N,
} from "@engrams/core/constants";
import { engramsPath } from "./paths.js";

export type BootstrapContext = {
  bootstrapFiles?: Array<{ path: string; content: string }>;
  agentId?: string;
};

export async function injectEngramsContext(
  context: BootstrapContext,
  pluginConfig?: Record<string, unknown>,
): Promise<boolean> {
  try {
    const configPath = pluginConfig?.path;
    if (typeof configPath !== "string" || configPath === "") {
      console.warn("engrams: no path configured, skipping injection");
      return false;
    }

    const resolved = engramsPath(configPath);
    const indexPath = join(resolved, INDEX_FILE_NAME);

    let raw: string;
    try {
      raw = await readFile(indexPath, "utf-8");
    } catch {
      console.warn(`engrams: could not read index at ${indexPath}, skipping`);
      return false;
    }

    let index: IndexEntry[];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn(`engrams: malformed index at ${indexPath}, skipping`);
        return false;
      }
      index = parsed as IndexEntry[];
    } catch {
      console.warn(`engrams: malformed index at ${indexPath}, skipping`);
      return false;
    }

    const agentId = context.agentId ?? "";
    const timeWindowHours =
      typeof pluginConfig?.timeWindowHours === "number"
        ? pluginConfig.timeWindowHours
        : DEFAULT_TIME_WINDOW_HOURS;
    const topN =
      typeof pluginConfig?.topN === "number"
        ? pluginConfig.topN
        : DEFAULT_TOP_N;

    const selected = selectTopics({
      index,
      agentId,
      timeWindowHours,
      topN,
      now: new Date(),
    });

    if (selected.length === 0) {
      return false;
    }

    const maxBytes =
      typeof pluginConfig?.maxBytes === "number"
        ? pluginConfig.maxBytes
        : MAX_OUTPUT_BYTES;

    const content = await renderOutput({
      selectedTopics: selected,
      engramsPath: resolved,
      maxBytes,
    });

    if (!content) {
      return false;
    }

    if (!context.bootstrapFiles) {
      context.bootstrapFiles = [];
    }

    context.bootstrapFiles.push({
      path: CONTEXT_FILE_NAME,
      content,
    });

    return true;
  } catch (err) {
    console.warn("engrams: unexpected error during bootstrap injection", err);
    return false;
  }
}
