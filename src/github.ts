import type { DayPoint, LocDay, Rank, StatsData } from "./cards.js";

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
        const last = allDays.at(-1);
        if (last?.date === d.date) {
          // Day split across two windows — sum the partial counts.
          allDays[allDays.length - 1] = { date: d.date, count: last.count + d.contributionCount };
        } else {
          allDays.push({ date: d.date, count: d.contributionCount });
        }
      }
    }
    // `to` is inclusive — start next window 1ms later to avoid double-counting.
    from = new Date(to.getTime() + 1);
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

export interface LocCommit {
  readonly committedDate: string;
  readonly additions: number;
  readonly deletions: number;
  readonly parentCount: number;
}

const LOC_CARD_DAYS = 31;
const MS_PER_DAY = 86_400_000;

/** Sum additions+deletions per UTC date; zero-fill; return the last `days` days ending at `todayIso`. */
export function bucketLocByDay(
  commits: readonly LocCommit[],
  todayIso: string,
  days: number = LOC_CARD_DAYS,
): readonly LocDay[] {
  const totals = new Map<string, number>();
  for (const c of commits) {
    if (c.parentCount > 1) continue;
    const date = c.committedDate.slice(0, 10);
    totals.set(date, (totals.get(date) ?? 0) + c.additions + c.deletions);
  }
  const end = new Date(`${todayIso}T00:00:00Z`).getTime();
  const out: LocDay[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(end - i * MS_PER_DAY).toISOString().slice(0, 10);
    out.push({ date, changed: totals.get(date) ?? 0 });
  }
  return out;
}

const LOC_WINDOW_DAYS = 35;
const HISTORY_PAGE_SIZE = 100;

/** Local git identities whose commits count as the user's — matched by author email
 *  because historical commits are not linked to the GitHub account. */
const AUTHOR_EMAILS = [
  "dev@example.com",
  "143555043+Crawford-Young@users.noreply.github.com",
];

interface HistoryPage {
  nodes: ReadonlyArray<{
    committedDate: string;
    additions: number;
    deletions: number;
    parents: { totalCount: number };
  }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

const HISTORY_FIELDS = `nodes { committedDate additions deletions parents(first: 1) { totalCount } }
                pageInfo { hasNextPage endCursor }`;

interface LocReposQuery {
  user: {
    repositories: {
      nodes: ReadonlyArray<{
        name: string;
        defaultBranchRef: { target: { history?: HistoryPage } | null } | null;
      }>;
    };
  };
}

const LOC_REPOS_QUERY = `query($login: String!, $since: GitTimestamp!, $emails: [String!]!) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, first: 100, isFork: false) {
      nodes {
        name
        defaultBranchRef {
          target {
            ... on Commit {
              history(since: $since, author: { emails: $emails }, first: ${HISTORY_PAGE_SIZE}) {
                ${HISTORY_FIELDS}
              }
            }
          }
        }
      }
    }
  }
}`;

interface LocHistoryPageQuery {
  repository: {
    defaultBranchRef: { target: { history?: HistoryPage } | null } | null;
  };
}

const LOC_HISTORY_PAGE_QUERY = `query($login: String!, $name: String!, $since: GitTimestamp!, $emails: [String!]!, $after: String!) {
  repository(owner: $login, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(since: $since, author: { emails: $emails }, first: ${HISTORY_PAGE_SIZE}, after: $after) {
            ${HISTORY_FIELDS}
          }
        }
      }
    }
  }
}`;

export async function fetchLocByDay(token: string): Promise<readonly LocDay[]> {
  const since = new Date(Date.now() - LOC_WINDOW_DAYS * MS_PER_DAY).toISOString();
  const commits: LocCommit[] = [];

  const repos = (
    await gql<LocReposQuery>(token, LOC_REPOS_QUERY, {
      login: LOGIN,
      since,
      emails: AUTHOR_EMAILS,
    })
  ).user.repositories.nodes;

  for (const repo of repos) {
    let page = repo.defaultBranchRef?.target?.history;
    while (page) {
      for (const c of page.nodes) {
        commits.push({
          committedDate: c.committedDate,
          additions: c.additions,
          deletions: c.deletions,
          parentCount: c.parents.totalCount,
        });
      }
      if (!page.pageInfo.hasNextPage || page.pageInfo.endCursor === null) break;
      page = (
        await gql<LocHistoryPageQuery>(token, LOC_HISTORY_PAGE_QUERY, {
          login: LOGIN,
          name: repo.name,
          since,
          emails: AUTHOR_EMAILS,
          after: page.pageInfo.endCursor,
        })
      ).repository.defaultBranchRef?.target?.history;
    }
  }

  return bucketLocByDay(commits, new Date().toISOString().slice(0, 10));
}
