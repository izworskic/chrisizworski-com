const PAGE = 'https://chrisizworski.com/ballard-locks/';
const TOUR = 'https://chrisizworski.com/ballard-locks/tour/';
const API = 'https://chrisizworski.com/api/ballard-locks';
const AIS_API = 'https://chrisizworski.com/api/ballard-ais';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url, timeoutMs = 30000) {
  const started = Date.now();
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/json',
      'user-agent': 'ChrisIzworskiBallardProductionSmoke/2.0',
      'cache-control': 'no-cache',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  return { response, text, elapsedMs: Date.now() - started };
}

function parseJson(text) {
  try { return JSON.parse(text); }
  catch { return null; }
}

function fishContractValid(fish) {
  if (!fish || !String(fish.source || '').includes('Washington Department of Fish & Wildlife')) return false;
  if (!fish.ok) return Boolean(fish.error);
  if (!Array.isArray(fish.species) || fish.species.length !== 3) return false;
  const expected = new Set(['Sockeye', 'Chinook', 'Coho']);
  const seen = new Set();
  for (const species of fish.species) {
    if (!expected.has(species?.species) || seen.has(species.species)) return false;
    seen.add(species.species);
    if (!species?.latest?.date || !Number.isFinite(species?.latest?.daily) || !Number.isFinite(species?.latest?.total)) return false;
    if (!['IN SEASON', 'SEASON EDGE', 'OFFSEASON'].includes(species?.season?.status)) return false;
    if (species.ageDays != null && !Number.isFinite(species.ageDays)) return false;
  }
  return true;
}

function lakeLevelContractValid(level) {
  if (!level || !String(level.source || '').includes('USACE')) return false;
  if (!Array.isArray(level.targetRangeFt) || level.targetRangeFt[0] !== 20 || level.targetRangeFt[1] !== 22) return false;
  if (!level.ok) return Boolean(level.error);
  if (!Number.isFinite(level.valueFt) || level.valueFt < 18 || level.valueFt > 24) return false;
  const observed = Date.parse(level.observedAt);
  if (!Number.isFinite(observed)) return false;
  const ageHours = Math.max(0, (Date.now() - observed) / 3600000);
  return ageHours <= 72;
}

function apiContractValid(data) {
  if (!data?.location?.name?.includes('Hiram M. Chittenden')) return false;
  if (!Number.isFinite(data?.visit?.score) || data.visit.score < 0 || data.visit.score > 100) return false;
  if (!['High', 'Moderate', 'Low'].includes(data?.visit?.confidence)) return false;
  if (!Array.isArray(data?.visit?.reasons) || data.visit.reasons.length === 0) return false;
  if (!data?.visit?.bestFirstStop?.name || !data?.visit?.bestFirstStop?.why) return false;
  if (typeof data?.access?.groundsOpen !== 'boolean' || typeof data?.access?.fishLadderOpen !== 'boolean') return false;
  if (typeof data?.locks?.largeOpen !== 'boolean' || typeof data?.locks?.smallOpen !== 'boolean') return false;
  if (!['ACTIVE', 'MODERATE', 'QUIET', 'UNKNOWN'].includes(data?.vessels?.signal)) return false;
  if (!String(data?.vessels?.source || '').includes('Open Waters AIS')) return false;
  if (!String(data?.vessels?.caveat || '').toLowerCase().includes('does not guarantee a lock transit')) return false;
  if (data?.tides?.decisionRole !== 'context-only') return false;
  if (!fishContractValid(data.fish)) return false;
  if (!lakeLevelContractValid(data.lakeLevel)) return false;
  return true;
}

