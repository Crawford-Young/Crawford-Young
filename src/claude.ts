import type { ClaudeDay } from "./cards.js";

export interface DailyUsage {
  readonly input: number;
  readonly output: number;
}

export type UsageByDate = Record<string, DailyUsage>;

const DAY_MS = 86_400_000;

interface TranscriptLine {
  readonly type?: string;
  readonly timestamp?: string;
  readonly message?: {
    readonly id?: string;
    readonly usage?: {
      readonly input_tokens?: number;
      readonly output_tokens?: number;
      readonly cache_creation_input_tokens?: number;
      readonly cache_read_input_tokens?: number;
    };
  };
}

function localDate(iso: string): string | null {
  // en-CA locale formats as YYYY-MM-DD in the machine's timezone.
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-CA");
}

/** Aggregate token usage per local date. `seen` dedupes message ids across files. */
export function aggregateLines(
  lines: readonly string[],
  seen: Set<string>,
): UsageByDate {
  const out: Record<string, { input: number; output: number }> = {};
  for (const raw of lines) {
    if (raw.trim() === "") continue;
    let parsed: TranscriptLine;
    try {
      parsed = JSON.parse(raw) as TranscriptLine;
    } catch {
      continue;
    }
    const usage = parsed.message?.usage;
    const id = parsed.message?.id;
    const ts = parsed.timestamp;
    if (parsed.type !== "assistant" || !usage || !id || !ts) continue;
    if (seen.has(id)) continue;
    const date = localDate(ts);
    if (!date) continue;
    seen.add(id);
    const bucket = (out[date] ??= { input: 0, output: 0 });
    bucket.input +=
      (usage.input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0);
    bucket.output += usage.output_tokens ?? 0;
  }
  return out;
}

/** Dates present in `fresh` overwrite `existing`; other history is preserved. */
export function mergeUsage(existing: UsageByDate, fresh: UsageByDate): UsageByDate {
  return { ...existing, ...fresh };
}

/** Last day of the claude card: the UTC day before generation. The Action runs at 06:00 UTC and
 *  the local export at 18:00 local, so the generation day itself never has data yet. */
export function claudeWindowEnd(now: Date): string {
  return new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
}

/** The `n` days ending on `endIso`, zero-filled — stale data shows as zeros instead of shifting the window. */
export function toClaudeDays(usage: UsageByDate, n: number, endIso: string): readonly ClaudeDay[] {
  const endMs = Date.parse(`${endIso}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(endMs - (n - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    const u = usage[date];
    return { date, tokens: u ? u.input + u.output : 0 };
  });
}
