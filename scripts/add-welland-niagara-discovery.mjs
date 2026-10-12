// Idempotent ownership shim: National Tools is a verified, pinned external mirror.
// Reapply the local Niagara/Welland discovery additions after upstream syncs and builds.
import fs from 'node:fs';
const HUB = 'public/synced-national-tools/index.html';
const REGION = 'public/synced-national-tools/northeast-great-lakes/index.html';
const WELLAND_URL = 'https://chrisizworski.com/welland-canal/';
const PLANNER_URL = 'https://chrisizworski.com/niagara-falls-today/';
const plannerCard = "<article class=\"directory-card\" data-search-card data-tool-id=\"niagara-falls-today\" data-personas=\"trip family event\" data-tags=\"niagara falls today attractions open boat cave winds maid mist journey behind falls 2 hours 4 hours 6 hours plan visiting usa canada viewpoints\" data-months=\"1,2,3,4,5,6,7,8,9,10,11,12\"><div class=\"card-top\"><span class=\"kind\">Visit planner</span><span class=\"season-label\" hidden>Plan by date</span></div><h3>Niagara Falls Today · Best Visit Plan</h3><p class=\"place\">Niagara Falls · New York &amp; Ontario</p><p class=\"description\">Build a feasible 2-, 4-, or 6-hour Niagara Falls itinerary with dated attraction schedules, cutoff times and conservative travel buffers.</p><p class=\"signals\"><strong>Signals:</strong> published operator schedule rules + same-side routing + skip reasons</p><div class=\"card-actions\"><a class=\"primary-action\" href=\"/niagara-falls-today/\">Plan Niagara Falls today &rarr;</a></div></article>";
const plannerSignal = "<div class=\"signal\"><span class=\"signal-kicker\">Visit planner</span><strong>What fits in 2, 4 or 6 hours?</strong><p>Start on either side, choose a priority and get an explainable route with published attraction hours and what to skip.</p><a href=\"/niagara-falls-today/\">Build my Falls itinerary →</a></div>";
const plannerTool = "<article class=\"tool-card\"><span class=\"kind\">Visit planner</span><h3>Niagara Falls Today · Best Visit Plan</h3><p class=\"place\">Niagara Falls · New York and Ontario</p><p>Get a conservative same-side itinerary for 2, 4 or 6 hours, checked against published seasonal attraction hours and last-ticket cutoffs. No automatic border crossing or invented current queue times.</p><p class=\"why\"><strong>Best for:</strong> short-stay visitors who want to know what actually fits before buying a ticket.</p><p class=\"sources\">Published operator hours (manual review) + deterministic travel buffers</p><a class=\"action\" href=\"/niagara-falls-today/\">Plan Niagara Falls today</a></article>";
const card = "<article class=\"directory-card\" data-search-card data-tool-id=\"welland-canal\" data-personas=\"trip event conditions\" data-tags=\"welland canal lock ship schedule freighter tracking st catharines thorold port colborne ontario niagara peninsula great lakes seaway ships ais lock 3 viewing\" data-months=\"3,4,5,6,7,8,9,10,11,12\"><div class=\"card-top\"><span class=\"kind\">Live ship watch</span><span class=\"season-label\" hidden>Useful now</span></div><h3>Welland Canal Ships &amp; Locks Live</h3><p class=\"place\">Niagara Peninsula · Ontario</p><p class=\"description\">Explore all eight locks on a ship map, see recent AIS-reported vessels, and choose a public lock-viewing spot. Check official Seaway transits before going.</p><p class=\"signals\"><strong>Signals:</strong> recent AIS reports + official transit links + lock-by-lock viewing guidance</p><div class=\"card-actions\"><a class=\"primary-action\" href=\"/welland-canal/\">Explore Welland Canal ships and locks &rarr;</a></div></article>";
const tripDesk = "<section class=\"now-board\" id=\"niagara-trip-desk\" aria-labelledby=\"niagara-desk-title\"><div class=\"now-head\"><div><p class=\"eyebrow\">Niagara trip desk</p><h2 id=\"niagara-desk-title\">Cross the border. See the falls. Watch the ships.</h2></div><p>Three separate decisions in one region. Check the bridge before driving, choose a rainbow viewing window, then explore Welland Canal locks if ship watching is part of the trip.</p></div><div class=\"signal-grid\"><div class=\"signal\"><span class=\"signal-kicker\">1 · Getting there</span><strong>Which Niagara border crossing?</strong><p>Compare official direction-specific bridge waits and eligibility.</p><a href=\"/niagara-border-crossing/\">Choose a border crossing →</a></div><div class=\"signal\"><span class=\"signal-kicker\">2 · At the falls</span><strong>When might a rainbow appear?</strong><p>Check sun angle, clouds and the stronger viewpoint window.</p><a href=\"/national-tools/niagara-rainbow/\">Find a rainbow window →</a></div><div class=\"signal\"><span class=\"signal-kicker\">3 · Along the canal</span><strong>Where can I watch a freighter?</strong><p>Explore eight Welland locks, recent AIS reports and official ship-transit sources.</p><a href=\"/welland-canal/\">Explore Welland Canal locks →</a></div></div></section>";
const shipSignal = "<div class=\"signal\"><span class=\"signal-kicker\">Canal ship watch</span><strong>Welland Canal locks and recent ships</strong><p>Explore eight locks, recent AIS vessel reports, Lock 3 viewing, and official Seaway transit information. AIS is not a lock appointment.</p><a href=\"/welland-canal/\">Explore the canal and locks →</a></div>";
const shipTool = "<article class=\"tool-card\"><span class=\"kind\">Live ship watch</span><h3>Welland Canal Ships &amp; Locks Live</h3><p class=\"place\">St. Catharines · Thorold · Port Colborne, Ontario</p><p>Explore all eight locks on an interactive map, see recently reported AIS vessel positions and learn where public viewing is available. Official Seaway transit information remains the source of record for schedules.</p><p class=\"why\"><strong>Best for:</strong> visitors choosing a lock to watch freighters without mistaking a ship position for a confirmed passage time.</p><p class=\"sources\">Recent AIS reports + official Seaway transit links + municipal lock-viewing guidance</p><a class=\"action\" href=\"/welland-canal/\">Open Welland Canal Ships &amp; Locks</a></article>";