async function waitForPage() {
  let last;
  for (let attempt = 1; attempt <= 18; attempt++) {
    try {
      last = await fetchText(`${PAGE}?smoke=${Date.now()}`, 15000);
      const ready = last.response.ok
        && last.text.includes('<h1>Ballard Locks Live</h1>')
        && last.text.includes('<link rel="canonical" href="https://chrisizworski.com/ballard-locks/">')
        && last.text.includes('/api/ballard-locks')
        && last.text.includes('one working system doing three jobs at once')
        && last.text.includes('Look up from your phone')
        && last.text.includes('activity-story')
        && last.text.includes('context only');
      if (ready) return last;
      console.log(`Ballard ambassador page not ready (attempt ${attempt}/18, HTTP ${last.response.status}); retrying.`);
    } catch (error) {
      console.log(`Ballard page attempt ${attempt}/18 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error(`Ballard ambassador production page did not become ready${last ? ` (last HTTP ${last.response.status})` : ''}`);
}

async function waitForTour() {
  let last;
  for (let attempt = 1; attempt <= 18; attempt++) {
    try {
      last = await fetchText(`${TOUR}?smoke=${Date.now()}`, 15000);
      const ready = last.response.ok
        && last.text.includes('Walk the Ballard Locks with someone telling you what to notice')
        && last.text.includes('20 min · Essentials')
        && last.text.includes('45 min · Full grounds')
        && last.text.includes('75 min · + Ballard')
        && last.text.includes('/api/ballard-locks')
        && last.text.includes('/api/ballard-ais')
        && last.text.includes('https://tiles.openfreemap.org/styles/liberty')
        && last.text.includes("map.addSource('ais'")
        && last.text.includes('setInterval(loadAis,15000)')
        && last.text.includes('closeOnClick:false')
        && last.text.includes('See this')
        && last.text.includes('What’s happening')
        && last.text.includes('Watch for')
        && last.text.includes('Why it matters')
        && last.text.includes('RIGHT NOW')
        && last.text.includes('not a guaranteed lock transit')
        && !last.text.includes('embed.myshiptracking.com')
        && !/href=["'][^"']*ballardlocks\.org/i.test(last.text);
      if (ready) return last;
      console.log(`Ballard ambassador tour not ready (attempt ${attempt}/18, HTTP ${last.response.status}); retrying.`);
    } catch (error) {
      console.log(`Ballard tour attempt ${attempt}/18 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error(`Ballard ambassador tour did not become ready${last ? ` (last HTTP ${last.response.status})` : ''}`);
}

async function waitForAisContract() {
  let last;
  for (let attempt = 1; attempt <= 24; attempt++) {
    try {
      const aisApi = await fetchText(`${AIS_API}?smoke=${Date.now()}`, 20000);
      const aisData = parseJson(aisApi.text);
      last = { aisApi, aisData };
      const features = aisData?.featureCollection?.features;
      const generated = Date.parse(aisData?.generatedAt || '');
      const fresh = Number.isFinite(generated) && Math.abs(Date.now() - generated) <= 10 * 60 * 1000;
      const countMatches = Array.isArray(features) && Number.isFinite(aisData?.count) && aisData.count === features.length;
      if (aisApi.response.ok && aisData?.ok && aisData?.source === 'Open Waters AIS' && aisData?.featureCollection?.type === 'FeatureCollection' && countMatches && fresh) {
        const robots = String(aisApi.response.headers.get('x-robots-tag') || '').toLowerCase();
        if (!robots.includes('noindex')) throw new Error(`Ballard AIS API missing noindex header: ${robots || '(none)'}`);
        if (features.length) {
          const f = features[0];
          const c = f?.geometry?.coordinates;
          if (f?.geometry?.type !== 'Point' || !Array.isArray(c) || !Number.isFinite(Number(c[0])) || !Number.isFinite(Number(c[1]))) throw new Error('Ballard AIS API returned invalid vessel geometry');
        }
        return last;
      }
      console.log(`Ballard AIS contract not ready (attempt ${attempt}/24, HTTP ${aisApi.response.status}, count=${aisData?.count ?? 'n/a'}); retrying.`);
    } catch (error) {
      console.log(`Ballard AIS readiness attempt ${attempt}/24 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error(`Ballard production AIS API did not become ready${last ? `; last payload: ${last.aisApi.text.slice(0,500)}` : ''}`);
}

async function waitForApiContract() {
  let last;
  for (let attempt = 1; attempt <= 24; attempt++) {
    try {
      const api = await fetchText(`${API}?smoke=${Date.now()}`, 30000);
      const data = parseJson(api.text);
      last = { api, data };
      if (api.response.ok && data && apiContractValid(data)) return last;
      console.log(`Ballard decision API contract not ready (attempt ${attempt}/24, HTTP ${api.response.status}); retrying.`);
    } catch (error) {
      console.log(`Ballard API readiness attempt ${attempt}/24 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  const summary = last?.data ? JSON.stringify({visit:last.data.visit, fish:last.data.fish, lakeLevel:last.data.lakeLevel, vessels:last.data.vessels}) : last?.api?.text?.slice(0, 500);
  throw new Error(`Ballard production decision API did not expose the v2 truth contract${summary ? `; last payload: ${summary}` : ''}`);
}

const page = await waitForPage();
const tour = await waitForTour();
const { aisApi, aisData } = await waitForAisContract();

for (const required of [
  'This is where Seattle manages the meeting of two different water worlds.',
  'one working system doing three jobs at once',
  'What might you actually see?',
  'AIS covers only equipped vessels',
  'Watch one complete lockage and the engineering becomes obvious',
  'Look up from your phone',
  'Salmon activity with seasonal meaning',
  'context only',
  'ca-pub-8222782620788075',
  'G-Y5D2V2W7HN',
  '/ballard-locks/tour/',
]) {
  if (!page.text.includes(required)) throw new Error(`Ballard production page missing ambassador contract: ${required}`);
}

if (/href=["'][^"']*ballardlocks\.org/i.test(page.text)) {
  throw new Error('Current BallardLocks.org domain returned as a linked authority');
}

const { api, data } = await waitForApiContract();
if (!String(api.response.headers.get('content-type') || '').includes('application/json')) {
  throw new Error(`Ballard API returned unexpected content type: ${api.response.headers.get('content-type')}`);
}
const robots = String(api.response.headers.get('x-robots-tag') || '').toLowerCase();
if (!robots.includes('noindex')) throw new Error(`Ballard API missing noindex header: ${robots || '(none)'}`);

const generated = Date.parse(data.generatedAt);
if (!Number.isFinite(generated)) throw new Error(`Invalid generatedAt: ${data.generatedAt}`);
const ageMs = Math.abs(Date.now() - generated);
if (ageMs > 15 * 60 * 1000) throw new Error(`Ballard API payload is stale by ${Math.round(ageMs / 60000)} minutes`);

const feeds = {
  fish: Boolean(data?.fish?.ok),
  tides: Boolean(data?.tides?.ok),
  weather: Boolean(data?.weather?.ok),
  lakeLevel: Boolean(data?.lakeLevel?.ok),
  vesselSummary: Boolean(data?.vessels?.ok),
};

if (data?.fish?.ok && data.fish.species.length !== 3) throw new Error('WDFW feed marked ok without all three species');
if (data?.tides?.ok && (!Array.isArray(data.tides.predictions) || data.tides.predictions.length === 0)) throw new Error('NOAA tide feed marked ok without predictions');
if (data?.weather?.ok && !Number.isFinite(data.weather.temperatureF)) throw new Error(`NWS weather feed marked ok without temperature: ${JSON.stringify(data.weather)}`);
if (data?.lakeLevel?.ok && !Number.isFinite(data.lakeLevel.valueFt)) throw new Error(`USACE lake level marked ok without value: ${JSON.stringify(data.lakeLevel)}`);

console.log(JSON.stringify({
  status: 'ok',
  experience: 'ballard-ambassador-v2',
  pageStatus: page.response.status,
  tourStatus: tour.response.status,
  tourMs: tour.elapsedMs,
  pageMs: page.elapsedMs,
  apiStatus: api.response.status,
  apiMs: api.elapsedMs,
  aisStatus: aisApi.response.status,
  aisMs: aisApi.elapsedMs,
  aisCount: aisData.count,
  generatedAt: data.generatedAt,
  score: data.visit.score,
  label: data.visit.label,
  confidence: data.visit.confidence,
  bestFirstStop: data.visit.bestFirstStop,
  feeds,
  lakeLevel: data.lakeLevel?.ok ? {
    valueFt: data.lakeLevel.valueFt,
    observedAt: data.lakeLevel.observedAt,
    source: data.lakeLevel.source,
  } : { ok:false, error:data.lakeLevel?.error },
  fishSpecies: data.fish?.ok ? data.fish.species.map(s => ({ species: s.species, date: s.latest.date, daily: s.latest.daily, total: s.latest.total, ageDays: s.ageDays, season:s.season?.status })) : [],
  nextTide: data.tides?.ok ? data.tides.predictions?.[0] : null,
  weather: data.weather?.ok ? { temperatureF: data.weather.temperatureF, shortForecast: data.weather.shortForecast } : null,
}));
