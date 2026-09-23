// /api/fall-color -- single entry point for the whole fall color tool.
//
// This is one Serverless Function on purpose. The Vercel Hobby plan caps a
// deployment at 12 Serverless Functions, and the hub was already at 11 before this
// property moved in. Five separate routes would have been 16 and the build fails
// outright. So the five handlers live in lib/fall-color/routes/ (outside api/, where
// they do not each become a function) and this dispatcher picks one by ?view=.
// Public paths are preserved by rewrites in vercel.json, so nothing user facing or
// SEO facing depends on this shape.
//
// If the hub ever moves to Pro, these can be split back out with no URL change.
const handlers = {
  conditions: require("../lib/fall-color/routes/conditions.js"),
  report: require("../lib/fall-color/routes/report.js"),
  snapshot: require("../lib/fall-color/routes/snapshot.js"),
  rss: require("../lib/fall-color/routes/rss.js"),
  sitemap: require("../lib/fall-color/routes/sitemap.js"),
  cron: require("../lib/fall-color/routes/cron.js"),
  "old-sow-live": require("../lib/old-sow/route.js"),
  "mackinac-island": require("../lib/mackinac-island/route.js"),
  "detroit-outdoors": require("../lib/detroit-outdoors/route.js"),
};

const DETROIT_FREIGHTER_SAFE_CACHE_SECONDS = 60;
const DETROIT_FOCUSED_CACHE_SECONDS = 300;
const DETROIT_AIS_PUBLIC_MAX_AGE_MS = 10 * 60 * 1000;
const DETROIT_FREIGHTER_CARD_ID = "riverfront-live-freighter";

function detroitQuery(req) {
  return new URL(req.url || "/", "https://chrisizworski.com").searchParams;
}

function detroitRequestContext(req) {
  const query = detroitQuery(req);
  const intent = String((req.query && req.query.intent) || query.get("intent") || "");
  const mode = String((req.query && req.query.mode) || query.get("mode") || "");
  const boardIds = String((req.query && req.query.boardIds) || query.get("boardIds") || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return { intent, mode, boardIds };
}

function requestReferencesFreighter(req) {
  const context = detroitRequestContext(req);
  return context.intent === "freighter" || context.boardIds.includes(DETROIT_FREIGHTER_CARD_ID);
}

function parseSharedMaxAge(value) {
  const match = String(value || "").match(/(?:^|[,\s])s-maxage=(\d+)/i);
  return match ? Number(match[1]) : null;
}

function detroitCachePolicy(req, proposedValue, aisRemainingSeconds = null) {
  const context = detroitRequestContext(req);

  // Editorial prose that references a freighter is intentionally not edge-cached.
  // Browser/session and server-side editorial caches still absorb model cost, while
  // the public sentence can never outlive the live AIS decision that justified it.
  if (context.mode === "editorial" && requestReferencesFreighter(req)) return "no-store";

  let ttl = context.intent && context.intent !== "freighter"
    ? DETROIT_FOCUSED_CACHE_SECONDS
    : DETROIT_FREIGHTER_SAFE_CACHE_SECONDS;

  const proposedSeconds = parseSharedMaxAge(proposedValue);
  if (Number.isFinite(proposedSeconds)) ttl = Math.min(ttl, proposedSeconds);
  if (Number.isFinite(aisRemainingSeconds)) ttl = Math.min(ttl, Math.max(0, Math.floor(aisRemainingSeconds)));

  return ttl > 0 ? `public, s-maxage=${ttl}, must-revalidate` : "no-store";
}

function candidateAisRemainingSeconds(candidate, now = Date.now()) {
  if (!candidate || typeof candidate !== "object") return null;
  const signals = [candidate, ...(Array.isArray(candidate.bundleSignals) ? candidate.bundleSignals : [])];
  let remaining = null;

  for (const signal of signals) {
    if (!signal || signal.sourceEngine !== "great-lakes-ais") continue;
    const observed = Date.parse(signal.timeWindow && signal.timeWindow.start || "");
    if (!Number.isFinite(observed)) return 0;
    const ageMs = Math.max(0, now - observed);
    const seconds = Math.floor((DETROIT_AIS_PUBLIC_MAX_AGE_MS - ageMs) / 1000);
    remaining = remaining === null ? seconds : Math.min(remaining, seconds);
  }

  return remaining;
}

function responseAisRemainingSeconds(body, now = Date.now()) {
  if (!body || typeof body !== "object") return null;
  const candidates = [];
  if (body.intent && body.intent.candidate) candidates.push(body.intent.candidate);
  if (Array.isArray(body.opportunities)) candidates.push(...body.opportunities);

  let remaining = null;
  for (const candidate of candidates) {
    const seconds = candidateAisRemainingSeconds(candidate, now);
    if (!Number.isFinite(seconds)) continue;
    remaining = remaining === null ? seconds : Math.min(remaining, seconds);
  }
  return remaining;
}

module.exports = async (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex");
  const view = String((req.query && req.query.view) || "conditions");
  const handler = handlers[view];
  if (!handler) {
    res.status(404).json({ error: "unknown view", view: view });
    return;
  }

  if (view === "detroit-outdoors") {
    const setHeader = res.setHeader.bind(res);
    const sendJson = res.json.bind(res);
    let proposedCacheControl = null;

    res.setHeader = (name, value) => {
      if (String(name).toLowerCase() === "cache-control") {
        proposedCacheControl = String(value || "");
        if (/s-maxage/i.test(proposedCacheControl)) {
          return setHeader(name, detroitCachePolicy(req, proposedCacheControl));
        }
      }
      return setHeader(name, value);
    };

    res.json = body => {
      const remaining = responseAisRemainingSeconds(body, Date.now());
      if (Number.isFinite(remaining)) {
        // This is the response-time guard missing from the first cost-control pass.
        // If a vessel crossed the hard ten-minute line while the board/JEV work was
        // running, do not publish that decision as current. Otherwise cap shared
        // cache life to the exact remaining AIS lifetime.
        if (remaining <= 0) {
          setHeader("Cache-Control", "no-store");
          res.statusCode = 409;
          return sendJson({ ok: false, error: "detroit-ais-expired-during-render" });
        }
        setHeader("Cache-Control", detroitCachePolicy(req, proposedCacheControl, remaining));
      }
      return sendJson(body);
    };
  }
  return handler(req, res);
};