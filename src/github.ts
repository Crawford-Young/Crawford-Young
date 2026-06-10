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
