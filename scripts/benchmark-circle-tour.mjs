import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const html = read('public/lake-superior-circle-tour/index.html');
const page = read('public/assets/lake-superior-circle-tour.js');
const core = read('public/assets/lake-superior-circle-tour-core.js');
const map = read('public/assets/lake-superior-circle-tour-map.js');
const registry = JSON.parse(read('data/tool-network-registry.json'));
const check = process.argv.includes('--check');

const sections = [];
function section(name, weight, tests) {
  const failed = tests.filter(([ok]) => !ok).map(([, label]) => label);
  const score = failed.length ? Math.max(0, weight - Math.ceil(weight * failed.length / tests.length)) : weight;
  sections.push({name, weight, score, failed});
}
const has = (text, value) => text.includes(value);

section('Search framing', 15, [
  [has(html, 'Lake Superior Circle Tour Map: 7–15 Days'), 'map/itinerary title'],
  [has(html, 'interactive 1,300-mile Lake Superior Circle Tour map'), 'direct meta answer'],
  [has(html, 'https://chrisizworski.com/lake-superior-circle-tour/'), 'canonical'],
  [has(html, 'lake-superior-circle-tour-map.png'), 'social route image'],
]);

section('Map and planner', 25, [
  [(html.match(/class="stop-card"/g) || []).length === 31, '31 stop cards'],
  [has(html, 'id="circleTourMap"'), 'interactive map'],
  [has(html, 'data-preset="7"') && has(html, 'data-preset="10"') && has(html, 'data-preset="15"'), 'three complete presets'],
  [has(html, 'data-direction="counterclockwise"') && has(html, 'data-direction="clockwise"'), 'both directions'],
  [has(map, 'MAPLIBRE_VERSION = "6.3.0"') && has(map, 'tiles.openfreemap.org/styles/liberty'), 'pinned map stack'],
  [has(core, 'IntersectionObserver') && has(core, 'lake-superior-circle-tour-map.js'), 'lazy map load'],
]);

section('Continuous route integrity', 20, [
  [has(map, '"31","13"'), 'Whitefish Point sits correctly before Soo'],
  [has(html, 'approximately 1,358 route miles'), 'route mileage is explicit'],
  [has(html, 'id="itin-7"') && has(html, 'id="itin-10"') && has(html, 'id="itin-15"'), 'written itineraries'],
  [has(core, 'google.com/maps/dir'), 'daily Google directions'],
]);

section('Mobile, share and resilience', 15, [
  [has(html, 'id="mobileTripSheet"') && has(html, 'id="mobileTripTrigger"'), 'mobile trip sheet'],
  [has(core, 'navigator.share') && has(core, 'navigator.clipboard'), 'share/copy'],
  [has(core, 'printTrip'), 'print itinerary'],
  [!/(localStorage|sessionStorage|document\.cookie)/.test(html + page + core + map), 'no personal browser storage'],
  [has(core, 'The interactive map could not load.'), 'map failure fallback'],
]);

section('Current 2026 trip facts', 15, [
  [has(page, "const RELEASE = '2026-08-20'"), 'release stamp'],
  [has(page, 'Agawa Canyon Tour Train runs August 1–October 18'), 'current Agawa season'],
  [has(page, 'Gargantua Road is closed for maintenance'), 'current LSPP road alert'],
  [has(page, 'Photography and digital-device use are not permitted at the Agawa Rock Pictographs'), 'Agawa Rock device rule'],
  [has(page, 'Munising Falls Trail remains closed until further notice'), 'current Pictured Rocks closure'],
  [has(page, 'Sand Point Road and beach are open'), 'current Sand Point status'],
]);

const tool = registry.tools.find((item) => item.id === 'circle-tour');
const outgoing = registry.relationships.filter((edge) => edge.from === 'circle-tour').map((edge) => edge.to);
const incoming = registry.relationships.filter((edge) => edge.to === 'circle-tour').map((edge) => edge.from);
section('Tool-network fit', 10, [
  [tool?.canonical === 'https://chrisizworski.com/lake-superior-circle-tour/', 'registry canonical'],
  [outgoing.includes('soo-locks') && outgoing.includes('pictured-rocks'), 'major route-stop handoffs'],
  [incoming.includes('fall-color') && incoming.includes('pictured-rocks'), 'network discovery paths'],
  [has(page, 'block.remove()'), 'self-justifying authority block retired'],
]);

const score = sections.reduce((sum, item) => sum + item.score, 0);
const failures = sections.flatMap((item) => item.failed.map((failure) => `${item.name}: ${failure}`));
console.log(`Lake Superior Circle Tour benchmark: ${score}/100`);
for (const item of sections) console.log(`${String(item.score).padStart(2)}/${item.weight}  ${item.name}${item.failed.length ? ` — ${item.failed.join('; ')}` : ''}`);
if (check && (score < 95 || failures.length > 2)) process.exitCode = 1;
