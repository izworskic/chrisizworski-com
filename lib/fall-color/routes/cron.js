// /api/cron-report -- runs daily via Vercel Cron. Generates the AI report ONLY in season.
// Not user callable: requires the Vercel cron Authorization header (CRON_SECRET).
const { getConditions } = require("../data.js");
const { REGIONS } = require("../regions.js");
const { snapshotFor, inSeason } = require("../model.js");
const { annotateReport } = require("../report-provenance.js");
const { writeModelReport } = require("../model-report-writer.js");
const { authorizeCronRequest } = require("../github-actions-oidc.js");

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "https://winning-dogfish-39241.upstash.io";
async function redis(cmd) {
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!token) throw new Error("missing Upstash REST token (UPSTASH_REDIS_REST_TOKEN or KV_REST_API_TOKEN)");
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  return j ? j.result : null;
}

module.exports = async (req, res) => {
  // Hub convention: API routes are never indexed.
  res.setHeader("X-Robots-Tag", "noindex");
  const auth = req.headers.authorization || "";
  const test = req.query && req.query.test === "1"; // bypass season gate for a one-time check
  const authorized = await authorizeCronRequest({
    authorization: auth,
    isTest: test,
    cronSecret: process.env.CRON_SECRET || "",
    expectedSha: process.env.VERCEL_GIT_COMMIT_SHA || "",
  });
  if (!authorized) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const force = req.query && req.query.force === "1";
  const dateKey = new Date().toLocaleString("en-CA", { timeZone: "America/Detroit" }).slice(0, 10);

  if (!inSeason() && !test) {
    res.status(200).json({ skipped: "off-season", date: dateKey });
    return;
  }
  try {
    const existing = await redis(["GET", "fallcolor:report:" + dateKey]);
    if (existing && !force) {
      res.status(200).json({ skipped: "already-generated", date: dateKey });
      return;
    }
  } catch (e) { /* if redis read fails, fall through and try to generate */ }

  let cond;
  try {
    cond = await getConditions();
  } catch (e) {
    res.status(502).json({ error: "conditions-unavailable", detail: String((e && e.message) || e) });
    return;
  }
  // Writing a report from zero regions would produce prose that reads like an assessment with no
  // observation behind it. Refuse rather than invent.
  if (!cond || !Array.isArray(cond.regions) || cond.regions.length === 0) {
    res.status(502).json({ error: "conditions-empty", detail: "no regions returned; refusing to write a report from nothing" });
    return;
  }
  const condMap = {};
  (cond.regions || []).forEach((r) => (condMap[r.id] = r));
  const snap = REGIONS.map((r) => snapshotFor(r, condMap[r.id], cond && cond.anchor));

  // One scheduled edition per Michigan calendar day. Cached readers never call a writer.
  // This writer uses only the modeled input; no Anthropic request, token, or usage charge.
  const body = writeModelReport(snap);
  if (!body) {
    res.status(502).json({ error: "empty-model-report" });
    return;
  }

  const obj = annotateReport({ generationMethod: "Deterministic model summary", date: dateKey, updated: new Date().toISOString(), body, conditionsUpdated: cond.updated, sourceEvidence: snap.map(s => ({ region: s.id, modeledPercent: s.pct, source: s.source })) });
  try {
    await redis(["SET", "fallcolor:report:" + dateKey, JSON.stringify(obj), "EX", 60 * 60 * 24 * 45]);
    await redis(["SET", "fallcolor:report:latest", JSON.stringify(obj)]);
  } catch (e) {
    res.status(500).json({ error: "redis-write", detail: String((e && e.message) || e) });
    return;
  }
  res.status(200).json({ ok: true, date: dateKey, chars: body.length });
};
