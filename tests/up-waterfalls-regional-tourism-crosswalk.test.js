import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const crosswalk = JSON.parse(fs.readFileSync('data/up-waterfall-regional-tourism-crosswalk-2026.json', 'utf8'));
const curated = JSON.parse(fs.readFileSync('data/up-waterfalls.json', 'utf8')).waterfalls;
const allowed = new Set(['curated','closure_guide','research_only','companion_covered','not_distinct_natural_falls','needs_identity_review']);
const curatedIds = new Set(curated.map(({id}) => id));
const normalized = value => value.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();

test('regional-tourism crosswalk has source-level coverage and reproducible totals', () => {
  assert.ok(crosswalk.sources.length >= 13);
  assert.equal(crosswalk.counts.tourismSourceSets, crosswalk.sources.length);
  assert.equal(crosswalk.counts.tourismMentions, crosswalk.entries.length);
  assert.ok(crosswalk.counts.curatedAtAudit <= curated.length);
  assert.equal(new Set(crosswalk.entries.map(item => normalized(item.sourceName))).size, crosswalk.counts.distinctSourceNameStrings);
  const tallies = Object.create(null);
  for (const entry of crosswalk.entries) {
    assert.ok(allowed.has(entry.disposition), entry.sourceName);
    assert.ok(crosswalk.sources.some(source => source.id === entry.sourceId), entry.sourceId);
    assert.ok(entry.note.length > 10, entry.sourceName);
    assert.ok(Array.isArray(entry.curatedIds), entry.sourceName);
    for (const id of entry.curatedIds) assert.ok(curatedIds.has(id), id);
    tallies[entry.disposition] = (tallies[entry.disposition] ?? 0) + 1;
  }
  assert.deepEqual(Object.assign({}, tallies), crosswalk.counts.byDisposition);
  for (const source of crosswalk.sources) {
    assert.equal(source.namedCount, crosswalk.entries.filter(e => e.sourceId === source.id).length, source.id);
    assert.ok(source.url.startsWith('https://'), source.id);
  }
});

test('major access-blocked falls never become visitor-arrival approvals', () => {
  for (const name of ['Dead River Falls', 'Alger Falls', 'Au Train Falls', 'Whitefish Falls', '10-Foot Falls (Upper Eagle River)']) {
    assert.ok(crosswalk.entries.some(e => normalized(e.sourceName) === normalized(name) && e.disposition === 'research_only'), name);
  }
  for (const name of ['Peanut Butter Falls']) assert.ok(crosswalk.entries.some(e => e.sourceName === name && e.disposition === 'companion_covered'), name);
  for (const name of ['Red Ridge Dam', 'Gardeners Creek Nature Trail']) assert.ok(crosswalk.entries.some(e => e.sourceName === name && e.disposition === 'not_distinct_natural_falls'), name);
});

test('regional aliases match the correct destination rather than inflate missing waterfalls', () => {
  for (const [name, id] of [['Mexi-Mini Falls','mex-i-min-e-falls'],['Gabbro Falls/Bakers Falls','gabbro-falls'],['Cascade Falls (Cascade Creek)','cascade-falls']]) {
    assert.ok(crosswalk.entries.some(e => e.sourceName === name && e.disposition === 'curated' && e.curatedIds.includes(id)), name);
  }
  assert.ok(crosswalk.entries.some(e => e.sourceName === 'Unnamed Falls (near Interstate)' && e.disposition === 'needs_identity_review'));
});

test('new Dead River source caveat remains research-only and contains the DNR authority', () => {
  const html = fs.readFileSync('public/upper-peninsula-waterfalls/research/dead-river-falls/index.html','utf8');
  assert.match(html, /name="robots" content="noindex,follow"/);
  assert.match(html, /Michigan DNR's/);
  assert.match(html, /other activities/);
  assert.match(html, /2022 Marquette Charter Township recreation-plan draft/);
  assert.doesNotMatch(html, /<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?"@type":"TouristAttraction"/);
});

test('explorer links to source-only priority cases but never indexes them as attraction trips', () => {
  const hub = fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
  const sitemap = fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
  assert.match(hub, /Important regional waterfalls not cleared for trip planning/);
  for (const slug of ['dead-river-falls', 'alger-falls-highway-parking-review', 'au-train-falls']) {
    const researchPath = '/upper-peninsula-waterfalls/research/' + slug + '/';
    assert.ok(hub.includes(researchPath), researchPath);
    assert.ok(!sitemap.includes('https://chrisizworski.com' + researchPath), researchPath);
  }
  const modified = hub.match(/"dateModified":"(\\d{4}-\\d{2}-\\d{2})"/);
  assert.ok(modified, 'hub must publish a source-accurate dateModified');
  assert.ok(sitemap.includes('<loc>https://chrisizworski.com/upper-peninsula-waterfalls/</loc><lastmod>'+modified[1]+'</lastmod>'),
    'sitemap hub lastmod must equal actual page dateModified');
});
