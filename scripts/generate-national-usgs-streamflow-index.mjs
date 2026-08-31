#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE = "https://waterservices.usgs.gov/nwis/site/";
const UA = "ChrisIzworskiNationalRiverIndex/1.0 (+https://chrisizworski.com/national-tools/rivers/)";
const STATE_FIPS = [
  "01","02","04","05","06","08","09","10","11","12","13","15","16","17","18","19",
  "20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35",
  "36","37","38","39","40","41","42","44","45","46","47","48","49","50","51","53",
  "54","55","56","60","66","69","72","78"
];
const CONCURRENCY = 4;
const MAX_ATTEMPTS = 4;
const TIMEOUT_MS = 30000;
const OUTPUT = path.resolve("public/data/national-usgs-streamflow-sites.json");

function finite(value, min = -Infinity, max = Infinity) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function parseRdb(body, stateFips) {
  const lines = String(body || "").split(/\r?\n/).filter(Boolean);
  const hi = lines.findIndex((line) => !line.startsWith("#") && line.includes("site_no") && line.includes("station_nm"));
  if (hi < 0) return [];
  const headers = lines[hi].split("\t");
  const index = (name) => headers.indexOf(name);
  const idI = index("site_no");
  const nameI = index("station_nm");
  const latI = index("dec_lat_va");
  const lonI = index("dec_long_va");
  if ([idI, nameI, latI, lonI].some((i) => i < 0)) return [];
  return lines.slice(hi + 2)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t"))
    .map((parts) => ({
      id: parts[idI],
      name: parts[nameI],
      latitude: finite(parts[latI], -90, 90),
      longitude: finite(parts[lonI], -180, 180),
      state_fips: stateFips,
    }))
    .filter((site) => site.id && site.name && site.latitude != null && site.longitude != null);
}
async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchState(stateFips) {
  const url = new URL(SITE);
  url.searchParams.set("format", "rdb");
  url.searchParams.set("stateCd", stateFips);
  url.searchParams.set("siteType", "ST");
  url.searchParams.set("siteStatus", "active");
  url.searchParams.set("hasDataTypeCd", "iv");
  url.searchParams.set("parameterCd", "00060");

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { accept: "text/plain", "user-agent": UA },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status === 404) return [];
      if (!response.ok) throw new Error(`USGS site service returned ${response.status}`);
      const body = await response.text();
      return parseRdb(body, stateFips);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(750 * attempt);
    }
  }
  throw new Error(`${stateFips}: ${String(lastError?.message || lastError)}`);
}

const results = new Array(STATE_FIPS.length);
let cursor = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= STATE_FIPS.length) return;
    const state = STATE_FIPS[index];
    const sites = await fetchState(state);
    results[index] = { state, sites };
    process.stdout.write(`${state}: ${sites.length} sites\n`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const byId = new Map();
for (const result of results) {
  for (const site of result.sites) {
    if (!byId.has(site.id)) byId.set(site.id, site);
  }
}
const sites = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
if (sites.length < 5000) {
  throw new Error(`Generated only ${sites.length} active streamflow sites; refusing to publish an incomplete national index.`);
}

const payload = {
  version: 1,
  generated_at: new Date().toISOString(),
  source_name: "USGS Site Service",
  source_url: SITE,
  criteria: {
    siteType: "ST",
    siteStatus: "active",
    hasDataTypeCd: "iv",
    parameterCd: "00060",
  },
  states_requested: STATE_FIPS,
  site_count: sites.length,
  sites,
};

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(payload));
process.stdout.write(`Wrote ${sites.length} sites to ${OUTPUT}\n`);
