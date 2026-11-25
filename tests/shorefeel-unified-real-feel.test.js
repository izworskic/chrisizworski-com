'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {gridUrl,decode,nearbyWater}=require('../lib/shorefeel/nearshore-noaa.js');
const {interpretShoreline}=require('../lib/shorefeel/shoreline-real-feel.js');
const {beachFeel}=require('../lib/shorefeel/beach-feel.js');
const us=require('../data/shorefeel-us-coast.json').beaches;
const ca=require('../data/shorefeel-canada-ontario.json').locations;
const {interpret:interpretUS}=require('../lib/shorefeel/us-coast.js');
const {interpret:interpretCA}=require('../lib/shorefeel/canada.js');
const now=new Date('2026-07-15T12:30:00Z'),first=us[0],ontario=ca[0];
const pixel=(beach,iso='2026-07-15T11:00:00Z',value=14)=>{
 const p=beach.reference||beach;
 return 'time,latitude,longitude,sst\nUTC,degrees_north,degrees_east,degree_C\n'+
  [iso,(p.lat+.015).toFixed(4),(p.lon+.015).toFixed(4),value].join(',')+'\n';
};
const usPeriod={startTime:'2026-07-15T12:00:00Z',endTime:'2026-07-15T13:00:00Z',
 temperature:86,temperatureUnit:'F',windSpeed:'9 mph',windDirection:'NE',
 relativeHumidity:{value:43},shortForecast:'Sunny'};
const usPoint={properties:{type:'land'}};
const usForecast={properties:{updateTime:'2026-07-15T12:00:00Z',periods:[usPeriod]}};
const ecSample={type:'Feature',geometry:{type:'Point',coordinates:[ontario.reference.lon+.025,ontario.reference.lat+.02]},
 properties:{identifier:'on-145',name:{en:'Nearby ECCC town'},lastUpdated:'2026-07-15T12:00:00Z',
 hourlyForecastGroup:{timestamp:{en:'2026-07-15T12:00:00Z'},hourlyForecasts:[{
 timestamp:'2026-07-15T12:00:00Z',temperature:{value:{en:27}},
 wind:{speed:{value:{en:16}},direction:{value:{en:'NE'}}},humidex:{value:{en:34}}
 }]}}};
