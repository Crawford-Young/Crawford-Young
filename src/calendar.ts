export interface CalendarDay {
  readonly date: string;
  readonly count: number;
}

export type Level = 0 | 1 | 2 | 3 | 4;

export interface HeatmapCell extends CalendarDay {
  /** 0 = Sunday … 6 = Saturday — the cell's row. */
  readonly weekday: number;
  readonly level: Level;
}

export interface MonthLabel {
  readonly col: number;
  readonly label: string;
}

export interface HeatmapLayout {
  /** Sunday-start columns, oldest first; the last column ends on the last day. */
  readonly weeks: ReadonlyArray<readonly HeatmapCell[]>;
  readonly months: readonly MonthLabel[];
  readonly total: number;
}

const DAY_MS = 86_400_000;
const DAYS_PER_WEEK = 7;
const HEATMAP_WEEKS = 53;
/** A month label needs this many columns before the next one or it overlaps. */
const MIN_LABEL_GAP_COLS = 2;
const QUARTILES = [0.25, 0.5, 0.75] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Level per count: 0 for none, otherwise the quartile of the count among the
 * non-zero days (the busiest day is always level 4). Quartiles rather than a
 * linear max-scale keep bursty work readable — one 200-contribution day must
 * not wash every 1–5 day out to near-empty.
 */
export function contributionLevels(counts: readonly number[]): Level[] {
  const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (active.length === 0) return counts.map(() => 0);
  const [q1, q2, q3] = QUARTILES.map((p) => active[Math.ceil(p * active.length) - 1]!);
  const max = active.at(-1)!;
  return counts.map((c) => {
    if (c <= 0) return 0;
    if (c === max) return 4;
    if (c <= q1!) return 1;
    if (c <= q2!) return 2;
    if (c <= q3!) return 3;
    return 4;
  });
}

function isoAt(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function monthLabels(weeks: ReadonlyArray<readonly HeatmapCell[]>): MonthLabel[] {
  const starts: MonthLabel[] = [];
  let prevMonth = -1;
  weeks.forEach((week, col) => {
    const month = new Date(`${week[0]!.date}T00:00:00Z`).getUTCMonth();
    if (month !== prevMonth) starts.push({ col, label: MONTHS[month]! });
    prevMonth = month;
  });
  return starts.filter((m, i) => {
    const next = starts[i + 1];
    return !next || next.col - m.col >= MIN_LABEL_GAP_COLS;
  });
}

/** Lay out the `weeks` Sunday-start columns ending on the latest input date; missing dates count 0. */
export function layoutHeatmap(
  days: readonly CalendarDay[],
  weeks: number = HEATMAP_WEEKS,
): HeatmapLayout {
  if (days.length === 0) return { weeks: [], months: [], total: 0 };
  const counts = new Map(days.map((d) => [d.date, d.count]));
  const lastIso = days.reduce((max, d) => (d.date > max ? d.date : max), days[0]!.date);
  const endMs = Date.parse(`${lastIso}T00:00:00Z`);
  const endWeekday = new Date(endMs).getUTCDay();
  const startMs = endMs - (endWeekday + DAYS_PER_WEEK * (weeks - 1)) * DAY_MS;

  const shown: CalendarDay[] = [];
  for (let t = startMs; t <= endMs; t += DAY_MS) {
    const date = isoAt(t);
    shown.push({ date, count: counts.get(date) ?? 0 });
  }
  const levels = contributionLevels(shown.map((d) => d.count));
  const cells: HeatmapCell[] = shown.map((d, i) => ({
    ...d,
    weekday: i % DAYS_PER_WEEK,
    level: levels[i]!,
  }));

  const columns: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += DAYS_PER_WEEK) {
    columns.push(cells.slice(i, i + DAYS_PER_WEEK));
  }
  return {
    weeks: columns,
    months: monthLabels(columns),
    total: shown.reduce((sum, d) => sum + d.count, 0),
  };
}
