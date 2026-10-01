const BASE = String(process.env.CBBT_BASE_URL || 'https://chrisizworski.com').replace(/\/$/, '');
const PAGE_URL = `${BASE}/chesapeake-bay-bridge-tunnel/`;
const API_URL = `${BASE}/api/cbbt`;
const RADAR_URL = `${BASE}/api/cbbt-media?asset=radar`;
const CAMERA_URL = `${BASE}/api/cbbt-cameras`;
const MEDIA_JS_URL = `${BASE}/assets/cbbt-view.js?v=20261001a`;
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
  ]) {
    if (!html.includes(marker)) throw new Error(`page missing marker: ${marker}`);
  }

  // Prove the browser media bundle from the new release has actually reached
  // production before accepting the rest of this smoke. This closes the race
  // where GitHub Actions can start before Vercel has promoted the push.
  const mediaJs = await request(MEDIA_JS_URL, { accept: 'application/javascript,text/javascript,*/*;q=0.8' });
  if (!mediaJs.ok) throw new Error(`media JS returned ${mediaJs.status}`);
  const mediaSource = await mediaJs.text();
  for (const marker of [
    "var CAMERA_API='/api/cbbt-cameras'",
    'KAKQ_loop.gif',
    'LIVE IMAGE · 30 SEC',
  ]) {
    if (!mediaSource.includes(marker)) throw new Error(`new live-media bundle not promoted yet: ${marker}`);
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

  const camerasResponse = await request(CAMERA_URL, { accept: 'application/json' });
  if (!camerasResponse.ok) throw new Error(`/api/cbbt-cameras returned ${camerasResponse.status}`);
  const cameraData = await camerasResponse.json();
  if (cameraData?.source?.name !== 'VDOT 511 Virginia') throw new Error('camera source provenance mismatch');
  if (!Array.isArray(cameraData?.cameras)) throw new Error('camera payload missing cameras array');
  if (!cameraData.available || cameraData.cameras.length < 1) throw new Error('no live CBBT-area VDOT cameras returned');
  for (const camera of cameraData.cameras) {
    if (!/^https:\/\/snapshot\.vdotcameras\.com\//i.test(String(camera.imageUrl || ''))) {
      throw new Error(`unexpected VDOT camera image URL for ${camera.id || 'unknown camera'}`);
    }
  }

  return {
    page: page.status,
    api: api.status,
    officialState: data.officialStatus.state,
    restriction: data.officialStatus.restrictionLevel || 'UNKNOWN',
    systemHealth: data.systemHealth.state || 'UNKNOWN',
    radar,
    cameras: cameraData.cameras.length,
  };
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    const result = await verifyOnce();
    console.log(
      `CBBT production smoke PASS | page=${result.page} | api=${result.api} | official=${result.officialState} | restriction=${result.restriction} | health=${result.systemHealth} | radar=${result.radar} | cameras=${result.cameras}`,
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