const forecastCA={type:'FeatureCollection',features:[ecSample]};
test('all 46 curated U.S. and Ontario shores have a bounded NOAA request without user-controlled URLs',()=>{
 assert.equal(us.length+ca.length,46);
 for(const beach of [...us,...ca]){
  const url=gridUrl(beach);
  assert.match(url,/^https:\/\/apps\.glerl\.noaa\.gov\/erddap\/griddap\/GLSEA_ACSPO_GCS\.csv\?sst\[last-3:1:last\]/);
  assert.ok(url.length<220,beach.slug);
  assert.equal(url.includes('evil.example'),false);
 }
 assert.equal(gridUrl({reference:{lat:null,lon:-80}}),null);
});
test('NOAA water pixel must be close, source-dated, lake-only, plausible, and never a beach thermometer',()=>{
 const p=decode(pixel(first),first,now);
 assert.equal(p.kind,'satellite');
 assert.equal(p.tempF,57.2);
 assert.ok(p.distanceKm>0&&p.distanceKm<4);
 assert.match(p.scope,/not swimming-area water/);
 assert.ok(p.sourceUrl.includes('GLSEA_ACSPO_GCS'));
 assert.equal(decode(pixel(first,'2026-07-12T02:00:00Z'),first,now),null);
 assert.equal(decode(pixel(first,'2026-07-15T14:00:00Z'),first,now),null);
 assert.equal(decode(pixel(first,'2026-07-15T11:00:00Z',-50),first,now),null);
 assert.equal(decode('garbage',first,now),null);
 assert.equal(decode('x'.repeat(262145),first,now),null);
});
test('NOAA upstream failures do not suppress the official air forecast',async()=>{
 const fail=async()=>{throw Error('NOAA temporarily down')};
 assert.equal(await nearbyWater(first,now,fail),null);
 const wrong=async()=>({ok:false,status:503});
 assert.equal(await nearbyWater(first,now,wrong),null);
 const good=async()=>({ok:true,text:async()=>pixel(first)});
 const yes=await nearbyWater(first,now,good);
 assert.ok(yes&&yes.kind==='satellite');
});
test('same Saginaw engine now interprets lake breeze across U.S. and Ontario without a numeric beach correction',()=>{
 const sample=decode(pixel(first),first,now);
 const beach={lat:first.lat,lon:first.lon};
 const waterRef={lat:sample.sampleLat,lon:sample.sampleLon};
 const physics=beachFeel({startsAt:usPeriod.startTime,tempF:86,windDirection:'NE',windMph:9,humidity:43},
  sample,beach,waterRef,now,{waterBody:'Lake Superior',shoreWord:'lake'});
 assert.equal(physics.windExposure,'onshore');
 const result=interpretShoreline({weather:{startsAt:usPeriod.startTime,tempF:86,windMph:9,windDirection:'NE',humidity:43},
  water:sample,beach,lake:first.lake,provider:'NWS',apparentF:88,apparentMethod:'NWS heat index',now});
 assert.equal(result.status,'forecast-based');
 assert.equal(result.lakeEffect.status,'contextual');
 assert.equal(result.windExposure,'onshore');
 assert.equal(result.lakeEffect.label,'Possible cooling from lake wind');
 assert.ok(result.waterAirContrastF>8);
 assert.equal(result.temperatureF,88,'the provider air comfort is not silently altered by NOAA water');
 assert.equal(result.calibratedOnSand,false);
 assert.equal(result.beachAirCorrectionF,null);
 const absent=interpretShoreline({weather:{startsAt:usPeriod.startTime,tempF:86,windMph:9,windDirection:'NE',humidity:43},
  water:null,beach,lake:first.lake,provider:'NWS',apparentF:88,apparentMethod:'NWS heat index',now});
 assert.equal(absent.lakeEffect.status,'unverified');
 assert.equal(absent.waterAirContrastF,null);
});
test('NWS air index is unchanged; ECCC humidex uses only an actual published forecast value',()=>{
 const waterUS=decode(pixel(first),first,now);
 const u=interpretUS(first,usPoint,usForecast,now,waterUS);
 assert.equal(u.status,'forecast-based');
 assert.equal(u.shorelineRealFeel.temperatureF,u.feelsLikeF);
 assert.equal(u.shorelineRealFeel.lakeEffect.label,'Possible cooling from lake wind');
 const w=decode(pixel(ontario),ontario,now);
 const c=interpretCA(ontario,forecastCA,now,w);
 assert.equal(c.status,'forecast-based');
 assert.equal(c.apparentC,34);
 assert.equal(c.method,'ECCC forecast humidex');
 assert.equal(c.shorelineRealFeel.lakeEffect.status,'contextual');
 assert.equal(c.shorelineRealFeel.calibratedOnSand,false);
 assert.match(c.shorelineRealFeel.limitation,/not the water at the swimming area/);
 const noHumidex=structuredClone(forecastCA);
 delete noHumidex.features[0].properties.hourlyForecastGroup.hourlyForecasts[0].humidex;
 assert.equal(interpretCA(ontario,noHumidex,now,w).apparentC,27);
});
test('all 46 canonical detail pages are generated by the owning script, and regional explorers expose lake influence',()=>{
 const root=path.resolve(__dirname,'..');
 const gen=fs.readFileSync(path.join(root,'scripts/generate-shorefeel-details.mjs'),'utf8');
 assert.match(gen,/id="feel-lake-effect"/);
 assert.match(gen,/data-shorefeel-region/);
 const client=fs.readFileSync(path.join(root,'public/assets/shorefeel-beach-detail.js'),'utf8');
 assert.match(client,/shorelineRealFeel/);
 assert.match(client,/feel-lake-effect/);
 for(const [html,js] of [
  ['public/great-lakes-beaches/around-the-lakes/index.html','public/assets/shorefeel-us.js'],
  ['public/great-lakes-beaches/canada/index.html','public/assets/shorefeel-ca.js']]){
  assert.match(fs.readFileSync(path.join(root,html),'utf8'),/id="report-lake-effect"/);
  assert.match(fs.readFileSync(path.join(root,js),'utf8'),/shorelineRealFeel/);
 }
 assert.match(fs.readFileSync(path.join(root,'api/shorefeel-us.js'),'utf8'),/nearbyWater/);
 assert.match(fs.readFileSync(path.join(root,'api/shorefeel-ca.js'),'utf8'),/nearbyWater/);
});


test('live-route contract wires the official air forecast and NOAA into the same source-qualified real feel',async()=>{
 const usHandler=require('../api/shorefeel-us.js');
 const caHandler=require('../api/shorefeel-ca.js');
 const old=global.fetch;
 try{
  const destinations=[];
  global.fetch=async url=>{
   destinations.push(String(url));
   if(String(url).startsWith('https://apps.glerl.noaa.gov/')){
    return {ok:true,text:async()=>pixel(first)};
   }
   return {ok:true,json:async()=>String(url).includes('/points/')?{
     properties:{type:'land',forecastHourly:'https://api.weather.gov/gridpoints/DLH/31,92/forecast/hourly'}
   }:usForecast};
  };
  const usResult=await usHandler.lookup(first,now);
  assert.equal(usResult.status,'forecast-based');
  assert.equal(usResult.shorelineRealFeel.lakeEffect.status,'contextual');
  assert.equal(destinations.filter(u=>u.startsWith('https://api.weather.gov/')).length,2);
  assert.equal(destinations.filter(u=>u.startsWith('https://apps.glerl.noaa.gov/')).length,1);
  const ecCalls=[];
  global.fetch=async url=>{
   ecCalls.push(String(url));
   return String(url).startsWith('https://apps.glerl.noaa.gov/')
     ?{ok:true,text:async()=>pixel(ontario)}
     :{ok:true,json:async()=>forecastCA};
  };
  const caResult=await caHandler.lookup(ontario,now);
  assert.equal(caResult.status,'forecast-based');
  assert.equal(caResult.apparentC,34);
  assert.equal(caResult.shorelineRealFeel.lakeEffect.status,'contextual');
  assert.equal(ecCalls.filter(u=>u.startsWith('https://api.weather.gc.ca/')).length,1);
  assert.equal(ecCalls.filter(u=>u.startsWith('https://apps.glerl.noaa.gov/')).length,1);
 }finally{global.fetch=old;}
});
