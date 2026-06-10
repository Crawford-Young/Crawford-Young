import type { ClaudeDay } from "./cards.js";

export interface DailyUsage {
  readonly input: number;
  readonly output: number;
}

export type UsageByDate = Record<string, DailyUsage>;

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

export function toClaudeDays(usage: UsageByDate, n: number): readonly ClaudeDay[] {
  return Object.entries(usage)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-n)
    .map(([date, u]) => ({ date, tokens: u.input + u.output }));
}
