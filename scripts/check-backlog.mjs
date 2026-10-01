/**
 * Every shipped requirement has a story, and the board says which.
 *
 * This exists because one wildcard hid four of them. HRT-40 was tagged `R2.x`,
 * which matched everything in domain 2, so R2.9, R2.11, R2.14 and R2.15 looked
 * covered and none of them had been built. A board that quietly stops being
 * complete is worse than no board, because people stop reading it.
 *
 * So a wildcard no longer counts. A requirement in a release we have shipped or
 * are shipping has to be named, on its own or inside a range.
 */
import { readFileSync } from "node:fs";

/** Releases whose requirements must all have a story by now. */
const SHIPPING = new Set(["0.1", "0.2"]);

const prd = readFileSync("PRD.md", "utf8");
const board = readFileSync("BACKLOG.md", "utf8");

const required = [];
for (const line of prd.split("\n")) {
  const row = /^\|\s*(R(\d+)\.(\d+))\s*\|\s*(\d\.\d)\s*\|/.exec(line);
  if (row && SHIPPING.has(row[4])) {
    required.push({ id: row[1], domain: row[2], number: row[3] });
  }
}

const named = new Set();
for (const m of board.matchAll(/\bR(\d+)\.(\d+)\b/g)) named.add(`${m[1]}.${m[2]}`);
for (const m of board.matchAll(/\bR(\d+)\.(\d+)\s+to\s+R(\d+)\.(\d+)\b/g)) {
  const [, d, a, d2, b] = m;
  if (d !== d2) continue;
  for (let n = Number(a); n <= Number(b); n++) named.add(`${d}.${n}`);
}

const missing = required.filter((r) => !named.has(`${r.domain}.${r.number}`));

if (missing.length > 0) {
  console.error("Requirements in a shipping release with no story naming them:\n");
  for (const r of missing) {
    const line = prd.split("\n").find((l) => l.startsWith(`| ${r.id} |`)) ?? "";
    console.error(`  ${r.id}  ${line.split("|")[3]?.trim().slice(0, 90) ?? ""}`);
  }
  console.error(`\n${missing.length} without a story. Add one, or move the requirement's release.`);
  process.exit(1);
}

console.log(`${required.length} requirements in 0.1 and 0.2, every one named by a story.`);
