'use strict';

const VIEWPOINTS = [
  {
    id: 'uekahuna',
    name: 'Uēkahuna',
    lat: 19.420228,
    lon: -155.288968,
    walkMinutes: 2,
    parkingSpaces: 70,
    mobility: 'easy',
    photo: 'good',
    crowdNote: 'One of the larger eruption-viewing parking areas.',
    why: 'Fastest low-walking option with restrooms, ranger presence when staffed, and a direct caldera view.',
    tradeoff: 'Farther from the active vents than the Keanakākoʻi walk-in overlooks.',
    source: 'NPS eruption-viewing and parking pages'
  },
  {
    id: 'kilauea-overlook',
    name: 'Kīlauea Overlook',
    lat: 19.423602,
    lon: -155.284341,
    walkMinutes: 5,
    parkingSpaces: 36,
    mobility: 'easy',
    photo: 'excellent',
    crowdNote: 'NPS advises avoiding roughly 5–9 PM during eruption crowds; pre-sunrise is often easier.',
    why: 'Short walk and broad, unobstructed views into Kaluapele; strong choice for photography and first-time visitors.',
    tradeoff: 'Smaller parking area and can become heavily congested during eruptions.',
    source: 'NPS eruption-viewing and parking pages'
  },
  {
    id: 'keanakakoi',
    name: 'Keanakākoʻi viewing area',
    lat: 19.406470,
    lon: -155.252939,
    walkMinutes: 30,
    parkingSpaces: 30,
    mobility: 'walk',
    photo: 'excellent',
    crowdNote: 'Extremely limited parking during eruptions; use Devastation Trail parking or Puʻupuaʻi as backup.',
    why: 'Closest public eruption views when open, reached by a 1-mile walk from Devastation Trail parking.',
    tradeoff: 'Requires about a 2-mile round trip; the final section is uneven cinder and conditions can close the area.',
    source: 'NPS Keanakākoʻi eruption-viewing page'
  }
];

function text(v) { return String(v || '').toLowerCase(); }

function classifyActivity(rawText) {
  const t = text(rawText);
  if (!t.trim()) return { state: 'UNKNOWN', label: 'Status unavailable', evidence: [] };

  const evidence = [];
  const has = (re, label) => { if (re.test(t)) { evidence.push(label); return true; } return false; };

  const paused = has(/eruption (?:is )?paused|eruptive activity (?:has )?(?:paused|ceased|stopped)|no eruptive activity|no active lava/i, 'HVO reports a pause or no active eruption');
  const fountaining = has(/(?:lava )?fountain(?:ing|s)?|fountaining episode/i, 'HVO mentions lava fountaining');
  const currentFountaining = /(?:lava )?fountains? (?:are|is) (?:ongoing|active|occurring|continuing)|fountaining (?:is|continues|has begun|began|started)|eruption episode \d+ (?:began|started|is underway|continues)|sustained (?:lava )?fountaining/i.test(t);
  const overflow = has(/overflow(?:s|ing)?|lava flow|spatter|incandescence|strong glow/i, 'HVO mentions overflow, spatter, lava flow, or strong glow');
  const precursor = has(/inflation|tremor|tilt|conditions remain favorable|episode \d+ remains possible|precursory/i, 'HVO reports unrest or precursor signals');

  if (paused && !currentFountaining && !overflow) return { state: 'PAUSED', label: 'Eruption paused', evidence };
  if (fountaining && currentFountaining) return { state: 'FOUNTAINING', label: 'Fountaining reported', evidence };
  if (overflow) return { state: 'ELEVATED', label: 'Elevated summit activity', evidence };
  if (precursor) return { state: 'UNREST', label: 'Unrest / possible next episode', evidence };
  return { state: 'MONITORING', label: 'Monitoring', evidence };
}

function classifyForecastability(rawText) {
  const t = text(rawText);
  if (/can no longer be modeled|cannot (?:currently )?be modeled|cannot be forecast|timing .* uncertain|unable to forecast|not possible to forecast|cannot say with certainty/.test(t)) {
    return { state: 'UNPREDICTABLE', label: 'No reliable eruption window' };
  }
  if (/forecast window|estimated window|window for .* episode|expected .* between/.test(t)) {
    return { state: 'OFFICIAL_WINDOW', label: 'Official window available' };
  }
  return { state: 'NONE', label: 'No official window stated' };
}

function hoursOld(iso, now = new Date()) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, (now.getTime() - d.getTime()) / 36e5);
}

function weatherScore(period) {
  if (!period) return null;
  const f = text(period.shortForecast);
  const pop = Number(period.precipProbability ?? period.probabilityOfPrecipitation?.value ?? 0);
  let s = 0.62;
  if (/clear|sunny|mostly clear|partly cloudy/.test(f)) s += 0.2;
  if (/mostly sunny/.test(f)) s += 0.12;
  if (/cloudy|overcast/.test(f)) s -= 0.1;
  if (/fog|mist/.test(f)) s -= 0.35;
  if (/rain|shower|thunder/.test(f)) s -= 0.23;
  if (Number.isFinite(pop)) s -= Math.min(0.28, pop / 350);
  return Math.max(0, Math.min(1, s));
}

