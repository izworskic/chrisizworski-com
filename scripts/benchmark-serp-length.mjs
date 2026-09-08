#!/usr/bin/env node
// Titles <= 60 and meta descriptions <= 158, measured on what Google actually renders.
//
// PR #16 drove both counts to zero in August 2026 and nothing kept them there, so they crept back
// up unnoticed. The reason they crept back unnoticed is that no gate measured them: benchmark:seo
// checks that the name survives, not that the string fits. This is that missing gate.
//
// TWO THINGS THIS GETS RIGHT THAT A NAIVE VERSION GETS WRONG:
//
// 1. DECODE HTML ENTITIES FIRST. "&amp;" is five characters in the file and one on the SERP, and
//    "&#x27;" is six characters and one. Counting raw source produced two false "over limit"
//    titles and one false description on the first pass here. Measure the rendered string.
//
// 2. A PAGE INSIDE A RUNNING MEASUREMENT WINDOW IS EXEMPT UNTIL THE WINDOW CLOSES, AND THE
//    EXEMPTION EXPIRES BY ITSELF. Rewriting a meta description on a page whose CTR is being
//    measured destroys the measurement, because the description IS the treatment. But an
//    open-ended exemption is just a hidden failure, so each entry carries the date its window
//    ends and this gate starts failing the day after. Nothing is quietly forgiven.
//
// Usage: node scripts/benchmark-serp-length.mjs [--check]

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 158;

// Pages frozen inside a live measurement window. `until` is the last day of the evaluation window
// from the experiment record; after that the exemption stops applying and this gate fails until
// the string is brought back inside the limit.
const FROZEN = [
  {
    route: "/tools/",
    until: "2026-09-21",
    experiment: "entity-discovery-ctr-experiment.json",
    note: "metaDescription is in the experiment freeze list; window opened 2026-08-25.",
  },
];

// Known over-limit strings that already existed on main before this gate was made blocking.
// These are NOT exemptions for future growth: the exact field may stay at or below its recorded
// baseline, but any increase fails the gate. This keeps unrelated production work from rewriting
// existing SERP treatments while still preventing the debt from getting worse. Remove an entry as
// soon as that route is intentionally brought under the normal limit in dedicated SEO work.
const LEGACY_OVERLIMIT_BASELINE = new Map([
  ["/national-tools/ice-out/|title", 63],
  ["/ontario-fishing-lake-finder/|title", 62],
  ["/ontario-fishing-lake-finder/|description", 178],
]);

function decodeEntities(value) {
  return value
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const today = new Date().toISOString().slice(0, 10);
const files = await walk(publicRoot);
const failures = [];
const exempt = [];
const legacy = [];

function recordLength(route, field, length, limit, frozen) {
  if (length <= limit) return;
  const line = `${route} ${field} ${length} > ${limit}`;
  if (frozen) {
    exempt.push(`${line} (frozen until ${frozen.until})`);
    return;
  }
  const legacyBaseline = LEGACY_OVERLIMIT_BASELINE.get(`${route}|${field}`);
  if (legacyBaseline !== undefined && length <= legacyBaseline) {
    legacy.push(`${line} (pre-existing baseline ${legacyBaseline}; may not increase)`);
    return;
  }
  failures.push(line);
}

for (const file of files) {
  const html = await readFile(file, "utf8");
  const route = "/" + path.relative(publicRoot, file).replace(/\\/g, "/").replace(/index\.html$/, "");
  const title = decodeEntities((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
  const description = decodeEntities(
    (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "",
  );

  const frozen = FROZEN.find((f) => f.route === route && today <= f.until);
  recordLength(route, "title", title.length, TITLE_MAX, frozen);
  recordLength(route, "description", description.length, DESCRIPTION_MAX, frozen);
}

for (const f of FROZEN) {
  if (today > f.until) {
    console.log(`  note: the ${f.route} freeze expired ${f.until}; it is now measured normally.`);
  }
}
for (const line of exempt) console.log(`  exempt: ${line}`);
for (const line of legacy) console.log(`  legacy: ${line}`);

if (failures.length) {
  console.error(`\nSERP LENGTH CHECK FAILED: ${failures.length} over the limit.`);
  for (const line of failures) console.error(`  ${line}`);
  console.error(
    "\nIf the page is inside a live measurement window, add it to FROZEN in this file with the",
  );
  console.error("window end date from its experiment record. Do not remove the limit.");
  process.exit(1);
}

console.log(
  `serp length PASS - ${files.length} pages, titles <= ${TITLE_MAX}, descriptions <= ${DESCRIPTION_MAX}` +
    (exempt.length ? `, ${exempt.length} frozen` : "") +
    (legacy.length ? `, ${legacy.length} pre-existing over-limit baselines` : ""),
);
