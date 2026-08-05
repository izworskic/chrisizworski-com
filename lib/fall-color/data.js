// Shared live-data layer (keyless): Open-Meteo weather + NASA MODIS NDVI via ORNL.
const { REGIONS } = require("./regions.js");

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

async function getNdvi(r) {
  try {
    const end = new Date();
    const start = new Date(Date.now() - 140 * 86400000); // <= 10 MODIS composites
    const url = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=${r.lat}&longitude=${r.lon}&band=250m_16_days_NDVI&startDate=${modisDate(start)}&endDate=${modisDate(end)}&kmAboveBelow=0&kmLeftRight=0`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const j = await res.json();
    const pts = ((j && j.subset) || [])
      .map((s) => ({ v: Array.isArray(s.data) ? s.data[0] : s.data, date: s.calendar_date }))
      .filter((p) => typeof p.v === "number" && p.v > 0 && p.v <= 10000);
    if (!pts.length) return null;
    const vals = pts.map((p) => p.v);
    const summerMax = Math.max(...vals);
    const winterMin = Math.min(...vals);
    const recent = pts[pts.length - 1].v;
    const denom = Math.max(1, summerMax - winterMin);
    const senescence = Math.min(1, Math.max(0, (summerMax - recent) / denom));
    return {
      canopyPct: Math.round((100 * recent) / summerMax),
      senescence: Math.round(senescence * 100) / 100,
      date: pts[pts.length - 1].date,
    };
  } catch (e) {
    return null;
  }
}

async function getConditions() {
  const results = await Promise.all([getWeatherAll(), ...REGIONS.map(getNdvi)]);
  const wx = results[0];
  const ndvi = results.slice(1);
  return {
    updated: new Date().toISOString(),
    regions: REGIONS.map((r, i) => ({
      id: r.id, lat: r.lat, lon: r.lon,
      weather: (wx && wx[i] && wx[i].summary) || null,
      forecast: (wx && wx[i] && wx[i].forecast) || null,
      ndvi: ndvi[i] || null,
    })),
  };
}

module.exports = { getConditions, getWeatherAll, getNdvi };
