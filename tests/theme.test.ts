import { describe, expect, it } from "vitest";
import { cardFrame, escapeXml, fmtNum, theme } from "../src/theme.js";

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
});

describe("cardFrame", () => {
  it("wraps body in a themed SVG shell", () => {
    const svg = cardFrame(450, 195, "Title <X>", "<g id=\"body\"/>");
    expect(svg).toContain(`width="450"`);
    expect(svg).toContain("Title &lt;X&gt;");
    expect(svg).toContain(theme.bg);
    expect(svg).toContain(`<g id="body"/>`);
    expect(svg).toMatchSnapshot();
  });
});
