const NIAGARA = { lat: 43.0810, lon: -79.0740, timeZone: 'America/New_York' };
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, payload: null };

const VIEWPOINTS = [
  { id: 'terrapin', name: 'Terrapin Point', side: 'U.S.', lat: 43.08008, lon: -79.07443, elevM: 126, note: 'Closest public overlook to Horseshoe Falls on Goat Island.' },
  { id: 'prospect', name: 'Prospect Point', side: 'U.S.', lat: 43.08623, lon: -79.06987, elevM: 170, note: 'Broad view beside American Falls and the observation tower.' },
  { id: 'luna', name: 'Luna Island', side: 'U.S.', lat: 43.08325, lon: -79.07102, elevM: 166, note: 'Between American Falls and Bridal Veil Falls.' },
  { id: 'table-rock', name: 'Table Rock', side: 'Canada', lat: 43.07896, lon: -79.07816, elevM: 161, note: 'Close Canadian overlook beside Horseshoe Falls.' },
  { id: 'queen-victoria', name: 'Queen Victoria Park', side: 'Canada', lat: 43.08250, lon: -79.07875, elevM: 164, note: 'Open Canadian park view across the gorge toward the falls.' }
];

const MIST_SOURCES = [
  { id: 'horseshoe', name: 'Horseshoe Falls', lat: 43.07735, lon: -79.07565, elevM: 145, strength: 1.0 },
  { id: 'american', name: 'American Falls', lat: 43.08505, lon: -79.07055, elevM: 151, strength: 0.82 },
  { id: 'bridal', name: 'Bridal Veil Falls', lat: 43.08358, lon: -79.07084, elevM: 151, strength: 0.68 }
];

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const deg = (r) => r * 180 / Math.PI;
const rad = (d) => d * Math.PI / 180;
const round5 = (n) => Math.max(0, Math.min(100, Math.round(n / 5) * 5));

function parseDurationMs(iso = 'PT1H') {
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m) return 3600000;
  return ((Number(m[1] || 0) * 24 + Number(m[2] || 0)) * 60 + Number(m[3] || 0)) * 60000 + Number(m[4] || 0) * 1000;
}

function expandValues(node) {
  if (!node?.values) return [];
  return node.values.map((entry) => {
    const [startText, duration = 'PT1H'] = entry.validTime.split('/');
    const start = Date.parse(startText);
    return { start, end: start + parseDurationMs(duration), value: entry.value };
  }).filter((x) => Number.isFinite(x.start));
}

function valueAt(series, t, fallback = null) {
  const hit = series.find((x) => t >= x.start && t < x.end);
  if (hit && hit.value != null) return Number(hit.value);
  let nearest = null;
  for (const item of series) {
    if (item.value == null) continue;
    const d = Math.min(Math.abs(t - item.start), Math.abs(t - item.end));
    if (!nearest || d < nearest.d) nearest = { d, value: Number(item.value) };
  }
  return nearest && nearest.d <= 3 * 3600000 ? nearest.value : fallback;
}

function localParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NIAGARA.timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const out = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { date: `${out.year}-${out.month}-${out.day}`, time: `${out.hour}:${out.minute}` };
}

function solarPosition(date, latDeg, lonDeg) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  const geomMeanLong = ((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360 + 360) % 360;
  const geomMeanAnom = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const ecc = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const sunEq = Math.sin(rad(geomMeanAnom)) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(rad(2 * geomMeanAnom)) * (0.019993 - 0.000101 * t)
    + Math.sin(rad(3 * geomMeanAnom)) * 0.000289;
  const trueLong = geomMeanLong + sunEq;
  const omega = 125.04 - 1934.136 * t;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const meanObliq = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliq = meanObliq + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(obliq)) * Math.sin(rad(appLong))));
  const y = Math.tan(rad(obliq / 2)) ** 2;
  const eqTime = 4 * deg(y * Math.sin(2 * rad(geomMeanLong)) - 2 * ecc * Math.sin(rad(geomMeanAnom))
    + 4 * ecc * y * Math.sin(rad(geomMeanAnom)) * Math.cos(2 * rad(geomMeanLong))
    - 0.5 * y * y * Math.sin(4 * rad(geomMeanLong))
    - 1.25 * ecc * ecc * Math.sin(2 * rad(geomMeanAnom)));
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  let trueSolar = (utcMinutes + eqTime + 4 * lonDeg) % 1440;
  if (trueSolar < 0) trueSolar += 1440;
  let hourAngle = trueSolar / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;
  const cosZenith = clamp(
    Math.sin(rad(latDeg)) * Math.sin(rad(decl)) + Math.cos(rad(latDeg)) * Math.cos(rad(decl)) * Math.cos(rad(hourAngle)),
    -1, 1
  );
  const zenith = deg(Math.acos(cosZenith));
  const elevation = 90 - zenith;
  const azDen = Math.cos(rad(latDeg)) * Math.sin(rad(zenith));
  let azimuth;
  if (Math.abs(azDen) > 0.001) {
    let azRad = (Math.sin(rad(latDeg)) * Math.cos(rad(zenith)) - Math.sin(rad(decl))) / azDen;
    azRad = clamp(azRad, -1, 1);
    azimuth = 180 - deg(Math.acos(azRad));
    if (hourAngle > 0) azimuth = -azimuth;
    azimuth = (azimuth + 360) % 360;
  } else {
    azimuth = latDeg > 0 ? 180 : 0;
  }
  return { elevation, azimuth };
}

