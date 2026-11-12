import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const html = read('public/lake-superior-circle-tour/index.html');
const page = read('public/assets/lake-superior-circle-tour.js');
const core = read('public/assets/lake-superior-circle-tour-core.js');
const map = read('public/assets/lake-superior-circle-tour-map.js');
const live = read('public/assets/lake-superior-circle-tour-live-day.js');
const fallDispatcher = read('api/fall-color.js');
const smokeAdapter = read('lib/fall-color/routes/circle-tour-smoke.js');
const registry = JSON.parse(read('benchmarks/tool-network-registry.json'));
const check = process.argv.includes('--check');

const sections = [];
function section(name, weight, tests) {
  const failed = tests.filter(([ok]) => !ok).map(([, label]) => label);
  const score = failed.length ? Math.max(0, weight - Math.ceil(weight * failed.length / tests.length)) : weight;
  sections.push({name, weight, score, failed});
}
const has = (text, value) => text.includes(value);

section('Search framing', 10, [
  [has(html, 'Lake Superior Circle Tour Map: 7–15 Days'), 'map/itinerary title'],
  [has(html, 'interactive 1,300-mile Lake Superior Circle Tour map'), 'direct meta answer'],
  [has(html, 'https://chrisizworski.com/lake-superior-circle-tour/'), 'canonical'],
  [has(html, 'lake-superior-circle-tour-map.png'), 'social route image'],
]);

section('Map and planner', 15, [
  [(html.match(/class="stop-card"/g) || []).length === 31, '31 stop cards'],
  [has(html, 'id="circleTourMap"'), 'interactive map'],
  [has(html, 'id="stop-5" data-seg="mi"') && has(html, '<td class="stop-n">Ironwood & Black River Corridor</td><td class="region region-mi">MI</td>'), 'Ironwood is Michigan in stop and summary'],
  [html.indexOf('id="stop-5"') > html.indexOf('id="seg-mi"') && html.indexOf('id="stop-5"') < html.indexOf('id="stop-6"'), 'Ironwood rendered within Michigan section'],
  [has(html, 'data-preset="7"') && has(html, 'data-preset="10"') && has(html, 'data-preset="15"'), 'three complete presets'],
  [has(html, 'data-direction="counterclockwise"') && has(html, 'data-direction="clockwise"'), 'both directions'],
  [has(map, 'MAPLIBRE_VERSION = "6.3.0"') && has(map, 'tiles.openfreemap.org/styles/liberty'), 'pinned map stack'],
  [has(core, 'IntersectionObserver') && has(core, 'lake-superior-circle-tour-map.js'), 'lazy map load'],
]);

section('Continuous route integrity', 10, [
  [has(map, '"31","13"'), 'Whitefish Point sits correctly before Soo'],
  [has(html, 'approximately 1,358 estimated itinerary miles') && has(html, 'approximately 1,359 estimated itinerary miles'), 'distinct editorial itinerary mileages are explicit'],
  [has(html, 'id="itin-7"') && has(html, 'id="itin-10"') && has(html, 'id="itin-15"'), 'written itineraries'],
  [has(core, 'google.com/maps/dir'), 'daily Google directions'],
  [has(core, 'Do not carry counterclockwise day prose') && has(core, 'original counterclockwise guide'), 'clockwise preview avoids mismatched narratives'],
  [has(live, "return match ? Number(match[1].replace(/,/g, '')) : null") && has(live, 'Route mileage not verified for this leg'), 'missing segment distance fails closed rather than inventing 45 miles'],
  [has(live, "String(id) === '5'") && has(live, 'America/Chicago'), 'Ironwood keeps Central Time while categorized Michigan'],
  [has(html, 'Choose one longer park visit') && has(html, 'transit day'), 'North Shore days distinguish waypoints from visits'],
  [has(live, "id === '1' || id === '30'"), 'duplicate Duluth seam has zero fake mileage'],
]);

section('Adaptive route intelligence', 25, [
  [has(page, 'lake-superior-circle-tour-live-day.js?v=20260930-1'), 'adaptive day layer loaded'],
  [has(live, '/api/duluth-canal') && has(live, '/api/soo-ais'), 'ship systems reused'],
  [has(live, '/api/buoys') && has(live, 'wave_ht'), 'fresh water evidence changes water-facing stops'],
  [has(live, '/api/fall-color?view=snapshot') && has(live, 'fall.pct'), 'shared fall-color model changes scenic stops'],
  [has(live, '/api/aurora') && has(live, 'auroraOpportunity'), 'aurora plus cloud gate drives tonight action'],
  [has(live, '/api/border-crossings') && has(live, 'borderMinutes'), 'official Sault wait enters time budget'],
  [has(live, 'view=circle-tour-smoke') && has(smokeAdapter, 'national-smoke-window'), 'national smoke engine reused'],
  [has(live, 'liveDelta') && has(live, 'used + item.hours <= stopBudget'), 'live score changes are bounded by honest time'],
  [has(live, 'data-current-alert="pictured-rocks"') && has(live, 'data-current-alert="lspp"') && has(live, "accessNotice?.dataset.currentSeason === 'true'"), 'dated access notices affect scoring only during checked season'],
  [has(live, "pairCrossing(segment, '20', '21')") && has(live, 'borderAllowancesForSegment'), 'both Sault and Pigeon River crossings have explicit planning allowances'],
]);

