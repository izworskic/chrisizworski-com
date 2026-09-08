const PAGE = 'https://chrisizworski.com/ballard-locks/';
const API = 'https://chrisizworski.com/api/ballard-locks';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url, timeoutMs = 30000) {
  const started = Date.now();
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/json',
      'user-agent': 'ChrisIzworskiBallardProductionSmoke/1.0',
      'cache-control': 'no-cache',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  return { response, text, elapsedMs: Date.now() - started };
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

const api = await fetchText(API, 30000);
if (!api.response.ok) throw new Error(`Ballard API HTTP ${api.response.status}: ${api.text.slice(0, 500)}`);
if (!String(api.response.headers.get('content-type') || '').includes('application/json')) {
  throw new Error(`Ballard API returned unexpected content type: ${api.response.headers.get('content-type')}`);
}
const robots = String(api.response.headers.get('x-robots-tag') || '').toLowerCase();
if (!robots.includes('noindex')) throw new Error(`Ballard API missing noindex header: ${robots || '(none)'}`);

let data;
try { data = JSON.parse(api.text); }
catch { throw new Error(`Ballard API did not return valid JSON: ${api.text.slice(0, 500)}`); }

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

if (feeds.fish) {
  if (!Array.isArray(data.fish.species) || data.fish.species.length === 0) throw new Error('WDFW feed marked ok without species rows');
  for (const species of data.fish.species) {
    if (!species?.latest?.date || !Number.isFinite(species?.latest?.daily)) throw new Error(`Invalid WDFW species row: ${JSON.stringify(species)}`);
    if (species.ageDays != null && !Number.isFinite(species.ageDays)) throw new Error(`Invalid WDFW source age: ${JSON.stringify(species)}`);
  }
}
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
  fishSpecies: data.fish?.ok ? data.fish.species.map(s => ({ species: s.species, date: s.latest.date, daily: s.latest.daily, ageDays: s.ageDays })) : [],
  nextTide: data.tides?.ok ? data.tides.predictions?.[0] : null,
  weather: data.weather?.ok ? { temperatureF: data.weather.temperatureF, shortForecast: data.weather.shortForecast } : null,
}));
