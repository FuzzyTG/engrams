import path from "node:path";

export function engramsPath(configuredPath: string): string {
  return path.resolve(configuredPath);
}

export function knowledgeBaseRoot(configuredPath: string): string {
  return path.dirname(engramsPath(configuredPath));
}
