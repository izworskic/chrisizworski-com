// Shared live-data layer (keyless): Open-Meteo weather + NASA MODIS NDVI via ORNL.
const { REGIONS } = require("./regions.js");
const { getSeasonOffset } = require("./phenocam.js");

function modisDate(d) {
  const y = d.getUTCFullYear();
  const start = Date.UTC(y, 0, 0);
  const doy = Math.floor((d.getTime() - start) / 86400000);
  return "A" + y + String(doy).padStart(3, "0");
}

async function getWeatherAll() {
  const lats = REGIONS.map((r) => r.lat).join(",");
  const lons = REGIONS.map((r) => r.lon).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max&past_days=14&forecast_days=7&temperature_unit=fahrenheit&timezone=America%2FDetroit`;
  const res = await fetch(url);
  const j = await res.json();
  const arr = Array.isArray(j) ? j : [j];
  return arr.map((loc) => {
    const d = loc.daily || {};
    const times = d.time || [];
    const mins = d.temperature_2m_min || [];
    const maxs = d.temperature_2m_max || [];
    const codes = d.weather_code || [];
    const pops = d.precipitation_probability_max || [];
    const todayIdx = 14; // past_days prepended, today sits at index = past_days
    const past = mins.slice(0, todayIdx + 1);
    const future = mins.slice(todayIdx + 1);
    const valid = past.filter((t) => typeof t === "number");
    const summary = {
      lowestRecent: valid.length ? Math.round(Math.min(...valid)) : null,
      coolNights: valid.filter((t) => t <= 45).length,
      frostRecent: valid.some((t) => t <= 32),
      hardFreezeRecent: valid.some((t) => t <= 28),
      frostForecast: future.some((t) => typeof t === "number" && t <= 32),
    };
    const forecast = [];
    for (let i = todayIdx; i < Math.min(times.length, todayIdx + 7); i++) {
      forecast.push({
        date: times[i],
        hi: maxs[i],
        lo: mins[i],
        code: typeof codes[i] === "number" ? codes[i] : 0,
        pop: typeof pops[i] === "number" ? pops[i] : 0,
      });
    }
    return { summary, forecast };
  });
}

// MODIS canopy greenness.
//
// Two changes from the original single-band, single-pixel query, both measured:
//   1. A 1km box (81 pixels at 250m) instead of one pixel. The single pixel at a region's
//      centroid can be water, field or road; on a live comparison it read 8810 against a
//      box mean of 9178, about 4% off its own neighbourhood.
//   2. The pixel_reliability band, fetched in parallel and used to drop cloud and snow
//      contaminated pixels (0 good, 1 marginal, 2 snow or ice, 3 cloudy). The original
//      query asked only for NDVI and filtered nothing.
// ageDays is returned so callers can weight this by freshness and say so honestly. The
// ORNL subset service currently runs 65 to 75 days behind, which is why the model no
// longer treats a stale reading as if it were absent without saying so.
async function getNdvi(r) {
  try {
    const end = new Date();
    const start = new Date(Date.now() - 140 * 86400000); // <= 10 MODIS composites
    const q = `latitude=${r.lat}&longitude=${r.lon}&startDate=${modisDate(start)}&endDate=${modisDate(end)}&kmAboveBelow=1&kmLeftRight=1`;
    const base = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?";
    const [nRes, qRes] = await Promise.all([
      fetch(base + q + "&band=250m_16_days_NDVI", { headers: { Accept: "application/json" } }),
      fetch(base + q + "&band=250m_16_days_pixel_reliability", { headers: { Accept: "application/json" } }).catch(() => null),
    ]);
    if (!nRes || !nRes.ok) return null;
    const nj = await nRes.json();
    let qj = null;
    if (qRes && qRes.ok) { try { qj = await qRes.json(); } catch (e) { qj = null; } }
    const qByDate = {};
    ((qj && qj.subset) || []).forEach((s) => { qByDate[s.calendar_date] = Array.isArray(s.data) ? s.data : [s.data]; });

    const pts = [];
    for (const s of (nj && nj.subset) || []) {
      const vals = Array.isArray(s.data) ? s.data : [s.data];
      const rel = qByDate[s.calendar_date] || null;
      const keep = vals.filter((v, i) => {
        if (!(typeof v === "number" && v > 0 && v <= 10000)) return false;
        if (!rel || typeof rel[i] !== "number") return true; // no quality band, keep the pixel
        return rel[i] === 0 || rel[i] === 1;                 // drop snow, ice and cloud
      });
      if (keep.length < 5) continue; // too little clean canopy in the box to trust the date
      pts.push({ v: keep.reduce((a, b) => a + b, 0) / keep.length, date: s.calendar_date, pixels: keep.length, of: vals.length });
    }
    if (!pts.length) return null;
    const vals = pts.map((p) => p.v);
    const summerMax = Math.max(...vals);
    const winterMin = Math.min(...vals);
    const last = pts[pts.length - 1];
    const denom = Math.max(1, summerMax - winterMin);
    const senescence = Math.min(1, Math.max(0, (summerMax - last.v) / denom));
    return {
      canopyPct: Math.round((100 * last.v) / summerMax),
      senescence: Math.round(senescence * 100) / 100,
      date: last.date,
      ageDays: Math.round((Date.now() - new Date(last.date + "T00:00:00Z").getTime()) / 86400000),
      pixelsUsed: last.pixels,
      pixelsTotal: last.of,
    };
  } catch (e) {
    return null;
  }
}

async function getConditions() {
  const results = await Promise.all([
    getWeatherAll(),
    getSeasonOffset().catch(() => ({ shift: 0, confidence: "none", sites: [], note: "anchor unavailable" })),
    ...REGIONS.map(getNdvi),
  ]);
  const wx = results[0];
  const anchor = results[1];
  const ndvi = results.slice(2);
  return {
    updated: new Date().toISOString(),
    anchor,
    regions: REGIONS.map((r, i) => ({
      id: r.id, lat: r.lat, lon: r.lon,
      weather: (wx && wx[i] && wx[i].summary) || null,
      forecast: (wx && wx[i] && wx[i].forecast) || null,
      ndvi: ndvi[i] || null,
    })),
  };
}

module.exports = { getConditions, getWeatherAll, getNdvi };
