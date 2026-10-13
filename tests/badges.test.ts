import { describe, expect, it } from "vitest";
import { BADGES, renderBadge, textColorFor } from "../src/badges.js";

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

describe("textColorFor", () => {
  it("puts dark text on light backgrounds and light text on dark ones", () => {
    expect(textColorFor("#61DAFB")).toBe("#000000");
    expect(textColorFor("#000000")).toBe("#ffffff");
    expect(textColorFor("#3178C6")).toBe("#ffffff");
  });
});

describe("BADGES", () => {
  const files = BADGES.map((b) => b.file);

  it("defines the link badges plus the four stack groups, uniquely named", () => {
    expect(files).toEqual([
      "linkedin.svg",
      "portfolio.svg",
      "typescript.svg",
      "react.svg",
      "nextjs.svg",
      "tailwind.svg",
      "radix-ui.svg",
      "vitest.svg",
      "playwright.svg",
      "vercel.svg",
      "expo.svg",
      "react-native.svg",
      "tauri.svg",
      "rust.svg",
      "godot.svg",
      "gdscript.svg",
      "claude.svg",
      "python.svg",
      "nodejs.svg",
      "mongodb.svg",
      "git.svg",
    ]);
    expect(new Set(files).size).toBe(files.length);
  });
  it("drops JavaScript", () => {
    expect(files).not.toContain("javascript.svg");
  });
  it("renders every badge without NaN or undefined", () => {
    for (const b of BADGES) expect(renderBadge(b)).not.toMatch(/NaN|Infinity|undefined/);
  });
});
