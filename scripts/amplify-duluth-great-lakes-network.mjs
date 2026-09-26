import fs from 'node:fs';

const DULUTH_PATH = '/duluth-canal-park/';
const DULUTH_ID = 'duluth-canal-park';
const files = {
  hub: 'public/great-lakes/index.html',
  gazette: 'public/great-lakes-gazette/index.html',
  soo: 'public/soo-locks/index.html',
  tracker: 'public/great-lakes-freighter-tracking/index.html',
  circle: 'public/lake-superior-circle-tour/index.html',
  registry: 'benchmarks/tool-network-registry.json'
};

function insertAfterClosing(html, startIndex, closingTag, addition, label) {
  if (startIndex < 0) throw new Error(`Duluth network amplification: ${label} start not found`);
  const end = html.indexOf(closingTag, startIndex);
  if (end < 0) throw new Error(`Duluth network amplification: ${label} closing tag not found`);
  const at = end + closingTag.length;
  return html.slice(0, at) + addition + html.slice(at);
}

function write(file, html) {
  fs.writeFileSync(file, html, 'utf8');
}

// Great Lakes hub: put Duluth directly in the ship-following decision lane and live-tool grid.
let hub = fs.readFileSync(files.hub, 'utf8');
if (!hub.includes('data-decision-network="duluth-canal-park"')) {
  const sooDecision = hub.indexOf('data-decision-network="soo-locks"');
  hub = insertAfterClosing(
    hub,
    sooDecision,
    '</li>',
    '<li><a href="/duluth-canal-park/" data-decision-network="duluth-canal-park" data-lane="ships" data-surface="great-lakes">Duluth Canal Park<span>Next ship, Aerial Lift Bridge passage window and live cams</span></a></li>',
    'Great Lakes ship lane'
  );
}
if (!hub.includes('data-featured-tool="duluth-canal-park"')) {
  const sooCard = hub.indexOf('data-featured-tool="soo-locks"');
  hub = insertAfterClosing(
    hub,
    sooCard,
    '</article>',
    '\n  <article class="card" data-featured-tool="duluth-canal-park">\n    <h3><a href="/duluth-canal-park/" data-track-tool="duluth-canal-park" data-placement="great-lakes-live">Duluth Ship Schedule &amp; Canal Park Live Cams</a></h3>\n    <p>See which Duluth ship matters next, its supported Aerial Lift Bridge passage window, live AIS position, camera network, and where to watch from Canal Park.</p>\n    <a class="tool-cta" href="/duluth-canal-park/" data-track-tool="duluth-canal-park" data-placement="great-lakes-live">Watch Duluth ships &rarr;</a>\n  </article>',
    'Great Lakes live tool card'
  );
}
hub = hub.replace('Eight fast starting points for border and bridge travel, vessel activity, lake conditions, aurora potential, and the daily maritime picture.', 'Nine fast starting points for border and bridge travel, vessel activity, lake conditions, aurora potential, and the daily maritime picture.');
write(files.hub, hub);

// Gazette: make Duluth one of the live follow-up tools for readers following a shipping story.
let gazette = fs.readFileSync(files.gazette, 'utf8');
if (!gazette.includes('data-track-tool="duluth-canal-park"')) {
  const section = gazette.indexOf('id="follow-live"');
  const grid = gazette.indexOf('<div class="tool-grid">', section);
  if (grid < 0) throw new Error('Duluth network amplification: Gazette live-tool grid not found');
  const at = grid + '<div class="tool-grid">'.length;
  const card = '\n      <a class="tool-card" href="/duluth-canal-park/" data-track-tool="duluth-canal-park" data-placement="gazette-live-tools"><strong>Duluth Ship Schedule &amp; Canal Park Live Cams</strong><span>Follow the next supported Aerial Lift Bridge passage with live AIS, camera views and Canal Park watching spots.</span></a>';
  gazette = gazette.slice(0, at) + card + gazette.slice(at);
}
write(files.gazette, gazette);

// Soo Locks: cross-link two high-intent ship-watching destinations without changing Soo search ownership.
let soo = fs.readFileSync(files.soo, 'utf8');
if (!soo.includes('data-duluth-network-link')) {
  const related = soo.lastIndexOf('<div class="related">');
  const fallback = soo.indexOf('<div class="footer">');
  const at = related >= 0 ? related : fallback;
  if (at < 0) throw new Error('Duluth network amplification: Soo Locks related/footer anchor not found');
  const callout = '<div class="cta-card" data-duluth-network-link><h3>Watching ships on Lake Superior?</h3><p>For the western end of the lake, the <a href="/duluth-canal-park/" data-track-tool="duluth-canal-park" data-placement="soo-related">Duluth ship schedule and Canal Park live cams</a> combine fresh AIS, a supported Aerial Lift Bridge passage window, cameras and in-person viewing spots.</p></div>\n';
  soo = soo.slice(0, at) + callout + soo.slice(at);
}
write(files.soo, soo);