section('Clock-based day sheet', 15, [
  [has(live, 'ctTodayStartTime') && has(live, 'Today’s day sheet'), 'departure-time day sheet'],
  [has(live, 'America/Chicago') && has(live, 'America/Detroit'), 'CT/ET handled'],
  [has(live, 'function buildDaySheet') && has(live, 'formatClock'), 'ordered clock schedule'],
  [has(live, "name: 'Sault Ste. Marie'") && has(live, 'border.name') && has(live, 'border crossing'), 'border blocks rendered for supported crossings'],
  [has(live, 'function sunTime') && has(live, 'Sunset at the overnight stop'), 'sunset context'],
  [has(live, 'if (start === end)') && has(live, 'stayDay:true'), 'same-stop local day'],
  [has(live, 'page.setTrip(p.ids'), 'today route replaces trip in route order'],
]);

section('Mobile, live data and resilience', 10, [
  [has(html, 'id="mobileTripSheet"') && has(html, 'id="mobileTripTrigger"'), 'mobile trip sheet'],
  [has(core, 'navigator.share') && has(core, 'navigator.clipboard'), 'share/copy'],
  [has(core, 'printTrip'), 'print itinerary'],
  [has(html, 'id="liveData"') && has(page, 'station=9099064') && has(page, 'datum=LWD'), 'NOAA Duluth water level'],
  [!/(localStorage|sessionStorage|document\.cookie)/.test(html + page + core + map + live), 'no personal browser storage'],
  [has(live, 'attempts <= 30') && has(live, 'CircleTourMap?.focusStop'), 'lazy-map focus retry'],
  [has(live, 'NOT an observed border delay') && has(live, 'no air-quality penalty is being assumed'), 'unavailable evidence is not misrepresented as observed'],
]);

section('Current 2026 trip facts', 5, [
  [has(page, "const RELEASE = '2026-11-08'"), 'release stamp'],
  [has(page, 'Last verified schedule: August 1–October 18, 2026') && has(page, 'sourceSeasonIsCurrent'), 'Agawa 2026 reference expires outside verified season'],
  [has(page, 'Agawa Rock Pictographs Trail and Trapper’s Trail') && has(html, '/lake-superior-provincial-park/'), '2026 LSPP closure and park-explorer handoff'],
  [has(page, 'Current-season access is not verified') && has(page, 'historical'), 'closed-season notices cannot silently roll into 2027'],
  [has(page, 'Munising Falls Trail was listed closed until further notice') && has(page, 'alert.dataset.currentSeason'), 'Pictured Rocks 2026 notice explicitly dated'],
]);

const tool = registry.tools.find((item) => item.id === 'circle-tour');
const outgoing = registry.relationships.filter((edge) => edge.from === 'circle-tour').map((edge) => edge.to);
const incoming = registry.relationships.filter((edge) => edge.to === 'circle-tour').map((edge) => edge.from);
section('Tool-network fit', 10, [
  [tool?.canonical === 'https://chrisizworski.com/lake-superior-circle-tour/', 'registry canonical'],
  [outgoing.includes('soo-locks') && outgoing.includes('pictured-rocks'), 'major route-stop handoffs'],
  [incoming.includes('fall-color') && incoming.includes('pictured-rocks'), 'network discovery paths'],
  [has(fallDispatcher, 'circle-tour-smoke') && has(smokeAdapter, 'Wildfire Smoke & Outdoor Air Window'), 'smoke adapter keeps canonical specialist ownership'],
  [has(page, 'block.remove()'), 'self-justifying authority block retired'],
]);

const score = sections.reduce((sum, item) => sum + item.score, 0);
const failures = sections.flatMap((item) => item.failed.map((failure) => `${item.name}: ${failure}`));
console.log(`Lake Superior Circle Tour benchmark: ${score}/100`);
for (const item of sections) console.log(`${String(item.score).padStart(2)}/${item.weight}  ${item.name}${item.failed.length ? ` — ${item.failed.join('; ')}` : ''}`);
if (check && (score < 95 || failures.length > 2)) process.exitCode = 1;