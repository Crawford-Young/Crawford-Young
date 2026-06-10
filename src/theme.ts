export const theme = {
  bg: "#1a1b27",
  border: "#2a2c3f",
  title: "#70a5fd",
  icon: "#bf91f3",
  text: "#38bdae",
  subtext: "#9aa5ce",
} as const;

export const FONT = `'Segoe UI', Ubuntu, sans-serif`;

const THOUSAND = 1_000;
const MILLION = 1_000_000;

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

export function fmtNum(n: number): string {
  if (n >= MILLION) return `${(n / MILLION).toFixed(1)}M`;
  if (n >= THOUSAND) return `${(n / THOUSAND).toFixed(1)}k`;
  return String(n);
}

export function cardFrame(
  width: number,
  height: number,
  title: string,
  body: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${escapeXml(title)}">
  <rect width="${width - 1}" height="${height - 1}" x="0.5" y="0.5" rx="6" fill="${theme.bg}" stroke="${theme.border}"/>
  <text x="24" y="33" fill="${theme.title}" font-family="${FONT}" font-size="16" font-weight="600">${escapeXml(title)}</text>
${body}
</svg>`;
}
