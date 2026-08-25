#!/usr/bin/env node
// Make dateModified tell the truth.
//
// Every one of the 159 pages carrying a dateModified was UNDERSTATING it, and 103 of them by more
// than a month: pages edited on August 6 were telling Google they had not changed since April 28,
// an understatement of up to 100 days. None overstated. The stamps had been set by hand in bulk
// and then drifted every time anything shipped.
//
// This matters more here than on most sites. Freshness is a citation signal, and the whole
// proposition of this network is live conditions: the aurora page recomputes its Kp on every load
// and the fall colour section writes daily from August 20. Telling Google those pages have sat
// untouched since spring is the opposite of what is true.
//
// The stamp is the America/Detroit calendar date of the last commit that touched the file, so it is
// derived rather than declared and cannot drift again. Normalizing the commit timestamp into the
// site's timezone matters for GitHub Actions commits just after midnight UTC, which are still the
// prior Michigan calendar day. Running this changes only the stamp; the gate below tolerates a few
// days of lag so that the commit which writes the stamp does not immediately invalidate it.
//
// Usage: node scripts/stamp-freshness.mjs [--check]
//   default   rewrite stamps that are older than the file's real last-commit date
//   --check   report only, exit 1 if any stamp lags by more than TOLERANCE_DAYS

import { readFile, writeFile } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const CHECK = process.argv.includes("--check");
const TOLERANCE_DAYS = 7;
const SITE_TIME_ZONE = "America/Detroit";
const siteDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateInSiteTimeZone(timestamp) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = Object.fromEntries(
    siteDateFormatter
      .formatToParts(parsed)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

// When did this file's CONTENT last change, ignoring commits that only moved the stamp itself.
// Without this the script oscillates: it stamps a date, the commit carrying that stamp becomes the
// file's newest commit, and the next run stamps that instead. Rebases made it stamp "today" on
// every page. A commit that only edits dateModified or lastmod is not a content change.
const STAMP_ONLY = /^[+-].*"(?:dateModified)"\s*:\s*"\d{4}-\d{2}-\d{2}|^[+-]\s*<lastmod>/;
function lastContentCommitDate(file) {
  const rel = path.relative(root, file);
  let hashes;
  try {
    hashes = execFileSync("git", ["log", "-12", "--format=%H %cI", "--", rel], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim().split("\n").filter(Boolean);
  } catch { return null; }
  if (!hashes.length) return null;

  for (const row of hashes) {
    const separator = row.indexOf(" ");
    const hash = separator > 0 ? row.slice(0, separator) : row;
    const timestamp = separator > 0 ? row.slice(separator + 1) : "";
    const date = dateInSiteTimeZone(timestamp);
    if (!date) continue;
    let diff = "";
    try {
      diff = execFileSync("git", ["show", "--format=", "--unified=0", hash, "--", rel], {
        cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 16 * 1024 * 1024,
      });
    } catch { return date; }
    const changed = diff.split("\n").filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
    if (!changed.length) continue;
    if (changed.some((l) => !STAMP_ONLY.test(l))) return date; // a real content change
  }
  // Every recent commit touched only the stamp; fall back to the oldest one we looked at.
  const oldest = hashes[hashes.length - 1];
  const separator = oldest.indexOf(" ");
  return dateInSiteTimeZone(separator > 0 ? oldest.slice(separator + 1) : "");
}
const lastCommitDate = lastContentCommitDate;

// The sitemap carries its own lastmod per URL and drifts independently. PR #44's integrity test
// caught exactly that: a page whose dateModified moved while its sitemap entry did not. Both are
// freshness signals and they must agree, so the stamper owns both.
// Every page sitemap robots.txt declares. This list was three of seven, so sitemap-fall.xml,
// sitemap-manistee.xml and sitemap-winter.xml drifted with nothing checking them. If you add a
// sitemap to robots.txt, add it here in the same commit. image-sitemap.xml is deliberately out:
// it indexes images, not pages, so it has no page dateModified to agree with.
const SITEMAPS = [
  "sitemap.xml",
  "sitemap-beaches.xml",
  "sitemap-reputation.xml",
  "sitemap-fall.xml",
  "sitemap-manistee.xml",
  "sitemap-winter.xml",
];
async function syncSitemaps(dateByRoute) {
  let updated = 0;
  for (const name of SITEMAPS) {
    const file = path.join(publicRoot, name);
    let xml;
    try { xml = await readFile(file, "utf8"); } catch { continue; }
    let next = xml.replace(
      /<loc>https:\/\/chrisizworski\.com([^<]*)<\/loc>(\s*)<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g,
      (whole, route, gap, current) => {
        const want = dateByRoute.get(route) || dateByRoute.get(route.replace(/\/$/, "") + "/");
        if (!want || want === current) return whole;
        updated += 1;
        return `<loc>https://chrisizworski.com${route}</loc>${gap}<lastmod>${want}</lastmod>`;
      },
    );
    // An entry with NO lastmod was previously invisible: the regex above only matches entries that
    // already have one, so sitemap-winter.xml shipped 11 URLs with no freshness signal at all and
    // nothing reported it. Insert the page's real date instead of skipping.
    // Capture the whitespace AND whatever tag follows, so the "no lastmod here" test cannot be
    // satisfied by the regex backtracking \s* down to zero. An anchored lookahead alone duplicated
    // every existing entry (247 lastmod for 124 urls) because \s* simply gave back characters.
    next = next.replace(
      /<loc>https:\/\/chrisizworski\.com([^<]*)<\/loc>(\s*)<(?!lastmod>)/g,
      (whole, route, gap) => {
        const want = dateByRoute.get(route) || dateByRoute.get(route.replace(/\/$/, "") + "/");
        if (!want) return whole;
        updated += 1;
        return `<loc>https://chrisizworski.com${route}</loc>${gap}<lastmod>${want}</lastmod>${gap}<`;
      },
    );
    if (next !== xml && !CHECK) await writeFile(file, next);
  }
  return updated;
}

const files = walk(publicRoot);
const dateByRoute = new Map();
const lagging = [];
let rewritten = 0;
let skippedNoHistory = 0;
const unstamped = [];

for (const file of files) {
  const html = await readFile(file, "utf8");
  const match = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    // A page with no stamp can never be "behind", so it silently left the freshness system
    // entirely. That is how /connect/ sat 14 days stale and unreported. Record it and fail below.
    unstamped.push("/" + path.relative(publicRoot, file).replace(/\\/g, "/").replace(/index\.html$/, ""));
    continue;
  }
  const claimed = match[1];
  const real = lastCommitDate(file);
  if (!real) { skippedNoHistory += 1; continue; }

  const routeKey = "/" + path.relative(publicRoot, file).replace(/\\/g, "/").replace(/index\.html$/, "");
  const lagDays = Math.round((Date.parse(real) - Date.parse(claimed)) / 86400000);
  dateByRoute.set(routeKey, lagDays > 0 ? real : claimed);
  if (lagDays <= 0) continue; // already truthful, or newer than git which we never touch

  const rel = "/" + path.relative(publicRoot, file).replace(/\\/g, "/").replace(/index\.html$/, "");
  lagging.push({ rel, claimed, real, lagDays });

  if (!CHECK) {
    // Only the stamp changes. Nothing else in the file is touched.
    const next = html.replace(/("dateModified"\s*:\s*")(\d{4}-\d{2}-\d{2})/, `$1${real}`);
    if (next !== html) { await writeFile(file, next); rewritten += 1; }
  }
}

const bad = lagging.filter((l) => l.lagDays > TOLERANCE_DAYS);

const sitemapDrift = await syncSitemaps(dateByRoute);

if (CHECK) {
  if (sitemapDrift) console.log(`  sitemap lastmod entries disagreeing with their page: ${sitemapDrift}`);
  console.log(`freshness check: ${files.length} html files, ${lagging.length} stamps behind their last commit`);
  if (skippedNoHistory) console.log(`  ${skippedNoHistory} skipped, no git history (shallow clone?)`);
  for (const l of bad.slice(0, 12)) console.log(`  ${String(l.lagDays).padStart(4)}d behind  claims ${l.claimed}, real ${l.real}  ${l.rel}`);
  if (bad.length > 12) console.log(`  ...and ${bad.length - 12} more`);
  // Only pages we actually submit to Google have to carry a stamp. An unlisted page is allowed to
  // have none; a sitemap-listed one is not, because its lastmod would then have nothing to agree with.
  const listed = new Set();
  for (const name of SITEMAPS) {
    let xml;
    try { xml = await readFile(path.join(publicRoot, name), "utf8"); } catch { continue; }
    for (const m of xml.matchAll(/<loc>https:\/\/chrisizworski\.com([^<]*)<\/loc>/g)) listed.add(m[1]);
  }
  const unstampedListed = unstamped.filter((r) => listed.has(r));
  if (unstampedListed.length) {
    console.error(`\nFRESHNESS CHECK FAILED: ${unstampedListed.length} sitemap-listed pages carry no dateModified.`);
    for (const r of unstampedListed) console.error(`  ${r}`);
    console.error("Add a dateModified to the page's WebPage node, then run: node scripts/stamp-freshness.mjs");
    process.exit(1);
  }
  if (sitemapDrift) {
    console.error(`\nFRESHNESS CHECK FAILED: ${sitemapDrift} sitemap lastmod entries disagree with their page's dateModified.`);
    console.error("Run: node scripts/stamp-freshness.mjs");
    process.exit(1);
  }
  if (bad.length) {
    console.error(`\nFRESHNESS CHECK FAILED: ${bad.length} pages understate their own modification date by more than ${TOLERANCE_DAYS} days.`);
    console.error("Run: node scripts/stamp-freshness.mjs");
    process.exit(1);
  }
  console.log("freshness PASS\n");
} else {
  console.log(`stamped ${rewritten} pages from git history, synced ${sitemapDrift} sitemap entries`);
  if (skippedNoHistory) console.log(`  ${skippedNoHistory} skipped, no git history`);
  const worst = lagging.sort((a, b) => b.lagDays - a.lagDays).slice(0, 5);
  for (const l of worst) console.log(`  ${String(l.lagDays).padStart(4)}d corrected  ${l.claimed} -> ${l.real}  ${l.rel}`);
}
