import { describe, expect, it } from "vitest";
import { renderLanguagesCard, renderStatsCard } from "../src/cards.js";

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