function addAfterClosing(html, needle, closing, insertion) {
  const at = html.indexOf(needle);
  if (at < 0) throw new Error('Niagara discovery missing anchor: ' + needle);
  const end = html.indexOf(closing, at);
  if (end < 0) throw new Error('Niagara discovery missing closing: ' + closing);
  return html.slice(0, end + closing.length) + '\n' + insertion + html.slice(end + closing.length);
}
function updateStructuredList(html, anchorUrl) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Niagara discovery JSON-LD missing');
  const data = JSON.parse(match[1]);
  const list = data['@graph']?.find(x => x['@type'] === 'ItemList');
  if (!Array.isArray(list?.itemListElement)) throw new Error('Niagara discovery ItemList missing');
  if (!list.itemListElement.some(x => x.url === WELLAND_URL)) {
    const index = list.itemListElement.findIndex(x => x.url === anchorUrl);
    if (index < 0) throw new Error('Niagara discovery schema anchor missing');
    list.itemListElement.splice(index + 1, 0, { '@type': 'ListItem', position: 0, url: WELLAND_URL, name: 'Welland Canal Ships & Locks Live' });
  }
  if (!list.itemListElement.some(x => x.url === PLANNER_URL)) {
    const index = list.itemListElement.findIndex(x => x.url === anchorUrl);
    if (index < 0) throw new Error('Niagara Falls Today schema anchor missing');
    list.itemListElement.splice(index + 1, 0, { '@type':'ListItem', position:0, url:PLANNER_URL, name:'Niagara Falls Today · Best Visit Plan' });
  }
  list.itemListElement.forEach((x, i) => { x.position = i + 1; });
  list.numberOfItems = list.itemListElement.length;
  return {html: html.replace(match[0], '<script type="application/ld+json">' + JSON.stringify(data) + '</script>'), data, count: list.numberOfItems};
}
function syncNational() {
  let html = fs.readFileSync(HUB, 'utf8');
  if (!html.includes('data-tool-id="welland-canal"')) html = addAfterClosing(html, 'data-tool-id="niagara-border"', '</article>', card);
  if (!html.includes('data-tool-id="niagara-falls-today"')) html = addAfterClosing(html, 'data-tool-id="niagara-border"', '</article>', plannerCard);
  const updated = updateStructuredList(html, 'https://chrisizworski.com/niagara-border-crossing/');
  html = updated.html;
  const page = updated.data['@graph'].find(x => x['@type'] === 'CollectionPage');
  if (page && (!page.dateModified || page.dateModified < '2026-10-11')) {
    page.dateModified = '2026-10-11';
    html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, '<script type="application/ld+json">' + JSON.stringify(updated.data) + '</script>');
  }
  html = html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/, '$1' + updated.count + ' tools shown$2');
  html = html.replace('Major-water and destination decisions from Duluth ship watching and Great Lakes shoreline conditions to Niagara viewing geometry and Acadia sunrise and surf timing.', 'Major-water decisions from Welland Canal ships and locks, Duluth freighters and Great Lakes shoreline conditions to Niagara border crossings, waterfall rainbows and Acadia.');
  if ((html.match(/data-tool-id="welland-canal"/g) || []).length !== 1) throw new Error('Duplicate Welland card');
  if ((html.match(/data-search-card/g) || []).length !== updated.count) throw new Error('National tools card count mismatch');
  fs.writeFileSync(HUB, html);
}
function syncRegion() {
  let html = fs.readFileSync(REGION, 'utf8');
  if (!html.includes('id="niagara-trip-desk"')) html = html.replace('<section class="now-board"', tripDesk + '\n<section class="now-board"');
  if (!html.includes('href="/niagara-falls-today/"')) html = addAfterClosing(html, '<span class="signal-kicker">2 · At the falls</span>', '</div>', plannerSignal);
  if (!html.includes('<span class="signal-kicker">Canal ship watch</span>')) html = addAfterClosing(html, '<span class="signal-kicker">Border decision</span>', '</div>', shipSignal);
  if (!html.includes('<h3>Welland Canal Ships &amp; Locks Live</h3>')) html = addAfterClosing(html, '<article class="tool-card"><span class="kind">Live border decision</span>', '</article>', shipTool);
  if (!html.includes('<h3>Niagara Falls Today · Best Visit Plan</h3>')) html = addAfterClosing(html, '<h3>Welland Canal Ships &amp; Locks Live</h3>', '</article>', plannerTool);
  html = html.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Niagara border wait times, Falls rainbow viewing, Welland Canal live ships and eight locks, Great Lakes levels and Northeast coastal timing.">');
  html = html.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="Choose Niagara border crossings, Falls rainbow windows or Welland ship viewing, plus Great Lakes and Northeast coast tools.">');
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="Niagara crossings, rainbows, Welland Canal ships and locks, Great Lakes levels and Northeast coastal tools.">');
  html = html.replace(/<p class="hero-lede">[\s\S]*?<\/p>/, '<p class="hero-lede">Niagara trip planning starts with the right bridge, a good Falls viewing window and the chance to watch a freighter at the Welland Canal. This regional desk also covers Great Lakes shoreline levels and Acadia\'s Thunder Hole.</p>');
  html = html.replace('Border operations, water level, sun geometry and tide-wave timing operate on different clocks.', 'Border operations, canal ship reports, water level, sun geometry and tide-wave timing operate on different clocks.');
  const updated = updateStructuredList(html, 'https://chrisizworski.com/niagara-border-crossing/');
  html = updated.html;
  const page = updated.data['@graph'].find(x => x['@type'] === 'CollectionPage');
  if (page) {
    page.description = 'Northeast and Great Lakes decision tools for Niagara border waits, Niagara Falls rainbows, Welland Canal ship watching, lake levels and coastal timing.';
    html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, '<script type="application/ld+json">' + JSON.stringify(updated.data) + '</script>');
  }
  if (!html.includes('href="/welland-canal/"') || !html.includes('href="/niagara-falls-today/"') || updated.count < 6) throw new Error('Regional Welland missing');
  fs.writeFileSync(REGION, html);
}
syncNational();
syncRegion();
