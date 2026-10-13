import { describe, expect, it } from "vitest";
import { layoutHeatmap } from "../src/calendar.js";
import {
  renderClaudeCard,
  renderHeatmapCard,
  renderLanguagesCard,
  renderOverviewCard,
} from "../src/cards.js";
import { palette } from "../src/theme.js";

const DAY_MS = 86_400_000;

function yearOfDays(endIso: string, count: (i: number) => number) {
  const end = Date.parse(`${endIso}T00:00:00Z`);
  return Array.from({ length: 371 }, (_, i) => ({
    date: new Date(end - (370 - i) * DAY_MS).toISOString().slice(0, 10),
    count: count(i),
  }));
}

describe("renderHeatmapCard", () => {
  const layout = layoutHeatmap(yearOfDays("2026-10-13", (i) => (i % 9 === 0 ? i % 40 : 0)));
  const svg = renderHeatmapCard(layout);

  it("draws one cell per shown day plus a five-step legend", () => {
    expect(svg.match(/class="day"/g)).toHaveLength(52 * 7 + 3);
    expect(svg.match(/class="legend"/g)).toHaveLength(5);
    expect(svg).toContain(">Less<");
    expect(svg).toContain(">More<");
  });
  it("states the yearly total and labels months and weekdays", () => {
    expect(svg).toContain(`${layout.total.toLocaleString("en-US")} contributions in the last year`);
    expect(svg).toContain(">Nov<");
    expect(svg).toContain(">Mon<");
    expect(svg).toContain(">Wed<");
    expect(svg).toContain(">Fri<");
  });
  it("fills empty days with surface-raised and the top level with accent-active", () => {
    expect(svg).toContain(`fill="${palette.surfaceRaised}"`);
    expect(svg).toContain(`fill="${palette.accentActive}"`);
  });
  it("is full width", () => {
    expect(svg).toContain(`width="760"`);
    expect(svg).toMatchSnapshot();
  });
  it("renders an empty calendar without NaN", () => {
    const empty = renderHeatmapCard(layoutHeatmap([]));
    expect(empty).not.toMatch(/NaN|Infinity|undefined/);
    expect(empty).toContain("0 contributions in the last year");
  });
});

describe("renderOverviewCard", () => {
  const svg = renderOverviewCard({
    contributions: 1801,
    commits: 799,
    pullRequests: 304,
    issues: 139,
    repositories: 15,
  });
  it("shows each last-12-month total with grouped digits", () => {
    expect(svg).toContain("Last 12 Months");
    expect(svg).toContain(">1,801<");
    expect(svg).toContain(">799<");
    expect(svg).toContain(">Commits<");
    expect(svg).toContain(">304<");
    expect(svg).toContain(">139<");
    expect(svg).toContain(">15<");
    expect(svg).toContain("Pull requests");
  });
  it("has no rank, stars or contributed-to rows", () => {
    expect(svg).not.toMatch(/rank|star|contributed to/i);
  });
  it("is half width", () => {
    expect(svg).toContain(`width="375"`);
    expect(svg).toMatchSnapshot();
  });
});

describe("renderLanguagesCard", () => {
  it("shows language names and percentages", () => {
    const svg = renderLanguagesCard([
      { name: "TypeScript", color: "#3178c6", size: 7000 },
      { name: "Python", color: "#3572A5", size: 3000 },
    ]);
    expect(svg).toContain(">TypeScript<");
    expect(svg).toContain(">70.0%<");
    expect(svg).toContain(">30.0%<");
    expect(svg).toContain(`width="375"`);
    expect(svg).toMatchSnapshot();
  });
  it("right-aligns each column's percentages, the right column at the card's 24px inset", () => {
    const svg = renderLanguagesCard(
      ["A", "B", "C", "D", "E", "F"].map((name, i) => ({ name, color: "#123456", size: 60 - i * 10 })),
    );
    const pctX = [...svg.matchAll(/<text x="([\d.]+)" y="\d+" text-anchor="end"[^>]*>[\d.]+%</g)].map((m) =>
      Number(m[1]),
    );
    expect(pctX).toHaveLength(6);
    const [left, right] = [pctX.slice(0, 3), pctX.slice(3)];
    expect(new Set(left).size).toBe(1);
    expect(right).toEqual([375 - 24, 375 - 24, 375 - 24]);
    // The left column's percentages end before the right column's dots begin.
    const dotCx = [...svg.matchAll(/<circle cx="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(left[0]!).toBeLessThan(dotCx.at(-1)! - 5);
  });
  it("falls back to the accent colour for a language without one", () => {
    const svg = renderLanguagesCard([{ name: "Zig", color: null, size: 100 }]);
    expect(svg).toContain(`fill="${palette.accent}"`);
  });
  it("renders an empty list without NaN", () => {
    expect(renderLanguagesCard([])).not.toMatch(/NaN|Infinity|undefined/);
  });
});

describe("renderClaudeCard", () => {
  const days = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.parse("2026-09-14T00:00:00Z") + i * DAY_MS).toISOString().slice(0, 10),
    tokens: i === 29 ? 0 : (i + 1) * 1000,
  }));
  const svg = renderClaudeCard(days);

  it("renders one bar per day and the window total", () => {
    expect(svg.match(/class="bar"/g)).toHaveLength(30);
    expect(svg).toContain("435.0k tokens");
  });
  it("titles the card with the real window length and its dates", () => {
    expect(svg).toContain("Claude Code Usage — Last 30 Days");
    expect(svg).toContain(">2026-09-14<");
    expect(svg).toContain(">2026-10-13<");
  });
  it("fills usage bars with the accent and zero days with a surface-raised stub", () => {
    expect(svg).toContain(`fill="${palette.accent}"`);
    expect(svg).toContain(`fill="${palette.surfaceRaised}"`);
    expect(svg).toMatchSnapshot();
  });
  it("handles an all-zero window without NaN", () => {
    const zero = renderClaudeCard(days.map((d) => ({ ...d, tokens: 0 })));
    expect(zero).not.toMatch(/NaN|Infinity|undefined/);
    expect(zero).toContain("0 tokens");
  });
});
