import { describe, expect, it } from "vitest";
import {
  renderActivityCard,
  renderClaudeCard,
  renderLanguagesCard,
  renderStatsCard,
  renderStreakCard,
} from "../src/cards.js";

const stats = { stars: 120, commits: 2300, prs: 87, issues: 14, contributedTo: 9 };
const rank = { letter: "A", pct: 0.62 };

describe("renderStatsCard", () => {
  it("shows every stat row and the rank letter", () => {
    const svg = renderStatsCard(stats, rank);
    expect(svg).toContain("Total Stars Earned");
    expect(svg).toContain("2.3k");
    expect(svg).toContain(">A<");
    expect(svg).toMatchSnapshot();
  });
});

describe("renderLanguagesCard", () => {
  it("shows language names and percentages", () => {
    const svg = renderLanguagesCard([
      { name: "TypeScript", color: "#3178c6", size: 7000 },
      { name: "Python", color: "#3572A5", size: 3000 },
    ]);
    expect(svg).toContain("TypeScript");
    expect(svg).toContain("70.0%");
    expect(svg).toContain("30.0%");
    expect(svg).toMatchSnapshot();
  });
  it("defaults missing language color to theme text color", () => {
    const svg = renderLanguagesCard([{ name: "Zig", color: null, size: 100 }]);
    expect(svg).toContain("Zig");
  });
});

const days31 = Array.from({ length: 31 }, (_, i) => ({
  date: `2026-05-${String(i + 1).padStart(2, "0")}`,
  count: i % 7,
}));

describe("renderStreakCard", () => {
  it("shows totals and streak numbers", () => {
    const svg = renderStreakCard({ total: 1842, current: 12, longest: 41 });
    expect(svg).toContain("1.8k");
    expect(svg).toContain(">12<");
    expect(svg).toContain(">41<");
    expect(svg).toMatchSnapshot();
  });
});

describe("renderActivityCard", () => {
  it("renders an area path spanning the days", () => {
    const svg = renderActivityCard(days31);
    expect(svg).toContain("<path");
    expect(svg).toMatchSnapshot();
  });
  it("handles an all-zero month without NaN", () => {
    const svg = renderActivityCard(days31.map((d) => ({ ...d, count: 0 })));
    expect(svg).not.toContain("NaN");
  });
});

describe("renderClaudeCard", () => {
  it("renders one bar per day and the 30-day total", () => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, "0")}`,
      tokens: (i + 1) * 1000,
    }));
    const svg = renderClaudeCard(days);
    expect(svg.match(/<rect class="bar"/g)).toHaveLength(30);
    expect(svg).toContain("465.0k tokens / 30 days");
    expect(svg).toMatchSnapshot();
  });
  it("handles zero usage without NaN", () => {
    const svg = renderClaudeCard([{ date: "2026-06-01", tokens: 0 }]);
    expect(svg).not.toContain("NaN");
  });
});
