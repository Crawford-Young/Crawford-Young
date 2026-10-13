import type { CalendarDay } from "./calendar.js";
import type { LanguageSlice, OverviewData } from "./cards.js";

const API_URL = "https://api.github.com/graphql";
const LOGIN = "Crawford-Young";
const TOP_LANGUAGES = 6;
const LANGUAGE_WINDOW_DAYS = 365;
const DAY_MS = 86_400_000;

/** Markup, styling, notebooks and build/shell glue — they say little about what the code is written in. */
const EXCLUDED_LANGUAGES: ReadonlySet<string> = new Set([
  "Jupyter Notebook",
  "HTML",
  "CSS",
  "SCSS",
  "Shell",
  "PowerShell",
  "Dockerfile",
  "Makefile",
  "Batchfile",
]);

export interface LanguageRepo {
  readonly pushedAt: string;
  readonly languages: {
    readonly edges: ReadonlyArray<{
      readonly size: number;
      readonly node: { readonly name: string; readonly color: string | null };
    }>;
  };
}

export interface ContributionsCollection {
  readonly totalCommitContributions: number;
  readonly totalPullRequestContributions: number;
  readonly totalIssueContributions: number;
  readonly totalRepositoriesWithContributedCommits: number;
  readonly contributionCalendar: {
    readonly totalContributions: number;
    readonly weeks: ReadonlyArray<{
      readonly contributionDays: ReadonlyArray<{ readonly date: string; readonly contributionCount: number }>;
    }>;
  };
}

interface ProfileQuery {
  readonly user: {
    readonly contributionsCollection: ContributionsCollection;
    readonly repositories: { readonly nodes: readonly LanguageRepo[] };
  };
}

/** Public data only, so the Action's own GITHUB_TOKEN can read it. The default
 *  contributionsCollection window is the last year, matching the profile calendar. */
const PROFILE_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        pushedAt
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

async function gql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    data?: T;
    errors?: ReadonlyArray<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(`GraphQL: ${json.errors[0]!.message}`);
  if (!json.data) throw new Error("GraphQL: empty data");
  return json.data;
}

/** Top languages by bytes across repos pushed at or after `sinceIso`, minus the excluded set. */
export function summarizeLanguages(
  repos: readonly LanguageRepo[],
  sinceIso: string,
  top: number = TOP_LANGUAGES,
): LanguageSlice[] {
  const totals = new Map<string, { color: string | null; size: number }>();
  for (const repo of repos) {
    if (repo.pushedAt < sinceIso) continue;
    for (const { size, node } of repo.languages.edges) {
      if (EXCLUDED_LANGUAGES.has(node.name)) continue;
      const prev = totals.get(node.name);
      totals.set(node.name, { color: node.color, size: (prev?.size ?? 0) + size });
    }
  }
  return [...totals.entries()]
    .map(([name, v]) => ({ name, color: v.color, size: v.size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, top);
}

/** Commits only: private (restricted) activity is already inside the contributions total. */
export function toOverview(c: ContributionsCollection): OverviewData {
  return {
    contributions: c.contributionCalendar.totalContributions,
    commits: c.totalCommitContributions,
    pullRequests: c.totalPullRequestContributions,
    issues: c.totalIssueContributions,
    repositories: c.totalRepositoriesWithContributedCommits,
  };
}

export interface GithubData {
  readonly days: readonly CalendarDay[];
  readonly overview: OverviewData;
  readonly languages: readonly LanguageSlice[];
}

export async function fetchGithubData(token: string, now: Date = new Date()): Promise<GithubData> {
  const { contributionsCollection: col, repositories } = (
    await gql<ProfileQuery>(token, PROFILE_QUERY, { login: LOGIN })
  ).user;
  const since = new Date(now.getTime() - LANGUAGE_WINDOW_DAYS * DAY_MS).toISOString();
  return {
    days: col.contributionCalendar.weeks.flatMap((w) =>
      w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })),
    ),
    overview: toOverview(col),
    languages: summarizeLanguages(repositories.nodes, since),
  };
}
