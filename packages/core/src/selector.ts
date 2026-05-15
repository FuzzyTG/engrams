import type { SelectionInput, SelectedTopic, IndexEntry } from "./types.js";

/**
 * Select the top-N topics relevant to a given agent.
 *
 * 1. Filter: keep evergreen entries and entries whose last_seen falls within
 *    the time window. Exclude entries where the agent is neither origin nor
 *    participant.
 * 2. Tier: Tier 1 = origin matches agentId; Tier 2 = participant but not origin.
 *    Tier is used only for labeling, not ranking priority.
 * 3. Sort all eligible entries together by weight descending, tiebreak by
 *    most recent last_seen.
 * 4. Take top N.
 */
export function selectTopics(input: SelectionInput): SelectedTopic[] {
  const { index, agentId, timeWindowHours, topN, now } = input;

  const cutoffMs = now.getTime() - timeWindowHours * 60 * 60 * 1000;
  // Truncate to midnight UTC so day-precision last_seen dates compare consistently
  const cutoff = new Date(cutoffMs - (cutoffMs % 86_400_000));

  // Step 1: filter eligible entries
  const eligible = index.filter((entry) => {
    // Time eligibility: evergreen or within window
    const timeOk = entry.evergreen || isWithinWindow(entry.last_seen, cutoff);
    if (!timeOk) return false;

    // Agent eligibility: must be origin or participant
    const isOrigin = entry.origin === agentId;
    const isParticipant = entry.participants.includes(agentId);
    return isOrigin || isParticipant;
  });

  // Step 2: assign tiers and merge
  const candidates: { entry: IndexEntry; tier: 1 | 2 }[] = eligible.map(entry => ({
    entry,
    tier: entry.origin === agentId ? 1 : 2,
  }));

  // Step 3: sort by weight descending, tiebreak by most recent last_seen
  candidates.sort((a, b) => {
    if (b.entry.weight !== a.entry.weight) return b.entry.weight - a.entry.weight;
    return compareDates(b.entry.last_seen, a.entry.last_seen);
  });

  // Step 4: take top N
  const result: SelectedTopic[] = [];
  for (const c of candidates) {
    if (result.length >= topN) break;
    result.push({ file: c.entry.file, title: c.entry.title, weight: c.entry.weight, tier: c.tier });
  }

  return result;
}

/** Check whether a YYYY-MM-DD date string is on or after the cutoff date. */
function isWithinWindow(dateStr: string, cutoff: Date): boolean {
  const parsed = parseDate(dateStr);
  if (parsed === null) return false;
  return parsed >= cutoff;
}

/** Compare two YYYY-MM-DD date strings. Returns positive if a > b. */
function compareDates(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  // Treat unparseable dates as epoch (very old)
  const ta = da ? da.getTime() : 0;
  const tb = db ? db.getTime() : 0;
  return ta - tb;
}

/** Parse a YYYY-MM-DD string into a Date (at midnight UTC), or null. */
function parseDate(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    if (dateStr !== "") {
      console.warn(`engrams: selector skipping entry with malformed last_seen: "${dateStr}"`);
    }
    return null;
  }
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  return d;
}
