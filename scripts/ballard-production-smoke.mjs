const PAGE = 'https://chrisizworski.com/ballard-locks/';
const TOUR = 'https://chrisizworski.com/ballard-locks/tour/';
const API = 'https://chrisizworski.com/api/ballard-locks';
const AIS_API = 'https://chrisizworski.com/api/ballard-ais';
const LEVEL_TSID = 'LWSC.Elev-Lake.Ave.1Hour.1Hour.IRIDIUM-REV';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url, timeoutMs = 30000) {
  const started = Date.now();
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/json',
      'user-agent': 'ChrisIzworskiBallardProductionSmoke/1.4',
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

function fishContractReady(data) {
  if (!data?.fish?.ok || !Array.isArray(data.fish.species) || data.fish.species.length !== 3) return false;
  const expected = new Set(['Sockeye', 'Chinook', 'Coho']);
  const seen = new Set();
  const signatures = [];
  for (const species of data.fish.species) {
    if (!expected.has(species?.species) || seen.has(species.species)) return false;
    seen.add(species.species);
    if (!species?.latest?.date || !Number.isFinite(species?.latest?.daily) || !Number.isFinite(species?.latest?.total)) return false;
    signatures.push(`${species.latest.daily}:${species.latest.total}`);
  }
  return new Set(signatures).size === 3;
}

function lakeLevelContractReady(data) {
  const level = data?.lakeLevel;
  if (!level?.ok || !Number.isFinite(level.valueFt) || level.valueFt < 18 || level.valueFt > 24) return false;
  const observed = Date.parse(level.observedAt);
  if (!Number.isFinite(observed)) return false;
  const ageHours = Math.max(0, (Date.now() - observed) / 3600000);
  if (ageHours > 72) return false;
  if (!String(level.source || '').includes('USACE')) return false;
  if (level.tsid !== LEVEL_TSID) return false;
  return true;
}

async function waitForPage() {
  let last;
  for (let attempt = 1; attempt <= 18; attempt++) {
    try {
      last = await fetchText(PAGE, 15000);
      const ready = last.response.ok
        && last.text.includes('<h1>Ballard Locks Live: Ships, Salmon &amp; Tides</h1>')
        && last.text.includes('<link rel="canonical" href="https://chrisizworski.com/ballard-locks/">')
        && last.text.includes('/api/ballard-locks');
      if (ready) return last;
      console.log(`Ballard production page not ready (attempt ${attempt}/18, HTTP ${last.response.status}); retrying.`);
    } catch (error) {
      console.log(`Ballard page attempt ${attempt}/18 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error(`Ballard production page did not become ready${last ? ` (last HTTP ${last.response.status})` : ''}`);
}

async function waitForTour() {
  let last;
  for (let attempt = 1; attempt <= 18; attempt++) {
    try {
      last = await fetchText(TOUR + '?smoke=' + Date.now(), 15000);
      const ready = last.response.ok
        && last.text.includes('Ballard Locks Self-Guided Tour Map')
        && last.text.includes('20 min · Essentials')
        && last.text.includes('45 min · Full Locks')
        && last.text.includes('75 min · + Ballard')
        && last.text.includes('/api/ballard-locks')
        && last.text.includes('/api/ballard-ais')
        && last.text.includes('activePopup=null')
        && last.text.includes('if(activePopup&&activePopup!==popup)activePopup.remove()')
        && last.text.includes('id="tour-map" class="map map-overlay"')
        && last.text.includes('https://tiles.openfreemap.org/styles/liberty')
        && last.text.includes("map.addSource('ais-vessels'")
        && last.text.includes("id:'ais-vessels'")
        && last.text.includes('setInterval(loadAis,15000)')
        && last.text.includes('interactive:true')
        && last.text.includes('id="map-live-dock"')
        && last.text.includes('data-live-panel="fish"')
        && !last.text.includes('data-live-panel="ais"')
        && last.text.includes('data-live-panel="camera"')
        && last.text.includes("closeOnClick:false")
        && last.text.includes("map.panBy([shiftX,shiftY")
        && last.text.includes('map.jumpTo({center:v.center,zoom:v.zoom})')
        && last.text.includes('https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe')
        && last.text.includes('Sockeye')
        && last.text.includes('Chinook')
        && last.text.includes('Coho')
        && !last.text.includes('id="tour-ais-underlay"')
        && !last.text.includes('embed.myshiptracking.com')
        && !last.text.includes('syncAisToMap')
        && !last.text.includes('What this map adds');
      if (ready) return last;
      console.log('Ballard tour not ready (attempt ' + attempt + '/18, HTTP ' + last.response.status + '); retrying.');
    } catch (error) {
      console.log('Ballard tour attempt ' + attempt + '/18 failed: ' + error.message);
    }
    await sleep(5000);
  }
  throw new Error('Ballard tour did not become ready' + (last ? ' (last HTTP ' + last.response.status + ')' : ''));
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
      if (api.response.ok && data && fishContractReady(data) && lakeLevelContractReady(data)) return last;
      const fishSummary = data?.fish?.species?.map(s => `${s.species}:${s.latest?.daily}/${s.latest?.total}`).join(', ') || data?.fish?.error || 'no fish payload';
      const levelSummary = data?.lakeLevel?.ok ? `${data.lakeLevel.valueFt}ft @ ${data.lakeLevel.observedAt}` : data?.lakeLevel?.error || 'no lake-level payload';
      console.log(`Ballard API contract not ready (attempt ${attempt}/24, HTTP ${api.response.status}, fish=${fishSummary}, lake=${levelSummary}); retrying.`);
    } catch (error) {
      console.log(`Ballard API readiness attempt ${attempt}/24 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  const summary = last?.data ? JSON.stringify({fish:last.data.fish, lakeLevel:last.data.lakeLevel}) : last?.api?.text?.slice(0, 500);
  throw new Error(`Ballard production API did not expose the corrected fish + USACE lake-level contract${summary ? `; last payload: ${summary}` : ''}`);
}

const page = await waitForPage();
const tour = await waitForTour();
const { aisApi, aisData } = await waitForAisContract();
for (const required of [
  'AIS map does not represent every pleasure boat',
  'not an official lockage count',
  'Ballard Locks salmon activity',
  'NOAA Tides &amp; Currents',
  'National Weather Service',
  'https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe',
  'Live Ballard Ship Canal camera',
  'Live video from Salmon Bay Marine Center Camera #3',
  'ca-pub-8222782620788075',
  'G-Y5D2V2W7HN',
  'https://chrisizworski.com/ballard-locks/tour/',
  'Explore the Locks stop by stop',
]) {
  if (!page.text.includes(required)) throw new Error(`Ballard production page missing required contract: ${required}`);
}


if (page.text.includes('Open live Ship Canal cameras')) {
  throw new Error('Multi-camera picker returned to Ballard production');
}

if (page.text.includes('UC1roj2AL1R0DxTjjX89gbEQ') || page.text.includes('youtube.com/@BallardLocksWebcam')) {
  throw new Error('Dead Ballard Locks YouTube camera embed/link returned to production');
}

const { api, data } = await waitForApiContract();
if (!String(api.response.headers.get('content-type') || '').includes('application/json')) {
  throw new Error(`Ballard API returned unexpected content type: ${api.response.headers.get('content-type')}`);
}
const robots = String(api.response.headers.get('x-robots-tag') || '').toLowerCase();
if (!robots.includes('noindex')) throw new Error(`Ballard API missing noindex header: ${robots || '(none)'}`);

if (!data?.location?.name?.includes('Hiram M. Chittenden')) throw new Error(`Unexpected Ballard location payload: ${JSON.stringify(data?.location)}`);
const generated = Date.parse(data.generatedAt);
if (!Number.isFinite(generated)) throw new Error(`Invalid generatedAt: ${data.generatedAt}`);
const ageMs = Math.abs(Date.now() - generated);
if (ageMs > 15 * 60 * 1000) throw new Error(`Ballard API payload is stale by ${Math.round(ageMs / 60000)} minutes`);

if (!Number.isFinite(data?.visit?.score) || data.visit.score < 0 || data.visit.score > 100) {
  throw new Error(`Invalid Ballard go-now score: ${JSON.stringify(data?.visit)}`);
}
if (!['High', 'Moderate', 'Low'].includes(data?.visit?.confidence)) throw new Error(`Invalid Ballard confidence: ${data?.visit?.confidence}`);
if (!Array.isArray(data?.visit?.reasons) || data.visit.reasons.length === 0) throw new Error('Ballard score reasons missing');

if (typeof data?.access?.groundsOpen !== 'boolean' || typeof data?.access?.fishLadderOpen !== 'boolean') throw new Error('Ballard access state missing');
if (typeof data?.locks?.largeOpen !== 'boolean' || typeof data?.locks?.smallOpen !== 'boolean') throw new Error('Ballard chamber state missing');
if (data?.vessels?.coverage !== 'AIS-equipped vessels only') throw new Error(`Ballard AIS truth contract changed: ${JSON.stringify(data?.vessels)}`);

const feeds = {
  fish: Boolean(data?.fish?.ok),
  tides: Boolean(data?.tides?.ok),
  weather: Boolean(data?.weather?.ok),
  lakeLevel: Boolean(data?.lakeLevel?.ok),
};
const coreFeedsUp = [feeds.fish, feeds.tides, feeds.weather].filter(Boolean).length;
if (coreFeedsUp < 2) throw new Error(`Too many Ballard core feeds unavailable: ${JSON.stringify(feeds)}`);
if (!lakeLevelContractReady(data)) throw new Error(`USACE Lake Washington Ship Canal level contract failed: ${JSON.stringify(data?.lakeLevel)}`);

const expectedSpecies = new Set(['Sockeye', 'Chinook', 'Coho']);
const seenSpecies = new Set();
const signatures = [];
for (const species of data.fish.species) {
  if (!expectedSpecies.has(species?.species)) throw new Error(`Unexpected WDFW species row: ${JSON.stringify(species)}`);
  if (seenSpecies.has(species.species)) throw new Error(`Duplicate WDFW species row: ${species.species}`);
  seenSpecies.add(species.species);
  if (!species?.latest?.date || !Number.isFinite(species?.latest?.daily) || !Number.isFinite(species?.latest?.total)) throw new Error(`Invalid WDFW species row: ${JSON.stringify(species)}`);
  if (species.ageDays != null && !Number.isFinite(species.ageDays)) throw new Error(`Invalid WDFW source age: ${JSON.stringify(species)}`);
  signatures.push(`${species.latest.daily}:${species.latest.total}`);
}
if (new Set(signatures).size !== 3) throw new Error(`WDFW species tables appear cross-contaminated; daily/total signatures collided: ${JSON.stringify(data.fish.species)}`);

if (feeds.tides && (!Array.isArray(data.tides.predictions) || data.tides.predictions.length === 0)) throw new Error('NOAA tide feed marked ok without predictions');
if (feeds.weather && !Number.isFinite(data.weather.temperatureF)) throw new Error(`NWS weather feed marked ok without temperature: ${JSON.stringify(data.weather)}`);

console.log(JSON.stringify({
  status: 'ok',
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
  feeds,
  lakeLevel: {
    valueFt: data.lakeLevel.valueFt,
    observedAt: data.lakeLevel.observedAt,
    delta24hr: data.lakeLevel.delta24hr,
    source: data.lakeLevel.source,
    tsid: data.lakeLevel.tsid,
  },
  fishSpecies: data.fish.species.map(s => ({ species: s.species, date: s.latest.date, daily: s.latest.daily, total: s.latest.total, ageDays: s.ageDays })),
  nextTide: data.tides?.ok ? data.tides.predictions?.[0] : null,
  weather: data.weather?.ok ? { temperatureF: data.weather.temperatureF, shortForecast: data.weather.shortForecast } : null,
}));
