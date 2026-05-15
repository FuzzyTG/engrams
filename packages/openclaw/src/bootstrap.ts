// TODO: implement bootstrap injection
export type BootstrapContext = {
  bootstrapFiles?: Array<{ path: string; content: string }>;
  agentId?: string;
};

export async function injectEngramsContext(
  _context: BootstrapContext,
  _pluginConfig?: Record<string, unknown>
): Promise<boolean> {
  throw new Error("Not implemented");
}
