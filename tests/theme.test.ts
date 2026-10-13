import { describe, expect, it } from "vitest";
import { cardFrame, escapeXml, fmtInt, fmtNum, palette } from "../src/theme.js";

describe("escapeXml", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml(`<a & "b">'`)).toBe("&lt;a &amp; &quot;b&quot;&gt;&apos;");
  });
});

describe("fmtNum", () => {
  it("passes small numbers through", () => {
    expect(fmtNum(999)).toBe("999");
  });
  it("abbreviates thousands to one decimal", () => {
    expect(fmtNum(1234)).toBe("1.2k");
    expect(fmtNum(12_345)).toBe("12.3k");
  });
  it("abbreviates millions", () => {
    expect(fmtNum(2_500_000)).toBe("2.5M");
  });
  it("abbreviates billions", () => {
    expect(fmtNum(2_993_900_000)).toBe("3.0B");
    expect(fmtNum(1_000_000_000)).toBe("1.0B");
  });
  it("promotes to the next unit when rounding would print 1000.0", () => {
    expect(fmtNum(999_999)).toBe("1.0M");
    expect(fmtNum(999_999_999)).toBe("1.0B");
  });
});

describe("fmtInt", () => {
  it("groups thousands with commas", () => {
    expect(fmtInt(1801)).toBe("1,801");
    expect(fmtInt(42)).toBe("42");
  });
});

describe("cardFrame", () => {
  it("wraps body in a card using the ui dark surface tokens", () => {
    const svg = cardFrame(450, 195, "Title <X>", "<g id=\"body\"/>");
    expect(svg).toContain(`width="450"`);
    expect(svg).toContain("Title &lt;X&gt;");
    expect(svg).toContain(`fill="${palette.surface}"`);
    expect(svg).toContain(`stroke="${palette.border}"`);
    expect(svg).toContain(`rx="8"`);
    expect(svg).toContain(`<g id="body"/>`);
    expect(svg).toMatchSnapshot();
  });
  it("uses the @crawfordyoung/ui dark token values", () => {
    expect(palette.surface).toBe("#18181b");
    expect(palette.surfaceRaised).toBe("#27272a");
    expect(palette.foreground).toBe("#fafafa");
    expect(palette.mutedForeground).toBe("#a1a1aa");
    expect(palette.accent).toBe("#10b981");
    expect(palette.accentSubtle).toBe("#022c22");
    expect(palette.accentActive).toBe("#6ee7b7");
  });
});
