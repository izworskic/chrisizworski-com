const {
  compareNiagaraCrossings,
  mergeNiagaraSources,
  normalizeSelection,
  parseOperatorTrafficHtml,
} = require("../lib/niagara-border-crossings");
const { cleanText, normalizeNwsAlerts } = require("../lib/border-crossings");

const URLS = Object.freeze({
  cbp: "https://bwt.cbp.gov/api/bwtnew",
  cbsa: "https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv",
  nfbc: "https://www.niagarafallsbridges.com/services/traffic-conditions",
  peace: "https://www.peacebridge.com/Traffic/index.php",
  nwsBuffalo: "https://api.weather.gov/alerts/active?point=42.8864,-78.8784",
  nwsNiagara: "https://api.weather.gov/alerts/active?point=43.0962,-79.0377",
  nwsLewiston: "https://api.weather.gov/alerts/active?point=43.1726,-79.0359",
  eccc: "https://api.weather.gc.ca/collections/weather-alerts/items?f=json&bbox=-79.30,42.80,-78.80,43.30&limit=50",
});

const USER_AGENT =
  "NiagaraBorderCrossingDecision/1.0 (+https://chrisizworski.com/niagara-border-crossing/; contact: izworski@gmail.com)";

async function fetchSource(url, type) {
  const response = await fetch(url, {
    headers: {
      accept: type === "text" ? "text/html, text/csv, text/plain" : "application/geo+json, application/json",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return type === "text" ? response.text() : response.json();
}

function sourceState(result, name, url, role) {
  return { name, url, role, available: result.status === "fulfilled" };
}

function normalizeEcccAlerts(payload) {
  return (Array.isArray(payload?.features) ? payload.features : [])
    .map((feature) => {
      const p = feature?.properties || {};
      return {
        id: cleanText(p.id || p.feature_id || feature.id) || null,
        source: "Environment and Climate Change Canada",
        headline: cleanText(p.alert_name_en || p.alert_short_name_en) || "Canadian weather alert",
        description: cleanText(p.alert_text_en) || null,
        impact: cleanText(p.impact_en) || null,
        confidence: cleanText(p.confidence_en) || null,
        status: cleanText(p.status_en || p.display_status) || null,
        severity: cleanText(p.risk_colour_en) || null,
        starts_at: p.validity_datetime || p.publication_datetime || null,
        ends_at: p.event_end_datetime || p.expiration_datetime || null,
        source_url: "https://weather.gc.ca/",
      };
    })
    .filter((alert) => alert.id || alert.headline);
}

function uniqueAlerts(alerts) {
  const seen = new Set();
  return alerts.filter((alert) => {
    const key = `${alert.source}|${alert.id || alert.headline}|${alert.starts_at || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=240");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const selection = normalizeSelection(req.query || {});
  const [cbpResult, cbsaResult, nfbcResult, peaceResult, nwsBuffaloResult, nwsNiagaraResult, nwsLewistonResult, ecccResult] =
    await Promise.allSettled([
      fetchSource(URLS.cbp, "json"),
      fetchSource(URLS.cbsa, "text"),
      fetchSource(URLS.nfbc, "text"),
      fetchSource(URLS.peace, "text"),
      fetchSource(URLS.nwsBuffalo, "json"),
      fetchSource(URLS.nwsNiagara, "json"),
      fetchSource(URLS.nwsLewiston, "json"),
      fetchSource(URLS.eccc, "json"),
    ]);

  const nfbc = nfbcResult.status === "fulfilled"
    ? parseOperatorTrafficHtml(nfbcResult.value, "Niagara Falls Bridge Commission", URLS.nfbc)
    : null;
  const peace = peaceResult.status === "fulfilled"
    ? parseOperatorTrafficHtml(peaceResult.value, "Buffalo and Fort Erie Public Bridge Authority", URLS.peace)
    : null;

  const crossings = mergeNiagaraSources(
    cbpResult.status === "fulfilled" ? cbpResult.value : [],
    cbsaResult.status === "fulfilled" ? cbsaResult.value : "",
    { nfbc, peace },
  );
  const decision = compareNiagaraCrossings(crossings, selection, new Date());

  const nwsAlerts = [
    ...(nwsBuffaloResult.status === "fulfilled" ? normalizeNwsAlerts(nwsBuffaloResult.value, "buffalo", "Buffalo / Peace Bridge approach") : []),
    ...(nwsNiagaraResult.status === "fulfilled" ? normalizeNwsAlerts(nwsNiagaraResult.value, "niagara-falls", "Niagara Falls approaches") : []),
    ...(nwsLewistonResult.status === "fulfilled" ? normalizeNwsAlerts(nwsLewistonResult.value, "lewiston", "Lewiston approach") : []),
  ];
  const ecccAlerts = ecccResult.status === "fulfilled" ? normalizeEcccAlerts(ecccResult.value) : [];

  const sources = {
    to_us_waits: sourceState(cbpResult, "U.S. Customs and Border Protection", "https://bwt.cbp.gov/", "PRIMARY AUTHORITY — U.S.-bound border processing"),
    to_canada_waits: sourceState(cbsaResult, "Canada Border Services Agency", "https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html", "PRIMARY AUTHORITY — Canada-bound processing at Peace, Rainbow and Lewiston–Queenston"),
    nfbc_operations: sourceState(nfbcResult, "Niagara Falls Bridge Commission", URLS.nfbc, "PRIMARY AUTHORITY — Rainbow, Whirlpool Rapids and Lewiston–Queenston bridge operations; Whirlpool wait context"),
    peace_operations: sourceState(peaceResult, "Buffalo and Fort Erie Public Bridge Authority", URLS.peace, "PRIMARY AUTHORITY — Peace Bridge operations"),
    nws_weather: {
      name: "National Weather Service",
      url: "https://www.weather.gov/",
      role: "PRIMARY AUTHORITY — U.S. weather alerts; context only",
      available: nwsBuffaloResult.status === "fulfilled" || nwsNiagaraResult.status === "fulfilled" || nwsLewistonResult.status === "fulfilled",
      complete: nwsBuffaloResult.status === "fulfilled" && nwsNiagaraResult.status === "fulfilled" && nwsLewistonResult.status === "fulfilled",
    },
    eccc_weather: sourceState(ecccResult, "Environment and Climate Change Canada", "https://weather.gc.ca/", "PRIMARY AUTHORITY — Canadian weather alerts; context only"),
    road_conditions: {
      name: "NITTEC / 511 New York / Ontario 511",
      role: "OFFICIAL APPROACH CONTEXT",
      integrated: false,
      reason: "The documented 511 APIs require developer keys. V1 links to official approach systems rather than silently scraping or using unauthenticated endpoints.",
      urls: ["https://www.nittec.org/", "https://511ny.org/", "https://511on.ca/"],
    },
  };

  const body = {
    fetched_at: new Date().toISOString(),
    selection,
    degraded: cbpResult.status !== "fulfilled" || cbsaResult.status !== "fulfilled" || nfbcResult.status !== "fulfilled" || peaceResult.status !== "fulfilled",
    decision,
    crossings,
    warnings: {
      weather: uniqueAlerts([...nwsAlerts, ...ecccAlerts]),
      note: "Weather alerts are travel context. They do not override bridge-owner closure or restriction authority.",
    },
    sources,
    definitions: {
      wait_time: "The authoritative agency's estimated border-processing delay for the selected direction and traveler category. It is not total trip time.",
      diversion_buffer: "A deliberately conservative bridge-switch guardrail used to avoid recommending a detour for a small wait difference. It is not a live route estimate.",
      source_stale: "The observation is too old for a confident crossing recommendation. Static eligibility and restrictions remain valid.",
      source_conflict: "Material official-source disagreement is exposed rather than silently resolved.",
      whirlpool: "Whirlpool Rapids is NEXUS-only. NFBC says real-time wait technology is not currently available there; operator updates are hourly.",
    },
  };

  if (req.method === "HEAD" && typeof res.end === "function") return res.status(200).end();
  return res.status(200).json(body);
};

module.exports.URLS = URLS;
module.exports.normalizeEcccAlerts = normalizeEcccAlerts;
module.exports.uniqueAlerts = uniqueAlerts;
