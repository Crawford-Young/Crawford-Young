import type { DayPoint, Rank, StatsData } from "./cards.js";

export interface Streaks {
  readonly total: number;
  readonly current: number;
  readonly longest: number;
}

/** Days must be in ascending date order, last entry = today. */
export function computeStreaks(days: readonly DayPoint[]): Streaks {
  const total = days.reduce((sum, d) => sum + d.count, 0);
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  // Today with 0 contributions does not break the streak — start from the
  // last day with activity if that day is today or yesterday.
  let i = days.length - 1;
  if (i >= 0 && days[i]!.count === 0) i -= 1;
  for (; i >= 0 && days[i]!.count > 0; i -= 1) current += 1;
  return { total, current, longest };
}

const RANK_WEIGHTS = {
  commits: 1_000,
  prs: 100,
  issues: 50,
  stars: 100,
  contributedTo: 20,
} as const;
const RANK_S_SCORE = 4;
const MIN_RING_PCT = 0.05;

export function computeRank(s: StatsData): Rank {
  const score =
    s.commits / RANK_WEIGHTS.commits +
    s.prs / RANK_WEIGHTS.prs +
    s.issues / RANK_WEIGHTS.issues +
    s.stars / RANK_WEIGHTS.stars +
    s.contributedTo / RANK_WEIGHTS.contributedTo;
  const pct = Math.max(MIN_RING_PCT, Math.min(1, score / RANK_S_SCORE));
  let letter = "B";
  if (score >= 4) letter = "S";
  else if (score >= 3) letter = "A+";
  else if (score >= 2) letter = "A";
  else if (score >= 1) letter = "B+";
  return { letter, pct };
}

const API_URL = "https://api.github.com/graphql";
export const LOGIN = "Crawford-Young";
const TOP_LANGUAGES = 6;
const ACTIVITY_DAYS = 31;

async function gql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
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

interface ProfileQuery {
  user: {
    createdAt: string;
    pullRequests: { totalCount: number };
    issues: { totalCount: number };
    repositoriesContributedTo: { totalCount: number };
    repositories: {
      nodes: ReadonlyArray<{
        stargazerCount: number;
        languages: {
          edges: ReadonlyArray<{
            size: number;
            node: { name: string; color: string | null };
          }>;
        };
      }>;
    };
  };
}

const PROFILE_QUERY = `query($login: String!) {
  user(login: $login) {
    createdAt
    pullRequests { totalCount }
    issues { totalCount }
    repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, REPOSITORY]) { totalCount }
    repositories(ownerAffiliations: OWNER, first: 100, isFork: false) {
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

interface CalendarQuery {
  user: {
    contributionsCollection: {
      totalCommitContributions: number;
      restrictedContributionsCount: number;
      contributionCalendar: {
        weeks: ReadonlyArray<{
          contributionDays: ReadonlyArray<{ date: string; contributionCount: number }>;
        }>;
      };
    };
  };
}

const CALENDAR_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

export interface GithubData {
  readonly stats: StatsData;
  readonly languages: ReadonlyArray<{ name: string; color: string | null; size: number }>;
  readonly allDays: readonly DayPoint[];
}

export async function fetchGithubData(token: string): Promise<GithubData> {
  const profile = (await gql<ProfileQuery>(token, PROFILE_QUERY, { login: LOGIN })).user;

  const langTotals = new Map<string, { color: string | null; size: number }>();
  let stars = 0;
  for (const repo of profile.repositories.nodes) {
    stars += repo.stargazerCount;
    for (const edge of repo.languages.edges) {
      const prev = langTotals.get(edge.node.name);
      langTotals.set(edge.node.name, {
        color: edge.node.color,
        size: (prev?.size ?? 0) + edge.size,
      });
    }
  }
  const languages = [...langTotals.entries()]
    .map(([name, v]) => ({ name, color: v.color, size: v.size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, TOP_LANGUAGES);

  // GraphQL caps contributionsCollection at 1 year — walk from account creation.
  const allDays: DayPoint[] = [];
  let commits = 0;
  const created = new Date(profile.createdAt);
  const now = new Date();
  for (let from = created; from < now; ) {
    const to = new Date(Math.min(
      now.getTime(),
      new Date(from).setFullYear(from.getFullYear() + 1),
    ));
    const col = (
      await gql<CalendarQuery>(token, CALENDAR_QUERY, {
        login: LOGIN,
        from: from.toISOString(),
        to: to.toISOString(),
      })
    ).user.contributionsCollection;
    commits += col.totalCommitContributions + col.restrictedContributionsCount;
    for (const week of col.contributionCalendar.weeks) {
      for (const d of week.contributionDays) {
        if (allDays.at(-1)?.date !== d.date) {
          allDays.push({ date: d.date, count: d.contributionCount });
        }
      }
    }
    from = to;
  }

  return {
    stats: {
      stars,
      commits,
      prs: profile.pullRequests.totalCount,
      issues: profile.issues.totalCount,
      contributedTo: profile.repositoriesContributedTo.totalCount,
    },
    languages,
    allDays,
  };
}

export function lastNDays(days: readonly DayPoint[], n: number = ACTIVITY_DAYS): readonly DayPoint[] {
  return days.slice(-n);
}
