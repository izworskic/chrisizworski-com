'use strict';

const HVO_STALE_HOURS = 30;

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
    crowdNote: 'One of the larger summit-viewing parking areas; useful when you want a short walk and room to get oriented.',
    why: 'This is the easiest place to get your bearings on the summit. The broad view across Kaluapele helps you read the scale of the caldera without committing to a long walk.',
    tradeoff: 'You are farther from the active vents than at Keanakākoʻi, so this is a scale-and-context view more than a close lava view.',
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
    crowdNote: 'The small lot can fill quickly during active episodes; NPS notes that roughly 5–9 PM is often the hardest arrival window, while pre-sunrise can be easier.',
    why: 'This is the broad-view choice. From here you can read much of Kaluapele at once, which makes it easier to understand how eruption and collapse have reshaped the summit.',
    tradeoff: 'The lot is small and can fill quickly during active episodes; the view is excellent, but the arrival window matters.',
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
    crowdNote: 'Parking is very limited during active episodes; this is the viewpoint to choose when the closer look is worth a longer walk and a less certain parking plan.',
    why: 'This is the closer, more committed viewing choice when it is open. The walk brings you nearer the active summit area, where changes in glow, spatter, and vent activity are easier to read.',
    tradeoff: 'Plan on about a 2-mile round trip, uneven cinder near the end, and very limited parking. Conditions can close the area.',
    source: 'NPS Keanakākoʻi eruption-viewing page'
  }
];

function text(v) { return String(v || '').toLowerCase(); }

function classifyActivity(rawText) {
  // Scenario and hazard sections describe possibilities, not observed activity.
  const t = text(rawText).split(/possible outcomes|possible scenarios|hvo actions|emplacement of the dike intrusion|\binterpretation\b|\bbackground\b|\bhazards\b/)[0];
  if (!t.trim()) return { state: 'UNKNOWN', label: 'Status unavailable', evidence: [] };

  const evidence = [];
  const has = (re, label, corpus = t) => { if (re.test(corpus)) { evidence.push(label); return true; } return false; };

  // Strip negated lava-flow wording before running positive activity detectors.
  const positiveText = t.split(/(?<=[.!?])\s+/).filter(sentence => !/\bprevious\b|\blast episode\b|\bsince the end\b|\bpast eruptions\b|\bno (?:lava )?fountaining\b|\bfountaining (?:has |is )?(?:stopped|ended|ceased|not occurring)\b/.test(sentence)).join(' ').replace(/\bno\s+(?:active\s+)?lava flows?(?:\s+(?:are|is))?(?:\s+(?:present|observed|detected|visible|occurring|continuing|advancing))?/gi, ' ');

  const paused = has(/eruption (?:is )?paused|eruptive activity (?:has )?(?:paused|ceased|stopped)|no eruptive activity|no active lava|no (?:lava )?fountaining (?:is )?(?:occurring|ongoing)|fountaining (?:has |is )?(?:stopped|ended|ceased|not occurring)/i, 'HVO reports a pause or no active eruption');
  const fountaining = has(/(?:lava )?fountain(?:ing|s)?|fountaining episode/i, 'HVO mentions lava fountaining', positiveText);
  const currentFountaining = /(?:lava )?fountains? (?:are|is) (?:ongoing|active|occurring|continuing)|fountaining (?:is|continues|has begun|began|started)|eruption episode \d+ (?:began|started|is underway|continues)|sustained (?:lava )?fountaining/i.test(positiveText);
  const overflow = has(/overflow(?:s|ing)?|(?:active|advancing|ongoing|fresh|new|visible|surface) lava flows?|lava flows? (?:continue|continues|are active|are present|are moving|are advancing)|spatter(?:ing)?|incandescence|strong glow/i, 'HVO mentions active overflow, spatter, lava flow, or strong glow', positiveText);
  const precursor = has(/inflation|tremor|tilt|intrusion|\bdike\b|seismicity|conditions remain favorable|episode \d+ remains possible|precursory/i, 'HVO reports unrest or precursor signals', positiveText);

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
  const age = (now.getTime() - d.getTime()) / 36e5;
  return age < -0.25 ? null : Math.max(0, age);
}

function weatherScore(period) {
  if (!period) return null;
  const rawPop = period.precipProbability ?? period.probabilityOfPrecipitation?.value;
  if (rawPop == null) return null;
  const pop = Number(rawPop);
  if (!Number.isFinite(pop)) return null;
  const f = text(period.shortForecast);
  let s = 0.62;
  if (/mostly sunny/.test(f)) s += 0.12;
  else if (/partly cloudy|partly sunny/.test(f)) s += 0.1;
  else if (/clear|sunny/.test(f)) s += 0.2;
  else if (/cloudy|overcast/.test(f)) s -= 0.1;
  if (/fog|mist/.test(f)) s -= 0.35;
  if (/rain|shower|thunder/.test(f)) s -= 0.23;
  s -= Math.min(0.28, pop / 350);
  return Math.max(0, Math.min(1, s));
}

function honoluluDayKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Honolulu', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function periodsForPlan(hourly, plan, now = new Date()) {
  if (!Array.isArray(hourly)) return [];
  const target = now.getTime();
  const valid = hourly.filter(p => {
    const start = new Date(p?.startTime).getTime();
    return p && p.startTime && Number.isFinite(start);
  });
  if (plan === 'tomorrow') {
    const tomorrowKey = honoluluDayKey(new Date(target + 24 * 36e5));
    return valid.filter(p => honoluluDayKey(p.startTime) === tomorrowKey).slice(0, 18);
  }
  if (plan === 'today') {
    const todayKey = honoluluDayKey(now);
    return valid.filter(p => honoluluDayKey(p.startTime) === todayKey && new Date(p.startTime).getTime() >= target).slice(0, 18);
  }
  return valid.filter(p => new Date(p.startTime).getTime() >= target - 30 * 60 * 1000).slice(0, 18);
}

function bestWeatherWindow(hourly, now = new Date(), plan = 'now', earliest = now) {
  const rows = periodsForPlan(hourly, plan, now)
    .map(p => ({ ...p, _score: weatherScore(p) }))
    .filter(p => Number.isFinite(p._score) && new Date(p.endTime).getTime() > earliest.getTime());
  if (!rows.length) return null;

  let best = rows[0];
  for (const row of rows) if (row._score > best._score) best = row;
  return {
    startTime: new Date(best.startTime) < earliest ? earliest.toISOString() : best.startTime,
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
  const p = hourly.find(row => {
    const start = new Date(row?.startTime).getTime();
    const end = new Date(row?.endTime).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && start <= target && target < end;
  });
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
  const hvo = sources?.hvo?.status === 'ok' && eruptionAgeHours != null && eruptionAgeHours <= HVO_STALE_HOURS;
  const weather = sources?.weather?.status === 'ok';
  const nps = sources?.nps?.status === 'ok';
  const degraded = Object.values(sources || {}).filter(s => s?.status && s.status !== 'ok').map(s => s.name || 'source');
  if (!hvo) return { level: 'Limited data', why: 'The newest HVO observation is missing or too old to use as a current read of the summit.', degraded };
  if (forecastability?.state === 'UNPREDICTABLE') return { level: 'Mixed signals', why: 'We know what the summit is doing now, but HVO says the timing of the next eruptive episode is not on a reliable clock.', degraded };
  if (weather && nps && degraded.length === 0) return { level: 'High confidence', why: 'HVO, NPS access, summit weather, and the supporting live inputs are current and tell a consistent story.', degraded };
  if (weather || nps) return { level: 'Reasonable confidence', why: 'HVO is current, but at least one supporting source is too weak to treat the whole visitor picture as settled.', degraded };
  return { level: 'Limited data', why: 'HVO gives us part of the story, but access or viewing conditions are not current enough to finish the visitor picture.', degraded };
}

function humanTime(iso, timeZone = 'Pacific/Honolulu') {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', weekday: 'short' }).format(new Date(iso));
  } catch { return iso; }
}

