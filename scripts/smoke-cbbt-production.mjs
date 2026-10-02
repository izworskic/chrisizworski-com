const BASE = String(process.env.CBBT_BASE_URL || 'https://chrisizworski.com').replace(/\/$/, '');
const PAGE_URL = `${BASE}/chesapeake-bay-bridge-tunnel/`;
const API_URL = `${BASE}/api/cbbt`;
const MEDIA_JS_URL = `${BASE}/assets/cbbt-view.js?v=20261001b`;
const RADAR_URL = `${BASE}/api/cbbt-media?asset=radar`;
const SOUTH_CAMERA_URL = `${BASE}/api/cbbt-media?asset=camera&slot=south`;
const NORTH_CAMERA_URL = `${BASE}/api/cbbt-media?asset=camera&slot=north`;
const PAGE_CAMERA_URL = `${BASE}/api/cbbt-media?asset=camera&slot=page`;
const ATTEMPTS = Number(process.env.CBBT_SMOKE_ATTEMPTS || 12);
const WAIT_MS = Number(process.env.CBBT_SMOKE_WAIT_MS || 10000);
const TIMEOUT_MS = Number(process.env.CBBT_SMOKE_TIMEOUT_MS || 25000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: options.redirect || 'follow',
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

async function requireCameraDelivery(url, label, expectedCameraId) {
  const response = await request(url, {
    accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    redirect: 'manual',
  });

  if (response.headers.get('x-cbbt-camera-id') !== expectedCameraId) {
    throw new Error(`${label} camera identity header mismatch`);
  }

  const type = String(response.headers.get('content-type') || '');
  if (response.status === 200) {
    if (!type.startsWith('image/')) {
      throw new Error(`${label} returned 200 with non-image content type ${type || 'missing'}`);
    }
    return `200 ${type}`;
  }

  if (![301, 302, 307, 308].includes(response.status)) {
    throw new Error(`${label} returned ${response.status}${type ? ` ${type}` : ''}`);
  }

  const location = response.headers.get('location');
  if (!location) throw new Error(`${label} redirect is missing Location`);
  const target = new URL(location, BASE);
  if (target.protocol !== 'https:' || target.hostname !== 'snapshot.vdotcameras.com') {
    throw new Error(`${label} redirects to an unexpected host`);
  }
  if (target.pathname !== `/thumbs/${expectedCameraId}.flv.png`) {
    throw new Error(`${label} redirects to an unexpected camera: ${target.pathname}`);
  }
  if (response.headers.get('x-cbbt-camera-delivery') !== 'client-redirect') {
    throw new Error(`${label} delivery contract missing`);
  }

  return `${response.status} -> ${target.hostname}${target.pathname}`;
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
    '/api/cbbt-media?asset=camera&slot=page',
    'Current visual check',
    'cbbtCameraImage',
    'Three nearby Virginia 511 still cameras',
    'Greenwell Rd',
    'E Stratford Rd',
    'Page Ave',
    'snapshot.vdotcameras.com/thumbs/vabeachcam014.flv.png',
    'snapshot.vdotcameras.com/thumbs/vabeachcam013.flv.png',
    'snapshot.vdotcameras.com/thumbs/vabeachcam015.flv.png',
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
    const radarType = String(response.headers.get('content-type') || '');
    if (response.status === 404) throw new Error('radar proxy route returned 404');
    radar = response.ok && radarType.startsWith('image/')
      ? `ok (${radarType})`
      : `upstream-degraded (${response.status}${radarType ? ` ${radarType}` : ''})`;
  } catch (error) {
    radar = `non-blocking warning (${error.message})`;
  }

  const southCamera = await requireCameraDelivery(SOUTH_CAMERA_URL, 'Greenwell Road camera route', 'vabeachcam014');
  const northCamera = await requireCameraDelivery(NORTH_CAMERA_URL, 'E Stratford Road camera route', 'vabeachcam013');
  const pageCamera = await requireCameraDelivery(PAGE_CAMERA_URL, 'Page Avenue camera route', 'vabeachcam015');

  return {
    page: page.status,
    api: api.status,
    officialState: data.officialStatus.state,
    restriction: data.officialStatus.restrictionLevel || 'UNKNOWN',
    systemHealth: data.systemHealth.state || 'UNKNOWN',
    radar,
    southCamera,
    northCamera,
    pageCamera,
  };
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    const result = await verifyOnce();
    console.log(
      `CBBT production smoke PASS | page=${result.page} | api=${result.api} | official=${result.officialState} | restriction=${result.restriction} | health=${result.systemHealth} | radar=${result.radar} | southCamera=${result.southCamera} | northCamera=${result.northCamera} | pageCamera=${result.pageCamera}`,
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
