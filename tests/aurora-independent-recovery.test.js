'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const page=fs.readFileSync('public/northern-lights-michigan/index.html','utf8');
const begin=page.indexOf('function clearKpForecast(){');
const end=page.indexOf('// === Tonight\'s dark window',begin);
assert.ok(begin>0&&end>begin);
const source=page.slice(begin,end);
const NOW=Date.parse('2026-11-24T23:00:00Z');
const stamp=new Date(NOW).toISOString();
function fixture(kp=6){
 return {fetched_at:stamp,forecast:{peak_24h:kp,peak_72h:kp,current:{kp:4},peak_24h_at:stamp,periods:[{time_tag:stamp,kp}]},solar_wind:{bz_gsm_nt:-6,speed_km_s:450},ovation:{regions:[{id:'mackinaw-city',sky_cover:{periods:[{percent:20}]}}]},moon:{phase:'Waxing Crescent'}};
}
function harness(){
 const nodes=new Map(),calls={};
 function node(){
  const classes=new Set(['active','alert','show','current']);
  const sub=new Map();
  return {textContent:'old',innerHTML:'old',style:{display:'block'},attrs:{},children:['old'],classes,
   classList:{remove(...xs){xs.forEach(x=>classes.delete(x));},add(...xs){xs.forEach(x=>classes.add(x));}},
   setAttribute(k,v){this.attrs[k]=v;},replaceChildren(...xs){this.children=xs;this.innerHTML='';},
   querySelector(k){if(!sub.has(k))sub.set(k,node());return sub.get(k);}
  };
 }
 const get=k=>{if(!nodes.has(k))nodes.set(k,node());return nodes.get(k);};
 let reply=fixture();
 const sandbox={document:{getElementById:get,querySelectorAll:()=>[get('step')]},Date,AbortSignal,Number,
   currentKp:0,kpForecast:[],latestAuroraData:null,KP_STATUS:Array(10).fill('signal'),
   asFiniteNumber:v=>v==null?null:Number(v),kpClass:Math.floor,
   currentForecast:d=>Number.isFinite(Date.parse(d?.fetched_at))&&Date.parse(d.fetched_at)===NOW,
   updateGauge:k=>{get('gaugeNum').textContent=k.toFixed(1);},
   drawForecast:rows=>{get('forecastSvg').children=rows;},
   highlightKpStep:()=>get('step').classList.add('current'),
   updateSmartCta:()=>get('smartCta').classList.add('show'),checkAndNotify:()=>{},
   renderSolarWind:d=>{calls.solar=d;},
   markSpaceWeatherUnavailable:id=>{get(id).querySelector('.sw-val').textContent='--';},
   renderDecisionData:d=>{calls.decision=d;},
   renderTonightVerdict:d=>{calls.verdict=d;},
   renderUnavailableTonightVerdict:()=>{calls.verdict=null;},
   formatMichiganTime:()=> '6 PM',
   fetch:async()=>{if(reply instanceof Error)throw reply;return {ok:true,json:async()=>reply};}
 };
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {get,calls,sandbox,set:d=>{reply=d;},load:()=>vm.runInContext('loadAuroraData()',sandbox)};
}
test('success, partial Kp outage, complete outage and valid recovery use one display lifecycle',async()=>{
 const h=harness();
 await h.load();
 assert.equal(h.get('gaugeNum').textContent,'6.0');
 assert.equal(h.get('forecastSvg').children.length,1);
 const partial=fixture();partial.forecast={peak_24h:null,peak_72h:null,periods:[],current:{kp:4}};
 h.set(partial);await h.load();
 assert.equal(h.get('gaugeNum').textContent,'--');
 assert.equal(h.get('forecastSvg').children.length,0);
 assert.equal(h.get('step').classes.has('current'),false);
 assert.equal(h.get('smartCta').classes.has('show'),false);
 assert.equal(h.get('liveDot').classes.has('alert'),false);
 assert.equal(h.get('forecastTooltip').style.display,'none');
 assert.equal(h.get('swKpPeak').querySelector('.sw-val').textContent,'--');
 assert.equal(h.get('swKpNow').querySelector('.sw-val').textContent,'4.0');
 assert.equal(h.calls.verdict,null);
 assert.equal(h.calls.decision,partial);
 assert.equal(h.calls.solar,partial.solar_wind);
 assert.match(h.get('tonightDetail').innerHTML,/do not replace the missing Kp forecast/);
 h.set(new Error('source down'));await h.load();
 assert.equal(h.calls.decision,null);
 assert.equal(h.calls.solar,undefined);
 assert.equal(h.get('swKpNow').querySelector('.sw-val').textContent,'--');
 assert.match(h.get('liveStatus').textContent,/manual guide active/);
 h.set(fixture(0));await h.load();
 assert.equal(h.get('gaugeNum').textContent,'0.0');
 assert.equal(h.get('forecastSvg').children.length,1);
 assert.equal(h.get('step').classes.has('current'),true);
 assert.ok(h.calls.verdict);
});
test('expired HTTP success and empty period list cannot retain a forecast',async()=>{
 const h=harness();await h.load();
 h.set({...fixture(),fetched_at:new Date(NOW-3600000).toISOString()});await h.load();
 assert.equal(h.calls.decision,null);
 assert.equal(h.get('gaugeNum').textContent,'--');
 const empty=fixture();empty.forecast.periods=[];
 h.set(empty);await h.load();
 assert.equal(h.calls.verdict,null);
 assert.equal(h.get('forecastSvg').children.length,0);
});
test('background expiry invokes the same clearing path',()=>{
 assert.match(page,/function expireRegionalForecast\(\)\s*\{\s*renderAuroraUnavailable\(null\);/);
});
