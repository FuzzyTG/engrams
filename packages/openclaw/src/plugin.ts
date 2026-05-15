import type { BootstrapContext } from "./bootstrap.js";

type PluginApi = {
  pluginConfig?: Record<string, unknown>;
  registerHook?: (id: string, handler: unknown) => void;
};

const plugin = {
  id: "engrams",
  name: "Engrams",
  description: "Injects relevant knowledge topics into agent context at bootstrap",
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      path: { type: "string", description: "Absolute path to the Engrams directory" },
      timeWindowHours: { type: "number", default: 84, description: "Time window in hours for candidate selection" },
      topN: { type: "number", default: 3, description: "Maximum number of topics to inject" },
    },
    required: ["path"],
  },
  register(_api: PluginApi) {
    // No event listeners — Engrams reads at bootstrap via managed hook only
  }
};

export default plugin;
export type { BootstrapContext };