function weatherWindowLabel(wxBest) {
  return wxBest ? `${humanTime(wxBest.startTime)}: ${wxBest.shortForecast || 'best available viewing-weather signal'}` : null;
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
  const arrival = new Date(now.getTime() + travelMinutes * 60 * 1000);
  const wxArrival = currentWeather(hourly, arrival);
  const wxBest = bestWeatherWindow(hourly, now, safeProfile.plan, arrival);
  const viewpoint = chooseViewpoint(safeProfile, access);
  const confidence = confidenceState(sources, eruptionAge, forecastability);

  if (access.parkClosed === true) {
    return {
      state: 'CLOSED', headline: 'The park is closed to this viewing trip',
      action: access.closureReason || 'This is an access decision, not an eruption decision. Follow NPS closure instructions and wait for reopening before traveling for eruption viewing.',
      bestWindow: null, mainReason: 'NPS access comes first here; volcanic activity never overrides a closure.', viewpoint: null, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile
    };
  }

  if (access.closureUnknown === true) {
    return {
      state: 'VERIFY ACCESS', headline: 'Confirm park access before you make the drive',
      action: 'Check NPS current conditions first. A clear camera, good weather, or active lava does not count as permission to enter an area whose access has not been verified.',
      bestWindow: weatherWindowLabel(wxBest), mainReason: 'Access is the first decision. Until NPS conditions are verified, the rest of the viewing picture stays secondary.', viewpoint: null, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile
    };
  }

  if (sources?.hvo?.status !== 'ok' || eruptionAge == null || eruptionAge > HVO_STALE_HOURS) {
    const ageReason = eruptionAge == null ? 'The HVO issuance time is unavailable.' : `The newest eruption state is about ${Math.round(eruptionAge)} hours old.`;
    return {
      state: 'LIMITED', headline: 'The volcano picture is too old to trust',
      action: 'Before you drive, open the newest HVO update and the summit camera. The point is to see what Kīlauea is doing now, not what it was doing yesterday.',
      bestWindow: weatherWindowLabel(wxBest),
      mainReason: ageReason, viewpoint: null, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile
    };
  }

  if (!viewpoint) {
    return { state: 'NO LISTED VIEWPOINT', headline: 'The listed eruption viewpoints are closed', action: 'Check NPS for another permitted viewing location before traveling. Current lava activity does not reopen a closed viewpoint.', bestWindow: null, mainReason: 'Every viewpoint supported by this tool is reported closed.', viewpoint: null, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile };
  }

  if (input?.air?.advisoryDetected) {
    return { state: 'CHECK AIR', headline: 'Check volcanic air conditions before visiting', action: 'Hawaiʻi DOH reports an unhealthy regional SO₂ signal. Check NPS air conditions at your intended viewpoint before travel; a regional station does not measure exposure at the crater rim.', bestWindow: null, mainReason: 'Active lava and clear weather do not settle the volcanic air question.', viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile };
  }

  if (safeProfile.plan === 'tomorrow') {
    return {
      state: 'RECHECK TOMORROW',
      headline: activity.state === 'FOUNTAINING' ? 'Tomorrow’s weather can be forecast; tomorrow’s eruption cannot' : 'Tomorrow starts with a fresh HVO check',
      action: wxBest ? `Use ${humanTime(wxBest.startTime)} only as a viewing-weather target. Recheck HVO, the summit camera and NPS access tomorrow before travel.` : 'Recheck HVO, the summit camera, NPS access and tomorrow’s summit weather before travel.',
      bestWindow: weatherWindowLabel(wxBest),
      mainReason: `${activity.label} is what HVO is seeing now; it is not a promise that Kīlauea will look the same tomorrow.`,
      viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile
    };
  }

  if (safeProfile.plan === 'today') {
    if (activity.state === 'PAUSED') {
      return {
        state: 'WAIT', headline: 'Kīlauea is between eruptive episodes right now',
        action: 'If visible lava is the reason for the trip, wait for HVO to confirm renewed activity. A quiet summit can still be worth understanding, but it is a different visit.',
        bestWindow: weatherWindowLabel(wxBest), mainReason: 'HVO does not confirm an active eruptive episode right now.', viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile
      };
    }
    return {
      state: 'RECHECK BEFORE LEAVING',
      headline: activity.state === 'FOUNTAINING' ? 'Kīlauea is fountaining now; later today is a new decision' : 'What the summit is doing now may not be what you find later',
      action: wxBest ? `Treat ${humanTime(wxBest.startTime)} as a weather target, then verify HVO and the live camera immediately before leaving.` : 'Verify HVO, the live camera and NPS access immediately before leaving later today.',
      bestWindow: weatherWindowLabel(wxBest),
      mainReason: forecastability.state === 'UNPREDICTABLE' ? 'HVO does not provide a reliable eruption countdown, so current activity cannot be projected into a later trip.' : `${activity.label} is current evidence, not a guarantee for later today.`,
      viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile
    };
  }

  if (['FOUNTAINING', 'ELEVATED', 'UNREST'].includes(activity.state) && (sources?.weather?.status !== 'ok' || !wxArrival || wxArrival.score == null)) {
    return { state: 'VERIFY WEATHER', headline: 'Check summit weather before making the drive', action: 'The forecast does not provide a usable viewing-weather read for your arrival. Check NWS summit weather and the live camera before leaving.', bestWindow: weatherWindowLabel(wxBest), mainReason: 'Missing weather is not evidence of a clear view.', viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile };
  }

  if (activity.state === 'FOUNTAINING' && sources?.air?.status && sources.air.status !== 'ok') {
    return { state: 'VERIFY AIR', headline: 'Confirm volcanic air conditions before visiting', action: 'The regional SO₂ feed is unavailable or stale. Check NPS air conditions at your intended viewpoint before leaving.', bestWindow: weatherWindowLabel(wxBest), mainReason: 'Missing air observations cannot support a confident go-now recommendation.', viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile };
  }

  const poorView = wxArrival && wxArrival.score != null && wxArrival.score < 0.35;
  const laterMeaningfullyBetter = wxNow && wxBest && wxBest.score > wxNow.score + 0.22 && new Date(wxBest.startTime) > now;
  const longDrive = travelMinutes >= 180;
  let state = 'WATCHING';
  let headline = 'The summit is worth watching, but timing matters';
  let action = 'Look at the summit camera before you leave. It is the quickest way to see whether the view matches the official activity report.';
  let mainReason = activity.label;
  let bestWindow = null;

  if (activity.state === 'FOUNTAINING') {
    if (poorView) {
      state = 'MIXED';
      headline = 'The eruption is active; the weather is hiding the story';
      action = 'Use the live camera before you move. On this summit, cloud and rain can erase a view of active lava in minutes.';
      mainReason = `${activity.label}; ${wxArrival.shortForecast || 'poor summit visibility'} near your arrival is the limiting factor, not the volcanic activity itself.`;
    } else if (longDrive) {
      state = 'GO: VERIFY FIRST';
      headline = 'Fountaining is happening now, but three hours is a long way from ‘now’';
      action = 'Before committing to a three-hour drive, check the newest HVO message and the live camera. Eruptive episodes can change before you reach the rim.';
      mainReason = 'HVO reports fountaining now; the uncertainty is whether that same scene will still be there after a three-hour drive.';
    } else {
      state = 'GO NOW';
      headline = 'Kīlauea is fountaining now';
      action = viewpoint ? `If the camera is clear, ${viewpoint.name} is your best fit. Once there, look across Kaluapele before narrowing in on the vent. The scale is part of the story.` : 'If the camera is clear, use an open NPS eruption viewpoint and give yourself a minute to read the whole caldera before focusing on the lava.';
      mainReason = activity.label;
    }
  } else if (activity.state === 'ELEVATED' || activity.state === 'UNREST') {
    if (forecastability.state === 'UNPREDICTABLE') {
      state = longDrive ? 'WAIT FOR CONFIRMATION' : 'WATCHING';
      headline = activity.state === 'ELEVATED' ? 'The summit is active, but it is not on a reliable clock' : 'The summit is restless, but the next episode is not on a reliable clock';
      action = longDrive ? 'Do not chase a modeled eruption time. For a three-hour drive, wait for a fresh HVO message or unmistakable activity on the summit camera.' : 'If you are nearby, look at the live camera and read the summit for yourself; otherwise wait for the next HVO message before making the trip about lava.';
      mainReason = 'HVO reports activity but says the next fountain window cannot be modeled reliably. The useful truth here is what the summit is doing now, not a countdown someone else has invented.';
    } else {
      state = longDrive ? 'WATCHING' : 'WORTH A LOOK';
      headline = 'Kīlauea is showing active summit signals';
      action = longDrive ? 'Before committing to the drive, compare the newest HVO message with the live camera. If they tell the same story, you have a much stronger reason to move.' : `Use the camera first${viewpoint ? `, then favor ${viewpoint.name}` : ''}. When you arrive, look for the features HVO is describing rather than only for bright lava.`;
      mainReason = activity.label;
    }
  } else if (activity.state === 'PAUSED') {
    state = 'WAIT';
    headline = 'Kīlauea is between eruptive episodes';
    action = 'If visible lava is the purpose of the drive, hold off until HVO confirms renewed activity. The pause is part of Kīlauea’s behavior, not a failure of the visit.';
    mainReason = 'No active eruptive episode is confirmed.';
  } else {
    state = 'CHECK FIRST';
    headline = 'The summit is not giving a strong live eruption signal yet';
    action = 'Read the newest HVO update and look at the live camera before deciding to travel. If the summit is quiet, let that be the answer rather than forcing a trip around an eruption that is not there.';
    mainReason = activity.label;
  }

  if (laterMeaningfullyBetter && activity.state !== 'PAUSED') {
    bestWindow = weatherWindowLabel(wxBest);
  } else if (wxBest) {
    bestWindow = weatherWindowLabel(wxBest);
  }

  return { state, headline, action, bestWindow, mainReason, viewpoint, confidence, activity, forecastability, wxNow, wxBest, profile: safeProfile };
}

module.exports = {
  VIEWPOINTS,
  classifyActivity,
  classifyForecastability,
  weatherScore,
  bestWeatherWindow,
  currentWeather,
  periodsForPlan,
  chooseViewpoint,
  buildDecision,
  hoursOld,
  HVO_STALE_HOURS
};
