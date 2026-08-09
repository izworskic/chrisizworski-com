#!/usr/bin/env node
// Entity surface benchmark. Tracks ownership of the search surfaces carrying the
// Chris Izworski entity. Structural checks run offline and are safe in CI.
// Network checks are opt-in: `npm run benchmark:entity -- --live`.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const b = JSON.parse(await readFile(path.join(root, "benchmarks", "entity-surface-baseline.json"), "utf8"));
const live = process.argv.includes("--live");
const check = process.argv.includes("--check");

async function walk(d) { const o = []; for (const e of await readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) o.push(...await walk(p)); else if (e.name === "index.html") o.push(p); } return o; }
const files = await walk(publicRoot);

let personNodes = 0, sameAs = [], jobTitles = new Set(), personIds = new Set();
for (const f of files) {
  const html = await readFile(f, "utf8");
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let d; try { d = JSON.parse(m[1]); } catch { continue; }
    for (const n of (d["@graph"] || [d])) {
      const id = String(n["@id"] || "");
      if (n["@type"] === "Person") { personNodes += 1; personIds.add(id); if (n.jobTitle) jobTitles.add(n.jobTitle); if (Array.isArray(n.sameAs)) sameAs = [...new Set([...sameAs, ...n.sameAs])]; }
      else if (id.endsWith("#person")) { /* reference node */ }
    }
  }
}

const selfOwned = (u) => b.selfOwnedDomains.some((d) => u.includes(d));
const independent = sameAs.filter((u) => !selfOwned(u));
const ownedIndependent = b.independentSurfaces.filter((s) => s.status === "owned");
const candidates = b.independentSurfaces.filter((s) => s.status === "absent");

console.log("\nENTITY SURFACE BENCHMARK  " + new Date().toISOString().slice(0, 10));
console.log("=".repeat(72));
console.log(`\nsameAs entries: ${sameAs.length}`);
console.log(`  self-owned domains : ${sameAs.length - independent.length}  (low entity weight, they only vouch for themselves)`);
console.log(`  independent        : ${independent.length}  (this is the number that matters)`);
console.log(`Person nodes with full definition: ${personNodes}   jobTitle values in use: ${[...jobTitles].join(", ") || "none"}`);
console.log(`Person @id values: ${[...personIds].join(", ") || "none"}`);
if (jobTitles.size > 1) console.log(`  WARNING: ${jobTitles.size} different job titles across the site. Every new surface copies whichever is live.`);
if (personIds.size !== 1 || !personIds.has(b.canonicalPersonId)) {
  console.log(`  WARNING: Person definitions must resolve to the single canonical @id ${b.canonicalPersonId}.`);
}

console.log(`\nOWNED INDEPENDENT SURFACES (${ownedIndependent.length} of gate ${b.gates.minIndependentOwnedSurfaces})`);
for (const s of ownedIndependent) console.log(`  w${s.weight}  ${s.id.padEnd(11)} ${s.url}`);
console.log(`\nCANDIDATE SURFACES NOT YET OWNED (${candidates.length}) — ranked by weight`);
for (const s of [...candidates].sort((x, y) => y.weight - x.weight)) console.log(`  w${s.weight}  ${s.id.padEnd(11)} ${s.note}`);

let dead = [];
if (live) {
  console.log("\nLIVE CHECK");
  const results = await Promise.all(sameAs.map(async (u) => {
    const host = new URL(u).host;
    if (b.botBlockedHosts[host]) return { u, state: "blocked", note: b.botBlockedHosts[host] };
    try {
      const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; entity-check)" }, signal: AbortSignal.timeout(18000) });
      const body = r.ok ? (await r.text()).slice(0, 90000) : "";
      return { u, state: r.ok ? "live" : "dead", status: r.status, backlink: body.includes("chrisizworski.com") };
    } catch (e) { return { u, state: "dead", status: String(e.message).slice(0, 30) }; }
  }));
  for (const r of results) {
    if (r.state === "blocked") console.log(`  BLOCKED  ${r.u}  (${r.note})`);
    else if (r.state === "dead") { dead.push(r.u); console.log(`  DEAD ${r.status}  ${r.u}`); }
    else if (!r.backlink) console.log(`  NO BACKLINK  ${r.u}`);
  }
  const verifiable = results.filter((r) => r.state === "live");
  const rate = verifiable.filter((r) => r.backlink).length / (verifiable.length || 1);
  console.log(`  live ${verifiable.length}/${sameAs.length}, blocked ${results.filter(r=>r.state==="blocked").length}, backlink rate among verifiable ${(rate * 100).toFixed(0)}%`);
  console.log("  NOTE: blocked is not dead. LinkedIn answers 999 and Medium 403 to every bot.");
} else {
  console.log("\n(structural checks only — pass --live to verify every sameAs URL over the network)");
}
console.log("");

if (check) {
  const problems = [];
  if (ownedIndependent.length < b.gates.minIndependentOwnedSurfaces) problems.push(`${ownedIndependent.length} independent surfaces owned, gate is ${b.gates.minIndependentOwnedSurfaces}`);
  if (b.gates.requireSinglePersonNode && (personIds.size !== 1 || !personIds.has(b.canonicalPersonId))) {
    problems.push(`Person @id values are ${[...personIds].join(", ") || "missing"}; required ${b.canonicalPersonId}`);
  }
  if (b.gates.requireJobTitleConsistency && jobTitles.size > 1) problems.push(`${jobTitles.size} conflicting jobTitle values`);
  if (dead.length > b.gates.maxDeadSameAs) problems.push(`${dead.length} dead sameAs URLs`);
  if (problems.length) { console.error("ENTITY BENCHMARK FAILED:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
  console.log("benchmark:entity PASS\n");
}