function bearingDistance(aLat, aLon, bLat, bLon) {
  const p1 = rad(aLat), p2 = rad(bLat), dl = rad(bLon - aLon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const bearing = (deg(Math.atan2(y, x)) + 360) % 360;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const distanceM = 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return { bearing, distanceM };
}

function offsetPoint(lat, lon, bearingDeg, meters) {
  const d = meters / 6371000;
  const br = rad(bearingDeg);
  const p1 = rad(lat), l1 = rad(lon);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(br));
  const l2 = l1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: deg(p2), lon: deg(l2) };
}

function angularSeparation(az1, el1, az2, el2) {
  const c = Math.sin(rad(el1)) * Math.sin(rad(el2)) + Math.cos(rad(el1)) * Math.cos(rad(el2)) * Math.cos(rad(az1 - az2));
  return deg(Math.acos(clamp(c, -1, 1)));
}

function geometryFor(viewpoint, source, sun, windDirDeg, windSpeedMs) {
  const downwind = ((windDirDeg ?? 0) + 180) % 360;
  const plumeShiftM = windDirDeg == null ? 0 : Math.min(320, Math.max(25, windSpeedMs * 32));
  const plume = offsetPoint(source.lat, source.lon, downwind, plumeShiftM);
  const ray = bearingDistance(viewpoint.lat, viewpoint.lon, plume.lat, plume.lon);
  const elevation = deg(Math.atan2(source.elevM - viewpoint.elevM, Math.max(1, ray.distanceM)));
  const antisolarAz = (sun.azimuth + 180) % 360;
  const antisolarEl = -sun.elevation;
  const separation = angularSeparation(ray.bearing, elevation, antisolarAz, antisolarEl);
  const delta = Math.abs(separation - 42);
  let score = Math.exp(-Math.pow(delta / 9.5, 2));
  if (sun.elevation < 2) score *= 0.05;
  if (sun.elevation > 52) score *= 0.55;
  return { score: clamp(score), separation, bearing: ray.bearing, plumeShiftM };
}

function scoreMoment(viewpoint, source, date, wx) {
  const sun = solarPosition(date, NIAGARA.lat, NIAGARA.lon);
  if (sun.elevation <= 1.5) return null;
  const windMs = Math.max(0, (wx.windSpeedKmh ?? 10) / 3.6);
  const geom = geometryFor(viewpoint, source, sun, wx.windDirection, windMs);
  const clearFraction = clamp(1 - (wx.skyCover ?? 55) / 100);
  const sunScore = Math.pow(clearFraction, 0.72);
  const precipPenalty = 1 - clamp((wx.pop ?? 0) / 140);
  let mistScore = windMs < 0.8 ? 0.72 : windMs <= 6.5 ? 1 : windMs <= 10 ? 0.82 : 0.58;
  mistScore *= source.strength;
  const visibilityKm = wx.visibilityM == null ? 16 : wx.visibilityM / 1000;
  const visibilityScore = clamp((visibilityKm - 2) / 14, 0.25, 1);
  let raw = 100 * (0.55 * geom.score + 0.28 * sunScore + 0.11 * mistScore + 0.06 * visibilityScore) * precipPenalty;
  if (sunScore < 0.12) raw = Math.min(raw, 35);
  if (geom.score < 0.12) raw = Math.min(raw, 40);
  return {
    score: round5(raw),
    components: {
      geometry: Math.round(geom.score * 100),
      sunlight: Math.round(sunScore * 100),
      mist: Math.round(mistScore * 100),
      visibility: Math.round(visibilityScore * 100)
    },
    sun: { elevation: Number(sun.elevation.toFixed(1)), azimuth: Number(sun.azimuth.toFixed(1)) },
    rainbowAngle: Number(geom.separation.toFixed(1)),
    plumeShiftM: Math.round(geom.plumeShiftM)
  };
}

