import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const source = JSON.parse(read('data/up-waterfall-uptravel-location-review-2026.json'));
const crosswalk = JSON.parse(read('data/up-waterfall-regional-tourism-crosswalk-2026.json'));
const curated = JSON.parse(read('data/up-waterfalls.json')).waterfalls;
const hub = read('public/upper-peninsula-waterfalls/index.html');
const page = read('public/upper-peninsula-waterfalls/research/pauls-loytila-falls/index.html');
const sitemap = read('public/sitemap-up-waterfalls.xml');
const route = '/upper-peninsula-waterfalls/research/pauls-loytila-falls/';

test('UP Travel geography review does not misrepresent the 300+ marketing estimate as verified access', () => {
  assert.equal(source.schemaVersion, 1);
  assert.equal(source.reviewed, '2026-11-08');
  assert.equal(source.source.regionalFilterSum, Object.values(source.source.regionalFilterCountsObserved).reduce((a,b)=>a+b,0));
  assert.equal(source.mainDirectoryFirstTwelve.length,12);
  assert.match(source.source.coverage,/NOT an exhaustive export/);
  assert.match(source.source.addressWarning,/not GPS/);
  assert.ok(source.policies.some(p=>/No town-label-to-precise-GPS/.test(p)));
  for(const entry of source.mainDirectoryFirstTwelve) {
    assert.ok(entry.name && entry.cityLabel && entry.addressLabel && entry.note);
    assert.ok(['curated','research-only','region-not-single-waterfall'].includes(entry.disposition));
    assert.ok(!('lat' in entry) && !('lng' in entry),entry.name);
    if(entry.curatedId) assert.ok(curated.some(x=>x.id===entry.curatedId),entry.name);
    if(entry.curatedIds) for(const id of entry.curatedIds) assert.ok(curated.some(x=>x.id===id),id);
  }
  assert.equal(curated.length,80);
});

test('Pauls Falls name is resolved to Löytilä, but its natural point cannot become a parking point', () => {
  const identity=source.highPriorityAliasCase;
  assert.equal(identity.name,"Paul's Falls");
  assert.equal(identity.specialistCanonicalName,'Löytilä Falls');
  assert.equal(identity.county,'Houghton');
  assert.equal(identity.closestTownBySpecialist,'Toivola');
  assert.deepEqual([identity.naturalFeature.lat,identity.naturalFeature.lng],[46.96483,-88.69343]);
  assert.match(identity.naturalFeature.role,/not-road-parking/);
  assert.equal(identity.publicationEligible,false);
  assert.equal(identity.publicMapEligible,false);
  assert.equal(identity.nearbyEligible,false);
  assert.equal(identity.routePolylineAuthorized,false);
  assert.equal(identity.parkingPoint,null);
  assert.ok(!curated.some(x=>/paul|loytila|löytilä/.test(x.id.toLowerCase())), 'no source-only destination in curated map');
});

test('UP Travel Western U.P. source set is complete and region crosswalk counts are self-consistent', () => {
  const feature=crosswalk.sources.find(s=>s.id==='uptravel-western-feature-2024');
  assert.equal(feature.namedCount,11);
  const rows=crosswalk.entries.filter(x=>x.sourceId===feature.id);
  assert.equal(rows.length,11);
  assert.ok(rows.some(e=>e.sourceName==="Paul's Falls"&&e.disposition==='research_only'));
  assert.ok(rows.some(e=>e.sourceName==='Chicagon Falls'&&e.disposition==='research_only'));
  assert.ok(rows.some(e=>e.sourceName==='Hungarian Falls'&&e.curatedIds.length===3));
  assert.equal(crosswalk.counts.tourismSourceSets,crosswalk.sources.length);
  assert.equal(crosswalk.counts.tourismMentions,crosswalk.entries.length);
  const statuses={};
  for(const row of crosswalk.entries) statuses[row.disposition]=(statuses[row.disposition]||0)+1;
  assert.deepEqual(statuses,crosswalk.counts.byDisposition);
});

test('Paul/Löytilä is a noindex research page, linked from hub but not an authorized visit', () => {
  assert.match(page,/name="robots" content="noindex,follow"/);
  assert.ok(page.includes('<link rel="canonical" href="https://chrisizworski.com'+route+'">'));
  assert.match(page,/RESEARCH ONLY/);
  assert.match(page,/Sante River/);
  assert.match(page,/Houghton County near Toivola/);
  assert.match(page,/46\.96483, -88\.69343/);
  assert.match(page,/Waterfalls of the Keweenaw/);
  assert.ok(!page.includes('data-parking-lat='));
  assert.ok(!page.includes('"@type":"TouristAttraction"'));
  assert.ok(!page.includes('maps.google.com/?q='));
  assert.ok(hub.includes(route));
  assert.ok(!sitemap.includes(route));
  assert.ok(!hub.includes('data-id="pauls-loytila-falls"'));
  assert.match(page,/"@id":"https:\/\/chrisizworski.com\/#person"/);
});
