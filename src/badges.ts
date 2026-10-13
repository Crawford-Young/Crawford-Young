import {
  type SimpleIcon,
  siClaude,
  siExpo,
  siGit,
  siGodotengine,
  siMongodb,
  siNextdotjs,
  siNodedotjs,
  siPython,
  siRadixui,
  siReact,
  siRust,
  siTailwindcss,
  siTauri,
  siTypescript,
  siVercel,
  siVitest,
} from "simple-icons";
import { escapeXml, FONT } from "./theme.js";

export interface Badge {
  readonly file: string;
  readonly label: string;
  readonly color: string;
  readonly textColor: string;
  readonly iconPath?: string;
}

const BADGE_HEIGHT = 20;
const ICON_SIZE = 14;
const ICON_X = 5;
const TEXT_PAD = 5;
const CHAR_WIDTH = 6.5;

const WHITE = "#ffffff";
const BLACK = "#000000";
/** YIQ perceived-brightness weights (per mille) and the cut-off above which text goes black.
 *  Biased toward white so mid-tone brands (TypeScript, Tailwind, Node.js) keep their usual white label. */
const YIQ_WEIGHTS = [299, 587, 114] as const;
const YIQ_SCALE = 1000;
const LIGHT_BACKGROUND = 0.65;
const CHANNEL_MAX = 255;
const HEX_RADIX = 16;

/** Hand-drawn "in" glyph on 24x24 viewBox — simple-icons removed LinkedIn. */
const LINKEDIN_PATH =
  "M4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2.5 8.5h3V21h-3V8.5zm5.5 0h2.8v1.7h.1c.4-.7 1.4-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.8V21h-3v-6.6c0-1.6 0-3.6-2.2-3.6s-2.5 1.7-2.5 3.5V21H8V8.5z";

/** Black text on light `#rrggbb` backgrounds, white otherwise. */
export function textColorFor(hex: string): string {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), HEX_RADIX));
  const brightness =
    channels.reduce((sum, c, i) => sum + c * YIQ_WEIGHTS[i]!, 0) / YIQ_SCALE / CHANNEL_MAX;
  return brightness > LIGHT_BACKGROUND ? BLACK : WHITE;
}

export function renderBadge(b: Badge): string {
  const hasIcon = b.iconPath !== undefined;
  const textX = hasIcon ? ICON_X + ICON_SIZE + TEXT_PAD : TEXT_PAD + 2;
  const width = Math.ceil(textX + b.label.length * CHAR_WIDTH + TEXT_PAD + 2);
  const icon = hasIcon
    ? `  <g transform="translate(${ICON_X}, 3) scale(${ICON_SIZE / 24})"><path d="${b.iconPath}" fill="${b.textColor}"/></g>\n`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BADGE_HEIGHT}" role="img" aria-label="${escapeXml(b.label)}">
  <rect width="${width}" height="${BADGE_HEIGHT}" fill="${b.color}"/>
${icon}  <text x="${textX}" y="14" fill="${b.textColor}" font-family="${FONT}" font-size="11">${escapeXml(b.label)}</text>
</svg>`;
}

/** Badge in the icon's own brand colour. */
function brand(file: string, label: string, icon: SimpleIcon): Badge {
  const color = `#${icon.hex}`;
  return { file, label, color, textColor: textColorFor(color), iconPath: icon.path };
}

/** Text-only badge for tools simple-icons has no glyph for (checked against v15 and v16). */
function textOnly(file: string, label: string, color: string): Badge {
  return { file, label, color, textColor: textColorFor(color) };
}

const PLAYWRIGHT_GREEN = "#2ead33";
const GDSCRIPT_BLUE = "#355570";

/** Order = README order: links, then Web · Apps · Games · AI + tools. */
export const BADGES: readonly Badge[] = [
  { file: "linkedin.svg", label: "LinkedIn — Crawford Young", color: "#0a66c2", textColor: WHITE, iconPath: LINKEDIN_PATH },
  { file: "portfolio.svg", label: "Portfolio — crawfordyoung.dev", color: "#6e40c9", textColor: WHITE, iconPath: siVercel.path },
  // Web
  brand("typescript.svg", "TypeScript", siTypescript),
  brand("react.svg", "React", siReact),
  brand("nextjs.svg", "Next.js", siNextdotjs),
  brand("tailwind.svg", "Tailwind CSS", siTailwindcss),
  brand("radix-ui.svg", "Radix UI", siRadixui),
  brand("vitest.svg", "Vitest", siVitest),
  textOnly("playwright.svg", "Playwright", PLAYWRIGHT_GREEN),
  brand("vercel.svg", "Vercel", siVercel),
  // Apps
  brand("expo.svg", "Expo", siExpo),
  brand("react-native.svg", "React Native", siReact),
  brand("tauri.svg", "Tauri", siTauri),
  brand("rust.svg", "Rust", siRust),
  // Games
  brand("godot.svg", "Godot", siGodotengine),
  textOnly("gdscript.svg", "GDScript", GDSCRIPT_BLUE),
  // AI + tools
  brand("claude.svg", "Claude", siClaude),
  brand("python.svg", "Python", siPython),
  brand("nodejs.svg", "Node.js", siNodedotjs),
  brand("mongodb.svg", "MongoDB", siMongodb),
  brand("git.svg", "Git", siGit),
];
