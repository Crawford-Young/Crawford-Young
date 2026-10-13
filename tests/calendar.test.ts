import { describe, expect, it } from "vitest";
import { contributionLevels, layoutHeatmap } from "../src/calendar.js";

describe("contributionLevels", () => {
  it("maps zero to level 0 and splits non-zero counts into quartiles", () => {
    const levels = contributionLevels([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(levels).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it("keeps a single burst day at the top level while small days stay light", () => {
    // Bursty batch-merge work: one huge day must not wash every other day out to empty.
    const levels = contributionLevels([0, 1, 1, 1, 202, 0]);
    expect(levels).toEqual([0, 1, 1, 1, 4, 0]);
  });
  it("returns all zeros when there is no activity", () => {
    expect(contributionLevels([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

function daysBetween(fromIso: string, toIso: string, count: (i: number) => number) {
  const out: { date: string; count: number }[] = [];
  const end = Date.parse(`${toIso}T00:00:00Z`);
  for (let t = Date.parse(`${fromIso}T00:00:00Z`), i = 0; t <= end; t += 86_400_000, i += 1) {
    out.push({ date: new Date(t).toISOString().slice(0, 10), count: count(i) });
  }
  return out;
}

describe("layoutHeatmap", () => {
  const days = daysBetween("2025-10-01", "2026-10-13", () => 1);
  const layout = layoutHeatmap(days);

  it("builds 53 Sunday-start week columns ending on the last day", () => {
    expect(layout.weeks).toHaveLength(53);
    const first = layout.weeks[0]!;
    expect(first[0]!.date).toBe("2025-10-12");
    expect(first[0]!.weekday).toBe(0);
    expect(first).toHaveLength(7);
    const last = layout.weeks.at(-1)!;
    expect(last.map((c) => c.date)).toEqual(["2026-10-11", "2026-10-12", "2026-10-13"]);
  });

  it("drops days before the first column and totals only the shown days", () => {
    expect(layout.weeks.flat()).toHaveLength(52 * 7 + 3);
    expect(layout.total).toBe(52 * 7 + 3);
  });

  it("zero-fills dates missing from the input", () => {
    const sparse = layoutHeatmap([
      { date: "2026-01-05", count: 4 },
      { date: "2026-10-13", count: 2 },
    ]);
    const cells = sparse.weeks.flat();
    expect(cells).toHaveLength(52 * 7 + 3);
    expect(cells.find((c) => c.date === "2026-01-05")!.count).toBe(4);
    expect(cells.find((c) => c.date === "2026-01-06")!.count).toBe(0);
    expect(sparse.total).toBe(6);
  });

  it("assigns quartile levels to cells", () => {
    const burst = layoutHeatmap([
      { date: "2026-10-08", count: 202 },
      { date: "2026-10-09", count: 1 },
      { date: "2026-10-13", count: 0 },
    ]);
    const cells = burst.weeks.flat();
    expect(cells.find((c) => c.date === "2026-10-08")!.level).toBe(4);
    expect(cells.find((c) => c.date === "2026-10-09")!.level).toBe(1);
    expect(cells.find((c) => c.date === "2026-10-13")!.level).toBe(0);
  });

  it("labels the column where each month starts", () => {
    expect(layout.months).toHaveLength(13);
    expect(layout.months[0]).toEqual({ col: 0, label: "Oct" });
    expect(layout.months[1]).toEqual({ col: 3, label: "Nov" });
    expect(layout.months.at(-1)).toEqual({ col: 51, label: "Oct" });
  });

  it("drops a month label that would collide with the next one", () => {
    // First column is 2025-08-31 (Aug) and the next column already starts September.
    const tight = layoutHeatmap(daysBetween("2025-08-31", "2026-08-30", () => 0));
    expect(tight.weeks[0]![0]!.date).toBe("2025-08-31");
    expect(tight.months[0]).toEqual({ col: 1, label: "Sep" });
  });

  it("returns an empty layout for no input", () => {
    expect(layoutHeatmap([])).toEqual({ weeks: [], months: [], total: 0 });
  });
});
