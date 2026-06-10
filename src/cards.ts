import { cardFrame, escapeXml, fmtNum, FONT, theme } from "./theme.js";

export interface StatsData {
  readonly stars: number;
  readonly commits: number;
  readonly prs: number;
  readonly issues: number;
  readonly contributedTo: number;
}

export interface Rank {
  readonly letter: string;
  readonly pct: number;
}

const ROW_START_Y = 66;
const ROW_GAP = 25;
const RING_CIRCUMFERENCE = 251; // 2 * PI * 40

export function renderStatsCard(d: StatsData, rank: Rank): string {
  const rows: ReadonlyArray<readonly [string, number]> = [
    ["Total Stars Earned", d.stars],
    ["Total Commits", d.commits],
    ["Total PRs", d.prs],
    ["Total Issues", d.issues],
    ["Contributed to", d.contributedTo],
  ];
  const body = rows
    .map(([label, value], i) => {
      const y = ROW_START_Y + i * ROW_GAP;
      return `  <text x="24" y="${y}" fill="${theme.text}" font-family="${FONT}" font-size="14">${escapeXml(label)}:</text>
  <text x="230" y="${y}" fill="${theme.text}" font-family="${FONT}" font-size="14" font-weight="600">${fmtNum(value)}</text>`;
    })
    .join("\n");
  const dash = (rank.pct * RING_CIRCUMFERENCE).toFixed(0);
  const ring = `  <circle cx="385" cy="120" r="40" stroke="${theme.border}" stroke-width="6"/>
  <circle cx="385" cy="120" r="40" stroke="${theme.title}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${dash} ${RING_CIRCUMFERENCE}" transform="rotate(-90 385 120)"/>
  <text x="385" y="128" text-anchor="middle" fill="${theme.title}" font-family="${FONT}" font-size="22" font-weight="700">${escapeXml(rank.letter)}</text>`;
  return cardFrame(450, 195, "Crawford Young's GitHub Stats", `${body}\n${ring}`);
}

export interface LanguageSlice {
  readonly name: string;
  readonly color: string | null;
  readonly size: number;
}

const LANG_BAR_X = 24;
const LANG_BAR_WIDTH = 252;
const LANG_LEGEND_START_Y = 80;
const LANG_LEGEND_GAP = 22;

export function renderLanguagesCard(langs: readonly LanguageSlice[]): string {
  const total = langs.reduce((sum, l) => sum + l.size, 0) || 1;
  let x = LANG_BAR_X;
  const bar = langs
    .map((l) => {
      const w = (l.size / total) * LANG_BAR_WIDTH;
      const rect = `  <rect x="${x.toFixed(1)}" y="52" width="${w.toFixed(1)}" height="8" fill="${l.color ?? theme.text}"/>`;
      x += w;
      return rect;
    })
    .join("\n");
  const legend = langs
    .map((l, i) => {
      const y = LANG_LEGEND_START_Y + i * LANG_LEGEND_GAP;
      const pct = ((l.size / total) * 100).toFixed(1);
      return `  <circle cx="29" cy="${y - 4}" r="5" fill="${l.color ?? theme.text}"/>
  <text x="42" y="${y}" fill="${theme.text}" font-family="${FONT}" font-size="13">${escapeXml(l.name)} ${pct}%</text>`;
    })
    .join("\n");
  return cardFrame(300, 90 + langs.length * LANG_LEGEND_GAP, "Most Used Languages", `${bar}\n${legend}`);
}

export interface StreakData {
  readonly total: number;
  readonly current: number;
  readonly longest: number;
}

export function renderStreakCard(s: StreakData): string {
  const cols: ReadonlyArray<readonly [string, string, number]> = [
    [fmtNum(s.total), "Total Contributions", 85],
    [String(s.current), "Current Streak", 225],
    [String(s.longest), "Longest Streak", 365],
  ];
  const body = cols
    .map(
      ([value, label, cx]) => `  <text x="${cx}" y="95" text-anchor="middle" fill="${theme.title}" font-family="${FONT}" font-size="28" font-weight="700">${value}</text>
  <text x="${cx}" y="125" text-anchor="middle" fill="${theme.subtext}" font-family="${FONT}" font-size="13">${label}</text>`,
    )
    .join("\n");
  const dividers = `  <line x1="155" y1="60" x2="155" y2="140" stroke="${theme.border}"/>
  <line x1="295" y1="60" x2="295" y2="140" stroke="${theme.border}"/>`;
  return cardFrame(450, 170, "Contribution Streak", `${body}\n${dividers}`);
}