function bestWeatherWindow(hourly, now = new Date()) {
  if (!Array.isArray(hourly) || !hourly.length) return null;
  const rows = hourly
    .filter(p => p && p.startTime && new Date(p.startTime) >= new Date(now.getTime() - 30 * 60 * 1000))
    .slice(0, 18)
    .map(p => ({ ...p, _score: weatherScore(p) }))
    .filter(p => Number.isFinite(p._score));
  if (!rows.length) return null;

  let best = rows[0];
  for (const row of rows) if (row._score > best._score) best = row;
  return {
    startTime: best.startTime,
    score: best._score,
    shortForecast: best.shortForecast,
    precipProbability: best.precipProbability ?? best.probabilityOfPrecipitation?.value ?? null,
    temperature: best.temperature ?? null,
    temperatureUnit: best.temperatureUnit || 'F'
  };
}

function currentWeather(hourly, now = new Date()) {
  if (!Array.isArray(hourly) || !hourly.length) return null;
  const target = now.getTime();
  const rows = hourly.filter(p => p?.startTime).map(p => ({ p, t: new Date(p.startTime).getTime() })).filter(x => Number.isFinite(x.t));
  rows.sort((a,b) => Math.abs(a.t-target) - Math.abs(b.t-target));
  const p = rows[0]?.p;
  if (!p) return null;
  return { ...p, score: weatherScore(p) };
}

function chooseViewpoint(profile, access = {}) {
  const closed = new Set(access.closedViewpoints || []);
  const available = VIEWPOINTS.filter(v => !closed.has(v.id));
  if (!available.length) return null;

  if (profile.mobility === 'short') {
    return available.find(v => v.id === 'uekahuna') || available.find(v => v.mobility === 'easy') || available[0];
  }
  if (profile.experience === 'photo') {
    return available.find(v => v.id === 'keanakakoi') || available.find(v => v.id === 'kilauea-overlook') || available[0];
  }
  return available.find(v => v.id === 'kilauea-overlook') || available.find(v => v.id === 'uekahuna') || available[0];
}

function confidenceState(sources, eruptionAgeHours, forecastability) {
  const hvo = sources?.hvo?.status === 'ok' && (eruptionAgeHours == null || eruptionAgeHours <= 20);
  const weather = sources?.weather?.status === 'ok';
  const nps = sources?.nps?.status === 'ok';
  const degraded = Object.values(sources || {}).filter(s => s?.status && s.status !== 'ok').map(s => s.name || 'source');
  if (!hvo) return { level: 'Limited data', why: 'A fresh HVO state could not be confirmed.', degraded };
  if (forecastability?.state === 'UNPREDICTABLE') return { level: 'Mixed signals', why: 'Current activity is observed, but HVO says eruption timing is not reliably modelable.', degraded };
  if (weather && nps && degraded.length === 0) return { level: 'High confidence', why: 'Fresh official eruption, access and weather inputs agree.', degraded };
  if (weather || nps) return { level: 'Reasonable confidence', why: 'The eruption state is fresh, but at least one supporting input is degraded.', degraded };
  return { level: 'Limited data', why: 'Only the eruption state is available; viewing conditions or access could not be fully checked.', degraded };
}

function humanTime(iso, timeZone = 'Pacific/Honolulu') {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', weekday: 'short' }).format(new Date(iso));
  } catch { return iso; }
}

