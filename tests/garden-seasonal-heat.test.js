'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/garden-seasonal-heat.js');
function response(){return{statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(x){this.body=x;return this;}};}
function yesterday(){
 const d=new Date(Date.now()-24*3600000);
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
function provider(loc){return{schema:'seasonal-heat-v1',provider:'USA National Phenology Network',status:'AVAILABLE',
 asOfDate:yesterday(),location:{latitude:loc.lat,longitude:loc.lon},totalGdd50F:2805.3,
 comparison:{anomalyGdd50F:237.4,referencePeriod:'1991-2020'},modelNotObservation:true,
 weekChangeGdd50F:87.4};}
test('reject out-of-state ZIP and arbitrary city before network',async()=>{
 const invalid=response();await handler({method:'GET',query:{zip:'90210',site:'bay-city'}},invalid);
 assert.equal(invalid.statusCode,400);assert.equal(invalid.body.code,'INVALID_ZIP');
 const unknown=response();await handler({method:'GET',query:{site:'nowhere'}},unknown);
 assert.equal(unknown.statusCode,400);
});
test('ZIP exact match is used for official phenology grid without city-centre fallback',async()=>{
 const old=global.fetch,calls=[];
 try{
 global.fetch=async url=>{
  calls.push(String(url));
  if(String(url).includes('tigerweb.geo.census.gov'))return{ok:true,json:async()=>({features:[{attributes:{ZCTA5:'48706',INTPTLAT:'+43.6038047',INTPTLON:'-83.9554112'}}]})};
  const u=new URL(url);
  assert.equal(u.hostname,'phenology.chrisizworski.com');
  assert.equal(u.pathname,'/api/seasonal-heat');
  assert.equal(u.searchParams.get('lat'),'43.6038');
  assert.equal(u.searchParams.get('lon'),'-83.9554');
  return {ok:true,json:async()=>provider({lat:43.6038,lon:-83.9554})};
 };
 const r=response();await handler({method:'GET',query:{zip:'48706',site:'detroit'}},r);
 assert.equal(r.statusCode,200);assert.equal(r.body.site.id,'zip:48706');assert.equal(r.body.site.zip,'48706');
 assert.equal(r.body.provider,'USA National Phenology Network');assert.equal(r.body.totalGdd50F,2805.3);
 assert.equal(r.body.consumerScope,'seasonal-context-only');assert.equal(calls.length,2);
 }finally{global.fetch=old;}
});
test('NPN city reference and upstream invalid schema fail independently',async()=>{
 const old=global.fetch;
 try{
  global.fetch=async url=>{
   const u=new URL(url);
   assert.equal(u.hostname,'phenology.chrisizworski.com');
   return {ok:true,json:async()=>({...provider({lat:43.5945,lon:-83.8889}),provider:'Bogus'})};
  };
  const no=response();await handler({method:'GET',query:{site:'bay-city'}},no);
  assert.equal(no.statusCode,503);
  assert.equal(no.body.scope,'no-seasonal-claim');
 }finally{global.fetch=old;}
});
test('Census unmapped, upstream errors never pass a made-up seasonal total',async()=>{
 const old=global.fetch;
 try{
  global.fetch=async url=>({ok:true,json:async()=>({features:[]})});
  const no=response();await handler({method:'GET',query:{zip:'48707'}},no);
  assert.equal(no.statusCode,404);assert.equal(no.body.code,'ZIP_NOT_MAPPED');assert.equal(no.body.status,'UNAVAILABLE');
  global.fetch=async()=>({ok:false,status:503});
  const fail=response();await handler({method:'GET',query:{site:'bay-city'}},fail);
  assert.equal(fail.statusCode,503);assert.ok(!('totalGdd50F' in fail.body));
 }finally{global.fetch=old;}
});
