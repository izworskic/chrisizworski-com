'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {registryIndex,descriptor,normalize,createReader,parseRequest,handleUnified}=require('../lib/shorefeel/unified-conditions');
const us=require('../api/shorefeel-us'),ca=require('../api/shorefeel-ca');
const now=new Date('2026-07-15T12:30:00Z');
const {registry,byKey}=registryIndex();
const grid='https://api.weather.gov/gridpoints/LOT/70,75/forecast/hourly';
const point={properties:{type:'land',forecastHourly:grid}};
const hourly={properties:{updateTime:'2026-07-15T11:30:00Z',periods:[
 {startTime:'2026-07-15T12:00:00Z',endTime:'2026-07-15T13:00:00Z',temperature:86,temperatureUnit:'F',windSpeed:'10 mph',windDirection:'NE',relativeHumidity:{value:52}},
 {startTime:'2026-07-15T13:00:00Z',endTime:'2026-07-15T14:00:00Z',temperature:88,temperatureUnit:'F',windSpeed:'10 mph',windDirection:'NE',relativeHumidity:{value:52}}
]}};
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(x){this.body=x;return x;}});
const inputs=['mi:grand-haven-state-park','epa:MI000290','ca:agawa-bay'];
function ecccFixture(beach,upcoming=false){
 const at=upcoming?'2026-07-15T13:00:00Z':'2026-07-15T12:00:00Z';
 return {features:[{geometry:{type:'Point',coordinates:[beach.reference.lon,beach.reference.lat]},
 properties:{identifier:'on-145',name:{en:'Nearby forecast town'},lastUpdated:'2026-07-15T12:00:00Z',
 hourlyForecastGroup:{timestamp:{en:'2026-07-15T12:00:00Z'},hourlyForecasts:[{timestamp:at,temperature:{value:{en:25}},humidex:{value:{en:30}},wind:{speed:{value:{en:16}},direction:{value:{en:'N'}}}}]}}}]};
}
test('all map-eligible identities have a usable official provider descriptor; aliases resolve together',()=>{
 const entries=registry.entries.filter(e=>e.mapEligible);
 assert.equal(entries.length,registry.stats.mapEntries);
 for(const e of entries){
  const d=descriptor(e);assert.ok(d,e.id);
  assert.equal(d.provider,e.country==='CA'?'ECCC':'NWS');
  assert.ok(d.provider==='NWS'?require('../lib/shorefeel/us-coast').validLocation(d.beach):require('../lib/shorefeel/canada').validBeach(d.beach),e.id);
 }
 assert.equal(byKey.get('mi:grand-haven-state-park'),byKey.get('epa:MI000340'));
 assert.equal(descriptor(byKey.get('mi:wenonah-park')),null);
 for(const query of [{id:'../../etc/passwd'},{ids:inputs.concat(['unknown','extra']).join(',')},{id:['epa:MI000290']},{id:inputs[0],beach:'x'},{id:inputs[0],ids:inputs[1]}])assert.equal(parseRequest(query,byKey),null);
});
test('mixed country map uses one shared grid fetch, no water fanout, same result format',async()=>{
 let calls=[];
 const read=createReader(async url=>{calls.push(url);return url.includes('/points/')?point:hourly;});
 const canadian=descriptor(byKey.get(inputs[2])).beach;
 const res=response();
 await handleUnified({query:{ids:inputs.join(',')}},res,{usLookup:us.lookup,nwsRead:us.nws},
 {now,nwsReader:read,ecccReader:async()=>ecccFixture(canadian),canada:ca});
 assert.equal(res.statusCode,200);assert.equal(res.body.mode,'map');
 const [a,b,c]=res.body.results;
 assert.equal(a.id,'epa:MI000340');assert.equal(b.id,'epa:MI000290');assert.equal(c.id,'ca:agawa-bay');
 assert.equal(a.provider,'NWS');assert.equal(c.provider,'ECCC');assert.equal(c.feelsLikeF,86);
 for(const row of [a,b,c]){
  assert.equal(row.status,'forecast-based');assert.equal(typeof row.feelsLikeF,'number');
  assert.equal(row.water,null);assert.deepEqual(row.hours,[]);assert.equal(row.swimStatus,'unknown');
 }
 assert.equal(calls.filter(url=>url===grid).length,1);
 assert.equal(calls.length,3);
});
test('detail preserves true hourly samples, checks provider and expiry, labels upcoming separately',async()=>{
 const entry=byKey.get(inputs[0]),d=descriptor(entry);
 const raw=await us.lookup(d.beach,now,{unified:true,includeWater:false,read:async url=>url.includes('/points/')?point:hourly});
 raw.hours=require('../lib/shorefeel/us-coast').forecastHours(hourly,now);
 const got=normalize(entry,d,raw,now,true);
 assert.equal(got.status,'forecast-based');assert.equal(got.hours.length,2);assert.equal(got.validUntil,'2026-07-15T13:00:00.000Z');
 assert.equal(got.guide,'/great-lakes-beaches/grand-haven-state-park/');
 assert.equal(normalize(entry,d,{...raw,beach:'different'},now,true).status,'unavailable');
 assert.equal(normalize(entry,d,raw,new Date('2026-07-15T15:00:00Z'),true).status,'unavailable');
 const c=byKey.get(inputs[2]),cd=descriptor(c),fixture=ecccFixture(cd.beach,true);
 const answer=await ca.lookup(cd.beach,now,{unified:true,includeWater:false,read:async()=>fixture});
 answer.hours=require('../lib/shorefeel/canada').forecastHours(cd.beach,fixture,now);
 assert.equal(normalize(c,cd,answer,now,true).status,'upcoming');
 assert.equal(answer.hours.length,1);
});
test('cache deduplicates concurrent reads, expires values and retries errors',async()=>{
 let clock=0,calls=0;
 const read=createReader(async url=>{calls++;if(url==='fail'&&calls===3)throw Error('failure');return url;},{clock:()=>clock,ttl:100,max:2});
 await Promise.all([read('a'),read('a')]);assert.equal(calls,1);
 clock=101;await read('a');assert.equal(calls,2);
 await assert.rejects(read('fail'));assert.equal(await read('fail'),'fail');assert.equal(calls,4);
});
test('a provider outage does not invent temperature or break other beaches',async()=>{
 const res=response();
 await handleUnified({query:{ids:'epa:MI000290,ca:agawa-bay'}},res,{usLookup:async()=>{throw Error('offline');},nwsRead:us.nws},
 {now,canada:ca,ecccReader:async()=>ecccFixture(descriptor(byKey.get('ca:agawa-bay')).beach)});
 assert.equal(res.body.results[0].status,'unavailable');assert.equal(res.body.results[0].feelsLikeF,null);
 assert.equal(res.body.results[1].status,'forecast-based');assert.equal(res.headers['Cache-Control'],'no-store');
 const bad=response();await handleUnified({query:{id:'unknown'}},bad,{usLookup:us.lookup,nwsRead:us.nws});
 assert.equal(bad.statusCode,400);
});