function dayTimestamps(dateText) {
  const base = Date.parse(`${dateText}T00:00:00Z`);
  const out = [];
  for (let t = base - 8 * 3600000; t <= base + 32 * 3600000; t += 10 * 60000) {
    if (localParts(new Date(t)).date === dateText) out.push(t);
  }
  return out;
}

function groupWindows(points) {
  if (!points.length) return [];
  const peak = Math.max(...points.map((x) => x.score));
  const threshold = Math.max(50, peak - 15);
  const windows = [];
  let current = [];
  for (const point of points) {
    if (point.score >= threshold) {
      if (current.length && point.t - current[current.length - 1].t > 11 * 60000) {
        windows.push(current); current = [];
      }
      current.push(point);
    } else if (current.length) {
      windows.push(current); current = [];
    }
  }
  if (current.length) windows.push(current);
  return windows.filter((w) => w.length >= 2).map((w) => {
    const best = [...w].sort((a, b) => b.score - a.score)[0];
    return {
      start: new Date(w[0].t).toISOString(),
      end: new Date(w[w.length - 1].t + 10 * 60000).toISOString(),
      peak: best.score,
      peakAt: new Date(best.t).toISOString(),
      viewpoint: best.viewpoint,
      fall: best.fall,
      components: best.components
    };
  }).sort((a, b) => b.peak - a.peak).slice(0, 3);
}

function buildWeatherAccessor(grid) {
  const p = grid.properties || {};
  const sky = expandValues(p.skyCover);
  const windSpeed = expandValues(p.windSpeed);
  const windDir = expandValues(p.windDirection);
  const pop = expandValues(p.probabilityOfPrecipitation);
  const rh = expandValues(p.relativeHumidity);
  const visibility = expandValues(p.visibility);
  return (t) => ({
    skyCover: valueAt(sky, t, 55),
    windSpeedKmh: valueAt(windSpeed, t, 12),
    windDirection: valueAt(windDir, t, null),
    pop: valueAt(pop, t, 0),
    relativeHumidity: valueAt(rh, t, null),
    visibilityM: valueAt(visibility, t, null)
  });
}

async function fetchJson(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'chrisizworski.com Niagara Rainbow Predictor (https://chrisizworski.com)',
      'Accept': 'application/geo+json, application/json'
    }
  });
  if (!r.ok) throw new Error(`NWS ${r.status} at ${new URL(url).pathname}`);
  return r.json();
}

async function loadNws() {
  const point = await fetchJson(`https://api.weather.gov/points/${NIAGARA.lat},${NIAGARA.lon}`);
  const gridUrl = point?.properties?.forecastGridData;
  if (!gridUrl) throw new Error('NWS point response did not include forecastGridData');
  const grid = await fetchJson(gridUrl);
  return { point, grid };
}

function nextLocalDates(count = 5) {
  const dates = [];
  let cursor = Date.now();
  while (dates.length < count) {
    const d = localParts(new Date(cursor)).date;
    if (!dates.includes(d)) dates.push(d);
    cursor += 24 * 3600000;
  }
  return dates;
}

function confidenceFor(dayIndex, coverage) {
  if (coverage < 0.65) return 'Low';
  if (dayIndex <= 1 && coverage > 0.9) return 'High';
  if (dayIndex <= 3) return 'Moderate';
  return 'Lower';
}

function recommendation(peak, bestNext) {
  if (peak >= 80) return 'Go if you can — the model sees a strong rainbow window.';
  if (peak >= 65) return 'Worth trying during the best window, but passing clouds could decide it.';
  if (peak >= 50) return bestNext ? `Marginal today. ${bestNext} looks better in the current forecast.` : 'Marginal today; watch for brighter breaks in the cloud cover.';
  return bestNext ? `Skip today if the rainbow is your priority. ${bestNext} is the better bet.` : 'Conditions do not line up well for a rainbow today.';
}

