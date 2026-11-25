import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const w=require('../public/assets/snowmobile-watchlist.js');
const c=require('../public/assets/snowmobile-comparison.js');
const now=Date.parse('2026-12-05T15:00:00Z'),H=3600000,iso=t=>new Date(t).toISOString();
const region={key:'grayling-gaylord',shortLabel:'Grayling–Gaylord',route:{routeState:'ROUTE_BROKEN',legalVerification:'CURRENT_LAYER_MATCH'},surfaceEvidence:{observedSnow:{available:true,latestAt:iso(now-H),largest48hInches:8}}};
const town={name:'Frederic',region:region.key,url:'/snowmobile/regions/grayling-gaylord.html#trail-conditions-near-frederic'};
const bundle={generatedAt:iso(now-60000),season:{active:true},statewide:{closuresVerified:true}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('device-only saved places persist, validate paths, deduplicate and clear',()=>{
 const s=storage(),p=w.townPlace(town),r=w.regionPlace(region);
 assert.equal(p.id,'town-grayling-gaylord-frederic');assert.equal(p.url,town.url);
 assert.equal(w.place({...p,url:'https://example.org/'}),null);
 assert.equal(w.place({...p,region:'other'}),null);
 assert.ok(w.write(s,[{...p,savedAt:iso(now),lastSeen:{}},{...r,savedAt:iso(now),lastSeen:{}},p]));
 assert.equal(w.read(s,now).spots.length,2);
 assert.ok(w.clear(s));assert.equal(s.getItem(w.KEY),null);assert.equal(w.read(s,now).spots.length,0);
});
test('blocked and corrupted storage fail closed',()=>{
 const bad={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
 assert.equal(w.read(bad,now).available,false);assert.equal(w.write(bad,[]),false);assert.equal(w.clear(bad),false);
 const s=storage();s.setItem(w.KEY,'not json');assert.equal(w.read(s,now).spots.length,0);
});
test('capture refuses stale bundles and unverified or off-season closure decisions',()=>{
 const current=w.capture(bundle,region,null,c,now);
 assert.equal(current.snow.largest48,8);assert.equal(current.closure.matched,true);
 assert.deepEqual(w.capture({...bundle,generatedAt:iso(now-H)},region,null,c,now),{});
 assert.equal(w.capture({...bundle,season:{active:false}},region,null,c,now).closure,undefined);
 assert.equal(w.capture({...bundle,statewide:{closuresVerified:false}},region,null,c,now).closure,undefined);
 assert.equal(w.capture(bundle,{...region,route:{routeState:'ROUTE_BROKEN',legalVerification:'UNVERIFIED'}},null,c,now).closure,undefined);
});
test('newer observations and changed closure matches are distinct from missing or older data',()=>{
 const p={snow:{at:iso(now-2*H),largest48:6},closure:{at:iso(now-H),matched:true}};
 const q={snow:{at:iso(now-H),largest48:4},closure:{at:iso(now),matched:false}};
 const changes=w.changes(p,q,now);
 assert.equal(changes.length,2);assert.match(changes[0],/newer dated NWS/);assert.match(changes[1],/not confirmation of opening/);
 assert.deepEqual(w.changes(p,{},now),[]);assert.deepEqual(w.changes(q,p,now),[]);
 assert.equal(w.mergeReading(p,{},now).snow.largest48,6);
 assert.equal(w.mergeReading(q,p,now).snow.largest48,4);
 assert.deepEqual(w.mergeReading(q,{},now+8*24*H),{});
});
test('rolling forecasts compare issuance only, no fabricated delta; club source gaps preserve dates',()=>{
 const p={forecast:{at:iso(now-2*H),start:iso(now),end:iso(now+72*H),total:9},clubs:{at:iso(now-H),reports:[{name:'Club',reportedAt:'2026-12-04',groomedAt:'2026-12-04',checked:true}]}};
 const q={forecast:{at:iso(now-H),start:iso(now+H),end:iso(now+73*H),total:3},clubs:{at:iso(now),reports:[{name:'Club',reportedAt:null,groomedAt:null,checked:false}]}};
 assert.deepEqual(w.changes(p,q,now),['NWS issued a newer 72-hour hub forecast.']);
 assert.equal(w.mergeReading(p,q,now).clubs.reports[0].reportedAt,'2026-12-04');
 q.clubs.reports[0]={name:'Club',reportedAt:'2026-12-05',groomedAt:'2026-12-05',checked:true};
 assert.equal(w.changes(p,q,now).length,3);
});
test('no new fetch or tracking, UI loads before main client and preserves typed town selection',()=>{
 const html=readFileSync(new URL('../public/snowmobile/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../public/assets/snowmobile-watchlist.js',import.meta.url),'utf8');
 assert.match(html,/id="sled-watchlist"[^>]*hidden/);assert.match(html,/id="sled-watch-clear"/);
 assert.ok(html.indexOf('/assets/snowmobile-watchlist.js')<html.indexOf('/assets/snowmobile-index.js'));
 assert.ok(js.includes("mode:'towns'"));assert.ok(!/\bfetch\(|\bgtag\(/.test(js));
 assert.match(js,/STALE, not current/);
});

test('statewide map is the first section after the introduction, with one map and unchanged watchlist and controls',()=>{
 const html=readFileSync(new URL('../public/snowmobile/index.html',import.meta.url),'utf8');
 assert.equal((html.match(/id="state-map"/g)||[]).length,1);
 assert.match(html,/<p class="lede">[\s\S]*?<\/p>\s*<section class="panel" aria-labelledby="map-title">/);
 const map=html.indexOf('id="state-map"');
 for(const id of ['sled-watchlist','snow-town-query','compare-form','region-list']){
  assert.ok(html.indexOf('id="'+id+'"')>map,id+' must follow the map');
 }
 assert.ok(html.indexOf('class="map-legend"')<html.indexOf('id="sled-watchlist"'));
});
