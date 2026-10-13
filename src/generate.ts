import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BADGES, renderBadge } from "./badges.js";
import { layoutHeatmap } from "./calendar.js";
import { renderClaudeCard, renderHeatmapCard, renderLanguagesCard, renderOverviewCard } from "./cards.js";
import type { UsageByDate } from "./claude.js";
import { claudeWindowEnd, toClaudeDays } from "./claude.js";
import { fetchGithubData } from "./github.js";

const ASSETS = "assets";
const BADGES_DIR = join(ASSETS, "badges");
const USAGE_FILE = join("data", "claude-usage.json");
const CLAUDE_CARD_DAYS = 30;

// The Action's own GITHUB_TOKEN: every query is public profile data, so no PAT to expire.
const token = process.env["GITHUB_TOKEN"];
if (!token) {
  console.error("GITHUB_TOKEN is not set");
  process.exit(1);
}

const now = new Date();
const data = await fetchGithubData(token, now);
mkdirSync(BADGES_DIR, { recursive: true });

writeFileSync(join(ASSETS, "heatmap.svg"), renderHeatmapCard(layoutHeatmap(data.days)));
writeFileSync(join(ASSETS, "overview.svg"), renderOverviewCard(data.overview));
writeFileSync(join(ASSETS, "languages.svg"), renderLanguagesCard(data.languages));

if (existsSync(USAGE_FILE)) {
  const usage = JSON.parse(readFileSync(USAGE_FILE, "utf8")) as UsageByDate;
  const days = toClaudeDays(usage, CLAUDE_CARD_DAYS, claudeWindowEnd(now));
  writeFileSync(join(ASSETS, "claude.svg"), renderClaudeCard(days));
} else {
  console.warn(`${USAGE_FILE} missing — skipping claude.svg`);
}

for (const badge of BADGES) {
  writeFileSync(join(BADGES_DIR, badge.file), renderBadge(badge));
}
console.log("assets written");
