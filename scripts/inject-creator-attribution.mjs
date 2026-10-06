#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addCreatorAttribution, hasVisibleCreatorAttribution } from "../lib/creator-attribution.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const registry = JSON.parse(await readFile(path.join(root, "benchmarks/tool-network-registry.json"), "utf8"));
const vercel = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
const mainHostTools = registry.tools.filter((tool) => {
  try { return new URL(tool.canonical).hostname === "chrisizworski.com"; }
  catch { return false; }
});
const rewriteRoutes = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
const checkOnly = process.argv.includes("--check");

function routeFor(pathname) {
  const candidates = new Set([pathname, pathname.endsWith("/") ? pathname.slice(0, -1) : pathname + "/"]);
  return rewriteRoutes.find((route) => candidates.has(route.source));
}

const missing = [];
let updated = 0;
let alreadyCovered = 0;
let proxyOwned = 0;
let externallyDelegated = 0;
for (const tool of mainHostTools) {
  const pathname = decodeURIComponent(new URL(tool.canonical).pathname);
  const relative = pathname === "/" ? "index.html" : path.join(pathname.replace(/^\/+|\/+$/g, ""), "index.html");
  const file = path.join(publicRoot, relative);
  let html;
  try { html = await readFile(file, "utf8"); }
  catch {
    const route = routeFor(pathname);
    if (!route) { missing.push(`${tool.id}: no file or exact Vercel route for ${pathname}`); continue; }
    const destination = String(route.destination || "");
    if (destination.startsWith("/api/public-tool-shell") || destination.startsWith("/api/garden-water-page")) proxyOwned += 1;
    else externallyDelegated += 1;
    continue;
  }

  const next = addCreatorAttribution(html);
  if (!hasVisibleCreatorAttribution(next)) {
    missing.push(`${tool.id}: attribution helper did not produce the required profile credit`);
    continue;
  }
  if (next === html) alreadyCovered += 1;
  else { if (!checkOnly) await writeFile(file, next); updated += 1; }
}

if (missing.length) {
  console.error("Creator attribution could not resolve registered tool pages:");
  missing.forEach((item) => console.error("  - " + item));
  process.exit(1);
}
if (proxyOwned && !/addCreatorAttribution/.test(await readFile(path.join(root, "lib/public-tool-page.js"), "utf8"))) {
  console.error("Proxy-served tools exist, but the shared public page renderer lacks creator attribution.");
  process.exit(1);
}
console.log(`Creator attribution${checkOnly ? " check" : " build"}: ${updated} static page(s) ${checkOnly ? "would need injection" : "updated"}, ${alreadyCovered} already visibly covered, ${proxyOwned} proxy routes and ${externallyDelegated} delegated routes inventoried; ${mainHostTools.length} main-host tools inventoried. Routed inventory is not emitted or live output verification.`);