export interface DayPoint {
  readonly date: string;
  readonly count: number;
}

const GRAPH_WIDTH = 760;
const GRAPH_HEIGHT = 220;
const PLOT_LEFT = 24;
const PLOT_RIGHT = 736;
const PLOT_TOP = 60;
const PLOT_BOTTOM = 190;

export function renderActivityCard(days: readonly DayPoint[]): string {
  const max = Math.max(1, ...days.map((d) => d.count));
  const step = (PLOT_RIGHT - PLOT_LEFT) / Math.max(1, days.length - 1);
  const pts = days.map((d, i) => {
    const px = PLOT_LEFT + i * step;
    const py = PLOT_BOTTOM - (d.count / max) * (PLOT_BOTTOM - PLOT_TOP);
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  });
  const area =
    pts.length > 0
      ? `M${PLOT_LEFT},${PLOT_BOTTOM} L${pts.join(" L")} L${PLOT_RIGHT},${PLOT_BOTTOM} Z`
      : `M${PLOT_LEFT},${PLOT_BOTTOM} L${PLOT_RIGHT},${PLOT_BOTTOM} Z`;
  const linePts = pts.length > 0 ? pts : [`${PLOT_LEFT},${PLOT_BOTTOM}`, `${PLOT_RIGHT},${PLOT_BOTTOM}`];
  const body = `  <path d="${area}" fill="${theme.title}" fill-opacity="0.25"/>
  <polyline points="${linePts.join(" ")}" stroke="${theme.title}" stroke-width="2" fill="none"/>
  <text x="${PLOT_LEFT}" y="${PLOT_BOTTOM + 18}" fill="${theme.subtext}" font-family="${FONT}" font-size="11">${days[0]?.date ?? ""}</text>
  <text x="${PLOT_RIGHT}" y="${PLOT_BOTTOM + 18}" text-anchor="end" fill="${theme.subtext}" font-family="${FONT}" font-size="11">${days.at(-1)?.date ?? ""}</text>`;
  return cardFrame(GRAPH_WIDTH, GRAPH_HEIGHT, "Contribution Activity — Last 31 Days", body);
}

export interface ClaudeDay {
  readonly date: string;
  readonly tokens: number;
}

const BAR_GAP = 4;

export function renderClaudeCard(days: readonly ClaudeDay[]): string {
  const max = Math.max(1, ...days.map((d) => d.tokens));
  const total = days.reduce((sum, d) => sum + d.tokens, 0);
  const slot = (PLOT_RIGHT - PLOT_LEFT) / Math.max(1, days.length);
  const bars = days
    .map((d, i) => {
      const h = (d.tokens / max) * (PLOT_BOTTOM - PLOT_TOP);
      const px = PLOT_LEFT + i * slot;
      const py = PLOT_BOTTOM - h;
      return `  <rect class="bar" x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${(slot - BAR_GAP).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${theme.icon}"/>`;
    })
    .join("\n");
  const subtitle = `  <text x="${PLOT_RIGHT}" y="33" text-anchor="end" fill="${theme.subtext}" font-family="${FONT}" font-size="13">${fmtNum(total)} tokens / ${days.length} days</text>
  <text x="${PLOT_LEFT}" y="${PLOT_BOTTOM + 18}" fill="${theme.subtext}" font-family="${FONT}" font-size="11">${days[0]?.date ?? ""}</text>
  <text x="${PLOT_RIGHT}" y="${PLOT_BOTTOM + 18}" text-anchor="end" fill="${theme.subtext}" font-family="${FONT}" font-size="11">${days.at(-1)?.date ?? ""}</text>`;
  return cardFrame(GRAPH_WIDTH, GRAPH_HEIGHT, "Claude Code Usage — Last 30 Days", `${bars}\n${subtitle}`);
}
