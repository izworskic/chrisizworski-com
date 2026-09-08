const PAGE = 'https://chrisizworski.com/ballard-locks/';
const API = 'https://chrisizworski.com/api/ballard-locks';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url, timeoutMs = 30000) {
  const started = Date.now();
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/json',
      'user-agent': 'ChrisIzworskiBallardProductionSmoke/1.3',
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

async function waitForApiContract() {
  let last;
  for (let attempt = 1; attempt <= 24; attempt++) {
    try {
      const api = await fetchText(`${API}?smoke=${Date.now()}`, 30000);
      const data = parseJson(api.text);
      last = { api, data };
      if (api.response.ok && data && fishContractReady(data)) return last;
      const fishSummary = data?.fish?.species?.map(s => `${s.species}:${s.latest?.daily}/${s.latest?.total}`).join(', ') || data?.fish?.error || 'no fish payload';
      console.log(`Ballard API contract not ready (attempt ${attempt}/24, HTTP ${api.response.status}, fish=${fishSummary}); retrying.`);
    } catch (error) {
      console.log(`Ballard API readiness attempt ${attempt}/24 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  const summary = last?.data?.fish?.species ? JSON.stringify(last.data.fish.species) : last?.api?.text?.slice(0, 500);
  throw new Error(`Ballard production API did not expose the corrected fish contract${summary ? `; last payload: ${summary}` : ''}`);
}

const page = await waitForPage();
for (const required of [
  'AIS map does not represent every pleasure boat',
  'not an official lockage count',
  'Ballard Locks salmon activity',
  'NOAA Tides &amp; Currents',
  'National Weather Service',
  'ca-pub-8222782620788075',
  'G-Y5D2V2W7HN',
]) {
  if (!page.text.includes(required)) throw new Error(`Ballard production page missing required contract: ${required}`);
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
  pageMs: page.elapsedMs,
  apiStatus: api.response.status,
  apiMs: api.elapsedMs,
  generatedAt: data.generatedAt,
  score: data.visit.score,
  label: data.visit.label,
  confidence: data.visit.confidence,
  feeds,
  fishSpecies: data.fish.species.map(s => ({ species: s.species, date: s.latest.date, daily: s.latest.daily, total: s.latest.total, ageDays: s.ageDays })),
  nextTide: data.tides?.ok ? data.tides.predictions?.[0] : null,
  weather: data.weather?.ok ? { temperatureF: data.weather.temperatureF, shortForecast: data.weather.shortForecast } : null,
}));