// Great Lakes Ship Tracker already has an in-context Duluth corridor link. Add a discoverable related card too.
let tracker = fs.readFileSync(files.tracker, 'utf8');
if (!tracker.includes('data-track-tool="duluth-canal-park" data-placement="freighter-related"')) {
  const grid = tracker.indexOf('<div class="related-grid">');
  if (grid < 0) throw new Error('Duluth network amplification: freighter related grid not found');
  const at = grid + '<div class="related-grid">'.length;
  const card = '\n      <a class="related-card" href="/duluth-canal-park/" data-track-tool="duluth-canal-park" data-placement="freighter-related"><strong>Duluth Ship Schedule &amp; Canal Park Live Cams</strong><span>Turn lake-wide tracking into a Duluth visit: next supported passage, Aerial Lift Bridge window, cameras and viewing spots.</span></a>';
  tracker = tracker.slice(0, at) + card + tracker.slice(at);
}
write(files.tracker, tracker);

// Circle Tour already links directly from the Duluth stop. Preserve and verify that high-context handoff.
const circle = fs.readFileSync(files.circle, 'utf8');
if (!circle.includes('href="/duluth-canal-park/"') || !circle.includes('Duluth ship schedule')) {
  throw new Error('Duluth network amplification: Circle Tour Duluth-stop handoff missing');
}

// Record the new intentional relationships in the governed tool network.
const registry = JSON.parse(fs.readFileSync(files.registry, 'utf8'));
registry.relationships = Array.isArray(registry.relationships) ? registry.relationships : [];
const edges = [
  {
    from: 'gazette', to: DULUTH_ID, type: 'live-story-handoff', strength: 'strong', surface: 'great-lakes-shipping',
    reason: 'Readers following a Duluth shipping item can move from the daily newspaper into live Canal Park passage timing and cameras.'
  },
  {
    from: 'soo-locks', to: DULUTH_ID, type: 'ship-watching-sibling', strength: 'optional', surface: 'great-lakes-shipping',
    reason: 'Soo Locks ship watchers can continue to the distinct Duluth destination tool for western Lake Superior viewing.'
  }
];
for (const edge of edges) {
  if (!registry.relationships.some(existing => existing.from === edge.from && existing.to === edge.to && existing.type === edge.type)) {
    registry.relationships.push(edge);
  }
}
registry.updated = '2026-09-26';
fs.writeFileSync(files.registry, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');

// Release gate: all five intended inbound discovery surfaces must retain a crawlable Duluth link.
const outputs = Object.fromEntries(Object.entries(files).filter(([key]) => key !== 'registry').map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]));
const checks = [
  ['Great Lakes hub decision lane', outputs.hub.includes('data-decision-network="duluth-canal-park"')],
  ['Great Lakes hub featured card', outputs.hub.includes('data-featured-tool="duluth-canal-park"')],
  ['Gazette live-tool card', outputs.gazette.includes('data-track-tool="duluth-canal-park"')],
  ['Soo Locks contextual handoff', outputs.soo.includes('data-duluth-network-link')],
  ['Ship Tracker related card', outputs.tracker.includes('data-placement="freighter-related"') && outputs.tracker.includes(DULUTH_PATH)],
  ['Circle Tour Duluth-stop link', outputs.circle.includes(DULUTH_PATH) && outputs.circle.includes('Duluth ship schedule')],
  ['all links clean', !Object.values(outputs).some(html => /duluth-canal-park\/[^"']*[?&]utm_/i.test(html))],
  ['Gazette registry relationship', registry.relationships.some(edge => edge.from === 'gazette' && edge.to === DULUTH_ID)],
  ['Soo registry relationship', registry.relationships.some(edge => edge.from === 'soo-locks' && edge.to === DULUTH_ID)]
];
for (const [label, pass] of checks) {
  if (!pass) throw new Error(`Duluth Great Lakes network verification failed: ${label}`);
}

console.log('Duluth Great Lakes network amplified across hub, Gazette, Soo Locks, Ship Tracker and Circle Tour.');
