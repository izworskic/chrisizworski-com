import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read = file => fs.readFileSync(file, 'utf8');
const atlas = JSON.parse(read('public/assets/up-waterfall-evidence-atlas.json'));
const curated = JSON.parse(read('data/up-waterfalls.json')).waterfalls;
const gis = JSON.parse(read('data/up-waterfall-reconciliation.json')).candidates;
const external = JSON.parse(read('data/up-waterfall-external-identity-shorelinescout.json')).observations;
const upTravel = JSON.parse(read('data/up-waterfall-uptravel-location-review-2026.json')).mainDirectoryFirstTwelve;
const html = read('public/upper-peninsula-waterfalls/atlas/index.html');
const js = read('public/assets/up-waterfall-evidence-atlas.js');
const hub = read('public/upper-peninsula-waterfalls/index.html');
const sitemap = read('public/sitemap-up-waterfalls.xml');
const base = '/upper-peninsula-waterfalls/atlas/';

test('source atlas contract includes all four review collections, but never calls them distinct waterfalls', () => {
  assert.equal(atlas.schemaVersion,1);
  assert.equal(atlas.counts.curatedGuideRecords,curated.length);
  assert.equal(atlas.counts.stateGisFeatureRecords,gis.length);
  assert.equal(atlas.counts.independentNameObservations,external.length);
  assert.equal(atlas.counts.upTravelDirectorySampleRecords,upTravel.length);
  assert.equal(atlas.counts.totalSourceRecords,curated.length+gis.length+external.length+upTravel.length);
  assert.equal(atlas.records.length,544);
  assert.equal(atlas.counts.nameOnlyWithoutPoint,303);
  assert.match(atlas.claim,/NOT distinct waterfalls/);
  assert.match(atlas.warning,/NOT parking/);
  assert.ok(!atlas.records.some(r=>/open-now|safe parking today/i.test(r.identityStatus||'')));
});

test('every external observation and UP Travel label remains off the waterfall map', () => {
  const ids=new Set(),groups={};
  for(const row of atlas.records){
    assert.ok(!ids.has(row.id),row.id);ids.add(row.id);
    groups[row.kind]=(groups[row.kind]||0)+1;
    assert.ok(row.sourceUrl?.startsWith('https://'),row.id);
    if(row.kind==='name'||row.kind==='tourism'){
      assert.equal(row.lat,null,row.id);
      assert.equal(row.lng,null,row.id);
      assert.ok(!row.guidePath,row.id);
      assert.ok(row.mapRole.includes('no-geographic')||row.mapRole.includes('not-validated'),row.id);
    }else{
      assert.ok(Number.isFinite(row.lat)&&Number.isFinite(row.lng),row.id);
      assert.ok(row.lat>44&&row.lat<49&&row.lng>-93&&row.lng< -82,row.id);
      assert.match(row.mapRole,/not-arrival|not-parking/,row.id);
    }
  }
  assert.deepEqual(groups,{guide:80,gis:161,name:291,tourism:12});
  assert.equal(atlas.records.filter(x=>x.kind==='gis'&&x.relatedGuideId).length,69);
  assert.ok(atlas.records.some(x=>x.kind==='guide'&&x.relatedGuideId==='tahquamenon'&&x.linkedGisIds.length===2));
});

test('identity ambiguity is retained as research, not autocollapsed into public trips', () => {
  const pauls=atlas.records.find(x=>x.id==='name:ss:pauls-falls');
  assert.ok(pauls);
  assert.equal(pauls.lat,null);
  assert.equal(pauls.county,'Houghton');
  assert.ok(atlas.records.some(x=>x.kind==='tourism'&&x.name==='Alger Falls'&&x.lat===null));
  assert.ok(atlas.records.some(x=>x.kind==='gis'&&x.name==='Chicagon Falls'&&!x.relatedGuideId));
  assert.ok(atlas.records.some(x=>x.kind==='guide'&&x.publication==='verified-closure-guide'));
  assert.ok(atlas.records.some(x=>x.kind==='guide'&&x.publication==='research-only-guide'));
});

test('a Python stdlib source join exactly regenerates the committed snapshot', () => {
  const run=spawnSync('python3',['scripts/build-up-waterfall-evidence-atlas.py','--check'],{encoding:'utf8',timeout:15000});
  assert.equal(run.status,0,run.stderr||run.stdout||run.error?.message);
  assert.match(run.stdout,/PASS Evidence Atlas/);
});

test('new atlas is accessible, purpose-built, noindex and cannot cannibalize visitor guide sitemap',()=>{
  assert.match(html,/name="robots" content="noindex,follow"/);
  assert.match(html,/href="https:\/\/chrisizworski.com\/upper-peninsula-waterfalls\/atlas\/"/);
  assert.match(html,/"@id":"https:\/\/chrisizworski.com\/#person"/);
  assert.ok(!html.includes('"@type":"TouristAttraction"'));
  assert.match(html,/544 source records|All 544 source records/);
  assert.match(html,/id="ea-search"/);
  assert.match(html,/id="ea-county"/);
  assert.match(html,/id="ea-record-list"/);
  assert.match(html,/id="ea-map"/);
  assert.ok(!sitemap.includes(base));
  assert.ok(hub.includes('href="'+base+'"'));
  assert.match(js,/city|county|source|map/i);
  assert.match(js,/not parking|not visitor parking|natural-feature/i);
  assert.ok(!js.includes("google.com/maps/dir"));
  assert.ok(!html.includes('http://tile'));
});
