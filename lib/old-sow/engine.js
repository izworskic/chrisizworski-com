import { AREA, CURRENT_STATIONS, EASTPORT_TIDE_STATION, ENGINE_VERSION, VIEWPOINTS } from './config.js';
import { daylightFor, daylightState } from './sun.js';
import { formatLocal, minutesBetween } from './time.js';
import { weatherForTime } from './weather.js';

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function absVelocity(row) { return Math.abs(num(row?.velocity) ?? 0); }

export function percentileRank(value, values) {
  const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length || !Number.isFinite(Number(value))) return null;
  const below = nums.filter((v) => v < Number(value)).length;
  const equal = nums.filter((v) => v === Number(value)).length;
  return Math.round(100 * (below + 0.5 * equal) / nums.length);
}

export function nearestTideHigh(timeInput, tideHiLo) {
  const t = new Date(timeInput).getTime();
  const highs = tideHiLo.filter((x) => String(x.type).toUpperCase().startsWith('H'));
  if (!highs.length || !Number.isFinite(t)) return null;
  return highs.reduce((best, row) => {
    const delta = Math.abs(new Date(row.time).getTime() - t);
    return !best || delta < best.delta ? { ...row, delta } : best;
  }, null);
}

function previousEvent(events, index, type) {
  for (let i = index - 1; i >= 0; i--) if (events[i].type === type) return events[i];
  return null;
}
function nextEvent(events, index, type) {
  for (let i = index + 1; i < events.length; i++) if (events[i].type === type) return events[i];
  return null;
}

export function buildFloodCycles(eventsInput, tideHiLo, { stationId = 'ACT0091', now = new Date() } = {}) {
  const events = [...(eventsInput || [])]
    .filter((e) => e?.time && ['flood', 'ebb', 'slack'].includes(e.type))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  const floods = events.map((e, i) => ({ e, i })).filter(({ e }) => e.type === 'flood');
  const magnitudes = floods.map(({ e }) => absVelocity(e)).filter((v) => v > 0);
  return floods.map(({ e, i }, idx) => {
    const prevSlack = previousEvent(events, i, 'slack');
    const nextSlack = nextEvent(events, i, 'slack');
    const peak = new Date(e.time);
    const fallbackStart = new Date(peak.getTime() - 90 * 60000);
    const fallbackEnd = new Date(peak.getTime() + 60 * 60000);
    const startBound = prevSlack ? new Date(prevSlack.time) : fallbackStart;
    const endBound = nextSlack ? new Date(nextSlack.time) : fallbackEnd;
    // Viewing window deliberately focuses on the energetic core of the predicted flood cycle.
    // It is a decision heuristic, not a claim that Old Sow itself begins/ends at these times.
    const start = new Date(Math.max(startBound.getTime(), peak.getTime() - 90 * 60000));
    const end = new Date(Math.min(endBound.getTime(), peak.getTime() + 60 * 60000));
    const high = nearestTideHigh(peak, tideHiLo);
    const tideOffsetMinutes = high ? minutesBetween(peak, high.time) : null;
    const strength = absVelocity(e);
    const percentile = percentileRank(strength, magnitudes);
    const daylight = daylightState(peak, AREA.lat, AREA.lon);
    return {
      id: `${stationId}-${peak.toISOString()}`,
      stationId,
      start: start.toISOString(),
      peak: peak.toISOString(),
      end: end.toISOString(),
      predictedMaxFloodKnots: strength,
      currentPercentile: percentile,
      currentPercentileLabel: percentile == null ? 'unknown' : `${percentile}th percentile of nearby predicted flood maxima in this 14-day sample`,
      nearestEastportHigh: high ? { time: high.time, feetMLLW: high.value, offsetMinutesFromPeak: tideOffsetMinutes } : null,
      daylightAtPeak: daylight.daylight,
      sunrise: daylight.sunrise?.toISOString() ?? null,
      sunset: daylight.sunset?.toISOString() ?? null,
      rankIndex: idx
    };
  }).filter((c) => new Date(c.end) >= new Date(now.getTime() - 4 * 3600000));
}

function strengthLabel(pct) {
  if (pct == null) return 'strength unknown';
  if (pct >= 85) return 'very strong nearby predicted flood current';
  if (pct >= 65) return 'strong nearby predicted flood current';
  if (pct >= 35) return 'typical nearby predicted flood current';
  return 'weaker nearby predicted flood current';
}

