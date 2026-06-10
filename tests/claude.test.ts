import { describe, expect, it } from "vitest";
import { aggregateLines, mergeUsage, toClaudeDays } from "../src/claude.js";

function line(id: string, ts: string, input: number, output: number): string {
  return JSON.stringify({
    type: "assistant",
    timestamp: ts,
    message: { id, usage: { input_tokens: input, output_tokens: output } },
  });
}

describe("aggregateLines", () => {
  it("buckets token usage by local date", () => {
    const out = aggregateLines(
      [line("m1", "2026-06-09T15:00:00Z", 100, 50), line("m2", "2026-06-09T16:00:00Z", 10, 5)],
      new Set(),
    );
    const day = Object.values(out)[0]!;
    expect(day).toEqual({ input: 110, output: 55 });
  });
  it("dedupes repeated message ids across streaming writes", () => {
    const seen = new Set<string>();
    const out = aggregateLines(
      [line("m1", "2026-06-09T15:00:00Z", 100, 50), line("m1", "2026-06-09T15:00:01Z", 100, 80)],
      seen,
    );
    expect(Object.values(out)[0]).toEqual({ input: 100, output: 50 });
  });
  it("counts cache tokens as input and skips malformed lines", () => {
    const cacheLine = JSON.stringify({
      type: "assistant",
      timestamp: "2026-06-09T15:00:00Z",
      message: {
        id: "m3",
        usage: {
          input_tokens: 10,
          output_tokens: 1,
          cache_creation_input_tokens: 200,
          cache_read_input_tokens: 3000,
        },
      },
    });
    const out = aggregateLines(["not json", "", cacheLine], new Set());
    expect(Object.values(out)[0]).toEqual({ input: 3210, output: 1 });
  });
});

describe("mergeUsage", () => {
  it("new parse wins for overlapping dates, old dates are kept", () => {
    const merged = mergeUsage(
      { "2026-06-01": { input: 5, output: 5 }, "2026-06-02": { input: 1, output: 1 } },
      { "2026-06-02": { input: 9, output: 9 } },
    );
    expect(merged).toEqual({
      "2026-06-01": { input: 5, output: 5 },
      "2026-06-02": { input: 9, output: 9 },
    });
  });
});

describe("toClaudeDays", () => {
  it("returns last n dates sorted ascending with zero-fill off", () => {
    const days = toClaudeDays(
      { "2026-06-02": { input: 2, output: 2 }, "2026-06-01": { input: 1, output: 1 } },
      30,
    );
    expect(days).toEqual([
      { date: "2026-06-01", tokens: 2 },
      { date: "2026-06-02", tokens: 4 },
    ]);
  });
});
