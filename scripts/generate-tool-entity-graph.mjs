#!/usr/bin/env node
// Make every hub tool a thing Google can resolve, and make the tools directory point AT that thing
// instead of describing it a second time.
//
// THE PROBLEM: /tools/ declared its 36 entries as anonymous inline nodes while the tool pages
// separately declared their own application nodes. Nothing tied the two together, so a crawler saw
// two unrelated descriptions of the same tool and no statement that the set belongs to one person.
// Three tools had no application entity at all — including /soo-locks/, which earns 40% of the
// estate's clicks.
//
// DESIGN: this reads each page's EXISTING entity id rather than imposing a convention, because
// rewriting sixteen hand-maintained JSON-LD blocks to normalise a fragment would be a large diff
// for no crawler benefit. It only writes where something is genuinely missing.
//
// WHAT IT CANNOT DO: force sitelinks or a knowledge panel. Those are algorithmic. This makes the
// entity legible and eligible; placement is still Google's call.
//
// Run: node scripts/generate-tool-entity-graph.mjs [--check]

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");
const PERSON = "https://chrisizworski.com/#person";
const TOOLS_PAGE = "public/tools/index.html";

// Hub-hosted tools. Off-site properties on their own hosts stay inline on /tools/: a cross-host
// @id would assert an entity this site does not control.
//
// /northern-lights-michigan/ is deliberately ABSENT. Its JSON-LD graph is sha256-pinned by
// tests/seasonal-search-protection.test.js and it is first in the staged backlog for a title and
// description rewrite. One deliberate change and one repin there, not two.
const HUB_TOOLS = [
  { file: "public/soo-locks/index.html", url: "https://chrisizworski.com/soo-locks/", name: "Soo Locks Ship Schedule Today", category: "TravelApplication" },
  { file: "public/great-lakes-buoys/index.html", url: "https://chrisizworski.com/great-lakes-buoys/", name: "Great Lakes Buoy Dashboard", category: "TravelApplication" },
  { file: "public/great-lakes-beaches/index.html", url: "https://chrisizworski.com/great-lakes-beaches/", name: "Great Lakes Beach Conditions", category: "TravelApplication" },
  { file: "public/great-lakes-freighter-tracking/index.html", url: "https://chrisizworski.com/great-lakes-freighter-tracking/" },
  { file: "public/mackinac-bridge-live/index.html", url: "https://chrisizworski.com/mackinac-bridge-live/" },
  { file: "public/mackinac-bridge-tolls/index.html", url: "https://chrisizworski.com/mackinac-bridge-tolls/" },
  { file: "public/michigan-border-wait-times/index.html", url: "https://chrisizworski.com/michigan-border-wait-times/" },
  { file: "public/michigan-boat-launches/index.html", url: "https://chrisizworski.com/michigan-boat-launches/" },
  { file: "public/isle-royale-map/index.html", url: "https://chrisizworski.com/isle-royale-map/" },
  { file: "public/heirloom-variety-matchmaker/index.html", url: "https://chrisizworski.com/heirloom-variety-matchmaker/" },
  { file: "public/zone-6a-planting-calendar/index.html", url: "https://chrisizworski.com/zone-6a-planting-calendar/" },
  { file: "public/estivant-pines/index.html", url: "https://chrisizworski.com/estivant-pines/" },
  { file: "public/fall-color/michigan-leaf-peeping-planner/index.html", url: "https://chrisizworski.com/fall-color/michigan-leaf-peeping-planner/" },
  { file: "public/national-tools/aurora/index.html", url: "https://chrisizworski.com/national-tools/aurora/" },
  { file: "public/national-tools/rivers/index.html", url: "https://chrisizworski.com/national-tools/rivers/" },
  { file: "public/national-tools/coastal/index.html", url: "https://chrisizworski.com/national-tools/coastal/" },
  { file: "public/national-tools/snow/index.html", url: "https://chrisizworski.com/national-tools/snow/" },
  { file: "public/national-tools/frost/index.html", url: "https://chrisizworski.com/national-tools/frost/" },
  { file: "public/national-tools/planting/index.html", url: "https://chrisizworski.com/national-tools/planting/" },
  { file: "public/national-tools/fall-color/index.html", url: "https://chrisizworski.com/national-tools/fall-color/" },
];

const APP_TYPES = new Set(["WebApplication", "SoftwareApplication"]);
const failures = [];
const notes = [];
let changed = 0;

const readBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];

function decode(value) {
  return value
    .replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

function metaDescription(html) {
  const match = html.match(/<meta name="description" content="([^"]+)"/);
  return match ? decode(match[1]) : null;
}

