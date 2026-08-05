// /api/cron-report -- runs daily via Vercel Cron. Generates the AI report ONLY in season.
// Not user callable: requires the Vercel cron Authorization header (CRON_SECRET).
const { getConditions } = require("../data.js");
const { REGIONS, CANOE } = require("../regions.js");
const { snapshotFor, inSeason, etParts } = require("../model.js");

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

const SYSTEM = [
  "You write a short daily note on where Michigan's fall color is turning. The tone is calm and unhurried, a little literary, the voice of someone who loves these woods and is in no rush.",
  "You are given today's live color for each region, north to south, from satellite canopy readings and recent weather, plus each region's peak window, a short weather read, and a list of canoe runs. Stay grounded in that data and invent nothing; when you mention a place, use the real names provided.",
  "Write 2 to 3 short paragraphs, about 150 to 200 words. Note where the color is richest and let the reader feel its pull, but do not command them: never write go now, hurry, do not miss, must, or should. You may offer a fitting drive, trail, or paddle, and the weather for the days ahead, as a gentle invitation rather than an instruction. If color is past peak somewhere, mention the quiet second wave: tamarack gold in the bogs in early to mid November, oak and beech holding russet, the Lake Michigan shoreline about a week behind. Close softly with what is coming.",
  "Plain prose only. No headings, no bullet points, no markdown, no emoji. Never use em dashes; use commas, periods, semicolons, or colons.",
].join(" ");

module.exports = async (req, res) => {
  // Hub convention: API routes are never indexed.
  res.setHeader("X-Robots-Tag", "noindex");
  const auth = req.headers.authorization || "";
  if (!process.env.CRON_SECRET || auth !== "Bearer " + process.env.CRON_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const force = req.query && req.query.force === "1";
  const test = req.query && req.query.test === "1"; // bypass season gate for a one-time check
  const p = etParts();
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

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(200).json({ error: "missing ANTHROPIC_API_KEY" });
    return;
  }

  let cond;
  try { cond = await getConditions(); } catch (e) { cond = { regions: [] }; }
  const condMap = {};
  (cond.regions || []).forEach((r) => (condMap[r.id] = r));
  const snap = REGIONS.map((r) => snapshotFor(r, condMap[r.id]));

  const lines = snap.map((s) =>
    "- " + s.name + " (" + s.area + "): " + s.label + ", about " + s.pct + " percent. " +
    "Canopy " + (s.canopyPct != null ? s.canopyPct + "% of summer" : "n/a") + ", recent low " +
    (s.lowestRecent != null ? s.lowestRecent + "F" : "n/a") + (s.frost ? ", frost" : "") +
    ". Peak " + s.peakWindow + ". Weather ahead: " + (s.weatherFeel || "n/a") + ". Drive: " + s.drive + ". Hike: " + s.hike + ". Paddle: " + s.paddle + "."
  ).join("\n");
  const rivers = CANOE.map((c) => {
    const s = snap.find((x) => x.id === c.region);
    return "- " + c.name + " (" + c.stretch + "): " + c.level + ", " + c.hours +
      ", color about " + (s ? s.pct : "?") + " percent.";
  }).join("\n");

  const userMsg = "Date: " + new Date().toLocaleDateString("en-US", { timeZone: "America/Detroit", weekday: "long", month: "long", day: "numeric" }) +
    ".\n\nLive color by region, north to south:\n" + lines +
    "\n\nCanoe runs and their color today:\n" + rivers +
    "\n\nWrite today's Michigan fall color report.";

  let body = "";
  try {
    const ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 700, system: SYSTEM, messages: [{ role: "user", content: userMsg }] }),
    });
    const aj = await ar.json();
    body = ((aj && aj.content) || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!body && aj && aj.error) { res.status(200).json({ error: "anthropic", detail: aj.error }); return; }
  } catch (e) {
    res.status(200).json({ error: "anthropic-fetch", detail: String((e && e.message) || e) });
    return;
  }
  if (!body) { res.status(200).json({ error: "empty-generation" }); return; }

  const obj = { date: dateKey, updated: new Date().toISOString(), body };
  try {
    await redis(["SET", "fallcolor:report:" + dateKey, JSON.stringify(obj), "EX", 60 * 60 * 24 * 45]);
    await redis(["SET", "fallcolor:report:latest", JSON.stringify(obj)]);
  } catch (e) {
    res.status(200).json({ error: "redis-write", detail: String((e && e.message) || e) });
    return;
  }
  res.status(200).json({ ok: true, date: dateKey, chars: body.length });
};
