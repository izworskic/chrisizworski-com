'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../public/assets/soo-visit-memory'),c=require('../public/assets/soo-changing-conditions'),core=require('../public/assets/soo-lock-watch'),near=require('../public/assets/soo-near-lock-motion');
const T=Date.parse('2026-11-21T14:45:00Z'),M=60000,id='366123456',iso=n=>new Date(T+n*M).toISOString();
const vessel=(n,d=0)=>({id,mmsi:id,name:'TEST SHIP',seen:iso(n-1),window:{start:iso(60+d),midpoint:iso(90+d),end:iso(120+d)}});
const snap=(n,ships=[vessel(n)])=>c.snapshot({ok:true,checkedAt:iso(n),nextShip:{ok:true,candidates:ships,inLock:[],nearLockMotion:[]}},T+n*M,core,near);
const step=(s,n,ships)=>c.step(s,snap(n,ships),false,T+n*M);
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const make=()=>m.create({startOffset:120,stay:45},T);
const captured=()=>m.capture(make(),step(null,0),T);
test('opt-in preferences round trip, versioned key and one-step clear',()=>{
 const s=store();assert.equal(m.read(s,T).value,null);
 const r=m.write(s,captured(),T);assert.equal(r.ok,true);
 assert.deepEqual(m.read(s,T).value.prefs,{startOffset:120,stay:45});
 assert.equal(m.clear(s),true);assert.equal(m.read(s,T).value,null);
 assert.equal(m.create({startOffset:1,stay:99},T),null);
});
test('restored memory is comparison-only and a newer fix can produce a meaningful change',()=>{
 const restored=m.restore(captured(),c,T+M);
 assert.deepEqual(restored.events,[]);
 const p=step(restored,1,[vessel(1,25)]);assert.match(c.summary(p,T+M).text,/25 min later/);
 assert.equal(c.summary(step(restored,0),T),null);
});
test('expired snapshots are discarded, choices survive, timestamps never refreshed by a read',()=>{
 const s=store();m.write(s,captured(),T);
 const old=m.read(s,T+16*M).value;
 assert.equal(old.baseline,null);assert.equal(old.lastCheck,T);assert.equal(old.savedAt,T);
 assert.equal(m.restore(old,c,T+16*M).last,null);
 assert.equal(m.read(s,T+m.CHECK_TTL+1).value.lastCheck,null);
 assert.equal(m.read(s,T+m.PREF_TTL+1).value,null);assert.equal(s.getItem(m.KEY),null);
});
test('failed feed removes baseline, older checks do not replace newer stored evidence',()=>{
 const r=captured(),failed=c.step(step(null,0),null,true,T+M);
 const cleared=m.capture(r,failed,T+M);assert.equal(cleared.baseline,null);assert.equal(cleared.lastCheck,T);
 const newer=m.capture(r,step(null,2),T+2*M);
 assert.equal(m.capture(newer,step(null,1),T+2*M).lastCheck,T+2*M);
});
test('out-of-order accepted watermark survives a reload without carrying absent live evidence',()=>{
 let state=step(null,0);state=step(state,1,[]);
 let r=m.capture(make(),state,T+M);assert.equal(r.baseline.ships.length,0);assert.equal(r.baseline.accepted.length,1);
 const restored=m.restore(r,c,T+2*M);const old={...vessel(2,30),seen:iso(-2)};
 const next=step(restored,2,[old]);assert.equal(c.summary(next,T+2*M),null);assert.equal(next.last.ships[id],undefined);
 assert.equal(next.accepted[id].seen,Date.parse(iso(-1)));
});
test('malformed, oversized, future and unsupported records fail closed',()=>{
 const s=store(),r=captured();
 for(const raw of ['{bad','x'.repeat(160001),JSON.stringify({...r,version:2}),JSON.stringify({...r,savedAt:T+M}),JSON.stringify({...r,prefs:{startOffset:120,stay:17}})]){
   s.setItem(m.KEY,raw);assert.equal(m.read(s,T).value,null);assert.equal(s.getItem(m.KEY),null);
 }
 for(const b of [{...r.baseline,listed:[]},{...r.baseline,ships:[{...r.baseline.ships[0],seen:T+1}]},{...r.baseline,accepted:[]}]){
   assert.equal(m.normalize({...r,baseline:b},T).baseline,null);
 }
});
test('storage exceptions cannot become successful saves or clears',()=>{
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('quota')},removeItem(){throw Error('blocked')}};
 assert.equal(m.read(blocked,T).ok,false);assert.equal(m.write(blocked,make(),T).ok,false);assert.equal(m.clear(blocked),false);
});
test('expired low-motion reports cannot be revived from device memory',()=>{
 const low={id,mmsi:id,name:'TEST SHIP',lat:46.502,lon:-84.36,seen:iso(-1),speedKnots:.4,distanceNm:.5,state:'near-lock-low-motion'};
 const x=c.snapshot({ok:true,checkedAt:iso(0),nextShip:{ok:true,candidates:[],inLock:[],nearLockMotion:[low]}},T,core,near);
 const rec=m.capture(make(),c.step(null,x,false,T),T);
 assert.equal(m.restore(rec,c,T+5*M).last.ships[id],undefined);
});
