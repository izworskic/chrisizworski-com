'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {plan}=require('../lib/sleeping-giant/route-engine.cjs');
const root=path.resolve(__dirname,'..');
function compile(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'giant-visitor-'));
 try {
  const output=execFileSync(process.execPath,['scripts/export-sleeping-giant-visitor-preview.mjs',dir],
   {cwd:root,encoding:'utf8',timeout:30000});
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const summary=JSON.parse(fs.readFileSync(path.join(dir,'preview-evidence-summary.json'),'utf8'));
  const match=html.match(/<script id="explorer-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match,'source data must be embedded and parseable without network');
  const json=JSON.parse(match[1]);
  return {html,json,summary,output};
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('Visitor preview compiles to self-contained HTML with a useful no-script route catalog',()=>{
 const {html,summary}=compile();
 assert.match(html,/Sleeping Giant Explorer/);
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/<noscript>/);
 assert.match(html,/21\.8 km/);
 assert.match(html,/17\.0 km/);
 assert.match(html,/16\.2 km/);
 assert.match(html,/2\.4 km/);
 assert.match(html,/4\.6 km/);
 assert.match(html,/1\.0 km/);
 assert.match(html,/6–10 hours/);
 assert.match(html,/published distances and documented timing/i);
 assert.match(html,/Built by Chris Izworski/);
 assert.equal((html.match(/class="route-card"/g)||[]).length,6);
 assert.equal((html.match(/class="map-choice"/g)||[]).length,6);
 assert.ok(html.includes('https://commons.wikimedia.org/wiki/Special:FilePath/Top_of_the_Sleeping_Giant.jpg'));
 assert.ok(html.includes('Justin Meissen'));
 assert.ok(html.includes('https://creativecommons.org/licenses/by-sa/2.0/'));
 assert.equal(summary.publicRoutePublished,false);
 assert.equal(summary.navigationLinksEnabled,false);
 assert.equal(summary.routes,6);
 assert.equal(summary.researchGeometryRoutes,4);
 assert.equal(summary.decisionComparisons,70);
});
test('All 70 planning combinations are produced by the canonical Node route engine, not browser guesses',()=>{
 const {json}=compile();
 assert.equal(Object.keys(json.plans).length,70);
 for(const hour of [2,4,8,10,12])for(const mode of ['hike','bike-hike'])
 for(const interest of ['short-walk','summit','geology','beach','lake','challenge','lookout']){
  const key=hour+'|'+mode+'|'+interest;
  const got=json.plans[key],expected=plan({hours:hour,mode,interest}).results;
  assert.deepEqual(got.map(x=>x.id),expected.map(x=>x.id));
  for(let i=0;i<6;i++){
   assert.equal(got[i].classification,expected[i].classification);
   assert.equal(got[i].durationStatus,expected[i].duration.status);
  }
 }
 assert.equal(json.plans['2|hike|short-walk'][0].id,'sea-lion');
 const top2=json.plans['2|hike|summit'].find(x=>x.id==='top-of-the-giant');
 assert.equal(top2.classification,'not_suitable');
 const top10=json.plans['10|hike|summit'].find(x=>x.id==='top-of-the-giant');
 assert.equal(top10.classification,'planning_candidate');
 assert.ok(json.plans['12|bike-hike|summit'].every(x=>x.classification!=='planning_candidate'));
});
test('A mapped government line remains unapproved navigation, and nonmapped experiences remain present',()=>{
 const {json,html}=compile();
 assert.deepEqual(json.overlays.map(o=>o.routeId),
  ['sea-lion','top-of-the-giant','head-of-the-giant','nanabosho-lookout']);
 assert.ok(json.overlays.every(o=>o.visitorRouteReady===false&&o.turnByTurnEligible===false
  &&o.parkingConnectorMapped===false&&o.sections.every(s=>s.researchGeometry.type==='LineString')));
 assert.ok(json.routes.some(r=>r.id==='middlebrun-beach'));
 assert.ok(json.routes.some(r=>r.id==='pass-lake-overlook'));
 assert.equal(json.allDirectionsDisabled,true);
 assert.equal(json.weatherLive,false);
 assert.equal(json.trailLive,false);
 assert.equal(json.parkingNowLive,false);
 assert.equal(json.parking.officialParkCoordinate,false);
 assert.equal(json.parking.carNavigationEligible,false);
 assert.match(html,/unverified parking-to-trail connection/i);
 assert.doesNotMatch(html,/google\.com\/maps\/dir/);
 assert.doesNotMatch(html,/api\/sleeping-giant/);
 assert.match(html,/<script src="\/assets\/leaflet-1\.9\.4\.js"><\/script>/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:\/\//);
});
test('Interactive preview has labelled controls, keyboard focus, a live result region and reduced motion',()=>{
 const {html}=compile();
 assert.match(html,/<label for="hours">/);
 assert.match(html,/<label for="interest">/);
 assert.match(html,/<fieldset class="control modes">/);
 assert.match(html,/role="status" aria-live="polite"/);
 assert.match(html,/aria-controls="map-canvas"/);
 assert.match(html,/type="button" class="map-choice"/);
 assert.match(html,/prefers-reduced-motion/);
 assert.match(html,/focus-visible/);
 assert.match(html,/id="map-canvas" viewBox=/);
 assert.match(html,/id="map-focus"/);
 assert.match(html,/id="map-zoom-status"/);
 assert.match(html,/value="destination"/);
 assert.match(html,/value="parking"/);
 assert.match(html,/text-anchor/);
 assert.match(html,/focusMap\('overview'\)/);

 assert.match(html,/id="route-shapes"/);
 assert.match(html,/data-source-id/);
 assert.match(html,/unverified parking-to-trail connection/i);
});
test('No misleading automatic open status, exact parking or cycling to every trail',()=>{
 const {json,html}=compile();
 assert.ok(json.routes.every(x=>x.currentTrailStatus==='unverified'));
 assert.ok(json.routes.filter(x=>x.bikePermission==='official_documented').length===3);
 assert.ok(json.routes.filter(x=>x.bikePermission!=='official_documented').length===3);
 assert.ok(json.routes.every(x=>x.roundTripKm>0));
 assert.match(html,/No documented complete bicycle approach/);
 assert.match(html,/do not cycle beyond the cutoff/i);
 assert.match(html,/Current trail and road access, parking availability, weather and exact junction coordinates are not verified|Trail and road access, parking availability, weather and exact junction coordinates are not verified/);
 assert.match(html,/not a live trail report/i);
 assert.doesNotMatch(html,/\bOPEN NOW\b/);
});
