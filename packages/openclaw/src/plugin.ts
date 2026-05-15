import type { BootstrapContext } from "./bootstrap.js";

type PluginApi = {
  pluginConfig?: Record<string, unknown>;
  registerHook?: (id: string, handler: unknown) => void;
};

const plugin = {
  id: "engrams",
  name: "Engrams",
  description: "Injects relevant knowledge topics into agent context at bootstrap",
  register(_api: PluginApi) {
    // No event listeners — Engrams reads at bootstrap via managed hook only
  }
};

export default plugin;
export type { BootstrapContext };