// Find whatever entity this page already publishes for itself, whatever fragment it happens to use.
function existingEntityId(html, url) {
  for (const block of readBlocks(html)) {
    let parsed;
    try { parsed = JSON.parse(block[1]); } catch { continue; }
    for (const node of parsed["@graph"] || [parsed]) {
      if (!node || typeof node !== "object") continue;
      const type = node["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (!types.some((value) => APP_TYPES.has(String(value)))) continue;
      if (typeof node["@id"] === "string" && node["@id"].startsWith(url)) return node["@id"];
    }
  }
  return null;
}

async function ensureEntity(tool) {
  const file = path.join(root, tool.file);
  const html = await readFile(file, "utf8");
  const found = existingEntityId(html, tool.url);
  if (found) return { ...tool, id: found };

  const id = `${tool.url}#app`;
  if (check) {
    failures.push(`${tool.file}: no resolvable application entity (expected ${id})`);
    return { ...tool, id: null };
  }

  const description = metaDescription(html);
  if (!description) {
    failures.push(`${tool.file}: no meta description to describe the tool with`);
    return { ...tool, id: null };
  }
  // Deliberately minimal: what it is, who made it, that it is free. No ratings, no prices, nothing
  // that goes stale or is invented.
  const node = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": id,
    name: tool.name,
    url: tool.url,
    description,
    applicationCategory: tool.category,
    operatingSystem: "Any web browser",
    isAccessibleForFree: true,
    creator: { "@id": PERSON },
    author: { "@id": PERSON },
  };
  const addition = `<script type="application/ld+json">${JSON.stringify(node)}</script>\n`;
  await writeFile(file, html.replace("</head>", `${addition}</head>`));
  changed++;
  return { ...tool, id };
}

async function wireDirectory(resolved) {
  const file = path.join(root, TOOLS_PAGE);
  let html = await readFile(file, "utf8");
  const byUrl = new Map(resolved.filter((tool) => tool.id).map((tool) => [tool.url, tool]));
  const listed = new Set();

  for (const block of readBlocks(html)) {
    let parsed;
    try { parsed = JSON.parse(block[1]); } catch { continue; }
    const graph = Array.isArray(parsed["@graph"]) ? parsed["@graph"] : null;
    const nodes = graph || [parsed];
    const list = nodes.find((node) => node && String(node["@type"]) === "ItemList");
    if (!list) continue;

    let touched = false;
    for (const entry of list.itemListElement || []) {
      const url = entry?.item?.url;
      if (!url) continue;
      listed.add(url);
      const tool = byUrl.get(url);
      if (!tool) continue;
      if (entry.item["@id"] === tool.id) continue;
      if (check) {
        failures.push(`/tools/ lists ${url} without referencing ${tool.id}`);
        continue;
      }
      // Reference the entity rather than restating it. Name, url and description stay so the list
      // reads on its own; the @id is what makes this the SAME thing as the tool's own page.
      entry.item = { "@id": tool.id, ...entry.item, creator: { "@id": PERSON } };
      touched = true;
    }

    if (touched && !check) {
      const rebuilt = graph ? { ...parsed, "@graph": nodes } : nodes[0];
      // Re-serialise in the style the block was already written in. Tests elsewhere pin exact
      // substrings of this JSON, and reformatting the whole block to add one key would rewrite 600
      // lines and break them for no crawler benefit.
      const compact = !block[1].includes("\n");
      const rendered = compact ? JSON.stringify(rebuilt) : JSON.stringify(rebuilt, null, 2);
      html = html.replace(block[0], `<script type="application/ld+json">${rendered}</script>`);
      changed++;
    }
    break;
  }

  // Not a failure, but worth saying out loud: a live tool absent from the structured directory is
  // invisible to a crawler reading it, however good its own page is.
  for (const tool of resolved) {
    if (tool.id && !listed.has(tool.url)) notes.push(tool.url);
  }

  if (!check) await writeFile(file, html);
}

const resolved = [];
for (const tool of HUB_TOOLS) resolved.push(await ensureEntity(tool));
await wireDirectory(resolved);

if (notes.length) {
  console.log(`  note: ${notes.length} hub tools carry an entity but are absent from the /tools/ ItemList:`);
  for (const url of notes) console.log(`    ${url}`);
}

if (failures.length) {
  console.error("TOOL ENTITY GRAPH FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  check
    ? `tool entity graph: ${resolved.filter((tool) => tool.id).length} hub tools carry a resolvable entity\n`
    : `tool entity graph: ${resolved.length} hub tools, ${changed} files updated\n`,
);
