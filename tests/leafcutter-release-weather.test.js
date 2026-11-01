'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../lib/leafcutter-release.cjs');
const handler=require('../api/leafcutter-release-weather.js');
function ymdUTC(date){return date.toISOString().slice(0,10);}
function makeHours(date,hi,offset='-04:00',n=9){
 return Array.from({length:n},(_,i)=>({startTime:date+'T'+String(i+9).padStart(2,'0')+':00:00'+offset,
  isDaytime:true,temperature:hi-(i<4?2:0),temperatureUnit:'F',probabilityOfPrecipitation:{value:i%3===0?35:10}}));
}
function response(){return{statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;},
 status(code){this.statusCode=code;return this;},json(data){this.body=data;return this;}};}
test('NWS daily high uses hourly daylight, not a hardiness zone or claimed observation',()=>{
 const now=new Date('2026-07-13T13:00:00Z');
 const data=[...makeHours('2026-07-13',76),...makeHours('2026-07-14',78),...makeHours('2026-07-15',69)];
 const result=E.reducePeriods(data,'2026-07-13T11:00:00Z',now);
 assert.equal(result.status,'WARM_STRETCH');
 assert.deepEqual(result.firstWarmStretch,{startDate:'2026-07-13',endDate:'2026-07-14'});
 assert.equal(result.daily[0].highF,76);
 assert.equal(result.daily[0].precipPeakPct,35);
 assert.match(result.assessment,/not a validated biological threshold/);
 assert.equal(result.daily[2].signal,'COOL_DAY');
});
test('Never infer a warm stretch from stale, partial, or missing source evidence',()=>{
 const now=new Date('2026-07-13T13:00:00Z'), p=[...makeHours('2026-07-13',79),...makeHours('2026-07-14',79)];
 assert.equal(E.reducePeriods(p,'2026-07-11T09:00:00Z',now).status,'STALE');
 assert.equal(E.reducePeriods([...makeHours('2026-07-13',79,'-04:00',3),...makeHours('2026-07-14',79,'-04:00',3)],'2026-07-13T11:00:00Z',now).status,'INSUFFICIENT');
 assert.equal(E.reducePeriods([...makeHours('2026-07-13',76),...makeHours('2026-07-14',74)],'2026-07-13T11:00:00Z',now).status,'NO_STRETCH');
 assert.equal(E.tempF({temperature:24,temperatureUnit:'C'}),75.2);
 assert.equal(E.tempF({temperature:null,temperatureUnit:'F'}),null);
});
test('Location selection is an explicit Michigan city list, with no geolocation call',async()=>{
 const r=response();
 await handler({method:'GET',query:{mode:'locations'}},r);
 assert.equal(r.statusCode,200);
 assert.equal(r.body.locations.find(x=>x.id==='bay-city').name,'Bay City');
 assert.ok(r.body.locations.length>=25);
 const no=response();await handler({method:'GET',query:{site:'bogus'}},no);assert.equal(no.statusCode,400);
});
test('Prevent NWS SSRF from untrusted forecast links',()=>{
 const v=handler._test.validHourlyUrl;
 assert.equal(v('https://evil.test/gridpoints/DTX/99,88/forecast/hourly'),null);
 assert.equal(v('https://api.weather.gov@evil.test/gridpoints/DTX/99,88/forecast/hourly'),null);
 assert.equal(v('http://api.weather.gov/gridpoints/DTX/99,88/forecast/hourly'),null);
 assert.equal(v('https://api.weather.gov/alerts/active'),null);
 assert.ok(v('https://api.weather.gov/gridpoints/DTX/99,88/forecast/hourly'));
});
test('NWS endpoint confirms data age and refuses to invent a release permission',async()=>{
 const original=global.fetch;
 const base=new Date();base.setUTCDate(base.getUTCDate()+1);
 const dateA=ymdUTC(base),dateB=ymdUTC(new Date(base.getTime()+86400000));
 global.fetch=async url=>({ok:true,json:async()=>url.includes('/points/')?
  {properties:{forecastHourly:'https://api.weather.gov/gridpoints/DTX/100,99/forecast/hourly',timeZone:'America/Detroit'}}:
  {properties:{generatedAt:new Date().toISOString(),timeZone:'America/Detroit',periods:[...makeHours(dateA,79),...makeHours(dateB,80)]}}});
 try{
  const r=response();await handler({method:'GET',query:{site:'bay-city'}},r);
  assert.equal(r.statusCode,200);
  assert.equal(r.body.provider,'National Weather Service');
  assert.equal(r.body.forecastOnly,true);
  assert.equal(r.body.bloomStatus,'UNVERIFIED');
  assert.equal(r.body.nestStatus,'UNVERIFIED');
  assert.ok(['WARM_STRETCH','INSUFFICIENT'].includes(r.body.status));
  assert.equal(r.headers['X-Robots-Tag'],'noindex, nofollow');
 }finally{global.fetch=original;}
});
test('Upstream failure returns 503 and never a favorable readiness result',async()=>{
 const original=global.fetch;global.fetch=async()=>({ok:false,status:503});
 try{const r=response();await handler({method:'GET',query:{site:'bay-city'}},r);
  assert.equal(r.statusCode,503);assert.equal(r.body.scope,'no-weather-claim');
  assert.ok(!('daily' in r.body));}finally{global.fetch=original;}
});
