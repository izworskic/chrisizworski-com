// Return one fully validated dated edition to a signed, repo-owned GitHub
// Actions runner. The runner commits it to fall-color-data; no Redis, no PAT,
// and no public page request can call Anthropic or write data.
const { authorizeCronRequest } = require("../github-actions-oidc.js");
const { dateKey } = require("../github-edition-store.js");
const { getConditions } = require("../data.js");
const { REGIONS } = require("../regions.js");
const { snapshotFor, inSeason } = require("../model.js");
const { annotateReport } = require("../report-provenance.js");
const { writeModelReport } = require("../model-report-writer.js");
const { generateDailyFallEditorial } = require("../daily-editorial.js");
const national = require("./national-briefings.js");

async function michiganEdition(today) {
  if (!inSeason()) return null;
  const conditions = await getConditions();
  if (!Array.isArray(conditions?.regions) || !conditions.regions.length) return null;
  const lookup = Object.fromEntries(conditions.regions.map(x => [x.id, x]));
  const snapshot = REGIONS.map(region => snapshotFor(region, lookup[region.id], conditions.anchor));
  const generated = await generateDailyFallEditorial(snapshot);
  const body = generated || writeModelReport(snapshot);
  if (!body) return null;
  return annotateReport({
    date: today,
    updated: new Date().toISOString(),
    body,
    generationMethod: generated ? "AI-generated model summary" : "Deterministic model summary",
    conditionsUpdated: conditions.updated,
    sourceEvidence: snapshot.map(s => ({ region: s.id, modeledPercent: s.pct, source: s.source })),
  });
}

module.exports = async (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  // Match a fully signed repo owner, branch, reusable workflow and production
  // commit identity, not a query-string 'force' or guessed shared secret.
  const allowed = await authorizeCronRequest({
    authorization: req.headers?.authorization || "",
    isTest: true,
    cronSecret: "",
    expectedSha: process.env.VERCEL_GIT_COMMIT_SHA || "",
  });
  if (!allowed) return res.status(401).json({ error: "unauthorized" });
  const today = dateKey();
  if (req.query?.check === "1") return res.status(200).json({ ok:true, authenticated:true, date:today });
  const kind = req.query?.kind;
  if (kind !== "mi" && kind !== "national") return res.status(400).json({ error: "unknown edition kind" });
  if (kind === "national" && !national._test.isSeason(today)) return res.status(200).json({ skipped: "off-season", date: today });
  if (kind === "mi" && !inSeason()) return res.status(200).json({ skipped: "off-season", date: today });
  try {
    const edition = kind === "mi" ? await michiganEdition(today) : await national.buildGithubEdition();
    if (!edition || edition.date !== today) {
      return res.status(502).json({ error: "source-or-generation-unavailable", date: today });
    }
    return res.status(200).json({ ok: true, date: today, kind, edition });
  } catch (error) {
    return res.status(502).json({ error: "edition-generation-failed", date: today, detail: String(error.message || error).slice(0,180) });
  }
};
