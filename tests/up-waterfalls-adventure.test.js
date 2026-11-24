import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const sandbox={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync('public/assets/up-waterfalls-adventure.js','utf8'),sandbox);
const {plan,timeMax,exactTown,distance}=sandbox.module.exports;
const origin={name:'Munising',lat:46.4309,lon:-86.6194};
const stop=(id,lat,lon,max,extra={})=>({id,lat,lon,max,status:'verify',verified:'verified',policy:'check',level:'easy',region:'Pictured Rocks / Munising',group:id,...extra});
const a=stop('a',46.44,-86.62,30),b=stop('b',46.48,-86.62,45),c=stop('c',46.49,-86.61,90,{level:'moderate'}),far=stop('far',47.4,-88.4,30);
const args={origin,total:240,reserve:120,radius:25,style:'mixed',day:'2027-07-12',candidates:[a,b,c,far]};
test('time budget and compact geography give distinct options',()=>{
 const r=plan(args);assert.equal(r.status,'AVAILABLE');assert.equal(r.options[0].ids,'a,b');assert.equal(r.options[0].onsite,75);assert.equal(r.options[1].ids,'c');assert.equal(r.options[1].spare,30);
 assert.ok(r.options.every(p=>p.onsite+args.reserve<=args.total&&p.spread<=15&&p.farthest<=25));
});
test('style and origin materially change recommendations',()=>{
 assert.equal(plan({...args,style:'easy'}).options[0].ids,'a,b');
 assert.equal(plan({...args,style:'hike'}).options[0].ids,'a,c');
 assert.equal(plan({...args,origin:{lat:47.4,lon:-88.4}}).options[0].ids,'far');
 const shorter=plan({...args,reserve:180});assert.equal(shorter.options[0].ids,'a');assert.equal(shorter.options[1].ids,'b');assert.ok(shorter.options.every(p=>p.onsite<=60));
});
test('fails closed for access, unknown duration, shared approaches, winter and invalid inputs',()=>{
 const bad=[stop('closed',46.44,-86.62,10,{status:'closed'}),stop('unknown',46.44,-86.62,10,{verified:'pending'}),stop('season',46.44,-86.62,10,{status:'seasonal'}),stop('bad-policy',46.44,-86.62,10,{policy:'extra-check'}),stop('gabbro-falls',46.44,-86.62,10),stop('missing',46.44,-86.62,null)];
 assert.equal(plan({...args,candidates:bad}).status,'EMPTY');
 assert.equal(plan({...args,day:'2027-01-12'}).status,'HELD');
 assert.equal(plan({...args,day:'2027-02-30'}).status,'INVALID');
 assert.equal(plan({...args,reserve:240}).status,'INVALID');
 assert.equal(plan({...args,candidates:[a,{...b,group:a.group}]}).options[0].stops.length,1);
 assert.equal(plan({...args,candidates:[a,{...b,region:'Other'}]}).options[0].stops.length,1);
 assert.equal(timeMax('20–50 min'),50);assert.equal(timeMax('not documented'),null);assert.equal(timeMax('60–20 min'),null);
});
test('town subset exactly matches existing Census place reference rows',()=>{
 const data=JSON.parse(fs.readFileSync('public/assets/up-waterfall-adventure-towns.json','utf8'));
 const orig=JSON.parse(fs.readFileSync('public/assets/michigan-places.json','utf8'));
 for(const p of data.places)assert.ok(orig.places.some(r=>r[3]==='p'&&r[0]===p.name&&r[1]===p.lat&&r[2]===p.lon));
 assert.equal(exactTown(data.places,'Munising, MI').name,'Munising');assert.equal(exactTown(data.places,'Munsing'),null);
 assert.equal(exactTown([origin,{...origin,lat:46.5}],'Munising'),null);
 assert.ok(distance(origin,a)<1);
});
