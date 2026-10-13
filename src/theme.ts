/** @crawfordyoung/ui dark tokens (component-library src/styles/tokens.css, `.dark`). */
export const palette = {
  surface: "#18181b",
  surfaceRaised: "#27272a",
  border: "#27272a",
  foreground: "#fafafa",
  mutedForeground: "#a1a1aa",
  accent: "#10b981",
  accentHover: "#34d399",
  accentActive: "#6ee7b7",
  accentSubtle: "#022c22",
} as const;

export const FONT = `-apple-system, 'Segoe UI', system-ui, sans-serif`;

const CARD_RADIUS = 8;
const UNITS: ReadonlyArray<readonly [number, string]> = [
  [1_000_000_000, "B"],
  [1_000_000, "M"],
  [1_000, "k"],
];

export function escapeXml(s: string): string {
  const map: Record<string, string> = {
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return s.replace(/[<>&"']/g, (c) => map[c] ?? c);
}

/** Compact one-decimal form (1.2k, 3.0B); promotes 999_999 to 1.0M rather than printing 1000.0k. */
export function fmtNum(n: number): string {
  const idx = UNITS.findIndex(([size]) => n >= size);
  if (idx === -1) return String(n);
  const [size, suffix] = UNITS[idx]!;
  const larger = UNITS[idx - 1];
  if (larger && (n / size).toFixed(1) === "1000.0") return `${(n / larger[0]).toFixed(1)}${larger[1]}`;
  return `${(n / size).toFixed(1)}${suffix}`;
}

export function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

export function cardFrame(width: number, height: number, title: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${escapeXml(title)}">
  <rect width="${width - 1}" height="${height - 1}" x="0.5" y="0.5" rx="${CARD_RADIUS}" fill="${palette.surface}" stroke="${palette.border}"/>
  <text x="24" y="33" fill="${palette.foreground}" font-family="${FONT}" font-size="16" font-weight="600">${escapeXml(title)}</text>
${body}
</svg>`;
}
