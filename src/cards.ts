import type { HeatmapLayout, Level } from "./calendar.js";
import { cardFrame, escapeXml, fmtInt, fmtNum, FONT, palette } from "./theme.js";

const FULL_WIDTH = 760;
const HALF_WIDTH = 375;
const HALF_HEIGHT = 195;
const PAD_X = 24;
const HEADER_Y = 33;

function text(
  x: number,
  y: number,
  content: string,
  opts: { size?: number; fill?: string; anchor?: "end" | "middle"; weight?: number } = {},
): string {
  const anchor = opts.anchor ? ` text-anchor="${opts.anchor}"` : "";
  const weight = opts.weight ? ` font-weight="${opts.weight}"` : "";
  return `  <text x="${x}" y="${y}"${anchor} fill="${opts.fill ?? palette.mutedForeground}" font-family="${FONT}" font-size="${opts.size ?? 13}"${weight}>${escapeXml(content)}</text>`;
}

// ── Contribution heatmap ────────────────────────────────────────────────────

/** Empty → surface-raised, then the ui accent ramp from subtle to active. Level 1 sits
 *  halfway between accent-subtle and accent: raw accent-subtle is too close to the empty cell. */
const LEVEL_COLORS: Readonly<Record<Level, string>> = {
  0: palette.surfaceRaised,
  1: "#097352",
  2: palette.accent,
  3: palette.accentHover,
  4: palette.accentActive,
};

const HEATMAP_HEIGHT = 200;
const CELL = 10;
const CELL_PITCH = 13;
const GRID_X = 50;
const GRID_Y = 72;
const MONTH_LABEL_Y = 62;
const LEGEND_Y = 176;
const LEGEND_RIGHT = FULL_WIDTH - PAD_X;
const LEGEND_MORE_WIDTH = 30;
const LEGEND_LABEL_GAP = 6;
const WEEKDAY_LABELS: ReadonlyArray<readonly [number, string]> = [
  [1, "Mon"],
  [3, "Wed"],
  [5, "Fri"],
];
const LEVELS: readonly Level[] = [0, 1, 2, 3, 4];

function cell(cls: string, x: number, y: number, level: Level): string {
  return `  <rect class="${cls}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${LEVEL_COLORS[level]}"/>`;
}

export function renderHeatmapCard(layout: HeatmapLayout): string {
  const subtitle = text(FULL_WIDTH - PAD_X, HEADER_Y, `${fmtInt(layout.total)} contributions in the last year`, {
    anchor: "end",
  });
  const months = layout.months.map((m) =>
    text(GRID_X + m.col * CELL_PITCH, MONTH_LABEL_Y, m.label, { size: 10 }),
  );
  const weekdays = WEEKDAY_LABELS.map(([row, label]) =>
    text(PAD_X, GRID_Y + row * CELL_PITCH + CELL - 1, label, { size: 10 }),
  );
  const cells = layout.weeks.flatMap((week, col) =>
    week.map((c) => cell("day", GRID_X + col * CELL_PITCH, GRID_Y + c.weekday * CELL_PITCH, c.level)),
  );
  const legendX = LEGEND_RIGHT - LEGEND_MORE_WIDTH - LEVELS.length * CELL_PITCH;
  const legendTextY = LEGEND_Y + CELL - 1;
  const legend = [
    text(legendX - LEGEND_LABEL_GAP, legendTextY, "Less", { size: 10, anchor: "end" }),
    ...LEVELS.map((level, i) => cell("legend", legendX + i * CELL_PITCH, LEGEND_Y, level)),
    text(LEGEND_RIGHT, legendTextY, "More", { size: 10, anchor: "end" }),
  ];
  const body = [subtitle, ...months, ...weekdays, ...cells, ...legend].join("\n");
  return cardFrame(FULL_WIDTH, HEATMAP_HEIGHT, "Contributions", body);
}

// ── Overview ────────────────────────────────────────────────────────────────

export interface OverviewData {
  readonly contributions: number;
  readonly commits: number;
  readonly pullRequests: number;
  readonly issues: number;
  readonly repositories: number;
}

const ROW_START_Y = 70;
const ROW_GAP = 26;

export function renderOverviewCard(d: OverviewData): string {
  const rows: ReadonlyArray<readonly [string, number]> = [
    ["Contributions", d.contributions],
    ["Commits", d.commits],
    ["Pull requests", d.pullRequests],
    ["Issues", d.issues],
    ["Active repositories", d.repositories],
  ];
  const body = rows
    .map(([label, value], i) => {
      const y = ROW_START_Y + i * ROW_GAP;
      const valueFill = i === 0 ? palette.accent : palette.foreground;
      return [
        text(PAD_X, y, label, { size: 14 }),
        text(HALF_WIDTH - PAD_X, y, fmtInt(value), { size: 14, fill: valueFill, anchor: "end", weight: 600 }),
      ].join("\n");
    })
    .join("\n");
  return cardFrame(HALF_WIDTH, HALF_HEIGHT, "Last 12 Months", body);
}

