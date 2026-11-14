'use strict';
const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../public/assets/circle-tour-rust-itinerary.js');
const html=fs.readFileSync('public/lake-superior-circle-tour/index.html','utf8');
const live=fs.readFileSync('public/assets/lake-superior-circle-tour-live-day.js','utf8');
const core=fs.readFileSync('public/assets/lake-superior-circle-tour-core.js','utf8');
const wrapper=fs.readFileSync('public/assets/lake-superior-circle-tour.js','utf8');

function stopCard(id){
 const match=html.match(new RegExp('<article class="stop-card" id="stop-'+id+'"[^>]*>[\\s\\S]*?<\\/article>'));
 const distance=match?.[0]?.match(/<span class="stop-dist"([^>]*)>([\s\S]*?)<\/span>/);
 if(!distance)return null;
 return {querySelector:selector=>selector==='.stop-dist'?{
   dataset:{edgeVerified:distance[1].includes('data-edge-verified="false"')?'false':'true'},
   textContent:distance[2].replace(/<[^>]*>/g,'')
 }:null};
}
const snippet=(s,a,b)=>{const start=s.indexOf(a),end=s.indexOf(b,start);
 assert.ok(start>=0&&end>start,a+' source extraction');return s.slice(start,end);};
const legacy=new Function('card','ROUTE_ORDER',
 snippet(live,'  function edgeMiles(', '  function visitHours(')+
 '\nreturn {edgeMiles,totalMiles,driveAllowanceHours};')(stopCard,engine.ORDER);
const publishedMiles=new Function(
 snippet(core,'  function publishedRouteMiles(', '  function renderRoutePreview(')+
 '\nreturn publishedRouteMiles;')();
