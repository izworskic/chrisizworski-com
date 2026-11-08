'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const D=require('../data/seaway/places.json');
const C=require('../public/assets/seaway-core.js');
const Follow=require('../public/assets/seaway-follow.js');
const html=fs.readFileSync('public/st-lawrence-seaway/index.html','utf8');
const js=fs.readFileSync('public/assets/seaway.js','utf8');
const generated=fs.readFileSync('scripts/enhance-seaway-journey.mjs','utf8');
const now=Date.parse('2026-11-08T13:10:00Z');
function ship(patch={}){
 return {mmsi:'316123456',name:'TEST CARRIER',seen:'2026-11-08T13:05:00Z',
  lat:44.978,lon:-74.86,regionIds:['massena'],speedKnots:5.2,heading:240,course:220,...patch};
}
function context(v=ship(),region='all'){return C.journeyContext(v,D.regions,region);}
test('a recent AIS position yields only an observed chapter, not a predicted route',()=>{
 const v=ship(),r=Follow.analyze(v,D,context(v),new Date(now).toISOString(),now);
 assert.equal(r.valid,true);assert.equal(r.mmsi,'316123456');assert.equal(r.id,'massena');assert.equal(r.area,'Massena · Eisenhower & Snell');assert.equal(r.ageMinutes,5);
 assert.equal(r.chapters.filter(c=>c.current).length,1);
 assert.deepEqual(r.locks.map(x=>x.id),['snell','eisenhower']);
 assert.deepEqual(r.viewpoints.map(x=>x.id),['eisenhower-center']);
 assert.deepEqual(r.neighbors.map(x=>x.id),['beauharnois','iroquois']);
 assert.match(r.message,/not a verified voyage direction/);
 for(const field of ['eta','estimatedArrival','nextLock','destination','inferredRoute','historicalPositions'])assert.equal(Object.hasOwn(r,field),false,field);
});
test('unknown chapter never invents a viewing place, lock or current stage',()=>{
 const v=ship({regionIds:[]}),r=Follow.analyze(v,D,context(v),null,now);
 assert.equal(r.valid,true);assert.equal(r.id,null);assert.equal(r.chapters.filter(c=>c.current).length,0);
 assert.equal(r.locks.length,0);assert.equal(r.viewpoints.length,0);assert.equal(r.neighbors.length,0);
 assert.match(r.message,/cannot be established/);
});
test('report ages out exactly at the 30-minute boundary, including stale, future and invalid IDs',()=>{
 assert.equal(Follow.analyze(ship({seen:'2026-11-08T12:40:00Z'}),D,context(),null,now).valid,true);
 for(const p of [{seen:'2026-11-08T12:39:59Z'},{seen:'2026-11-08T13:12:00Z'},{seen:'garbled'},{mmsi:'not-mmsi'}]){
  assert.equal(Follow.analyze(ship(p),D,context(),null,now).valid,false,JSON.stringify(p));
 }
});
test('Iroquois has only its own verified viewing plan, while Montreal invents no public entrance',()=>{
 const iro=ship({regionIds:['iroquois']});
 const a=Follow.analyze(iro,D,context(iro),null,now);
 assert.deepEqual(a.viewpoints.map(v=>v.id),['iroquois-point']);
 assert.equal(a.locks.length,1);
 const mont=ship({regionIds:['montreal']});
 const b=Follow.analyze(mont,D,context(mont),null,now);
 assert.equal(b.viewpoints.length,0);
 assert.equal(b.locks.length,2);
});
test('experience stays directly below map/list and before viewing, not a new route or obscuring map overlay',()=>{
 const panel=html.indexOf('id="followFreighter"'),map=html.indexOf('id="seawayMap"'),
  list=html.indexOf('id="shipList"'),regional=html.indexOf('id="regionReports"'),view=html.indexOf('id="viewing-plan"');
 assert.ok(map>=0&&list>map&&panel>list&&regional>panel&&view>panel,{map,list,panel,regional,view});
 assert.equal((html.match(/id="followFreighter"/g)||[]).length,1);
 assert.match(html,/id="followFreighter"[^>]+hidden/);
 assert.match(html,/id="followSelectedShip"[^>]+hidden/);
 assert.match(html,/aria-controls="followFreighter"/);
 assert.match(html,/id="followFreighterTitle" tabindex="-1"/);
 assert.match(html,/name="robots" content="index,follow,max-image-preview:large"/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/st-lawrence-seaway\//);
 assert.doesNotMatch(fs.readFileSync('public/eisenhower-lock/index.html','utf8'),/id="followFreighter"/);
 for(const marker of ['followFreighter','followSelectedShip','seaway-follow.css','seaway-follow.js'])assert.ok(generated.includes(marker),'generator missing '+marker);
 assert.match(html,/src="\/assets\/seaway-follow\.js\?v=20261108a"/);
 assert.ok(html.indexOf('src="/assets/seaway-follow.js')<html.indexOf('src="/assets/seaway.js'));
});
test('existing AIS viewer hands the selected observation to the journey and resets on state changes',()=>{
 assert.match(js,/follow\?\.select\(v,C\.journeyContext\(v,D\.regions,region\)/);
 assert.match(js,/function showFollowing\(/);
 assert.match(js,/function clearFollowing\(/);
 assert.match(js,/if\(selectedShip&&!reportFor\(selectedShip\)\)\{follow\?\.expire\(\)/);
 assert.match(js,/selectedShip=null;clearFollowing\(\)/);
 assert.match(js,/Follow this ship’s journey/);
 assert.match(js,/onInspectAll:id=>/);
 assert.doesNotMatch(js,/seaway-map-report-badge|L\.control\(\{position:'topright'/);
});
test('visitor data rendered using DOM text nodes, not provider-supplied HTML',()=>{
 const source=fs.readFileSync('public/assets/seaway-follow.js','utf8');
 assert.match(source,/node\.textContent=text/);
 assert.doesNotMatch(source,/\.innerHTML|insertAdjacentHTML|eval\(/);
 assert.match(source,/not a confirmed transit or arrival/);
 assert.match(source,/not a verified voyage direction/);
 const css=fs.readFileSync('public/assets/seaway-follow.css','utf8');
 assert.match(css,/\.follow-panel/);
 assert.match(css,/@media\(max-width:550px\)/);
 assert.doesNotMatch(css,/\.adsbygoogle|\.google-auto-placed|ad-overlay/);
});
