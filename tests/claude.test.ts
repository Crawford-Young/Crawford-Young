import { describe, expect, it } from "vitest";
import { aggregateLines, claudeWindowEnd, mergeUsage, toClaudeDays } from "../src/claude.js";

describe("claudeWindowEnd", () => {
  it("is the UTC day before generation, since today's local export has not run yet", () => {
    expect(claudeWindowEnd(new Date("2026-10-14T06:00:00Z"))).toBe("2026-10-13");
  });
  it("crosses month and year boundaries", () => {
    expect(claudeWindowEnd(new Date("2027-01-01T00:30:00Z"))).toBe("2026-12-31");
  });
});

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
  it("skips lines with unparseable timestamps", () => {
    const out = aggregateLines(
      [line("m4", "not-a-timestamp", 100, 50), line("m5", "2026-06-09T15:00:00Z", 10, 5)],
      new Set(),
    );
    expect(out).toEqual({ "2026-06-09": { input: 10, output: 5 } });
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
  it("returns an n-day window ending on the given date, zero-filling missing days", () => {
    const days = toClaudeDays(
      { "2026-06-02": { input: 2, output: 2 }, "2026-06-04": { input: 1, output: 0 } },
      4,
      "2026-06-04",
    );
    expect(days).toEqual([
      { date: "2026-06-01", tokens: 0 },
      { date: "2026-06-02", tokens: 4 },
      { date: "2026-06-03", tokens: 0 },
      { date: "2026-06-04", tokens: 1 },
    ]);
  });
  it("drops dates outside the window on either side", () => {
    const days = toClaudeDays(
      {
        "2026-05-31": { input: 9, output: 0 },
        "2026-06-01": { input: 1, output: 0 },
        "2026-06-03": { input: 9, output: 0 },
      },
      1,
      "2026-06-01",
    );
    expect(days).toEqual([{ date: "2026-06-01", tokens: 1 }]);
  });
  it("shows stale data as zeros instead of shifting the window back", () => {
    const days = toClaudeDays({ "2026-07-21": { input: 5, output: 5 } }, 30, "2026-10-13");
    expect(days).toHaveLength(30);
    expect(days[0]!.date).toBe("2026-09-14");
    expect(days.at(-1)!.date).toBe("2026-10-13");
    expect(days.every((d) => d.tokens === 0)).toBe(true);
  });
});
