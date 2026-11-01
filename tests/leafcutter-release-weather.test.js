'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../lib/leafcutter-release.cjs');
const handler=require('../api/leafcutter-release-weather.js');
const Zip=require('../lib/leafcutter-zip.cjs');
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

test('Michigan ZIP is validated before any external call, never interpreted as address or free URL',async()=>{
 for(const bad of ['4870','90210','48abc','48706-1234','48706?x=1','',null,48706]){
   assert.equal(Zip.validMichiganZip(bad),false,String(bad));
   assert.equal(Zip.urlForZip(bad),null);
 }
 for(const valid of ['48706','48631','49931','48001']){
   assert.equal(Zip.validMichiganZip(valid),true,valid);
   const u=new URL(Zip.urlForZip(valid));
   assert.equal(u.hostname,'tigerweb.geo.census.gov');
   assert.equal(u.pathname.endsWith('/MapServer/1/query'),true);
   assert.equal(u.searchParams.get('where'),"ZCTA5='"+valid+"'");
   assert.equal(u.searchParams.get('returnGeometry'),'false');
 }
 const r=response();await handler({method:'GET',query:{zip:'90210',site:'bay-city'}},r);
 assert.equal(r.statusCode,400);
 assert.equal(r.body.code,'INVALID_MICHIGAN_ZIP');
 assert.equal(r.body.scope,'no-weather-claim');
});
test('Authoritative ZCTA point is exact-ZIP matched and cannot leak Wisconsin or outside Michigan',()=>{
 const attributes={ZCTA5:'48706',INTPTLAT:'+43.621534',INTPTLON:'-83.912345'};
 const parsed=Zip.parseZipResponse('48706',{features:[{attributes}]});
 assert.equal(parsed.zip,'48706');
 assert.equal(parsed.id,'zip:48706');
 assert.equal(parsed.lat,43.621534);
 assert.equal(parsed.lon,-83.912345);
 assert.equal(parsed.kind,'zcta-interior-point');
 assert.match(parsed.coordinateMeaning,/not a street address/i);
 assert.equal(Zip.parseZipResponse('48706',{features:[{attributes:{...attributes,ZCTA5:'48708'}}]}),null);
 assert.equal(Zip.parseZipResponse('48706',{features:[{attributes:{...attributes,INTPTLAT:'0'}}]}),null);
 assert.equal(Zip.parseZipResponse('48706',{features:[{attributes:{...attributes,INTPTLON:'-91'}}]}),null);
 assert.equal(Zip.parseZipResponse('48706',{features:[{attributes},{attributes}]}),null);
 assert.equal(Zip.parseZipResponse('48706',{features:[]}),null);
 assert.equal(Zip.parseZipResponse('48706',{error:{code:500}}),null);
});
test('ZIP-based API resolves Census first, then calls NWS for actual ZCTA reference point',async()=>{
 const original=global.fetch,calls=[];
 const base=new Date();base.setUTCDate(base.getUTCDate()+1);
 const day=base.toISOString().slice(0,10),next=new Date(base.getTime()+86400000).toISOString().slice(0,10);
 global.fetch=async (url,opts={})=>{
   calls.push(String(url));
   if(String(url).startsWith(Zip.BASE+'/query')){
    const u=new URL(url);assert.equal(u.searchParams.get('where'),"ZCTA5='48706'");
    assert.equal(opts.redirect,'error');
    return {ok:true,json:async()=>({features:[{attributes:{ZCTA5:'48706',INTPTLAT:'+43.6234',INTPTLON:'-83.9251'}}]})};
   }
   if(String(url).includes('/points/')){
    assert.match(url,/43\.6234,-83\.9251$/);
    return {ok:true,json:async()=>({properties:{forecastHourly:'https://api.weather.gov/gridpoints/DTX/88,99/forecast/hourly',timeZone:'America/Detroit'}})};
   }
   return {ok:true,json:async()=>({properties:{generatedAt:new Date().toISOString(),timeZone:'America/Detroit',
     periods:[...makeHours(day,77),...makeHours(next,79)]}})};
 };
 try{
  const r=response();await handler({method:'GET',query:{zip:'48706',site:'detroit'}},r);
  assert.equal(r.statusCode,200);
  assert.equal(r.body.provider,'National Weather Service');
  assert.equal(r.body.site.id,'zip:48706');
  assert.equal(r.body.site.kind,'zcta-interior-point');
  assert.equal(r.body.site.zip,'48706');
  assert.equal(r.body.site.latitude,43.6234);
  assert.equal(r.body.site.longitude,-83.9251);
  assert.match(r.body.site.geography,/2020 Census/);
  assert.match(r.body.caveats.join(' '),/not exact mail-delivery/);
  assert.equal(r.body.bloomStatus,'UNVERIFIED');
  assert.equal(r.body.forecastOnly,true);
  assert.equal(calls.length,3);
 }finally{global.fetch=original;}
});
test('Unmapped special-use or P.O. box ZIP never substitutes city forecast',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async url=>{calls.push(url);return {ok:true,json:async()=>({features:[]})};};
 try{
  const r=response();await handler({method:'GET',query:{zip:'48707',site:'bay-city'}},r);
  assert.equal(r.statusCode,404);
  assert.equal(r.body.code,'ZIP_NOT_MAPPED');
  assert.equal(r.body.scope,'no-weather-claim');
  assert.equal(calls.length,1);
 }finally{global.fetch=original;}
});
test('Census source outage fails closed without NWS weather or favorable release',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async url=>{calls.push(url);return {ok:false,status:503};};
 try{
  const r=response();await handler({method:'GET',query:{zip:'48706'}},r);
  assert.equal(r.statusCode,503);
  assert.equal(r.body.code,'CENSUS_UNAVAILABLE');
  assert.equal(r.body.scope,'no-weather-claim');
  assert.equal(calls.length,1);
 }finally{global.fetch=original;}
});