function buildDecision(input, profile = {}, now = new Date()) {
  const safeProfile = {
    travel: ['here','one','three'].includes(profile.travel) ? profile.travel : 'one',
    mobility: ['short','walk'].includes(profile.mobility) ? profile.mobility : 'short',
    experience: ['casual','photo'].includes(profile.experience) ? profile.experience : 'casual',
    plan: ['now','today','tomorrow'].includes(profile.plan) ? profile.plan : 'now'
  };
  const travelMinutes = safeProfile.travel === 'here' ? 0 : safeProfile.travel === 'three' ? 180 : 60;

  const eruption = input?.eruption || {};
  const sources = input?.sources || {};
  const access = input?.access || {};
  const hourly = input?.weather?.hourly || [];
  const activity = eruption.activity || classifyActivity(eruption.text || '');
  const forecastability = eruption.forecastability || classifyForecastability(eruption.text || '');
  const eruptionAge = hoursOld(eruption.observedAt || eruption.issuedAt, now);
  const wxNow = currentWeather(hourly, now);
  const wxBest = bestWeatherWindow(hourly, now);
  const viewpoint = chooseViewpoint(safeProfile, access);
  const confidence = confidenceState(sources, eruptionAge, forecastability);

  if (access.parkClosed === true) {
    return {
      state: 'CLOSED', headline: 'Park access blocks eruption viewing',
      action: access.closureReason || 'Do not travel for eruption viewing until the National Park Service reopens access.',
      bestWindow: null, mainReason: 'NPS closure is a hard gate.', viewpoint: null, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile
    };
  }

  if (eruptionAge != null && eruptionAge > 20) {
    return {
      state: 'LIMITED', headline: 'Fresh eruption state not confirmed',
      action: 'Check the newest HVO update or live summit camera before making a drive.',
      bestWindow: wxBest ? `${humanTime(wxBest.startTime)} may offer the clearest weather` : null,
      mainReason: `The newest eruption state is about ${Math.round(eruptionAge)} hours old.`, viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile
    };
  }

  const poorView = wxNow && wxNow.score != null && wxNow.score < 0.35;
  const laterMeaningfullyBetter = wxNow && wxBest && wxBest.score > wxNow.score + 0.22 && new Date(wxBest.startTime) > now;
  const longDrive = travelMinutes >= 180;
  let state = 'WATCHING';
  let headline = 'Activity is worth watching, but timing matters';
  let action = 'Check the summit camera before leaving.';
  let mainReason = activity.label;
  let bestWindow = null;

  if (activity.state === 'FOUNTAINING') {
    if (poorView) {
      state = 'MIXED';
      headline = 'Eruption activity is reported, but the view may be obscured';
      action = 'Use the live camera before moving; weather may hide an active eruption.';
      mainReason = `${activity.label}; ${wxNow.shortForecast || 'poor summit visibility'} is the limiting factor.`;
    } else if (longDrive) {
      state = 'GO — VERIFY FIRST';
      headline = 'Active fountaining is the strongest reason to go';
      action = 'Check the newest HVO message and live camera immediately before a three-hour drive; episodes can change before arrival.';
      mainReason = 'Fountaining is reported now, but long-drive failure cost is high.';
    } else {
      state = 'GO NOW';
      headline = 'Active fountaining is reported at the summit';
      action = viewpoint ? `If the camera is clear, head for ${viewpoint.name}.` : 'If the camera is clear, use an open NPS eruption viewpoint.';
      mainReason = activity.label;
    }
  } else if (activity.state === 'ELEVATED' || activity.state === 'UNREST') {
    if (forecastability.state === 'UNPREDICTABLE') {
      state = longDrive ? 'WAIT FOR CONFIRMATION' : 'WATCHING';
      headline = activity.state === 'ELEVATED' ? 'Elevated summit activity, but no reliable fountain countdown' : 'The summit is building unrest, but the next episode is not on a reliable clock';
      action = longDrive ? 'Do not chase a modeled eruption time. Wait for a fresh HVO message or visible activity on the summit camera.' : 'If you are nearby, check the live camera; otherwise recheck when HVO posts a new message.';
      mainReason = 'HVO reports activity but says the next fountain window cannot be modeled reliably.';
    } else {
      state = longDrive ? 'WATCHING' : 'WORTH A LOOK';
      headline = 'Elevated summit activity is being observed';
      action = longDrive ? 'Verify the live camera and newest HVO message before committing to the drive.' : `Use the camera first${viewpoint ? `, then favor ${viewpoint.name}` : ''}.`;
      mainReason = activity.label;
    }
  } else if (activity.state === 'PAUSED') {
    state = 'WAIT';
    headline = 'The eruption is paused';
    action = 'Do not make a lava-specific drive until HVO confirms renewed activity.';
    mainReason = 'No active eruptive episode is confirmed.';
  } else {
    state = 'CHECK FIRST';
    headline = 'No strong live eruption signal is available';
    action = 'Open the official HVO update and live camera before deciding to travel.';
    mainReason = activity.label;
  }

  if (laterMeaningfullyBetter && activity.state !== 'PAUSED') {
    bestWindow = `${humanTime(wxBest.startTime)} — ${wxBest.shortForecast || 'better viewing weather'}`;
    if (!['FOUNTAINING'].includes(activity.state) && safeProfile.plan !== 'now') {
      state = 'BETTER LATER';
      headline = 'Viewing weather improves later';
      action = `Recheck eruption activity near ${humanTime(wxBest.startTime)}; the weather improves, but eruption timing remains independent.`;
      mainReason = `Viewing weather improves materially from ${wxNow.shortForecast || 'current conditions'} to ${wxBest.shortForecast || 'a clearer window'}.`;
    }
  } else if (wxBest) {
    bestWindow = `${humanTime(wxBest.startTime)} — ${wxBest.shortForecast || 'best weather signal'}`;
  }

  return { state, headline, action, bestWindow, mainReason, viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile };
}

module.exports = {
  VIEWPOINTS,
  classifyActivity,
  classifyForecastability,
  weatherScore,
  bestWeatherWindow,
  chooseViewpoint,
  buildDecision,
  hoursOld
};
