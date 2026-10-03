const { buildApproachContext } = require("../lib/niagara-approach-context");

const URLS = Object.freeze({
  nyEvents: "https://511ny.org/api/getevents",
  nyCameras: "https://511ny.org/api/getcameras",
  ontarioEvents: "https://511on.ca/api/v2/get/event",
  ontarioCameras: "https://511on.ca/api/v2/get/cameras",
});

const USER_AGENT =
  "NiagaraBorderCrossingDecision/2.0 (+https://chrisizworski.com/niagara-border-crossing/; contact: izworski@gmail.com)";

function configuredKeys() {
  return {
    ny: process.env.NY511_API_KEY || null,
    ontario: process.env.ONTARIO511_API_KEY || null,
  };
}

async function fetchJson(url, params) {
  const requestUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => requestUrl.searchParams.set(key, value));
  const response = await fetch(requestUrl, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Official approach source returned ${response.status}`);
  return response.json();
}

async function sourcePair(key, eventsUrl, camerasUrl, extraParams = {}) {
  if (!key) return { configured: false, available: false, events: [], cameras: [] };
  const baseParams = { key, format: "json", ...extraParams };
  const [eventsResult, camerasResult] = await Promise.allSettled([
    fetchJson(eventsUrl, baseParams),
    fetchJson(camerasUrl, baseParams),
  ]);
  return {
    configured: true,
    available: eventsResult.status === "fulfilled" || camerasResult.status === "fulfilled",
    events: eventsResult.status === "fulfilled" ? eventsResult.value : [],
    cameras: camerasResult.status === "fulfilled" ? camerasResult.value : [],
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=180, stale-while-revalidate=600");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const keys = configuredKeys();
  const [ny, ontario] = await Promise.all([
    sourcePair(keys.ny, URLS.nyEvents, URLS.nyCameras),
    sourcePair(keys.ontario, URLS.ontarioEvents, URLS.ontarioCameras, { lang: "en" }),
  ]);

  const context = buildApproachContext(
    {
      nyEvents: ny.events,
      nyCameras: ny.cameras,
      ontarioEvents: ontario.events,
      ontarioCameras: ontario.cameras,
    },
    {
      ny: { configured: ny.configured, available: ny.available },
      ontario: { configured: ontario.configured, available: ontario.available },
    },
  );

  const body = {
    fetched_at: new Date().toISOString(),
    ...context,
    definitions: {
      approach_context: "Official incidents and cameras in the Buffalo–Niagara–Fort Erie corridor. Nearby does not mean the item is on the traveler's exact route.",
      decision_role: "Context only. Approach events do not modify the crossing recommendation in this release.",
    },
  };

  if (req.method === "HEAD" && typeof res.end === "function") return res.status(200).end();
  return res.status(200).json(body);
};

module.exports.URLS = URLS;
module.exports.configuredKeys = configuredKeys;
module.exports.fetchJson = fetchJson;
module.exports.sourcePair = sourcePair;
