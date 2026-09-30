const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const html = read('public/lake-superior-circle-tour/index.html');
const page = read('public/assets/lake-superior-circle-tour.js');
const core = read('public/assets/lake-superior-circle-tour-core.js');
const map = read('public/assets/lake-superior-circle-tour-map.js');
const live = read('public/assets/lake-superior-circle-tour-live-day.js');
const fallDispatcher = read('api/fall-color.js');
const smokeAdapter = read('lib/fall-color/routes/circle-tour-smoke.js');
const registry = JSON.parse(read('benchmarks/tool-network-registry.json'));

test('Circle Tour is an interactive 31-stop route planner, not only a guide', () => {
  assert.match(html, /<title>Lake Superior Circle Tour Map: 7–15 Days \| Chris Izworski<\/title>/);
  assert.match(html, /id="circleTourMap"/);
  assert.match(html, /id="circle-tour-answer"/);
  assert.equal((html.match(/class="stop-card"/g) || []).length, 31);
  for (const days of ['7','10','15']) assert.match(html, new RegExp(`data-preset="${days}"`));
  assert.match(html, /data-direction="counterclockwise"/);
  assert.match(html, /data-direction="clockwise"/);
});

test('map route has every stop and uses a pinned lazy map implementation', () => {
  const order = JSON.parse(map.match(/const ROUTE_ORDER = (\[[^;]+\]);/)[1]);
  const coords = JSON.parse(map.match(/const STOP_COORDINATES = (\{[\s\S]*?\});/)[1]);
  assert.equal(order.length, 31);
  assert.equal(new Set(order).size, 31);
  assert.equal(Object.keys(coords).length, 31);
  assert.match(map, /MAPLIBRE_VERSION = "6\.3\.0"/);
  assert.match(map, /tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(core, /IntersectionObserver/);
  assert.match(core, /lake-superior-circle-tour-map\.js/);
});

test('planner supports real trip actions without storing personal data', () => {
  for (const token of ['navigator.share','navigator.clipboard','history.replaceState','google.com/maps/dir','mobileTripSheet','printTrip']) {
    assert.ok((html + core + live).includes(token), `missing ${token}`);
  }
  assert.doesNotMatch(html + page + core + map + live, /localStorage|sessionStorage|document\.cookie/);
});

test('September 30 finish layer keeps current travel facts and loads the adaptive day engine', () => {
  assert.match(page, /const RELEASE = '2026-09-30'/);
  assert.match(page, /lake-superior-circle-tour-live-day\.js\?v=20260930-1/);
  assert.match(page, /Agawa Canyon Tour Train runs August 1–October 18/);
  assert.match(page, /https:\/\/agawatrain\.com\//);
  assert.match(page, /Gargantua Road is closed for maintenance/);
  assert.match(page, /Photography and digital-device use are not permitted at the Agawa Rock Pictographs/);
  assert.match(page, /Munising Falls Trail remains closed until further notice/);
  assert.match(page, /Sand Point Road and beach are open/);
  assert.match(page, /block\.remove\(\)/);
  assert.match(page, /article\.dateModified = RELEASE/);
});

test('Today planner uses route, departure time, time budget and interests causally', () => {
  for (const token of ['ctTodayStart','ctTodayEnd','ctTodayStartTime','ctTodayHours','chosenInterests','scoreStop','stopBudget']) {
    assert.ok(live.includes(token), `missing ${token}`);
  }
  assert.match(live, /used \+ item\.hours <= stopBudget/);
  assert.doesNotMatch(live, /keep\.size <= 2/);
  assert.match(live, /if \(start === end\)/);
  assert.match(live, /id === '1' \|\| id === '30'/);
  assert.match(live, /page\.setTrip\(p\.ids/);
});

test('live conditions actually change stop scoring and the day budget', () => {
  for (const token of ['/api/duluth-canal','/api/soo-ais','/api/buoys','/api/fall-color?view=snapshot','/api/aurora','/api/border-crossings','view=circle-tour-smoke']) {
    assert.ok(live.includes(token), `missing live source ${token}`);
  }
  assert.match(live, /wave_ht/);
  assert.match(live, /fall\.pct/);
  assert.match(live, /pm25_aqi/);
  assert.match(live, /liveDelta/);
  assert.match(live, /borderMinutes/);
  assert.match(live, /currentPlan\) buildTodayPlan\(\{measure:false\}\)/);
  assert.match(live, /data-current-alert="pictured-rocks"/);
  assert.match(live, /data-current-alert="lspp"/);
});

test('smoke reuse is an adapter to the canonical national engine, not a second model', () => {
  assert.match(fallDispatcher, /"circle-tour-smoke": require\("\.\.\/lib\/fall-color\/routes\/circle-tour-smoke\.js"\)/);
  assert.match(smokeAdapter, /national-outdoor-core\.vercel\.app\/api\/national-smoke-window/);
  assert.match(smokeAdapter, /Wildfire Smoke & Outdoor Air Window/);
  assert.match(smokeAdapter, /does not claim that a nearby fire caused/);
});

test('clock-based day sheet handles time zones, border waits, sunset and tonight', () => {
  assert.match(live, /function buildDaySheet/);
  assert.match(live, /America\/Chicago/);
  assert.match(live, /America\/Detroit/);
  assert.match(live, /formatClock/);
  assert.match(live, /Sault Ste\. Marie border crossing/);
  assert.match(live, /function sunTime/);
  assert.match(live, /Sunset at the overnight stop/);
  assert.match(live, /auroraOpportunity/);
  assert.match(live, /Today’s day sheet/);
});

test('route intelligence map includes access stop 15 and retries lazy-map focus', () => {
  assert.match(live, /const ACCESS_STOPS = \['11','13','15','21'\]/);
  assert.match(live, /data-map-mode="today"/);
  assert.match(live, /data-map-mode="ships"/);
  assert.match(live, /data-map-mode="access"/);
  assert.match(live, /attempts <= 30/);
  assert.match(live, /CircleTourMap\?\.focusStop/);
});

test('Circle Tour keeps the live NOAA Lake Superior water-level signal', () => {
  assert.match(html, /id="liveData"/);
  assert.match(page, /station=9099064/);
  assert.match(page, /datum=LWD/);
  assert.match(page, /ft above LWD at Duluth/);
  assert.doesNotMatch(page, /datum=IGLD85/);
});

test('Circle Tour is connected to the tool network with unique search ownership', () => {
  const tool = registry.tools.find((item) => item.id === 'circle-tour');
  assert.ok(tool);
  assert.equal(tool.canonical, 'https://chrisizworski.com/lake-superior-circle-tour/');
  assert.match(tool.primaryIntent, /Lake Superior Circle Tour itinerary and stops/);
  const outbound = registry.relationships.filter((edge) => edge.from === 'circle-tour').map((edge) => edge.to);
  const inbound = registry.relationships.filter((edge) => edge.to === 'circle-tour').map((edge) => edge.from);
  assert.ok(outbound.includes('soo-locks'));
  assert.ok(outbound.includes('pictured-rocks'));
  assert.ok(inbound.includes('fall-color'));
  assert.ok(inbound.includes('pictured-rocks'));
});