// ── Languages ───────────────────────────────────────────────────────────────

export interface LanguageSlice {
  readonly name: string;
  readonly color: string | null;
  readonly size: number;
}

const LANG_BAR_Y = 52;
const LANG_BAR_HEIGHT = 8;
const LANG_BAR_WIDTH = HALF_WIDTH - 2 * PAD_X;
const LANG_ROWS = 3;
const LANG_ROW_START_Y = 92;
const LANG_ROW_GAP = 32;
const LANG_COL_GAP = 18;
/** Two columns spanning the bar's width, so the right column's percentages end at the 24px inset. */
const LANG_COL_WIDTH = (LANG_BAR_WIDTH - LANG_COL_GAP) / 2;
const LANG_DOT_R = 5;
const LANG_NAME_OFFSET = 16;
const PERCENT = 100;

export function renderLanguagesCard(langs: readonly LanguageSlice[]): string {
  const total = langs.reduce((sum, l) => sum + l.size, 0) || 1;
  let x = PAD_X;
  const segments = langs.map((l) => {
    const w = (l.size / total) * LANG_BAR_WIDTH;
    const rect = `    <rect x="${x.toFixed(1)}" y="${LANG_BAR_Y}" width="${w.toFixed(1)}" height="${LANG_BAR_HEIGHT}" fill="${l.color ?? palette.accent}"/>`;
    x += w;
    return rect;
  });
  const bar = `  <clipPath id="lang-bar"><rect x="${PAD_X}" y="${LANG_BAR_Y}" width="${LANG_BAR_WIDTH}" height="${LANG_BAR_HEIGHT}" rx="${LANG_BAR_HEIGHT / 2}"/></clipPath>
  <rect x="${PAD_X}" y="${LANG_BAR_Y}" width="${LANG_BAR_WIDTH}" height="${LANG_BAR_HEIGHT}" rx="${LANG_BAR_HEIGHT / 2}" fill="${palette.surfaceRaised}"/>
  <g clip-path="url(#lang-bar)">
${segments.join("\n")}
  </g>`;
  const legend = langs.map((l, i) => {
    const colX = PAD_X + Math.floor(i / LANG_ROWS) * (LANG_COL_WIDTH + LANG_COL_GAP);
    const y = LANG_ROW_START_Y + (i % LANG_ROWS) * LANG_ROW_GAP;
    const pct = `${((l.size / total) * PERCENT).toFixed(1)}%`;
    return [
      `  <circle cx="${colX + LANG_DOT_R}" cy="${y - 4}" r="${LANG_DOT_R}" fill="${l.color ?? palette.accent}"/>`,
      text(colX + LANG_NAME_OFFSET, y, l.name, { fill: palette.foreground }),
      text(colX + LANG_COL_WIDTH, y, pct, { anchor: "end" }),
    ].join("\n");
  });
  return cardFrame(HALF_WIDTH, HALF_HEIGHT, "Top Languages", [bar, ...legend].join("\n"));
}

// ── Claude Code usage ───────────────────────────────────────────────────────

export interface ClaudeDay {
  readonly date: string;
  readonly tokens: number;
}

const CLAUDE_HEIGHT = 220;
const PLOT_LEFT = PAD_X;
const PLOT_RIGHT = FULL_WIDTH - PAD_X;
const PLOT_TOP = 60;
const PLOT_BOTTOM = 190;
const BAR_GAP = 4;
const MIN_BAR = 2;

export function renderClaudeCard(days: readonly ClaudeDay[]): string {
  const max = Math.max(1, ...days.map((d) => d.tokens));
  const total = days.reduce((sum, d) => sum + d.tokens, 0);
  const slot = (PLOT_RIGHT - PLOT_LEFT) / Math.max(1, days.length);
  const bars = days.map((d, i) => {
    const h = d.tokens > 0 ? Math.max(MIN_BAR, (d.tokens / max) * (PLOT_BOTTOM - PLOT_TOP)) : MIN_BAR;
    const fill = d.tokens > 0 ? palette.accent : palette.surfaceRaised;
    return `  <rect class="bar" x="${(PLOT_LEFT + i * slot).toFixed(1)}" y="${(PLOT_BOTTOM - h).toFixed(1)}" width="${(slot - BAR_GAP).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${fill}"/>`;
  });
  const labels = [
    text(PLOT_RIGHT, HEADER_Y, `${fmtNum(total)} tokens`, { anchor: "end" }),
    text(PLOT_LEFT, PLOT_BOTTOM + 18, days[0]?.date ?? "", { size: 11 }),
    text(PLOT_RIGHT, PLOT_BOTTOM + 18, days.at(-1)?.date ?? "", { size: 11, anchor: "end" }),
  ];
  return cardFrame(
    FULL_WIDTH,
    CLAUDE_HEIGHT,
    `Claude Code Usage — Last ${days.length} Days`,
    [...bars, ...labels].join("\n"),
  );
}
