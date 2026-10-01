const BASE = String(process.env.CBBT_BASE_URL || 'https://chrisizworski.com').replace(/\/$/, '');
const PAGE_URL = `${BASE}/chesapeake-bay-bridge-tunnel/`;
const API_URL = `${BASE}/api/cbbt`;
const MEDIA_JS_URL = `${BASE}/assets/cbbt-view.js?v=20261001c`;
const NWS_CBBT_RADAR_URL = 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJ3ZWF0aGVyIiwiY2VudGVyIjpbLTc2LjAzNCwzNy4xN10sImxvY2F0aW9uIjpbLTc1Ljk2OCwzNy4xMzRdLCJ6b29tIjo4LjU5MzA0NjI3NzAzODg5NCwibGF5ZXIiOiJicmVmX3FjZCJ9LCJhbmltYXRpbmciOmZhbHNlLCJiYXNlIjoic3RhbmRhcmQiLCJhcnRjYyI6ZmFsc2UsImNvdW50eSI6ZmFsc2UsImN3YSI6ZmFsc2UsInJmYyI6ZmFsc2UsInN0YXRlIjpmYWxzZSwibWVudSI6dHJ1ZSwic2hvcnRGdXNlZE9ubHkiOmZhbHNlLCJvcGFjaXR5Ijp7ImFsZXJ0cyI6MC44LCJsb2NhbCI6MC42LCJsb2NhbFN0YXRpb25zIjowLjgsIm5hdGlvbmFsIjowLjZ9fQ%3D%3D';
const NWS_WMS_RADAR_URL = 'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.1.1&request=GetMap&layers=conus_bref_qcd&styles=&srs=EPSG%3A4326&bbox=-78%2C35%2C-74%2C39&width=400&height=300&format=image%2Fpng&transparent=true';
const ATTEMPTS = Number(process.env.CBBT_SMOKE_ATTEMPTS || 72);
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

async function imageCheck(url) {
  const response = await request(url, { accept: 'image/png,image/*,*/*;q=0.8' });
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  return { ok: response.ok && type.startsWith('image/'), status: response.status, type };
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
    'id="radarLink"',
    '/assets/cbbt-view.js?v=20261001c',
  ]) {
    if (!html.includes(marker)) throw new Error(`page missing marker: ${marker}`);
  }

  const mediaJs = await request(MEDIA_JS_URL, { accept: 'application/javascript,text/javascript,*/*;q=0.8' });
  if (!mediaJs.ok) throw new Error(`media JS returned ${mediaJs.status}`);
  const mediaSource = await mediaJs.text();
  for (const marker of [
    'CBBT_NWS_RADAR=',
    'NWS_RADAR_WMS=',
    'conus_bref_qcd',
    'cbbtRadarMap',
    'Open full-screen NWS radar centered on CBBT',
    'trafficvision.live/blog/chesapeake-bay-bridge-tunnel-traffic-cameras',
    'stationhome.html?id=8638901',
  ]) {
    if (!mediaSource.includes(marker)) throw new Error(`new live-media bundle not promoted yet: ${marker}`);
  }
  if (mediaSource.includes('RADAR_SOURCES=') || mediaSource.includes("CAMERA_API='/api/cbbt-cameras'")) {
    throw new Error('retired radar-image or camera scrape dependency still present in production media bundle');
  }

  const [liveRadar, wmsRadar] = await Promise.all([
    request(NWS_CBBT_RADAR_URL, { accept: 'text/html,application/xhtml+xml,*/*;q=0.8' }),
    imageCheck(NWS_WMS_RADAR_URL),
  ]);
  if (!liveRadar.ok) throw new Error(`centered NWS CBBT radar returned ${liveRadar.status}`);
  if (!wmsRadar.ok) throw new Error(`NWS WMS radar returned ${wmsRadar.status} (${wmsRadar.type || 'no content-type'})`);

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

  return {
    page: page.status,
    api: api.status,
    officialState: data.officialStatus.state,
    restriction: data.officialStatus.restrictionLevel || 'UNKNOWN',
    systemHealth: data.systemHealth.state || 'UNKNOWN',
    radar: liveRadar.status,
    wmsRadar: `${wmsRadar.status}/${wmsRadar.type}`,
  };
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    const result = await verifyOnce();
    console.log(
      `CBBT production smoke PASS | page=${result.page} | api=${result.api} | official=${result.officialState} | restriction=${result.restriction} | health=${result.systemHealth} | nws-centered-radar=${result.radar} | nws-wms=${result.wmsRadar} | live-views=linked`,
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
