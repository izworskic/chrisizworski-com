// Read-only public GitHub data branch. GitHub Actions is the *sole* writer.
// This replaces hot-path calls to a shared suspended Upstash Redis database.
// Serverless memory memoization plus CDN response caching amortize reads.
const RAW_ROOT = "https://raw.githubusercontent.com/izworskic/chrisizworski-com/fall-color-data/data/fall-color";
const shared = new Map();

function dateKey(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US",
    { timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now).map(x => [x.type, x.value]));
  return parts.year + "-" + parts.month + "-" + parts.day;
}

async function getJson(path, { ttlMs = 120000, fetchImpl = fetch } = {}) {
  if (!/^(?:mi|national)\/(?:latest|index|\d{4}-\d{2}-\d{2})\.json$/.test(path)) return null;
  const cached = shared.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  try {
    const r = await fetchImpl(RAW_ROOT + "/" + path, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (r.status === 404) {
      shared.set(path, { data: null, expiresAt: Date.now() + 30000 });
      return null;
    }
    if (!r.ok) throw new Error("GitHub archive HTTP " + r.status);
    const data = await r.json();
    shared.set(path, { data, expiresAt: Date.now() + ttlMs });
    return data;
  } catch {
    // Never present stale narrative as *current*; caller must check date.
    return cached ? cached.data : null;
  }
}
module.exports = { dateKey, getJson, RAW_ROOT };
