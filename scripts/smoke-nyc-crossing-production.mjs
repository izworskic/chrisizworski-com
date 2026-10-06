const BASE = String(process.env.NYC_CROSSING_BASE_URL || 'https://chrisizworski.com').replace(/\/$/, '');
const PAGE_URL = `${BASE}/nyc-crossing/`;
const API_URL = `${BASE}/api/nyc-crossing?smoke=${process.env.GITHUB_SHA || Date.now()}`;
const ATTEMPTS = Number(process.env.NYC_CROSSING_SMOKE_ATTEMPTS || 36);
const WAIT_MS = Number(process.env.NYC_CROSSING_SMOKE_WAIT_MS || 10000);
const TIMEOUT_MS = Number(process.env.NYC_CROSSING_SMOKE_TIMEOUT_MS || 25000);

const EXPECTED_IDS = [
  'gwb',
  'lincoln',
  'holland',
  'queens-midtown',
  'queensboro',
  'hugh-carey',
  'brooklyn',
  'manhattan',
  'williamsburg',
  'rfk',
  'verrazzano',
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, accept) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'NYCCrossingProductionSmoke/1.0 (+https://chrisizworski.com/nyc-crossing/)',
        accept,
        'cache-control': 'no-cache',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyOnce() {
  const page = await request(PAGE_URL + '?smoke=' + encodeURIComponent(process.env.GITHUB_SHA || Date.now()), 'text/html');
  assert(page.ok, `page returned ${page.status}`);
  const html = await page.text();
  for (const marker of [
    'Which NYC crossing should you take?',
    'Compare official live bridge and tunnel conditions',
    'NYC DOT real-time traffic feed',
    'NYC Open Data traffic history',
    'TRANSCOM travel-time data',
    '/assets/nyc-crossing.js?v=20261006b',
  ]) {
    assert(html.includes(marker), `page missing marker: ${marker}`);
  }

  const api = await request(API_URL, 'application/json');
  assert(api.ok, `API returned ${api.status}`);
  const data = await api.json();

  assert(Array.isArray(data.routes), 'API routes missing');
  assert(data.routes.length === EXPECTED_IDS.length, `expected ${EXPECTED_IDS.length} crossings, got ${data.routes.length}`);
  const ids = data.routes.map(route => route.id);
  for (const id of EXPECTED_IDS) assert(ids.includes(id), `missing crossing ${id}`);

  assert(['PARTIAL', 'UNAVAILABLE'].includes(data.trafficState), `unexpected trafficState ${data.trafficState}`);
  assert(['LIVE_CROSSING_CONDITIONS', 'COST_ONLY'].includes(data.recommendationState), `unexpected recommendationState ${data.recommendationState}`);
  assert(data.fastest == null, 'mixed crossing/approach scopes must not produce fastest route');
  assert(data.sources?.portAuthority, 'Port Authority source missing');
  assert(data.sources?.nycdotTraffic, 'NYC DOT live source missing');
  assert(data.sources?.nycdotHistory, 'NYC DOT history source missing');
  assert(data.sources?.transcom, 'TRANSCOM source missing');
  assert(['LIVE', 'NO_MATCH', 'UNAVAILABLE', 'NOT_APPLICABLE'].includes(data.baselineState), `unexpected baselineState ${data.baselineState}`);
  assert(data.baselineSource, 'NYC DOT historical baseline source missing');

  const live = data.routes.filter(route => route.etaState === 'LIVE');
  for (const route of live) {
    assert(Number.isFinite(route.etaMinutes) && route.etaMinutes > 0, `${route.id} live ETA invalid`);
    assert(route.etaScope, `${route.id} live scope missing`);
    assert(route.trafficSource, `${route.id} live source URL missing`);
    assert(route.trafficSourceName, `${route.id} live source name missing`);
    if (route.baselineKind === 'NYCDOT_8_WEEK_HOURLY_AVG') {
      assert(Number.isFinite(route.baselineMinutes) && route.baselineMinutes > 0, `${route.id} historical baseline invalid`);
      assert(Number.isFinite(route.baselineSamples) && route.baselineSamples >= 24, `${route.id} historical sample gate violated`);
      assert(route.baselineSource, `${route.id} historical source missing`);
    }
  }

  const nycdotLive = live.filter(route => route.trafficSourceName === 'NYC DOT Traffic Management Center');
  const nycdotBaselines = live.filter(route => route.baselineKind === 'NYCDOT_8_WEEK_HOURLY_AVG');
  if (data.baselineState === 'LIVE') {
    assert(Number.isFinite(data.baselineCount) && data.baselineCount > 0, 'LIVE baseline state has zero enriched routes');
    assert(nycdotBaselines.length === data.baselineCount, 'baselineCount does not match enriched NYC DOT routes');
  }

  const pending = new Map(data.routes.filter(route => route.trafficPending).map(route => [route.id, route.trafficPending]));
  assert(/TRANSCOM/.test(pending.get('williamsburg') || ''), 'Williamsburg TRANSCOM pending state missing when no live route is present');
  assert(/TRANSCOM/.test(pending.get('queensboro') || ''), 'Queensboro TRANSCOM pending state missing when no live route is present');

  return {
    page: page.status,
    api: api.status,
    trafficState: data.trafficState,
    liveCount: live.length,
    baselineCount: live.filter(route => route.baselineMinutes != null).length,
    nycdotLiveCount: nycdotLive.length,
    nycdotBaselineCount: nycdotBaselines.length,
    baselineState: data.baselineState,
    baselineReason: data.baselineReason,
  };
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    const result = await verifyOnce();
    const suffix = result.liveCount === 0
      ? ' | warning=no fresh official live readings at smoke time'
      : '';
    console.log(
      `NYC crossing production smoke PASS | page=${result.page} | api=${result.api} | traffic=${result.trafficState} | live=${result.liveCount} | baselines=${result.baselineCount} | nycdotLive=${result.nycdotLiveCount} | nycdotBaselines=${result.nycdotBaselineCount} | baselineState=${result.baselineState} | baselineReason=${result.baselineReason || 'none'}${suffix}`,
    );
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.warn(`NYC crossing production smoke attempt ${attempt}/${ATTEMPTS} failed: ${error.message}`);
    if (attempt < ATTEMPTS) await sleep(WAIT_MS);
  }
}

console.error(`NYC crossing production smoke FAIL — ${lastError?.message || 'unknown error'}`);
process.exit(1);
