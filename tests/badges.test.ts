import { describe, expect, it } from "vitest";
import { BADGES, renderBadge } from "../src/badges.js";

describe("renderBadge", () => {
  it("renders label text and background color", () => {
    const svg = renderBadge({
      file: "x.svg",
      label: "TypeScript",
      color: "#3178c6",
      textColor: "#ffffff",
      iconPath: "M0 0h24v24H0z",
    });
    expect(svg).toContain("TypeScript");
    expect(svg).toContain("#3178c6");
    expect(svg).toContain("M0 0h24v24H0z");
    expect(svg).toMatchSnapshot();
  });
  it("renders without an icon when iconPath is omitted", () => {
    const svg = renderBadge({
      file: "y.svg",
      label: "Portfolio",
      color: "#6e40c9",
      textColor: "#ffffff",
    });
    expect(svg).not.toContain("<path");
  });
});

describe("BADGES", () => {
  it("defines all 10 badges with unique filenames", () => {
    expect(BADGES).toHaveLength(10);
    expect(new Set(BADGES.map((b) => b.file)).size).toBe(10);
  });
});
