import { describe, expect, it } from "vitest";
import { summarizeLanguages, toOverview, type LanguageRepo } from "../src/github.js";

function repo(pushedAt: string, langs: ReadonlyArray<readonly [string, number]>): LanguageRepo {
  return {
    pushedAt,
    languages: {
      edges: langs.map(([name, size]) => ({ size, node: { name, color: `#${name.length}00000` } })),
    },
  };
}

const SINCE = "2025-10-13T00:00:00Z";

describe("summarizeLanguages", () => {
  it("sums sizes across repos pushed since the cutoff", () => {
    const out = summarizeLanguages(
      [
        repo("2026-10-01T00:00:00Z", [["TypeScript", 600], ["Rust", 100]]),
        repo("2026-01-01T00:00:00Z", [["TypeScript", 400]]),
        repo("2024-03-01T00:00:00Z", [["Java", 99_999]]),
      ],
      SINCE,
    );
    expect(out.map((l) => [l.name, l.size])).toEqual([
      ["TypeScript", 1000],
      ["Rust", 100],
    ]);
  });
  it("excludes notebook, markup, styling and shell-script languages", () => {
    const excluded = [
      "Jupyter Notebook",
      "HTML",
      "CSS",
      "SCSS",
      "Shell",
      "PowerShell",
      "Dockerfile",
      "Makefile",
      "Batchfile",
    ];
    const out = summarizeLanguages(
      [repo("2026-10-01T00:00:00Z", [...excluded.map((n) => [n, 10_000] as const), ["GDScript", 5]])],
      SINCE,
    );
    expect(out.map((l) => l.name)).toEqual(["GDScript"]);
  });
  it("keeps the top six by size, keeping GitHub's colour", () => {
    const names = ["A", "BB", "CCC", "DDDD", "EEEEE", "FFFFFF", "GGGGGGG"];
    const out = summarizeLanguages(
      [repo("2026-10-01T00:00:00Z", names.map((n, i) => [n, (i + 1) * 10] as const))],
      SINCE,
    );
    expect(out).toHaveLength(6);
    expect(out[0]).toEqual({ name: "GGGGGGG", color: "#700000", size: 70 });
    expect(out.map((l) => l.name)).not.toContain("A");
  });
});

describe("toOverview", () => {
  it("reports commit contributions only, leaving private activity to the contributions total", () => {
    expect(
      toOverview({
        totalCommitContributions: 799,
        totalPullRequestContributions: 304,
        totalIssueContributions: 139,
        totalRepositoriesWithContributedCommits: 15,
        contributionCalendar: { totalContributions: 1801, weeks: [] },
      }),
    ).toEqual({ contributions: 1801, commits: 799, pullRequests: 304, issues: 139, repositories: 15 });
  });
});
