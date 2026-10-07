#!/usr/bin/env node
// Publish directory references to the identities the registered destinations actually declare.
// This improves entity consistency; it cannot force ranking, sitelinks or a knowledge panel.
// Read-only on destinations: articles, pages and apps keep their existing types and IDs.
// Unverified off-site and extracted destinations are left as published, never assigned guessed IDs.
// Run: node scripts/generate-tool-entity-graph.mjs [--check]

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const PERSON = "https://chrisizworski.com/#person";
const TOOLS_PAGE = "public/tools/index.html";
const REGISTRY = "benchmarks/tool-network-registry.json";
const APP_TYPES = new Set(["WebApplication", "SoftwareApplication"]);
const PAGE_TYPES = new Set(["WebPage", "CollectionPage", "Article", "Dataset", "WebSite"]);
const APP_ONLY_FIELDS = ["applicationCategory", "applicationSubCategory", "operatingSystem"];
const typesOf = (node) => [].concat(node?.["@type"] || []);
const readBlocks = (html) => [...html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

function comparableUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch { return null; }
}

function* allNodes(value) {
  if (Array.isArray(value)) {
    for (const item of value) yield* allNodes(item);
  } else if (value && typeof value === "object") {
    yield value;
    for (const child of Object.values(value)) yield* allNodes(child);
  }
}

// Only a named entity for THIS destination qualifies. For example, a winery or trail listed on
// a planner page must not become the identity of the planner itself.
export function existingEntity(html, url) {
  const entities = [];
  for (const block of readBlocks(html)) {
    const parsed = JSON.parse(block[1]);
    for (const node of allNodes(parsed)) {
      if (typeof node["@id"] !== "string" || comparableUrl(node["@id"]) !== comparableUrl(url)) continue;
      if (typesOf(node).some((type) => APP_TYPES.has(type) || PAGE_TYPES.has(type))) entities.push(node);
    }
  }
  const node = entities.find((item) => typesOf(item).some((type) => APP_TYPES.has(type)))
    || ["WebPage", "CollectionPage", "Article", "Dataset", "WebSite"]
      .map((type) => entities.find((item) => typesOf(item).includes(type))).find(Boolean);
  return node ? { id: node["@id"], type: node["@type"] } : null;
}

// Derive count and ordering from the list actually displayed, not a separate registry total.
// Registry entries that are not on this directory do not gain fabricated ListItems here.
export function updateDirectoryList(list, byUrl) {
  if (!Array.isArray(list.itemListElement)) throw new Error("Tools ItemList has no itemListElement array");
  const before = JSON.stringify(list);
  const linked = new Set();
  const unresolved = [];
  list.numberOfItems = list.itemListElement.length;
  list.itemListElement.forEach((entry, index) => {
    entry.position = index + 1;
    const item = entry.item;
    if (!item || typeof item !== "object" || typeof item.url !== "string") {
      throw new Error(`Tools ListItem ${index + 1} has no item URL`);
    }
    const entity = byUrl.get(comparableUrl(item.url));
    if (!entity) { unresolved.push(item.url); return; }
    linked.add(entity.url);
    // Put resolved values last so a stale old @id cannot overwrite the destination identity.
    entry.item = { ...item, "@id": entity.id, "@type": entity.type };
    if ([].concat(entity.type).some((type) => APP_TYPES.has(type))) {
      entry.item.creator = { "@id": PERSON };
    } else {
      for (const field of APP_ONLY_FIELDS) delete entry.item[field];
    }
  });
  return { changed: before !== JSON.stringify(list), linked, unresolved, count: list.itemListElement.length };
}

export async function generateToolEntityGraph({ repoRoot = root, check = false } = {}) {
  const registry = JSON.parse(await readFile(path.join(repoRoot, REGISTRY), "utf8"));
  const resolved = [];
  const failures = [];
  const unavailable = [];
  for (const tool of registry.tools) {
    const url = new URL(tool.canonical);
    if (url.origin !== "https://chrisizworski.com") continue;
    const relative = decodeURIComponent(url.pathname).replace(/^\//, "");
    const file = path.join("public", relative.endsWith(".html") ? relative : path.join(relative, "index.html"));
    let html;
    try { html = await readFile(path.join(repoRoot, file), "utf8"); }
    catch (error) {
      if (error.code === "ENOENT") { unavailable.push(tool.canonical); continue; }
      throw error;
    }
    try {
      const entity = existingEntity(html, tool.canonical);
      if (entity) resolved.push({ ...tool, ...entity, url: tool.canonical });
      else unavailable.push(tool.canonical);
    } catch (error) { failures.push(`${file}: invalid JSON-LD (${error.message})`); }
  }

  const file = path.join(repoRoot, TOOLS_PAGE);
  let html = await readFile(file, "utf8");
  const byUrl = new Map(resolved.map((tool) => [comparableUrl(tool.url), tool]));
  let result = null;
  for (const block of readBlocks(html)) {
    let parsed;
    try { parsed = JSON.parse(block[1]); }
    catch (error) { failures.push(`${TOOLS_PAGE}: invalid JSON-LD (${error.message})`); continue; }
    const list = [...allNodes(parsed)].find((node) => node["@id"] === "https://chrisizworski.com/tools/#toollist" && typesOf(node).includes("ItemList"));
    if (!list) continue;
    result = updateDirectoryList(list, byUrl);
    if (result.changed) {
      if (check) failures.push("/tools/ ItemList count, ordering, entity IDs or types are out of sync; run npm run generate:tool-entities");
      else {
        const rendered = JSON.stringify(parsed, null, block[1].includes("\n") ? 2 : undefined);
        html = html.replace(block[0], () => block[0].replace(block[1], () => rendered));
      }
    }
    break;
  }
  if (!result) failures.push("/tools/: missing named tools ItemList");
  if (failures.length) throw new Error(`TOOL ENTITY GRAPH FAILED:\n${failures.map((failure) => `  - ${failure}`).join("\n")}`);
  if (!check && result.changed) await writeFile(file, html);
  return {
    resolved: resolved.length,
    linked: result.linked.size,
    listed: result.count,
    changed: result.changed,
    unavailable,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await generateToolEntityGraph({ check: process.argv.includes("--check") });
    console.log(`tool entity graph: ${result.resolved} registered local identities; ${result.linked}/${result.listed} directory entries linked to verified local identities; ${result.changed ? "directory updated" : "directory consistent"}`);
    if (result.unavailable.length) console.log(`  ${result.unavailable.length} registered central destinations have no local identity source; existing descriptions remain unchanged (no IDs inferred).`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
