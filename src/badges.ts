import {
  siGit,
  siJavascript,
  siNextdotjs,
  siNodedotjs,
  siPython,
  siReact,
  siTailwindcss,
  siTypescript,
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

/** Hand-drawn "in" glyph on 24x24 viewBox — simple-icons removed LinkedIn. */
const LINKEDIN_PATH =
  "M4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2.5 8.5h3V21h-3V8.5zm5.5 0h2.8v1.7h.1c.4-.7 1.4-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.8V21h-3v-6.6c0-1.6 0-3.6-2.2-3.6s-2.5 1.7-2.5 3.5V21H8V8.5z";

/** Vercel triangle on 24x24 viewBox. */
const VERCEL_PATH = "M12 2 22.5 20.5h-21z";

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

const WHITE = "#ffffff";

export const BADGES: readonly Badge[] = [
  { file: "linkedin.svg", label: "LinkedIn — Crawford Young", color: "#0a66c2", textColor: WHITE, iconPath: LINKEDIN_PATH },
  { file: "portfolio.svg", label: "Portfolio — crawfordyoung.vercel.app", color: "#6e40c9", textColor: WHITE, iconPath: VERCEL_PATH },
  { file: "typescript.svg", label: "TypeScript", color: "#3178c6", textColor: WHITE, iconPath: siTypescript.path },
  { file: "javascript.svg", label: "JavaScript", color: "#f7df1e", textColor: "#000000", iconPath: siJavascript.path },
  { file: "nextjs.svg", label: "Next.js", color: "#000000", textColor: WHITE, iconPath: siNextdotjs.path },
  { file: "react.svg", label: "React", color: "#61dafb", textColor: "#000000", iconPath: siReact.path },
  { file: "python.svg", label: "Python", color: "#3776ab", textColor: WHITE, iconPath: siPython.path },
  { file: "nodejs.svg", label: "Node.js", color: "#339933", textColor: WHITE, iconPath: siNodedotjs.path },
  { file: "tailwind.svg", label: "Tailwind CSS", color: "#06b6d4", textColor: WHITE, iconPath: siTailwindcss.path },
  { file: "git.svg", label: "Git", color: "#f05032", textColor: WHITE, iconPath: siGit.path },
];
