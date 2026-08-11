#!/usr/bin/env node
// Citation readiness: are the answers on this site self-contained?
//
// The test that matters is whether an answer block still answers its question when it is the ONLY
// thing a reader or a model sees. A block that says "the live reading at the top of this page"
// reads fine in place and answers nothing when lifted out, and lifted out is exactly how an
// assistant encounters it.
//
// Length is the proxy, not the goal. Current research on AI Overview citations puts self-contained
// answers of roughly 134 to 167 words several times more likely to be selected, and the same
// property governs featured snippets: a block that could not earn a snippet is very unlikely to be
// cited. But a padded 150 words is worse than a tight 60, so this also flags answers that lean on
// the surrounding page, which is the failure length alone cannot see.
//
// Usage: node scripts/benchmark-citation.mjs [--check]

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const CHECK = process.argv.includes("--check");
const BAND = [134, 167];
const BASELINE = path.join(root, "benchmarks", "citation-baseline.json");

// The tools that carry impressions. Deliberately excludes /when-to-plant-tomatoes-michigan/ and
// /michigan-frost-dates/: both are single-fact zero-click queries answered inline on the results
// page, and no amount of answer restructuring changes that.
const TRACKED = [
  "northern-lights-michigan", "soo-locks", "fall-color", "mackinac-bridge-live",
  "great-lakes-beaches", "great-lakes-freighter-tracking", "michigan-ice",
  "great-lakes-buoys", "saginaw-bay-ecology",
];

// Phrases that make a block depend on its surroundings. Each one is a place the answer stops
// standing on its own.
const DEPENDENT = [
  /\bthe (?:table|map|chart|list|tool|forecast|reading|outlook|panel|section|banner) above\b/i,
  /\b(?:above|below) (?:on this page|tell|tells|show|shows)\b/i,
  /\bnear the top of this page\b/i,
  /\bat the top of this page\b/i,
  /\bsee (?:the )?(?:table|list|section) below\b/i,
  /\bas (?:shown|described) above\b/i,
];

function answersIn(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
  const out = [];
  const re = /<h[34][^>]*>([^<]*\?)<\/h[34]>([\s\S]*?)(?=<h[1-4]|<\/section)/g;
  let m;
  while ((m = re.exec(body))) {
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < 4) continue;
    out.push({
      question: m[1].replace(/\s+/g, " ").trim(),
      words,
      inBand: words >= BAND[0] && words <= BAND[1],
      dependent: DEPENDENT.filter((re2) => re2.test(text)).length > 0,
    });
  }
  return out;
}

const report = [];
for (const route of TRACKED) {
  let html;
  try { html = await readFile(path.join(root, "public", route, "index.html"), "utf8"); } catch { continue; }
  const answers = answersIn(html);
  const inBand = answers.filter((a) => a.inBand).length;
  const dependent = answers.filter((a) => a.dependent);
  report.push({ route, answers: answers.length, inBand, dependent: dependent.length, detail: answers });
}

const totalAnswers = report.reduce((a, r) => a + r.answers, 0);
const totalInBand = report.reduce((a, r) => a + r.inBand, 0);
const totalDependent = report.reduce((a, r) => a + r.dependent, 0);
const noSurface = report.filter((r) => r.answers === 0).map((r) => r.route);

console.log(`citation readiness across ${report.length} tools`);
console.log(`  answer blocks:          ${totalAnswers}`);
console.log(`  self-contained length:  ${totalInBand} (${totalAnswers ? Math.round((totalInBand / totalAnswers) * 100) : 0}%)`);
console.log(`  depend on the page:     ${totalDependent}`);
console.log(`  tools with no Q&A:      ${noSurface.length}${noSurface.length ? "  " + noSurface.join(", ") : ""}\n`);
for (const r of report) {
  const flag = r.answers === 0 ? "NO Q&A SURFACE" : `${r.inBand}/${r.answers} in band${r.dependent ? `, ${r.dependent} page-dependent` : ""}`;
  console.log(`  ${r.route.padEnd(32)} ${flag}`);
}

if (CHECK) {
  const prev = JSON.parse(await readFile(BASELINE, "utf8"));
  const failures = [];
  if (totalInBand < prev.selfContained) failures.push(`self-contained answers fell from ${prev.selfContained} to ${totalInBand}`);
  if (totalDependent > prev.pageDependent) failures.push(`page-dependent answers rose from ${prev.pageDependent} to ${totalDependent}`);
  if (failures.length) { console.error("\nCITATION CHECK FAILED:"); for (const f of failures) console.error(`  ${f}`); process.exit(1); }
  console.log("\ncitation PASS (ratchet: never fewer self-contained, never more page-dependent)\n");
} else {
  await writeFile(BASELINE, JSON.stringify({
    recordedAt: new Date().toISOString().slice(0, 10),
    band: BAND, tools: report.length, answerBlocks: totalAnswers,
    selfContained: totalInBand, pageDependent: totalDependent, toolsWithNoSurface: noSurface,
    note: "Ratchet baseline. self-contained may only rise, page-dependent may only fall.",
  }, null, 2) + "\n");
  console.log(`\nbaseline written to ${path.relative(root, BASELINE)}`);
}
