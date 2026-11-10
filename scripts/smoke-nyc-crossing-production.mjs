import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import traffic from '../lib/nyc-crossing/traffic.js';

const BASE = String(process.env.NYC_CROSSING_BASE_URL || 'https://chrisizworski.com').replace(/\/$/, '');
const PAGE_URL = `${BASE}/nyc-crossing/`;
const ATTEMPTS = Number(process.env.NYC_CROSSING_SMOKE_ATTEMPTS || 36);
const WAIT_MS = Number(process.env.NYC_CROSSING_SMOKE_WAIT_MS || 10000);
const TIMEOUT_MS = Number(process.env.NYC_CROSSING_SMOKE_TIMEOUT_MS || 35000);
// Keep the release marker aligned with the page's cache-busted client asset.
const CLIENT_SCRIPT = readFileSync(new URL('../public/nyc-crossing/index.html', import.meta.url), 'utf8')
  .match(/src="(\/assets\/nyc-crossing\.js\?v=[^"]+)"/)?.[1];
if (!CLIENT_SCRIPT) throw new Error('NYC crossing source page is missing its versioned client script');

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

const FALLBACK_IDS = Object.keys(traffic.MAPBOX_PROBES);

export function mapboxDiagnostics(data) {
  const probes = FALLBACK_IDS.map(id => {
    const route = data.routes?.find(item => item.id === id);
    return `${id}=${route?.etaState || 'MISSING'} (source=${route?.trafficSourceName || 'none'})`;
  });
  return `mapboxState=${data.mapboxState} | mapboxReason=${JSON.stringify(data.mapboxReason || 'none')} | ${probes.join(' | ')}`;
}

// A provider may route around a temporarily unusable bridge. The engine must
// reject an overlong alternate route instead of publishing its ETA. That is
// degraded source coverage, not a broken live-traffic parser, but only when the
// other four pinned probes are demonstrably healthy.
export function isSafelyRejectedQueensboroDetour(data) {
  if (data.mapboxState !== 'PARTIAL') return false;
  const reason = String(data.mapboxReason || '');
  if (!reason.startsWith('4 of 5 fixed crossing probes returned usable live-traffic routes.')) return false;
  const match = /queensboro: Mapbox route-distance sanity failure: crossing probe failed sanity checks \\(distance ([\\d.]+) m; allowed ([\\d]+)–([\\d]+) m\\)/.exec(reason);
  if (!match || (reason.match(/route-distance sanity failure/g) || []).length !== 1) return false;
  const [, rawDistance, rawMin, rawMax] = match;
  const probe = traffic.MAPBOX_PROBES.queensboro;
  const distance = Number(rawDistance);
  if (!Number.isFinite(distance) || distance <= probe.maxDistanceMeters || distance > 20000 ||
      Number(rawMin) !== probe.minDistanceMeters || Number(rawMax) !== probe.maxDistanceMeters) return false;
  if (/NoRoute|NoSegment|normalization failure|geometry sanity failure|snap failure|HTTP\\s+[45]\\d{2}/i.test(reason)) return false;
  const queensboro = data.routes?.find(route => route.id === 'queensboro');
  if (!queensboro || queensboro.etaState === 'LIVE' || queensboro.etaMinutes != null ||
      !/Mapbox/.test(queensboro.trafficPending || '')) return false;
  return FALLBACK_IDS.filter(id => id !== 'queensboro').every(id => {
    const route = data.routes?.find(item => item.id === id);
    return reason.includes(`${id}: LIVE (`) && route?.etaState === 'LIVE' &&
      ['Mapbox live traffic routing', 'NYC DOT Traffic Management Center', 'Port Authority'].includes(route.trafficSourceName);
  });
}

