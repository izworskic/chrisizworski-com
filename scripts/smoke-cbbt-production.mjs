const BASE = String(process.env.CBBT_BASE_URL || 'https://chrisizworski.com').replace(/\/$/, '');
const PAGE_URL = `${BASE}/chesapeake-bay-bridge-tunnel/`;
const API_URL = `${BASE}/api/cbbt`;
const MEDIA_JS_URL = `${BASE}/assets/cbbt-view.js?v=20261001b`;
const RADAR_URL = `${BASE}/api/cbbt-media?asset=radar`;
const SOUTH_CAMERA_URL = `${BASE}/api/cbbt-media?asset=camera&slot=south`;
const NORTH_CAMERA_URL = `${BASE}/api/cbbt-media?asset=camera&slot=north`;
const ATTEMPTS = Number(process.env.CBBT_SMOKE_ATTEMPTS || 12);
const WAIT_MS = Number(process.env.CBBT_SMOKE_WAIT_MS || 10000);
const TIMEOUT_MS = Number(process.env.CBBT_SMOKE_TIMEOUT_MS || 25000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'CBBTProductionSmoke/1.0 (+https://chrisizworski.com/chesapeake-bay-bridge-tunnel/)',
        accept: options.accept || '*/*',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function requireImage(url, label) {
  const response = await request(url, { accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' });
  const type = String(response.headers.get('content-type') || '');
  if (!response.ok) throw new Error(`${label} returned ${response.status}${type ? ` ${type}` : ''}`);
  if (!type.startsWith('image/')) throw new Error(`${label} returned non-image content type ${type || 'missing'}`);
  return `${response.status} ${type}`;
}

async function verifyOnce() {
  const page = await request(PAGE_URL, { accept: 'text/html' });
  if (!page.ok) throw new Error(`page returned ${page.status}`);
  const html = await page.text();
  for (const marker of [
    'Chesapeake Bay Bridge-Tunnel Conditions',
    'id="statusPanel"',
    'id="vehicleQuickSelect"',
    'id="tollForm"',
    '/api/cbbt-media?asset=radar',
    '/assets/cbbt-view.js?v=20261001b',
  ]) {
    if (!html.includes(marker)) throw new Error(`page missing marker: ${marker}`);
  }

  const mediaJs = await request(MEDIA_JS_URL, { accept: 'application/javascript,text/javascript,*/*;q=0.8' });
  if (!mediaJs.ok) throw new Error(`CBBT media JS returned ${mediaJs.status}`);
  const mediaJsText = await mediaJs.text();
  for (const marker of [
    '/api/cbbt-media?asset=camera&slot=south',
    '/api/cbbt-media?asset=camera&slot=north',
    'CBBT cameras and weather',
  ]) {
    if (!mediaJsText.includes(marker)) throw new Error(`CBBT media JS missing marker: ${marker}`);
  }

  const api = await request(API_URL, { accept: 'application/json' });
  if (!api.ok) throw new Error(`/api/cbbt returned ${api.status}`);
  const data = await api.json();
  if (data?.engine?.authorityRule !== 'CBBT_OFFICIAL_STATUS_ALWAYS_WINS') {
    throw new Error('CBBT authority invariant missing from production API');
  }
  if (data?.engine?.weatherMayDeclareRestriction !== false) {
    throw new Error('production API allows weather to declare a CBBT restriction');
  }
  if (data?.bridge?.id !== 'cbbt') throw new Error('production API bridge identity mismatch');
  if (!data?.officialStatus || !('state' in data.officialStatus)) throw new Error('production API officialStatus missing');
  if (!data?.freshness || !data?.systemHealth) throw new Error('production API freshness/systemHealth missing');

  let radar = 'not checked';
  try {
    const response = await request(RADAR_URL, { accept: 'image/gif,image/*,*/*;q=0.8' });
    const type = String(response.headers.get('content-type') || '');
    if (response.status === 404) throw new Error('radar proxy route returned 404');
    radar = response.ok && type.startsWith('image/')
      ? `ok (${type})`
      : `upstream-degraded (${response.status}${type ? ` ${type}` : ''})`;
  } catch (error) {
    radar = `non-blocking warning (${error.message})`;
  }

  const southCamera = await requireImage(SOUTH_CAMERA_URL, 'south camera proxy');
  const northCamera = await requireImage(NORTH_CAMERA_URL, 'north camera proxy');

  return {
    page: page.status,
    api: api.status,
    officialState: data.officialStatus.state,
    restriction: data.officialStatus.restrictionLevel || 'UNKNOWN',
    systemHealth: data.systemHealth.state || 'UNKNOWN',
    radar,
    southCamera,
    northCamera,
  };
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    const result = await verifyOnce();
    console.log(
      `CBBT production smoke PASS | page=${result.page} | api=${result.api} | official=${result.officialState} | restriction=${result.restriction} | health=${result.systemHealth} | radar=${result.radar} | southCamera=${result.southCamera} | northCamera=${result.northCamera}`,
    );
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.warn(`CBBT production smoke attempt ${attempt}/${ATTEMPTS} failed: ${error.message}`);
    if (attempt < ATTEMPTS) await sleep(WAIT_MS);
  }
}

console.error(`CBBT production smoke FAIL — ${lastError?.message || 'unknown error'}`);
process.exit(1);
