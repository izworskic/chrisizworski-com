'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {beachFeel,apparentTemperature,offshoreBearing,breezeSector}=require('../lib/shorefeel/beach-feel.js');
const {weatherPeriods}=require('../lib/shorefeel/engine.js');

const beach={lat:43.6714,lon:-83.9068};
const inner={lat:43.702,lon:-83.858};
const now=new Date('2026-07-01T12:30:00Z');
const at=(overrides={})=>({tempF:82,windMph:12,windDirection:'NE',
 humidity:50,startsAt:'2026-07-01T12:00:00Z',...overrides});
const water=val=>({kind:'satellite',tempF:val});

test('bay wind direction is the direction the air comes from, not the direction it travels',()=>{
 const bearing=offshoreBearing(beach,inner);
 assert.ok(bearing>40&&bearing<60,'water is northeast of Bay City State Park');
 assert.equal(breezeSector('NE',bearing,12),'onshore');
 assert.equal(breezeSector('SW',bearing,12),'offshore');
 assert.equal(breezeSector('NW',bearing,12),'alongshore');
 assert.equal(breezeSector('NE',bearing,1),'unknown');
 assert.equal(breezeSector('INVALID',bearing,12),'unknown');
});

test('cool nearshore water and onshore flow identify a lake-cooling possibility, never a numeric beach air correction',()=>{
 const cold=beachFeel(at(),water(58),beach,inner,now);
 const warm=beachFeel(at(),water(79),beach,inner,now);
 assert.equal(cold.status,'forecast-based');
 assert.equal(cold.windExposure,'onshore');
 assert.equal(cold.label,'Lake-breeze cooling possible');
 assert.match(cold.note,/No exact degree correction is verified/);
 assert.equal(cold.waterAirContrastF,24);
 assert.equal(cold.apparentF,warm.apparentF,'water alone cannot change the forecast air feel value');
 assert.notEqual(cold.label,warm.label);
 assert.match(cold.limitation,/not an invented number of degrees/);
});

test('wind from inland does not make a lake-breeze cooling claim',()=>{
 const x=beachFeel(at({windDirection:'SW'}),water(40),beach,inner,now);
 assert.equal(x.windExposure,'offshore');
 assert.equal(x.label,'Wind blowing toward the bay');
 assert.doesNotMatch(x.note,/cooler than inland/);
});

test('a warmer lake in cool weather may moderate shoreline cold without inventing degrees',()=>{
 const x=beachFeel(at({tempF:40,windMph:12,humidity:55}),water(62),beach,inner,now);
 assert.equal(x.label,'Lake moderation possible');
 assert.equal(x.apparentMethod,'NWS wind chill');
 assert.ok(x.apparentF<40);
});

test('NWS heat index is humidity based and not an inferred lake water effect',()=>{
 const x=beachFeel(at({tempF:92,humidity:70}),water(63),beach,inner,now);
 assert.equal(x.apparentMethod,'NWS heat index');
 assert.ok(x.apparentF>92);
 const noHum=beachFeel(at({tempF:92,humidity:null}),water(63),beach,inner,now);
 assert.equal(noHum.apparentMethod,'NWS forecast air');
 assert.equal(noHum.apparentF,92);
 assert.equal(apparentTemperature(65,18,50).method,'NWS forecast air');
});

test('missing water and missing recent weather fail closed',()=>{
 const a=beachFeel(at({windDirection:'NE'}),null,beach,inner,now);
 assert.equal(a.status,'forecast-based');
 assert.equal(a.waterF,null);
 assert.notEqual(a.label,'Lake-breeze cooling possible');
 assert.equal(beachFeel(null,water(40),beach,inner,now).status,'unavailable');
 assert.equal(beachFeel(at({startsAt:'2026-06-30T07:00:00Z'}),water(40),beach,inner,now).status,'unavailable');
});

test('NWS parser preserves wind direction, humidity, and hourly forecast source',()=>{
 const p=weatherPeriods([{startTime:'2026-07-01T12:00:00Z',temperature:79,
  temperatureUnit:'F',windSpeed:'10 to 15 mph',windDirection:'ENE',isDaytime:true,
  relativeHumidity:{value:64},shortForecast:'Mostly Sunny'}]);
 assert.equal(p[0].windDirection,'ENE');
 assert.equal(p[0].humidity,64);
 assert.equal(p[0].windMph,15);
 assert.equal(p[0].tempF,79);
 const missing=weatherPeriods([{startTime:'2026-07-01T13:00:00Z',temperature:null,windSpeed:'Calm',relativeHumidity:{value:null}}]);
 assert.equal(missing[0].tempF,null,'no zero-degree forecast invented');
 assert.equal(missing[0].humidity,null,'no zero-humidity forecast invented');
});

test('pilot leads with beach feel while preserving separately sourced water, ads and geographic evidence',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/lake-huron-water-temperature/saginaw-bay/index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../public/assets/shorefeel-saginaw.js'),'utf8');
 const api=fs.readFileSync(path.join(__dirname,'../api/shorefeel.js'),'utf8');
 assert.match(html,/What will Saginaw Bay feel like at the beach/);
 assert.match(html,/id="lead-temp"[^>]*>Checking beach feel/);
 assert.match(html,/id="lead-wind"/);
 assert.match(html,/id="lead-water"/);
 assert.match(html,/id="lead-humidity"/);
 assert.match(html,/id="lake-influence-detail"/);
 assert.ok(html.indexOf('id="lead-temp"')<html.indexOf('id="bay-evidence"'));
 assert.ok(html.indexOf('id="bay-evidence"')<html.indexOf('id="bay-map"'));
 assert.match(api,/beachFeel:shorelineFeel/);
 assert.match(js,/payload\?\.beachFeel/);
 assert.match(html,/id="value-inner-bay"/);
 assert.match(html,/id="value-buoy"/);
 assert.match(html,/adsbygoogle\.js\?client=/);
 assert.match(html,/rel="canonical"/);
});
