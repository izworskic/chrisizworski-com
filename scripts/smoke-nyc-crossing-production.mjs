import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import traffic from '../lib/nyc-crossing/traffic.js';

const BASE = String(process.env.NYC_CROSSING_BASE_URL || 'https://chrisizworski.com').replace(/\/$/, '');
const PAGE_URL = `${BASE}/nyc-crossing/`;
const SOCIAL_CARD_URL = `${BASE}/api/nyc-crossing-social-card`;
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

  assert(html.includes('<link rel="canonical" href="https://chrisizworski.com/nyc-crossing/">'), 'page canonical missing');
  assert(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'), 'page must remain indexable');
  assert(html.includes('<meta name="twitter:card" content="summary_large_image">'), 'large social card metadata missing');
  assert(html.includes('<meta property="og:image" content="https://chrisizworski.com/api/nyc-crossing-social-card">'), 'Open Graph image URL missing');
  assert(html.includes('https://chrisizworski.com/national-tools/'), 'National Tools discovery link missing');
  assert(html.includes('/mackinac-bridge-live/') && html.includes('/niagara-border-crossing/'), 'related crossing links missing');
  const jsonLdText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert(jsonLdText, 'page JSON-LD missing');
  const graph = JSON.parse(jsonLdText)['@graph'];
  const pageNode = graph.find(item => item['@id'] === 'https://chrisizworski.com/nyc-crossing/#page');
  assert(pageNode?.author?.['@id'] === 'https://chrisizworski.com/#person', 'canonical author entity missing');
  assert(pageNode?.breadcrumb?.['@id'] === 'https://chrisizworski.com/nyc-crossing/#breadcrumb', 'breadcrumb entity missing');

  const socialCard = await request(`${SOCIAL_CARD_URL}?smoke=${nonce}`, 'image/png');
  assert(socialCard.ok, `social card returned ${socialCard.status}`);
  assert((socialCard.headers.get('content-type') || '').includes('image/png'), 'social card content type is not PNG');
  assert((socialCard.headers.get('x-robots-tag') || '').includes('noindex'), 'social image route should be non-indexable');
  const image = Buffer.from(await socialCard.arrayBuffer());
  assert(image.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'social image PNG signature invalid');
  assert(image.readUInt32BE(16) === 1200 && image.readUInt32BE(20) === 630, 'social image dimensions invalid');

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
    socialCard: socialCard.status,
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
        `NYC crossing production smoke ${result.mapboxHealth} | page=${result.page} | api=${result.api} | socialCard=${result.socialCard} | traffic=${result.trafficState} | live=${result.liveCount} | baselines=${result.baselineCount} | nycdotLive=${result.nycdotLiveCount} | nycdotBaselines=${result.nycdotBaselineCount} | baselineState=${result.baselineState} | mapbox=${result.mapboxCount || 0} | ${result.mapboxDiagnostics} | baselineReason=${result.baselineReason || 'none'}${suffix}${result.mapboxHealth === 'DEGRADED' ? ' | warning=temporary Mapbox outage; crossing fallback coverage is incomplete' : ''}`,
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