export function evaluateMapboxHealth(data) {
  const reason = String(data.mapboxReason || '');
  if (/\bHTTP\s+4\d{2}\b|Invalid Token|Not Authorized|Unauthorized|Forbidden/i.test(reason)) {
    const error = new Error(`Mapbox authorization/request failure: ${mapboxDiagnostics(data)}`);
    error.fatal = true;
    throw error;
  }
  assert(['LIVE', 'PARTIAL', 'UNAVAILABLE'].includes(data.mapboxState), `unexpected mapboxState ${data.mapboxState}: ${reason}`);

  for (const id of FALLBACK_IDS) {
    const route = data.routes?.find(item => item.id === id);
    assert(route, `${id} route missing`);
    if (route.etaState === 'LIVE' && route.trafficSourceName === 'Mapbox live traffic routing') {
      assert(Number.isFinite(route.etaMinutes) && route.etaMinutes > 0, `${id} Mapbox ETA invalid`);
      assert(route.baselineKind === 'MAPBOX_TYPICAL_TRAFFIC', `${id} Mapbox typical baseline missing`);
      assert(Number.isFinite(route.baselineMinutes) && route.baselineMinutes > 0, `${id} Mapbox baseline invalid`);
      const { minDistanceMeters: min, maxDistanceMeters: max } = traffic.MAPBOX_PROBES[id];
      assert(Number.isFinite(route.probeDistanceMeters) && route.probeDistanceMeters >= min && route.probeDistanceMeters <= max, `${id} Mapbox probe distance invalid`);
    } else if (route.etaState === 'LIVE' && ['Port Authority', 'NYC DOT Traffic Management Center'].includes(route.trafficSourceName)) {
      // Official evidence may still outrank a working Mapbox fallback.
    } else {
      assert(/Mapbox/.test(route.trafficPending || ''), `${id} Mapbox fallback state missing when live route is unavailable`);
      assert(data.mapboxState !== 'LIVE', `${id} unavailable despite Mapbox LIVE state`);
    }
  }

  if (data.mapboxState !== 'LIVE') {
    // A rejected, oversized Queensboro detour is correct fail-closed behavior;
    // preserve all other validation and authentication failures as red gates.
    if (isSafelyRejectedQueensboroDetour(data)) return 'DEGRADED';
    assert(/timeout|HTTP\s+5\d{2}\b|fetch failed|network|request failed|ECONN|ENOTFOUND|EAI_AGAIN/i.test(reason), `Mapbox failure is not a temporary third-party outage: ${reason}`);
    assert(!/NoRoute|NoSegment|normalization failure|sanity failure|snap failure/i.test(reason), `Mapbox route validation failed: ${reason}`);
    return 'DEGRADED';
  }
  return 'PASS';
}

