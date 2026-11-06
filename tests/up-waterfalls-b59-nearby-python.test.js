import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const hub=read('public/upper-peninsula-waterfalls/index.html');
const js=read('public/assets/up-waterfalls-nearby.js');
const py=read('scripts/build-up-waterfalls-nearby.py');
const css=read('public/assets/up-waterfalls.css');
const index=JSON.parse(read('public/assets/up-waterfalls-nearby.json'));
const catalog=JSON.parse(read('data/up-waterfalls.json')).waterfalls;
const rows=new Map(catalog.map(c=>[c.id,c]));
const cards=[...hub.matchAll(/<article class="waterfall-card"([^>]+)>/g)]
  .map(m=>Object.fromEntries([...m[1].matchAll(/data-([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]])));
const explicitOnly=new Set(['scott-falls','houghton-douglass-falls']);
const eligible=cards.filter(c=>c['arrival-verified']==='verified'&&['verify','seasonal','restricted'].includes(c.status)&&!explicitOnly.has(c.id));
const radians=Math.PI/180;
const geo=(a,b)=>{const x=a.lat*radians,y=b.lat*radians,dx=(b.lat-a.lat)*radians,dy=(b.lng-a.lng)*radians,z=Math.sin(dx/2)**2+Math.cos(x)*Math.cos(y)*Math.sin(dy/2)**2;return 2*3958.7613*Math.asin(Math.min(1,Math.sqrt(z)));};

test('B59 Python-generated index covers exactly source-verified visitor approaches, never research or closed pins',()=>{
 assert.equal(catalog.length,76);
 assert.equal(cards.length,76);
 assert.equal(index.schemaVersion,1);
 assert.equal(index.counts.curated,76);
 assert.equal(index.counts.eligible,68);
 assert.equal(index.counts.excluded,8);
 assert.deepEqual(index.locations.map(c=>c.id),eligible.map(c=>c.id).sort());
 assert.deepEqual(index.excludedIds,cards.filter(c=>!eligible.some(x=>x.id===c.id)).map(c=>c.id).sort());
 for(const id of ['sandstone-falls','munising-falls','silver-river-falls','lower-silver-falls','twin-waterfalls-memorial-preserve','scott-falls','houghton-douglass-falls']){
  assert.ok(index.excludedIds.includes(id),id);
  assert.ok(!index.locations.some(c=>c.id===id));
 }
 // Tahquamenon uses its own park planner, but this hub card does not have
 // the same "verified" arrival contract. Never infer a shared arrival.
 assert.ok(index.excludedIds.includes('tahquamenon'));
 for(const c of index.locations){
  const row=rows.get(c.id);
  assert.ok(row,'missing curated record '+c.id);
  assert.equal(c.name,row.name);
  assert.equal(c.region,row.region);
  assert.equal(c.status,row.status);
  assert.equal(c.lat,row.lat);
  assert.equal(c.lng,row.lng);
  assert.ok(c.url.startsWith('/')&&!c.url.startsWith('//'));
  assert.ok(c.source.startsWith('https://'));
 }
});
test('B59 every neighbor edge uses straight-line Haversine geography, and all neighbors within 50 miles are present',()=>{
 assert.equal(index.method,'haversine-waterfall-coordinate-straight-line-not-driving');
 assert.equal(index.maxRadiusMiles,50);
 assert.match(index.policy,/Not a route/);
 const place=new Map(index.locations.map(c=>[c.id,c]));
 assert.deepEqual(Object.keys(index.nearby).sort(),[...place.keys()].sort());
 for(const origin of index.locations){
  const expected=index.locations.filter(t=>t.id!==origin.id&&geo(origin,t)<=50).map(t=>t.id).sort();
  const observed=index.nearby[origin.id];
  assert.deepEqual(observed.map(t=>t.id).sort(),expected,'missing or invented neighbors for '+origin.id);
  let prev=0;
  for(const point of index.nearby[origin.id]){
   const distance=geo(origin,place.get(point.id));
   assert.ok(point.miles>=0&&point.miles<=50.1);
   assert.ok(Math.abs(point.miles-distance)<=0.051,'geodesic calculation drift '+origin.id+' '+point.id);
   assert.ok(distance>=prev-1e-9,'neighbor order drift '+origin.id);
   prev=distance;
   const backwards=index.nearby[point.id].find(other=>other.id===origin.id);
   assert.ok(backwards,'non-symmetric geography '+point.id);
   assert.equal(backwards.miles,point.miles,'distance round-trip mismatch');
  }
 }
 assert.ok(index.nearby['wagner-falls'].some(x=>x.id==='miners-falls'));
 assert.ok(index.nearby['bond-falls'].some(x=>x.id==='agate-falls'));
 assert.ok(!index.nearby['wagner-falls'].some(x=>x.id==='munising-falls'));
});
test('B59 visible UX remains source-linked and accessible, with existing trip planner intact',()=>{
 for(const id of ['nearby-lab','nearby-origin','nearby-radius','nearby-results','nearby-status','nearby-source-count'])assert.ok(hub.includes('id="'+id+'"'),id);
 assert.ok(hub.indexOf('id="visit-lens"')<hub.indexOf('id="nearby-lab"'));
 assert.ok(hub.indexOf('id="nearby-lab"')<hub.indexOf('class="explorer"'));
 assert.match(hub,/assets\/up-waterfalls-nearby\.js/);
 assert.match(hub,/dateModified":"2026-11-03"/);
 assert.match(hub,/id="show-geo-candidates"/);
 assert.match(hub,/id="selected-list"/);
 assert.match(hub,/https:\/\/chrisizworski.com\/upper-peninsula-waterfalls\//);
 assert.match(js,/dataset\.arrivalVerified==='verified'/);
 assert.match(js,/fetch\('\/assets\/up-waterfalls-nearby\.json'/);
 assert.match(js,/UPWaterfallFocus/);
 assert.match(js,/existing\.click\(\)/);
 assert.match(js,/straight-line/);
 assert.ok(!js.includes('google.com/maps/dir'),'comparison is not navigation');
 assert.match(css,/\.nearby-stop/);assert.match(css,/focus-visible/);assert.match(css,/max-width:670px/);
 assert.match(py,/class CuratedCards\(HTMLParser\)/);
 assert.match(py,/def great_circle_miles/);
 assert.match(py,/arrival != "verified"/);
 assert.match(py,/--check/);
});

test('B59 Python source recreates the committed artifact byte-for-byte where Python 3 is installed',t=>{
 const check=spawnSync('python3',['scripts/build-up-waterfalls-nearby.py','--check'],{encoding:'utf8'});
 if(check.error?.code==='ENOENT'){t.diagnostic('Python3 not installed on this runner; independent Node geodesic tests still apply');return;}
 assert.equal(check.status,0,check.stderr||check.stdout);
});
