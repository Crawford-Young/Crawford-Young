import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BADGES, renderBadge } from "./badges.js";
import {
  renderActivityCard,
  renderClaudeCard,
  renderLanguagesCard,
  renderLocCard,
  renderStatsCard,
  renderStreakCard,
} from "./cards.js";
import type { UsageByDate } from "./claude.js";
import { toClaudeDays } from "./claude.js";
import {
  computeRank,
  computeStreaks,
  fetchGithubData,
  fetchLocByDay,
  lastNDays,
} from "./github.js";

const ASSETS = "assets";
const BADGES_DIR = join(ASSETS, "badges");
const USAGE_FILE = join("data", "claude-usage.json");
const CLAUDE_CARD_DAYS = 30;

const token = process.env["STATS_TOKEN"];
if (!token) {
  console.error("STATS_TOKEN is not set");
  process.exit(1);
}

const data = await fetchGithubData(token);
mkdirSync(BADGES_DIR, { recursive: true });

writeFileSync(join(ASSETS, "stats.svg"), renderStatsCard(data.stats, computeRank(data.stats)));
writeFileSync(join(ASSETS, "languages.svg"), renderLanguagesCard(data.languages));
writeFileSync(join(ASSETS, "streak.svg"), renderStreakCard(computeStreaks(data.allDays)));
writeFileSync(join(ASSETS, "activity.svg"), renderActivityCard(lastNDays(data.allDays)));
writeFileSync(join(ASSETS, "loc.svg"), renderLocCard(await fetchLocByDay(token)));

if (existsSync(USAGE_FILE)) {
  const usage = JSON.parse(readFileSync(USAGE_FILE, "utf8")) as UsageByDate;
  const days = toClaudeDays(usage, CLAUDE_CARD_DAYS);
  writeFileSync(join(ASSETS, "claude.svg"), renderClaudeCard(days));
} else {
  console.warn(`${USAGE_FILE} missing — skipping claude.svg`);
}

for (const badge of BADGES) {
  writeFileSync(join(BADGES_DIR, badge.file), renderBadge(badge));
}
console.log("assets written");
