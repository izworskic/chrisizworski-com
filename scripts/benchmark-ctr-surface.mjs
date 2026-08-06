#!/usr/bin/env node

// CTR Surface Benchmark
// Scores the controllable SERP snippet surface of pages that already earn impressions,
// weighted by impression share, so the score only moves when work happens where traffic is.
// Run: npm run benchmark:ctr        (report)
//      npm run benchmark:ctr -- --check   (gate: non-zero exit on regression)

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const check = process.argv.includes("--check");

const baseline = JSON.parse(
  await readFile(path.join(root, "benchmarks", "ctr-surface-baseline.json"), "utf8"),
);
const G = baseline.gates;

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();
}
function grab(src, re) { return decode(src.match(re)?.[1] || ""); }

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name === "index.html") out.push(p);
  }
  return out;
}

const files = await walk(publicRoot);
const source = new Map();
for (const f of files) {
  const rel = "/" + path.relative(publicRoot, path.dirname(f)).split(path.sep).join("/") + "/";
  source.set(rel === "//" ? "/" : rel, await readFile(f, "utf8"));
}

// Inbound internal link graph, counted once.
const inbound = new Map();
for (const [, html] of source) {
  const seen = new Set();
  for (const m of html.matchAll(/href="(\/[^"#?]*?)\/?"/g)) {
    const t = m[1].endsWith("/") ? m[1] : m[1] + "/";
    if (!seen.has(t)) { seen.add(t); inbound.set(t, (inbound.get(t) || 0) + 1); }
  }
}

const sitemap = await readFile(path.join(publicRoot, "sitemap.xml"), "utf8");
const norm = (u) => (u.length > 1 ? u.replace(/\/+$/, "") : u);
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const inSitemap = new Set(sitemapPaths.map(norm));
const sitemapRaw = new Set(sitemapPaths);

function expectedCtr(position, zeroClickRisk) {
  const curve = baseline.expectedCtrCurve.byPosition;
  const stops = Object.keys(curve).map(Number).sort((a, b) => a - b);
  let base = curve[String(stops[stops.length - 1])];
  for (let i = 0; i < stops.length; i += 1) {
    if (position <= stops[i]) {
      if (i === 0) { base = curve[String(stops[0])]; break; }
      const lo = stops[i - 1], hi = stops[i];
      const t = (position - lo) / (hi - lo);
      base = curve[String(lo)] + t * (curve[String(hi)] - curve[String(lo)]);
      break;
    }
  }
  return base * (baseline.expectedCtrCurve.zeroClickDiscount[zeroClickRisk] ?? 1);
}

function audit(pathname, personaKey) {
  const html = source.get(pathname);
  if (!html) return { pathname, missing: true, checks: {}, score: 0 };
  const title = grab(html, /<title>([\s\S]*?)<\/title>/i);
  const description =
    grab(html, /<meta\s+name=["']description["']\s+content="([^"]*)"/i) ||
    grab(html, /<meta\s+name=["']description["']\s+content='([^']*)'/i);
  const canonical = grab(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const triggers = baseline.personas[personaKey]?.triggers ?? [];
  const lowerTitle = title.toLowerCase();
  const links = inbound.get(pathname) || 0;

  const checks = {
    titleFitsSerp: title.length >= G.titleMinChars && title.length <= G.titleMaxChars,
    titleCarriesPersonaTrigger: triggers.some((t) => lowerTitle.includes(t)),
    titleFrontLoadsTopic: !/^(chris izworski|home|welcome)/i.test(title),
    descriptionFits: description.length >= G.descriptionMinChars && description.length <= G.descriptionMaxChars,
    descriptionOpensWithAnswer: /^[A-Z0-9]/.test(description) && !/^chris izworski/i.test(description),
    canonicalSelfReferencing: norm(new URL(canonical || "https://x.invalid/").pathname) === norm(pathname),
    canonicalUsesSiteSlashConvention: canonical.endsWith("/"),
    inSitemap: inSitemap.has(norm(pathname)),
    sitemapUsesSiteSlashConvention: sitemapRaw.has(pathname),
    hasFourInboundLinks: links >= G.minInboundInternalLinks,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    pathname, title, titleChars: title.length, descriptionChars: description.length,
    inboundLinks: links, checks, score: passed / Object.keys(checks).length,
  };
}

const measured = baseline.measuredPages.map((p) => {
  const a = audit(p.path, p.persona);
  const exp = expectedCtr(p.position, p.zeroClickRisk);
  return {
    ...a, persona: p.persona, impressions: p.impressions, actualCtr: p.ctr, position: p.position,
    expectedCtr: exp, zeroClickRisk: p.zeroClickRisk,
    clicksAtRisk: Math.max(0, Math.round((exp - p.ctr) * p.impressions)),
  };
});

const totalImpressions = measured.reduce((s, p) => s + p.impressions, 0);
const weightedScore = measured.reduce((s, p) => s + p.score * (p.impressions / totalImpressions), 0);

const watchlist = baseline.seasonalWatchlist.paths.map((p) =>
  ({ ...audit(p, baseline.seasonalWatchlist.persona), persona: baseline.seasonalWatchlist.persona }));
const watchlistScore = watchlist.reduce((s, p) => s + p.score, 0) / watchlist.length;

function fail(c) { return Object.entries(c).filter(([, v]) => !v).map(([k]) => k); }

console.log("\nCTR SURFACE BENCHMARK  " + new Date().toISOString().slice(0, 10));
console.log("=".repeat(78));
console.log("\nMEASURED PAGES  (impression weighted, GSC window 171 days)\n");
for (const p of [...measured].sort((a, b) => b.impressions - a.impressions)) {
  const share = ((p.impressions / totalImpressions) * 100).toFixed(1);
  console.log(`${p.pathname}`);
  console.log(`  weight ${share.padStart(5)}%  score ${(p.score * 100).toFixed(0).padStart(3)}%  ` +
    `title ${String(p.titleChars).padStart(3)}  desc ${String(p.descriptionChars).padStart(3)}  links ${String(p.inboundLinks).padStart(2)}`);
  console.log(`  pos ${p.position.toFixed(2)}  ctr ${(p.actualCtr * 100).toFixed(2)}% vs modeled ${(p.expectedCtr * 100).toFixed(2)}%  zero-click ${p.zeroClickRisk}  clicks at risk/window: ${p.clicksAtRisk}`);
  const f = fail(p.checks);
  if (f.length) console.log(`  FAIL: ${f.join(", ")}`);
  console.log("");
}
console.log(`WEIGHTED SNIPPET SCORE: ${(weightedScore * 100).toFixed(1)}%  (gate ${(G.minWeightedScore * 100).toFixed(0)}%)`);
const totalRisk = measured.reduce((s, p) => s + p.clicksAtRisk, 0);
console.log(`TOTAL CLICKS AT RISK across the window: ${totalRisk}  (modeled, see baseline caution)`);

console.log("\nSEASONAL WATCHLIST  (no GSC history, hygiene only)\n");
const bad = watchlist.filter((p) => p.score < 1);
for (const p of bad.sort((a, b) => a.score - b.score)) {
  console.log(`  ${(p.score * 100).toFixed(0).padStart(3)}%  title ${String(p.titleChars).padStart(3)}  links ${String(p.inboundLinks).padStart(2)}  ${p.pathname}`);
  console.log(`         FAIL: ${fail(p.checks).join(", ")}`);
}
if (!bad.length) console.log("  all clean");
console.log(`\nWATCHLIST SCORE: ${(watchlistScore * 100).toFixed(1)}%  (${bad.length} of ${watchlist.length} pages failing at least one gate)`);
console.log("");

if (check) {
  const problems = [];
  if (weightedScore < G.minWeightedScore) problems.push(`weighted snippet score ${(weightedScore * 100).toFixed(1)}% below gate ${(G.minWeightedScore * 100).toFixed(0)}%`);
  const over = [...measured, ...watchlist].filter((p) => p.titleChars > G.titleMaxChars);
  const longDesc = [...measured, ...watchlist].filter((p) => p.descriptionChars > G.descriptionMaxChars);
  if (longDesc.length) problems.push(`${longDesc.length} descriptions over ${G.descriptionMaxChars} chars`);
  if (over.length) problems.push(`${over.length} titles over ${G.titleMaxChars} chars`);
  const missing = [...measured, ...watchlist].filter((p) => p.missing);
  if (missing.length) problems.push(`${missing.length} baseline pages missing from public/`);
  if (problems.length) { console.error("BENCHMARK FAILED:"); for (const p of problems) console.error("  - " + p); process.exit(1); }
  console.log("benchmark:ctr PASS\n");
}
