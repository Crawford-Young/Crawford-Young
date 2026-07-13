import { describe, expect, it } from "vitest";
import { bucketLocByDay, computeRank, computeStreaks } from "../src/github.js";

function day(date: string, count: number): { date: string; count: number } {
  return { date, count };
}

describe("computeStreaks", () => {
  it("computes total, current, and longest streaks", () => {
    const days = [
      day("2026-06-01", 2),
      day("2026-06-02", 1),
      day("2026-06-03", 0),
      day("2026-06-04", 3),
      day("2026-06-05", 1),
      day("2026-06-06", 1),
    ];
    expect(computeStreaks(days)).toEqual({ total: 8, current: 3, longest: 3 });
  });
  it("keeps current streak alive when today has no contributions yet", () => {
    const days = [day("2026-06-04", 1), day("2026-06-05", 2), day("2026-06-06", 0)];
    expect(computeStreaks(days).current).toBe(2);
  });
  it("returns zeros for empty input", () => {
    expect(computeStreaks([])).toEqual({ total: 0, current: 0, longest: 0 });
  });
});

describe("computeRank", () => {
  it("scores high activity as S", () => {
    expect(
      computeRank({ stars: 500, commits: 5000, prs: 300, issues: 100, contributedTo: 40 }).letter,
    ).toBe("S");
  });
  it("scores zero activity as B with low pct", () => {
    const r = computeRank({ stars: 0, commits: 0, prs: 0, issues: 0, contributedTo: 0 });
    expect(r.letter).toBe("B");
    expect(r.pct).toBeGreaterThanOrEqual(0.05);
  });
});

function commit(
  committedDate: string,
  additions: number,
  deletions: number,
  parentCount = 1,
): { committedDate: string; additions: number; deletions: number; parentCount: number } {
  return { committedDate, additions, deletions, parentCount };
}

describe("bucketLocByDay", () => {
  it("sums additions+deletions per UTC date", () => {
    const days = bucketLocByDay(
      [commit("2026-07-13T10:00:00Z", 100, 20), commit("2026-07-13T18:00:00Z", 5, 5)],
      "2026-07-13",
      3,
    );
    expect(days).toEqual([
      { date: "2026-07-11", changed: 0 },
      { date: "2026-07-12", changed: 0 },
      { date: "2026-07-13", changed: 130 },
    ]);
  });
  it("skips merge commits", () => {
    const days = bucketLocByDay(
      [commit("2026-07-13T10:00:00Z", 500, 500, 2), commit("2026-07-13T11:00:00Z", 10, 0)],
      "2026-07-13",
      1,
    );
    expect(days).toEqual([{ date: "2026-07-13", changed: 10 }]);
  });
  it("drops commits older than the window", () => {
    const days = bucketLocByDay([commit("2026-07-01T10:00:00Z", 99, 0)], "2026-07-13", 2);
    expect(days).toEqual([
      { date: "2026-07-12", changed: 0 },
      { date: "2026-07-13", changed: 0 },
    ]);
  });
  it("returns a zero-filled 31-day window for empty input", () => {
    const days = bucketLocByDay([], "2026-07-13");
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: "2026-06-13", changed: 0 });
    expect(days.at(-1)).toEqual({ date: "2026-07-13", changed: 0 });
    expect(days.every((d) => d.changed === 0)).toBe(true);
  });
});
