import { describe, expect, it } from "vitest";
import { computeRank, computeStreaks } from "../src/github.js";

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
