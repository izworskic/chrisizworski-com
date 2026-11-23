import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const city=require('../public/assets/snowmobile-city-search.js');
const census=JSON.parse(readFileSync(new URL('../public/data/snowmobile-origin-places.json',import.meta.url),'utf8'));
const trail=JSON.parse(readFileSync(new URL('../public/data/snowmobile-trail-towns.json',import.meta.url),'utf8'));
const {places,towns}=city.makeRecords(census,trail);

test('verified Census names cover eight Midwest and Great Lakes states without truncation',()=>{
  assert.ok(census.places.length>=9400);
  assert.equal(new Set(census.places.map(p=>p[0])).size,census.places.length);
  assert.equal(census.states.length,8);
  for(const [name,state] of [['Bay City','MI'],['Toledo','OH'],['Chicago','IL'],['Duluth','MN'],['Pittsburgh','PA'],['Buffalo','NY']]){
    assert.ok(places.some(p=>p.name===name&&p.state===state),name+', '+state);
  }
  assert.equal(census.places.some(p=>p[1]==='Frederic'&&p[2]==='MI'),false,'Unincorporated riding communities must not be attributed to Census');
  assert.ok(places.some(p=>p.name==='Frederic'&&p.state==='MI'&&p.source==='DNR-verified riding town reference'));
});

test('exact city and state input never silently chooses an ambiguous town',()=>{
  assert.equal(city.exact(places,'Bay City'),null);
  assert.equal(city.exact(places,'Detroit'),null);
  assert.equal(city.exact(places,'Buffalo'),null);
  assert.equal(city.exact(places,'Bay City, MI').state,'MI');
  assert.equal(city.exact(places,'Bay City WI').state,'WI');
  assert.equal(city.exact(places,'Frederic MI').source,'DNR-verified riding town reference');
  assert.equal(city.exact(places,'nowhere-on-earth, MI'),null);
});

test('type-to-search ranks direct matches, state qualifiers, accents and forgiving suggestions',()=>{
  assert.equal(city.match(places,'gaylord')[0].label,'Gaylord, MI');
  assert.equal(city.match(places,'Bay City MI')[0].label,'Bay City, MI');
  assert.equal(city.match(places,'Houghton NY')[0].label,'Houghton, NY');
  assert.equal(city.match(places,'Frederc')[0].label,'Frederic, MI');
  assert.ok(city.match(places,'sault ste. marie').some(p=>p.label==='Sault Ste. Marie, MI'));
  assert.ok(city.match(places,'st. ignace').some(p=>p.label==='St. Ignace, MI'));
  assert.deepEqual(city.match(places,'~~',3),[]);
  assert.deepEqual(city.match(places,'Missington, MI',3),[]);
  assert.equal(city.match(places,'Detroit',8)[0].state,'MI','Michigan names win tied suggestion rank, not exact auto-selection');
});

test('destination search uses the 27 source-backed DNR town anchors, not guessed local conditions',()=>{
  assert.equal(towns.length,27);
  for(const town of towns){
    assert.match(town.url,/^\/snowmobile\/regions\/[a-z-]+\.html#trail-conditions-near-[a-z0-9-]+$/);
    assert.ok(Number.isFinite(town.lat)&&Number.isFinite(town.lon));
  }
  const frederic=city.exact(towns,'Frederic');
  assert.ok(frederic.url.endsWith('/grayling-gaylord.html#trail-conditions-near-frederic'));
  assert.equal(city.exact(towns,'Paradise'),null);
});

test('stale or malformed geography is rejected instead of routed',()=>{
  assert.throws(()=>city.makeRecords({...census,places:census.places.slice(0,10)},trail),/verified city/);
  assert.throws(()=>city.makeRecords(census,{...trail,towns:trail.towns.slice(0,2)}),/verified city/);
  assert.throws(()=>city.makeRecords({...census,places:[...census.places,census.places[0]]},trail),/duplicate Census/);
  assert.throws(()=>city.makeRecords({...census,places:[...census.places.slice(0,-1),['mi-9999999','Fake Town','MI',999,9]]},trail),/Invalid or duplicate Census/);
});

test('independent Python checker verifies complete Census index and 5km DNR town geometry',()=>{
  const run=spawnSync('python3',['scripts/verify-snowmobile-city-index.py','--check'],{encoding:'utf8',timeout:30000});
  assert.equal(run.status,0,run.stderr||run.stdout||String(run.error));
  assert.match(run.stdout,/SNOWMOBILE CITY INDEX OK/);
});

test('statewide and seven generated regional pages use typed city inputs, no city dropdowns',()=>{
  const hub=readFileSync(new URL('../public/snowmobile/index.html',import.meta.url),'utf8');
  const generator=readFileSync(new URL('../scripts/generate-snowmobile-region-pages.mjs',import.meta.url),'utf8');
  assert.match(hub,/<input id="compare-origin" type="search"/);
  assert.match(hub,/<input id="snow-town-query" type="search"/);
  assert.doesNotMatch(hub,/<select id="compare-origin"/);
  assert.match(hub,/snowmobile-city-search\.js/);
  assert.match(generator,/<input id="originPreset" type="search"/);
  for(const key of ['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan']){
    const html=readFileSync(new URL('../public/snowmobile/regions/'+key+'.html',import.meta.url),'utf8');
    assert.match(html,/<input id="originPreset" type="search"/,key);
    assert.doesNotMatch(html,/<select id="originPreset"/,key);
    assert.match(html,/snowmobile-city-search\.js/,key);
    assert.match(html,/snowmobile-town-evidence\.js/,key);
  }
});

test('only named, verifiable place identifiers survive regional handoff',()=>{
  const compare=require('../public/assets/snowmobile-comparison.js');
  assert.match(compare.detailUrl('eastern-up','mi-2606020',3),/origin=mi-2606020/);
  assert.match(compare.detailUrl('grayling-gaylord','mi-trail-frederic',4),/origin=mi-trail-frederic/);
  assert.equal(compare.detailUrl('eastern-up','43.59006,-83.88842',3),'/snowmobile/regions/eastern-up.html');
  assert.equal(compare.detailUrl('eastern-up','<bad>?',3),'/snowmobile/regions/eastern-up.html');
});