async function buildPayload() {
  const { point, grid } = await loadNws();
  const weatherAt = buildWeatherAccessor(grid);
  const dates = nextLocalDates(5);
  const days = [];

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
    const dateText = dates[dayIndex];
    const moments = [];
    let weatherFields = 0;
    let weatherChecks = 0;
    for (const t of dayTimestamps(dateText)) {
      const wx = weatherAt(t);
      weatherChecks += 4;
      weatherFields += [wx.skyCover, wx.windSpeedKmh, wx.windDirection, wx.pop].filter((v) => v != null).length;
      let best = null;
      for (const viewpoint of VIEWPOINTS) {
        for (const source of MIST_SOURCES) {
          const scored = scoreMoment(viewpoint, source, new Date(t), wx);
          if (!scored) continue;
          const row = {
            t, score: scored.score, viewpoint: viewpoint.name, viewpointId: viewpoint.id,
            side: viewpoint.side, fall: source.name, components: scored.components,
            sun: scored.sun, rainbowAngle: scored.rainbowAngle, plumeShiftM: scored.plumeShiftM,
            weather: { skyCover: wx.skyCover, windSpeedKmh: wx.windSpeedKmh, windDirection: wx.windDirection, pop: wx.pop }
          };
          if (!best || row.score > best.score) best = row;
        }
      }
      if (best) moments.push(best);
    }
    moments.sort((a, b) => a.t - b.t);
    const windows = groupWindows(moments);
    const peakPoint = [...moments].sort((a, b) => b.score - a.score)[0] || null;
    const hourly = moments.filter((_, i) => i % 6 === 0).map((m) => ({
      at: new Date(m.t).toISOString(), score: m.score, viewpoint: m.viewpoint
    }));
    days.push({
      date: dateText,
      peak: peakPoint?.score ?? 0,
      peakAt: peakPoint ? new Date(peakPoint.t).toISOString() : null,
      bestViewpoint: peakPoint?.viewpoint ?? null,
      bestViewpointId: peakPoint?.viewpointId ?? null,
      bestFall: peakPoint?.fall ?? null,
      components: peakPoint?.components ?? null,
      weatherAtPeak: peakPoint?.weather ?? null,
      windows,
      hourly,
      coverage: weatherChecks ? Number((weatherFields / weatherChecks).toFixed(2)) : 0,
      confidence: confidenceFor(dayIndex, weatherChecks ? weatherFields / weatherChecks : 0)
    });
  }

  const better = days.slice(1).filter((d) => d.peak >= (days[0]?.peak || 0) + 10).sort((a, b) => b.peak - a.peak)[0];
  if (days[0]) days[0].recommendation = recommendation(days[0].peak, better?.date || null);

  const rankedViewpoints = VIEWPOINTS.map((v) => {
    let best = null;
    const today = dates[0];
    for (const t of dayTimestamps(today)) {
      const wx = weatherAt(t);
      for (const source of MIST_SOURCES) {
        const scored = scoreMoment(v, source, new Date(t), wx);
        if (!scored) continue;
        const row = { score: scored.score, at: t, fall: source.name, components: scored.components };
        if (!best || row.score > best.score) best = row;
      }
    }
    return {
      ...v,
      peak: best?.score ?? 0,
      peakAt: best ? new Date(best.at).toISOString() : null,
      fall: best?.fall ?? null,
      components: best?.components ?? null
    };
  }).sort((a, b) => b.peak - a.peak);

  return {
    ok: true,
    model: { version: '1.0.0', label: 'Experimental optical opportunity model', primaryRainbowAngleDeg: 42, intervalMinutes: 10 },
    location: { name: 'Niagara Falls', ...NIAGARA },
    source: {
      name: 'National Weather Service',
      point: point?.properties?.forecastOffice || 'https://api.weather.gov/',
      updated: grid?.properties?.updateTime || grid?.properties?.validTimes || new Date().toISOString(),
      fetchedAt: new Date().toISOString()
    },
    days,
    viewpoints: rankedViewpoints,
    disclaimer: 'This is an experimental model estimate, not a guarantee. A rainbow still depends on direct sunlight reaching airborne water droplets at the right geometry.'
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=900');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    if (cache.payload && Date.now() - cache.at < CACHE_TTL_MS) return res.status(200).json(cache.payload);
    const payload = await buildPayload();
    cache = { at: Date.now(), payload };
    return res.status(200).json(payload);
  } catch (error) {
    console.error('niagara-rainbow', error);
    return res.status(502).json({
      ok: false,
      error: 'Live Niagara rainbow forecast is temporarily unavailable.',
      detail: String(error?.message || error),
      retryable: true,
      source: 'National Weather Service',
      noSyntheticFallback: true
    });
  }
}
