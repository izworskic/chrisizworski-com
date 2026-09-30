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
const today = read('public/assets/lake-superior-circle-tour-today.js');
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
    assert.ok((html + core).includes(token), `missing ${token}`);
  }
  assert.doesNotMatch(html + page + core + map + today, /localStorage|sessionStorage|document\.cookie/);
});

test('September 2026 finish layer keeps current travel facts and loads route intelligence', () => {
  assert.match(page, /const RELEASE = '2026-09-29'/);
  assert.match(page, /lake-superior-circle-tour-today\.js\?v=20260929-1/);
  assert.match(page, /Agawa Canyon Tour Train runs August 1–October 18/);
  assert.match(page, /https:\/\/agawatrain\.com\//);
  assert.match(page, /Gargantua Road is closed for maintenance/);
  assert.match(page, /Photography and digital-device use are not permitted at the Agawa Rock Pictographs/);
  assert.match(page, /Munising Falls Trail remains closed until further notice/);
  assert.match(page, /Sand Point Road and beach are open/);
  assert.match(page, /block\.remove\(\)/);
  assert.match(page, /article\.dateModified = RELEASE/);
});

test('Today planner makes time, direction and interests causal', () => {
  assert.match(today, /Today on the Circle Tour/);
  assert.match(today, /ctTodayStart/);
  assert.match(today, /ctTodayEnd/);
  assert.match(today, /ctTodayHours/);
  assert.match(today, /chosenInterests/);
  assert.match(today, /routeOrder\(\)/);
  assert.match(today, /scoreStop\(id, interests\)/);
  assert.match(today, /hours - driveHours/);
  assert.match(today, /Add today’s stops to my trip/);
  assert.match(today, /google\.com\/maps\/dir/);
});

test('route intelligence reuses first-party specialist products instead of duplicating them', () => {
  for (const token of ['/api/duluth-canal','/api/soo-ais','/duluth-canal-park/','/soo-locks/','picturedrocks.chrisizworski.com','/sault-ste-marie-border-wait-time/','/great-lakes-buoys/','/fall-color/','/northern-lights-michigan/']) {
    assert.ok(today.includes(token), `missing ${token}`);
  }
  assert.match(today, /No supported Canal Park passage to call/);
  assert.match(today, /No fresh inbound ship call right now/);
});

test('map becomes a route-intelligence control surface', () => {
  assert.match(today, /Route intelligence/);
  assert.match(today, /data-map-mode="today"/);
  assert.match(today, /data-map-mode="ships"/);
  assert.match(today, /data-map-mode="access"/);
  assert.match(today, /CircleTourMap\?\.focusStop/);
  assert.match(today, /renderMapPicks\('today'\)/);
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