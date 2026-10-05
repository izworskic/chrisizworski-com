#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addCreatorAttribution } from "../lib/creator-attribution.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const registry = JSON.parse(await readFile(path.join(root, "benchmarks/tool-network-registry.json"), "utf8"));
const mainHostTools = registry.tools.filter((tool) => {
  try { return new URL(tool.canonical).hostname === "chrisizworski.com"; }
  catch { return false; }
});

const missing = [];
let updated = 0;
let alreadyCovered = 0;
for (const tool of mainHostTools) {
  const pathname = decodeURIComponent(new URL(tool.canonical).pathname);
  const relative = pathname === "/" ? "index.html" : path.join(pathname.replace(/^\/+|\/+$/g, ""), "index.html");
  const file = path.join(publicRoot, relative);
  let html;
  try { html = await readFile(file, "utf8"); }
  catch { missing.push(`${tool.id}: ${relative}`); continue; }

  const next = addCreatorAttribution(html);
  if (next === html) alreadyCovered += 1;
  else { await writeFile(file, next); updated += 1; }
}

if (missing.length) {
  console.error("Creator attribution could not find registered tool pages:");
  missing.forEach((item) => console.error("  - " + item));
  process.exit(1);
}
console.log(`Creator attribution: ${updated} page(s) updated, ${alreadyCovered} already covered, ${mainHostTools.length} registered main-site tools checked.`);