async function verifyOnce(attempt) {
  // Each attempt bypasses any earlier CDN response, including pre-deploy failures.
  const nonce = encodeURIComponent(`${process.env.GITHUB_SHA || 'manual'}-${Date.now()}-${attempt}`);
  const page = await request(`${PAGE_URL}?smoke=${nonce}`, 'text/html');
  assert(page.ok, `page returned ${page.status}`);
  const html = await page.text();
  for (const marker of [
    'Which NYC crossing should you take?',
    'Compare live bridge and tunnel conditions',
    'NYC DOT real-time traffic feed',
    'NYC Open Data traffic history',
    'Mapbox live traffic routing',
    CLIENT_SCRIPT,
  ]) {
    assert(html.includes(marker), `page missing marker: ${marker}`);
  }

  // Verify the real browser asset as well as its HTML tag: an old CDN script
  // could reintroduce the repeated incident placeholder after a clean deploy.
  const client = await request(`${BASE}${CLIENT_SCRIPT}&smoke=${nonce}`, 'application/javascript');
  assert(client.ok, `client asset returned ${client.status}`);
  const clientSource = await client.text();
  assert(!clientSource.includes('Incident feed awaiting first update'), 'repeated 511NY incident placeholder remains in deployed client');
  assert(clientSource.includes('511NY incident updates are not verified right now'), 'truthful one-time 511NY incident fallback missing from deployed client');
  assert(clientSource.includes('current511(info?.eventsUpdatedAt)'), '511NY per-feed freshness check missing from deployed client');

  const api = await request(`${BASE}/api/nyc-crossing?smoke=${nonce}`, 'application/json');
  assert(api.ok, `API returned ${api.status}`);
  const cacheControl = api.headers.get('cache-control') || '';
  assert(!/stale-while-revalidate=300/.test(cacheControl), `stale live API cache policy still deployed: ${cacheControl}`);
  const data = await api.json();
  console.log(`NYC crossing Mapbox diagnostics | ${mapboxDiagnostics(data)}`);
  const mapboxHealth = evaluateMapboxHealth(data);

  assert(Array.isArray(data.routes), 'API routes missing');
  assert(data.routes.length === EXPECTED_IDS.length, `expected ${EXPECTED_IDS.length} crossings, got ${data.routes.length}`);
  const ids = data.routes.map(route => route.id);
  for (const id of EXPECTED_IDS) assert(ids.includes(id), `missing crossing ${id}`);
  // NYC DOT tunnel links have no verified Mapbox probe. When their official
  // measurements are missing, the visitor still needs an explicit explanation.
  for (const id of ['queens-midtown', 'hugh-carey']) {
    const route = data.routes.find(item => item.id === id);
    if (route.etaState !== 'LIVE') {
      assert(route.etaMinutes == null, `${id} unavailable route must not invent an ETA`);
      assert(/Official NYC DOT crossing reading is unavailable/.test(route.trafficPending || ''), `${id} missing truthful unavailable-state explanation`);
    }
  }

  assert(['PARTIAL', 'UNAVAILABLE'].includes(data.trafficState), `unexpected trafficState ${data.trafficState}`);
  assert(['LIVE_CROSSING_CONDITIONS', 'COST_ONLY'].includes(data.recommendationState), `unexpected recommendationState ${data.recommendationState}`);
  assert(data.fastest == null, 'mixed crossing/approach scopes must not produce fastest route');
  assert(data.sources?.portAuthority, 'Port Authority source missing');
  assert(data.sources?.nycdotTraffic, 'NYC DOT live source missing');
  assert(data.sources?.nycdotHistory, 'NYC DOT history source missing');
  assert(data.sources?.mapbox, 'Mapbox source missing');
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
    mapboxState: data.mapboxState,
    mapboxCount: data.mapboxCount,
    mapboxHealth,
    mapboxDiagnostics: mapboxDiagnostics(data),
  };
}

async function runSmoke() {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const result = await verifyOnce(attempt);
      const suffix = result.liveCount === 0
        ? ' | warning=no fresh live readings at smoke time'
        : '';
      console.log(
        `NYC crossing production smoke ${result.mapboxHealth} | page=${result.page} | api=${result.api} | traffic=${result.trafficState} | live=${result.liveCount} | baselines=${result.baselineCount} | nycdotLive=${result.nycdotLiveCount} | nycdotBaselines=${result.nycdotBaselineCount} | baselineState=${result.baselineState} | mapbox=${result.mapboxCount || 0} | ${result.mapboxDiagnostics} | baselineReason=${result.baselineReason || 'none'}${suffix}${result.mapboxHealth === 'DEGRADED' ? ' | warning=Mapbox probe coverage incomplete (provider outage or rejected detour); no unverified ETA published' : ''}`,
      );
      process.exit(0);
    } catch (error) {
      lastError = error;
      console.warn(`NYC crossing production smoke attempt ${attempt}/${ATTEMPTS} failed: ${error.message}`);
      if (error.fatal) break;
      if (attempt < ATTEMPTS) await sleep(WAIT_MS);
    }
  }

  console.error(`NYC crossing production smoke FAIL — ${lastError?.message || 'unknown error'}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runSmoke();
}