const route=days=>{
 const start=html.indexOf('id="itin-'+days+'"');
 const end=days===7?html.indexOf('id="itin-10"',start):
   days===10?html.indexOf('id="itin-15"',start):html.length;
 return [...html.slice(start,end).matchAll(/<div class="itin-day" data-day="(\d+)" data-stops="([\d,]+)" data-miles="(\d+)"/g)]
   .map(([,day,stops,miles])=>({day:Number(day),stops:stops.split(','),miles:Number(miles)}));
};
const guard=(segment,direction='counterclockwise',crossings=[])=>{
 const routeMiles=legacy.totalMiles(segment);
 return engine.auditSegment({
   segment,direction,routeMiles,
   driveHours:routeMiles===null?NaN:segment.length===1?0:legacy.driveAllowanceHours(routeMiles),
   borderAllowances:crossings,borderMinutes:crossings.reduce((a,c)=>a+c.allowanceMinutes,0),
   borderUnknown:crossings.some(c=>!c.available),getEdgeMiles:legacy.edgeMiles,getCard:stopCard
 });
};
test('31 source stop identities preserve Whitefish Point at 31 between 12 and 13',()=>{
 assert.equal(engine.ORDER.length,31);
 assert.equal(new Set(engine.ORDER).size,31);
 assert.deepEqual(engine.ORDER.slice(10,15),['11','12','31','13','14']);
 assert.equal(engine.engine(),'js-parity');
});
test('all 31 directed neighbors are recognized only when source miles are published',()=>{
 for(const direction of ['counterclockwise','clockwise'])for(let i=0;i<31;i++){
   const from=engine.ORDER[i],to=engine.ORDER[(i+(direction==='counterclockwise'?1:30))%31];
   const legacyMiles=legacy.edgeMiles(from,to);
   assert.equal(engine.evidenceMiles(from,to,stopCard),legacyMiles,from+' '+to);
   const pass=Number.isFinite(legacyMiles);
   assert.equal(guard([from,to],direction).ok,pass,from+' to '+to+' '+direction);
 }
});
test('unknown/partial legs never become 45-mile invented driving legs',()=>{
 for(const segment of [['7','8'],['12','31'],['31','13'],['20','21']]){
   assert.equal(guard(segment).ok,false,segment.join(' to '));
 }
 assert.equal(guard(['2','4']).ok,false,'skipped unsupported road leg');
 assert.equal(guard(['4','5','6','7']).ok,true);
 assert.equal(guard(['7','6','5','4'],'clockwise').ok,true);
 assert.equal(guard(['1','30'],'clockwise').ok,true,'Duluth aliases are zero-distance identity');
 assert.equal(guard(['30','1'],'counterclockwise').ok,true);
 assert.equal(guard(['1','1']).ok,true,'one-site stay day has zero driving');
});
test('both borders reserve 45 minutes when live evidence is unavailable',()=>{
 const unavailable={name:'Sault Ste. Marie',available:false,waitMinutes:0,allowanceMinutes:45};
 const known={name:'Sault Ste. Marie',available:true,waitMinutes:14,allowanceMinutes:14};
 assert.equal(guard(['13','14'],'counterclockwise',[unavailable]).ok,true);
 assert.equal(guard(['13','14'],'counterclockwise',[known]).ok,true);
 assert.equal(guard(['14','13'],'clockwise',[unavailable]).ok,true);
 assert.equal(guard(['13','14']).ok,false,'cannot silently omit a border crossing');
 assert.equal(guard(['13','14'],'counterclockwise',[{...unavailable,allowanceMinutes:0}]).ok,false);
 assert.equal(guard(['13','14'],'counterclockwise',[{...known,allowanceMinutes:45}]).ok,false);
 assert.equal(guard(['4','5'],'counterclockwise',[unavailable]).ok,false,'phantom crossing');
});
test('published seven, ten and fifteen day mileages remain source estimates in both directions',()=>{
 for(const [days,total] of [[7,1359],[10,1358],[15,1358]]){
   const ccw=route(days);
   assert.equal(publishedMiles(ccw),total);
   assert.equal(engine.verifyPreset(ccw,total,'counterclockwise'),total);
   const cw=ccw.slice().reverse().map(d=>({...d,stops:d.stops.slice().reverse()}));
   assert.equal(engine.verifyPreset(cw,total,'clockwise'),total);
   const corrupted=ccw.map(d=>({...d,stops:d.stops.slice()}));
   corrupted[1].stops[0]='31';
   assert.equal(engine.verifyPreset(corrupted,total,'counterclockwise'),null);
   const missing=ccw.map(d=>({...d}));
   missing[1].miles=null;
   assert.equal(engine.verifyPreset(missing,total,'counterclockwise'),null);
 }
 assert.equal(engine.verifyPreset(route(7),null,'counterclockwise'),null);
});
test('source mismatch, missing borders and fabricated time allowance always fail closed',()=>{
 const expected=guard(['4','5','6','7']);
 assert.equal(expected.ok,true);
 const partial=engine.auditSegment({segment:['4','5','6','7'],direction:'counterclockwise',
    routeMiles:999,driveHours:999/47*1.2,borderAllowances:[],borderMinutes:0,
    borderUnknown:false,getEdgeMiles:legacy.edgeMiles,getCard:stopCard});
 assert.equal(partial.ok,false);
 const odd=engine.auditSegment({segment:['4','5'],direction:'counterclockwise',
    routeMiles:80,driveHours:0,borderAllowances:[],borderMinutes:0,
    borderUnknown:false,getEdgeMiles:legacy.edgeMiles,getCard:stopCard});
 assert.equal(odd.ok,false);
 const wrong=engine.auditSegment({segment:['4','5'],direction:'counterclockwise',
    routeMiles:80,driveHours:legacy.driveAllowanceHours(80),borderAllowances:[],
    borderMinutes:0,borderUnknown:false,getEdgeMiles:()=>45,getCard:stopCard});
 assert.equal(wrong.ok,false);
});
test('non-planner page, source and ads unchanged; original planner owns UX',()=>{
 assert.match(wrapper,/circle-tour-rust-itinerary\.js/);
 assert.ok(wrapper.indexOf("circle-tour-rust-itinerary.js")<wrapper.indexOf("lake-superior-circle-tour-core.js"));
 assert.match(core,/CircleTourRust\.verifyPreset/);
 assert.match(live,/CircleTourRust\?\.auditSegment/);
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/lake-superior-circle-tour\//);
 assert.equal((html.match(/class="stop-card"/g)||[]).length,31);
 assert.match(html,/pagead2\.googlesyndication\.com|adsbygoogle/);
});
