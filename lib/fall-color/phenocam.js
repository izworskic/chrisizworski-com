// PhenoCam ground truth anchor.
//
// The regional peak model is a climatology curve: it knows when a region USUALLY turns,
// not whether this particular year is running early or late. Satellite NDVI was meant to
// supply that, but the ORNL MODIS subset service runs 65 to 75 days behind, so during the
// season it is always older than the model's freshness guard and never contributes.
//
// PhenoCam solves the part that matters. These are cameras pointed at real forest canopy,
// publishing Green Chromatic Coordinate (gcc = G / (R + G + B)), the standard phenology
// colour index, with about two days of latency. We do not use them to draw a map; there
// are only two usable sites near Michigan and neither sits in the core U.P. colour zone.
// We use them for one number: how many days ahead of or behind its own history this
// autumn is running. That single offset shifts the whole climatology curve, which is
// exactly the thing a calendar cannot know about itself.
//
// Sites: kempnrs (45.84, -89.68) anchors the north, sanford (42.73, -84.46) the south.
// Both deciduous broadleaf, both updating daily. UMBS Pellston would be the ideal
// Michigan site but that camera has been down since March 2026.

const SITES = [
  { id: "kempnrs", lat: 45.84, lon: -89.68, label: "Kemp, northern hardwoods" },
  { id: "sanford", lat: 42.73, lon: -84.46, label: "Sanford, southern Michigan" },
];

const MAX_SHIFT_DAYS = 10;   // a bad camera week must never wreck the model
const MIN_SENESCENCE = 0.10; // below this the offset is noise, not signal
const MIN_PRIOR_YEARS = 2;

function doy(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
}
function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function quantile(a, q) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
}

async function fetchSeries(siteId) {
  const url = `https://phenocam.nau.edu/data/archive/${siteId}/ROI/${siteId}_DB_1000_1day.csv`;
  const res = await fetch(url, { headers: { "User-Agent": "chrisizworski.com fall colour" } });
  if (!res.ok) return null;
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l && !l.startsWith("#"));
  if (lines.length < 2) return null;
  const head = lines[0].split(",").map((h) => h.trim());
  const di = head.indexOf("date");
  const gi = head.indexOf("gcc_90");
  if (di < 0 || gi < 0) return null;
  const out = [];
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const v = parseFloat(c[gi]);
    if (c[di] && Number.isFinite(v) && v > 0.2 && v < 0.6) out.push({ date: c[di].trim(), gcc: v, y: +c[di].slice(0, 4), doy: doy(c[di].trim()) });
  }
  return out.length ? out : null;
}

// How far through senescence a reading sits, 0 = full summer canopy, 1 = bare.
function senescenceCurveForYear(rows, year, floor) {
  const summer = rows.filter((r) => r.y === year && r.doy >= 196 && r.doy <= 227).map((r) => r.gcc);
  const baseline = median(summer);
  if (baseline == null || baseline <= floor) return null;
  return rows
    .filter((r) => r.y === year && r.doy >= 228 && r.doy <= 320)
    .map((r) => ({ doy: r.doy, frac: Math.min(1, Math.max(0, (baseline - r.gcc) / (baseline - floor))) }));
}

function offsetForSite(rows, todayDoy, thisYear) {
  const autumn = rows.filter((r) => r.doy >= 288 && r.doy <= 320).map((r) => r.gcc);
  const floor = quantile(autumn, 0.1);
  if (floor == null) return null;

  const current = senescenceCurveForYear(rows, thisYear, floor);
  if (!current || !current.length) return { frac: null, shift: null, reason: "before the senescence window" };
  const recent = current.filter((p) => p.doy <= todayDoy).slice(-3);
  if (!recent.length) return { frac: null, shift: null, reason: "before the senescence window" };
  const frac = median(recent.map((p) => p.frac));
  const fracR = frac == null ? null : Math.round(frac * 100) / 100;
  if (frac == null || frac < MIN_SENESCENCE) return { frac: fracR, shift: null, reason: "senescence has not started" };
  // Past about 90% the canopy is essentially down and an offset no longer means anything.
  if (frac > 0.9) return { frac: fracR, shift: null, reason: "senescence complete" };

  const priorYears = [...new Set(rows.map((r) => r.y))].filter((y) => y < thisYear);
  const curves = priorYears.map((y) => senescenceCurveForYear(rows, y, floor)).filter(Boolean);
  if (curves.length < MIN_PRIOR_YEARS) return { frac: fracR, shift: null, reason: "not enough prior years" };

  // Historical mean fraction by day of year, then the day it normally reaches today's fraction.
  const byDoy = new Map();
  for (const c of curves) for (const p of c) {
    if (!byDoy.has(p.doy)) byDoy.set(p.doy, []);
    byDoy.get(p.doy).push(p.frac);
  }
  const normal = [...byDoy.entries()].map(([d, v]) => ({ doy: d, frac: median(v) })).sort((a, b) => a.doy - b.doy);
  let normalDoy = null;
  for (const p of normal) if (p.frac >= frac) { normalDoy = p.doy; break; }
  if (normalDoy == null) return { frac: fracR, shift: null, reason: "beyond historical range" };

  const raw = normalDoy - todayDoy; // positive: normally reached later, so this year is ahead
  return { frac: fracR, shift: Math.max(-MAX_SHIFT_DAYS, Math.min(MAX_SHIFT_DAYS, raw)), rawShift: raw, priorYears: curves.length };
}

async function getSeasonOffset(nowDate) {
  const now = nowDate || new Date();
  const thisYear = now.getUTCFullYear();
  const todayDoy = Math.floor((now - Date.UTC(thisYear, 0, 0)) / 86400000);
  const sites = [];
  await Promise.all(SITES.map(async (s) => {
    try {
      const rows = await fetchSeries(s.id);
      if (!rows) return;
      const latest = rows[rows.length - 1];
      const ageDays = Math.round((now - new Date(latest.date + "T00:00:00Z")) / 86400000);
      if (ageDays > 14) { sites.push({ ...s, stale: true, ageDays, latest: latest.date }); return; }
      const o = offsetForSite(rows, todayDoy, thisYear);
      if (o) sites.push({ ...s, ageDays, latest: latest.date, ...o });
    } catch (e) { /* a camera being down must never break the page */ }
  }));

  const usable = sites.filter((s) => typeof s.shift === "number");
  if (!usable.length) {
    return { shift: 0, confidence: "none", sites, note: sites.length ? "cameras reporting, senescence not yet underway" : "no usable camera data" };
  }
  const shift = Math.round(median(usable.map((s) => s.shift)));
  const agree = usable.length < 2 || usable.every((s) => Math.sign(s.shift) === Math.sign(usable[0].shift) || s.shift === 0);
  return { shift, confidence: usable.length >= 2 && agree ? "good" : "low", sites, note: agree ? null : "anchor sites disagree on direction" };
}

module.exports = { getSeasonOffset, SITES, _internal: { fetchSeries, offsetForSite, doy } };