function windowScore(cycle, weather) {
  let score = cycle.currentPercentile == null ? 35 : cycle.currentPercentile * 0.62;
  if (cycle.daylightAtPeak === true) score += 23;
  else if (cycle.daylightAtPeak === false) score -= 25;
  const cls = weather?.visibility?.classification;
  if (cls === 'impaired') score -= 18;
  if (cls === 'possibly_impaired') score -= 8;
  if (cls === 'not_stated') score += 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function rankCycles(cycles, weatherBundle) {
  return (cycles || []).map((c) => {
    const weather = weatherForTime(weatherBundle, c.peak);
    const score = windowScore(c, weather);
    return {
      ...c,
      weather,
      decisionScore: score,
      reasons: [
        strengthLabel(c.currentPercentile),
        c.daylightAtPeak === true ? 'peak is in daylight' : c.daylightAtPeak === false ? 'peak is after dark' : 'daylight status unknown',
        weather ? `visibility: ${weather.visibility.classification.replaceAll('_', ' ')}` : 'weather not available yet'
      ]
    };
  }).sort((a, b) => {
    // Near-term first within 24 h, then quality. This avoids telling a one-hour visitor to wait many days for a marginally higher score.
    const ta = new Date(a.start).getTime();
    const tb = new Date(b.start).getTime();
    const dayA = Math.floor(ta / 86400000), dayB = Math.floor(tb / 86400000);
    if (dayA !== dayB) return ta - tb;
    return b.decisionScore - a.decisionScore || ta - tb;
  });
}

export function currentPhase(eventsInput, now = new Date()) {
  const events = [...(eventsInput || [])].filter((e) => e?.time && e.type).sort((a, b) => new Date(a.time) - new Date(b.time));
  if (!events.length) return { phase: 'unknown', detail: 'Current prediction events unavailable.' };
  let previous = null, next = null;
  for (const e of events) {
    if (new Date(e.time) <= now) previous = e;
    if (new Date(e.time) > now) { next = e; break; }
  }
  if (!previous && next) return { phase: 'before-series', detail: `Next predicted event: ${next.type}.` };
  if (!previous) return { phase: 'unknown', detail: 'Current phase could not be determined.' };
  if (previous.type === 'flood') return { phase: 'predicted flood current', detail: 'A nearby NOAA prediction station is in the flood phase. This is not a live Old Sow observation.' };
  if (previous.type === 'ebb') return { phase: 'predicted ebb current', detail: 'A nearby NOAA prediction station is in the ebb phase. This is not a live Old Sow observation.' };
  if (previous.type === 'slack' && next?.type === 'flood') return { phase: 'near predicted flood onset', detail: 'The nearby prediction is between slack and the next flood maximum.' };
  if (previous.type === 'slack' && next?.type === 'ebb') return { phase: 'near predicted ebb onset', detail: 'The nearby prediction is between slack and the next ebb maximum.' };
  return { phase: `after predicted ${previous.type}`, detail: 'Phase is derived from NOAA current predictions, not a sensor at Old Sow.' };
}

function confidence(bundle, selected, weather) {
  let n = 0;
  const missing = [];
  if (selected?.events?.length) n += 3; else missing.push('primary current prediction');
  if (bundle.tideHiLo?.length) n += 2; else missing.push('Eastport tide prediction');
  if (bundle.waterLevel) n += 1; else missing.push('observed Eastport water level');
  if (bundle.metadata?.length) n += 1; else missing.push('current station metadata');
  if (weather?.hours?.length) n += 1; else missing.push('weather forecast');
  return { label: n >= 7 ? 'good source coverage' : n >= 5 ? 'partial source coverage' : 'limited source coverage', score: n / 8, missing };
}

function selectedStation(currents) {
  for (const id of CURRENT_STATIONS.map((x) => x.id)) if (currents?.[id]?.events?.length) return currents[id];
  return null;
}

function chartStation(currents, fallback) {
  const dense = Object.values(currents || {}).find((s) => s?.interval === '6' && (s.rows?.length || 0) > 20);
  return dense || fallback || null;
}

export function buildProduct(noaa, weather, now = new Date()) {
  const selected = selectedStation(noaa.currents);
  const events = selected?.events || selected?.rows || [];
  const cycles = selected ? buildFloodCycles(events, noaa.tideHiLo, { stationId: selected.station.id, now }) : [];
  const ranked = rankCycles(cycles, weather);
  const future = ranked.filter((c) => new Date(c.end) >= now);
  const next = future[0] ?? null;
  const phase = currentPhase(events, now);
  const coverage = confidence(noaa, selected, weather);
  const selectedMeta = noaa.metadata?.find((m) => m.id === selected?.station?.id) ?? null;

  const stations = CURRENT_STATIONS.map((s) => {
    const meta = noaa.metadata?.find((m) => m.id === s.id);
    const data = noaa.currents?.[s.id];
    return {
      ...s,
      lat: meta?.lat ?? null,
      lon: meta?.lon ?? null,
      type: meta?.type ?? null,
      bin: meta?.bin ?? null,
      interval: data?.interval ?? null,
      available: Boolean(data?.events?.length || data?.rows?.length),
      label: 'NOAA current prediction station; not a live Old Sow current sensor.'
    };
  });

  const high = next?.nearestEastportHigh;
  const explanation = next ? [
    `NOAA predicts a ${next.predictedMaxFloodKnots.toFixed(1)} kt flood maximum at ${selected?.station?.name || next.stationId}.`,
    high ? `That predicted current peak is ${Math.abs(high.offsetMinutesFromPeak)} minutes ${high.offsetMinutesFromPeak >= 0 ? 'before' : 'after'} the nearest Eastport high-water prediction.` : 'Eastport high-water cross-check is unavailable.',
    next.daylightAtPeak ? 'The predicted peak is in daylight.' : 'The predicted peak is not in daylight.',
    next.weather ? `Nearby forecast visibility classification: ${next.weather.visibility.classification.replaceAll('_', ' ')}.` : 'Weather is not available for this time yet.'
  ] : ['No complete future flood cycle is available from the current source response.'];

  const chartSource = chartStation(noaa.currents, selected);
  const chartCurrent = chartSource?.rows?.filter((r) => new Date(r.time) >= new Date(now.getTime() - 3 * 3600000) && new Date(r.time) <= new Date(now.getTime() + 48 * 3600000)).slice(0, 1200) ?? [];
  const chartTide = noaa.tideCurve?.filter((r) => new Date(r.time) >= new Date(now.getTime() - 3 * 3600000) && new Date(r.time) <= new Date(now.getTime() + 48 * 3600000)).slice(0, 1200) ?? [];

  const daylight = [];
  for (let d = 0; d < 3; d++) {
    const day = new Date(now.getTime() + d * 86400000);
    const times = daylightFor(day, AREA.lat, AREA.lon);
    daylight.push({ sunrise: times.sunrise?.toISOString() ?? null, sunset: times.sunset?.toISOString() ?? null });
  }

  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    truthBoundary: {
      observedOldSow: false,
      statement: 'No directly aimed verified live camera or authenticated observation is used. All viewing windows are forecasts derived from nearby predictions and context.',
      predictedCurrentIsObservation: false
    },
    decision: {
      phase,
      nextWindow: next,
      bestLandView: VIEWPOINTS[0],
      eastportView: VIEWPOINTS[1],
      explanation,
      coverage,
      clockNote: 'Eastport uses America/New_York. Deer Island uses America/Moncton; labels are generated from named time zones rather than a fixed offset.'
    },
    representativeCurrentStation: selected ? {
      id: selected.station.id,
      name: selected.station.name,
      role: selected.station.role,
      metadata: selectedMeta,
      methodStatus: 'provisional nearby-current proxy; not physically calibrated to visible Old Sow intensity'
    } : null,
    windows: ranked.slice(0, 32),
    chart: {
      tide: chartTide,
      current: chartCurrent,
      currentInterval: chartSource?.interval ?? null,
      currentStation: chartSource ? { id: chartSource.station.id, name: chartSource.station.name } : null,
      daylight
    },
    tide: {
      station: EASTPORT_TIDE_STATION,
      highLow: noaa.tideHiLo,
      observedWaterLevel: noaa.waterLevel,
      observedWind: noaa.wind
    },
    weather: weather ?? null,
    stations,
    viewpoints: VIEWPOINTS,
    sources: [...(noaa.sources || []), ...(weather?.sources || [])],
    sourceFailures: noaa.failures || [],
    displayExamples: next ? {
      eastportPeak: formatLocal(next.peak, 'America/New_York'),
      deerIslandPeak: formatLocal(next.peak, 'America/Moncton')
    } : null
  };
}
