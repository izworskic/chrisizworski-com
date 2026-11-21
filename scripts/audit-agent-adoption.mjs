#!/usr/bin/env node
/**
 * Read-only adoption inventory for independently owned tools.
 * The central repository does not inject policy into sibling repositories.
 * Missing access is UNKNOWN, never interpreted as compliant.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

export const REPOSITORIES = Object.freeze([
  "izworskic/national-outdoor-core",
  "izworskic/national-outdoor-tools-hub",
  "izworskic/national-aurora",
  "izworskic/national-rivers",
  "izworskic/national-frost",
  "izworskic/national-planting",
  "izworskic/national-fall-color",
  "izworskic/national-coastal-water",
  "izworskic/national-snowpack-melt",
  "izworskic/national-white-christmas",
  "izworskic/rocky-mountain-elk-rut-live",
  "izworskic/isle-royale-outdoors",
  "izworskic/phenology-michigan",
]);
export const ENTRYPOINTS = Object.freeze([
  "AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md",
]);
export const OS_URL = "https://github.com/izworskic/chrisizworski-com/tree/main/design-systems/experience-os-v1";
export const INVESTMENT_URL = "https://github.com/izworskic/chrisizworski-com/tree/main/.agents/skills/experience-investment";

export function classifyAdoption(files) {
  if (!files || files.some((item) => item.status === "unknown")) {
    return { status: "unknown", os: false, investment: false };
  }
  const contents = files.filter((item) => item.status === "present").map((item) => item.content).join("\n");
  const os = /EXPERIENCE_OS_V1/i.test(contents) && contents.includes(OS_URL);
  const investment = /experience-investment/i.test(contents) && contents.includes(INVESTMENT_URL);
  return {
    status: os && investment ? "adopted" : os || investment ? "partial" : "missing",
    os, investment,
  };
}

export function adoptionInstruction() {
  return [
    "Review the owning repository's AGENTS.md, tests, source and deployment rules first.",
    "For new tools and substantial visitor-facing redesigns, consult the central",
    "EXPERIENCE_OS_V1 package: " + OS_URL,
    "and Experience Investment: " + INVESTMENT_URL,
    "Use the latest released compatible 1.2.x Experience OS manifest, without",
    "copying a generic layout. The owning repository's safety, access, data,",
    "canonical, advertising, and CI requirements remain authoritative.",
    "For tiny fixes, apply directly relevant guardrails only. Never auto-merge.",
  ].join("\n");
}

function headers() {
  const h = { "Accept": "application/vnd.github+json", "User-Agent": "agent-adoption-readonly-audit", "X-GitHub-Api-Version": "2022-11-28" };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) h.Authorization = "Bearer " + token;
  return h;
}
async function request(url) {
  const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(12000) });
  if (response.status === 404) return { status: "missing" };
  if (!response.ok) return { status: "unknown", reason: "HTTP " + response.status };
  return { status: "present", data: await response.json() };
}
async function inspect(repo) {
  try {
    const metadata = await request("https://api.github.com/repos/" + repo);
    if (metadata.status !== "present") {
      return { repo, status: "unknown", reason: "Repository " + (metadata.reason || metadata.status), files: [] };
    }
    const paths = await Promise.all(ENTRYPOINTS.map(async path => {
      try {
        const response = await request("https://api.github.com/repos/" + repo + "/contents/" + path);
        if (response.status !== "present") return { path, ...response };
        if (response.data.type !== "file" || response.data.encoding !== "base64" || typeof response.data.content !== "string") {
          return { path, status: "unknown", reason: "Unsupported GitHub content" };
        }
        const content = Buffer.from(response.data.content.replace(/\s/g, ""), "base64").toString("utf8");
        return { path, status: "present", content };
      } catch (error) {
        return { path, status: "unknown", reason: String(error.message || error) };
      }
    }));
    const result = classifyAdoption(paths);
    return {
      repo,
      ...result,
      defaultBranch: metadata.data.default_branch || null,
      checkedFiles: paths.map(({ path, status, reason }) => ({ path, status, ...(reason ? { reason } : {}) })),
    };
  } catch (error) {
    return { repo, status: "unknown", reason: String(error.message || error), files: [] };
  }
}

export function optionsFrom(argv) {
  const opts = { strict: false, output: "artifacts/agent-adoption-audit.json", repos: REPOSITORIES };
  for (const arg of argv) {
    if (arg === "--strict") opts.strict = true;
    else if (arg.startsWith("--output=")) opts.output = arg.slice("--output=".length);
    else if (arg.startsWith("--repo=")) {
      const requested = arg.slice("--repo=".length);
      if (!REPOSITORIES.includes(requested)) throw new Error("Repository outside reviewed ownership list: " + requested);
      opts.repos = [requested];
    } else throw new Error("Unsupported argument: " + arg);
  }
  return opts;
}

export async function main(argv = process.argv.slice(2)) {
  const opts = optionsFrom(argv);
  const rows = [];
  // Sequential calls avoid rate-limit spikes and make source failures visible.
  for (const repo of opts.repos) rows.push(await inspect(repo));
  const summary = Object.fromEntries(["adopted", "partial", "missing", "unknown"].map(key => [key, rows.filter(row => row.status === key).length]));
  const report = {
    schemaVersion: 1, checkedAt: new Date().toISOString(), scope: "read-only",
    source: "owning-repository-agent-entrypoints", summary, rows,
    note: "Source references only. Actual agent runtime loading and adoption in delivered PRs require separate evidence.",
  };
  await mkdir(dirname(opts.output), { recursive: true });
  await writeFile(opts.output, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log("Cross-repository agent adoption: " + JSON.stringify(summary));
  for (const row of rows) console.log(row.status.toUpperCase().padEnd(9) + " " + row.repo);
  console.log("Report: " + opts.output);
  if (opts.strict && (summary.partial || summary.missing || summary.unknown)) process.exitCode = 1;
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
}
