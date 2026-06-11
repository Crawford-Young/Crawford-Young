import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { UsageByDate } from "./claude.js";
import { aggregateLines, mergeUsage } from "./claude.js";

const PROJECTS_DIR = join(homedir(), ".claude", "projects");
const OUT_FILE = join("data", "claude-usage.json");

const files = readdirSync(PROJECTS_DIR, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith(".jsonl"))
  .map((e) => join(e.parentPath, e.name));

const seen = new Set<string>();
// Sum date-wise across files — a plain object merge would drop the first
// file's tokens whenever one local date spans two transcript files.
const fresh: Record<string, { input: number; output: number }> = {};
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (const [date, u] of Object.entries(aggregateLines(lines, seen))) {
    const prev = fresh[date] ?? { input: 0, output: 0 };
    fresh[date] = { input: prev.input + u.input, output: prev.output + u.output };
  }
}

const existing: UsageByDate = existsSync(OUT_FILE)
  ? (JSON.parse(readFileSync(OUT_FILE, "utf8")) as UsageByDate)
  : {};
const merged = mergeUsage(existing, fresh);
const sorted = Object.fromEntries(
  Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)),
);

mkdirSync("data", { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`wrote ${OUT_FILE}: ${Object.keys(sorted).length} days from ${files.length} files`);
