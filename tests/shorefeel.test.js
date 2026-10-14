'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {parseGLSEA,lakeSeries,parseNDBC,weatherPeriods,comfort,bestWeatherWindow,DESTINATIONS}=require('../lib/shorefeel/engine.js');
test('GLSEA: five lake columns, daily ordinal and 30-point trend preserve source truth',()=>{
 const raw='Year Day Sup Mich Huron Erie Ont StClr\n2026 283 12.65 16.66 14.86 18.27 16.25 16.67\n2026 284 12.77 16.66 14.88 18.30 16.23 16.74\n2026 285 12.78 16.72 14.93 18.36 16.25 16.85';
 const rows=parseGLSEA(raw,new Date('2026-10-13T15:00:00Z'));
 assert.equal(rows.length,3);assert.equal(rows[2].date,'2026-10-12');
 assert.equal(lakeSeries(rows,'michigan',new Date('2026-10-13T15:00:00Z')).latest.tempF,62.1);
 assert.equal(lakeSeries(rows,'erie',new Date('2026-10-13T15:00:00Z')).latest.tempF,65);
 assert.equal(lakeSeries(rows,'invalid'),null);
 assert.equal(lakeSeries(rows,'michigan',new Date('2026-10-20T12:00:00Z')).status,'stale');
});
test('future, malformed and physically implausible NOAA values are never presented as current',()=>{
 const rows=parseGLSEA('2026 285 999 15 10 18 12 13\n2026 999 10 12 15 17 11 14\n2027 001 20 22 20 20 20 20',new Date('2026-10-13T00:00:00Z'));
 assert.equal(rows.length,1);assert.equal(rows[0].values.superior,null);assert.equal(rows[0].values.michigan,59);
});
test('NDBC observation parsing checks WTMP column and refuses stale or placeholder values',()=>{
 const raw='#YY MM DD hh mm WDIR WSPD GST WVHT WTMP\n#yr mo dy hr mn degT m/s m/s m m\n2026 10 13 12 30 250 4 5 1 15.2\n2026 10 12 22 30 270 7 9 3 18.4';
 const now=new Date('2026-10-13T13:00:00Z');const recent=parseNDBC(raw,now);
 assert.equal(recent.tempF,59.4);assert.equal(recent.observedAt,'2026-10-13T12:30:00.000Z');
 assert.equal(parseNDBC(raw,new Date('2026-10-14T13:00:00Z')),null);
 assert.equal(parseNDBC('#YY MM DD hh mm WTMP\n2026 10 13 12 30 999',now),null);
});
test('no fresh local station means no imaginary local water-feel certainty',()=>{
 const bad=comfort('swim',null,{tempF:80,windMph:17,summary:'Sunny'});
 assert.equal(bad.state,'limited');assert.match(bad.water,/No recent destination-relevant/);
 const family=comfort('family',58,{tempF:76,windMph:10,summary:'Mostly Sunny'});
 assert.match(family.decision,/Children/);assert.match(family.water,/cold/);
 const paddle=comfort('paddle',56,{tempF:84,windMph:20,summary:'Sunny'});
 assert.match(paddle.decision,/protective gear/);
});
test('weather-only best window excludes unsupported/non-daylight or hazard assertions',()=>{
 const p=weatherPeriods([{startTime:'2026-07-20T09:00:00-04:00',temperature:72,temperatureUnit:'F',windSpeed:'10 to 13 mph',shortForecast:'Sunny',isDaytime:true,probabilityOfPrecipitation:{value:0}}]);
 assert.equal(p[0].windMph,13);
 assert.match(bestWeatherWindow(p,'relax').reason,/NOT a swim-safety/);
 assert.equal(bestWeatherWindow([{...p[0],daylight:false}],'swim'),null);
});
test('destination station identity and geographic caveats differ',()=>{
 assert.equal(DESTINATIONS['grand-haven'].station,'45029');
 assert.equal(DESTINATIONS['traverse-city'].station,'45020');
 assert.match(DESTINATIONS['traverse-city'].stationCaveat,/Grand Traverse Bay/);
});

test('ERDDAP secondary NOAA CSV parses named five-lake columns and rejects blocked HTML',()=>{
 const {parseGLSEACsv}=require('../lib/shorefeel/engine.js');
 const csv='Year,Day,Sup,Mich,Huron,Erie,Ont\n,,degree_C,degree_C,degree_C,degree_C,degree_C\n2026,285,12.78,16.72,14.93,18.36,16.25';
 const rows=parseGLSEACsv(csv,new Date('2026-10-13T11:00:00Z'));
 assert.equal(rows.length,1);
 assert.equal(lakeSeries(rows,'michigan',new Date('2026-10-13T11:00:00Z')).latest.tempF,62.1);
 assert.equal(parseGLSEACsv('<html><title>Access denied</title></html>').length,0);
});
test('published NOAA fallback is date-stamped, self-expiring, and never a claimed bay temperature',()=>{
 const json=require('../data/shorefeel/last-verified-noaa-glsea.json');
 const {parseGLSEA}=require('../lib/shorefeel/engine.js');
 const raw=json.observations.join('\n');
 const recent=lakeSeries(parseGLSEA(raw,new Date('2026-10-13T12:00:00Z')),'michigan',new Date('2026-10-13T12:00:00Z'));
 assert.equal(recent.status,'recent');assert.equal(recent.latest.tempF,62.1);
 const stale=lakeSeries(parseGLSEA(raw,new Date('2026-10-20T12:00:00Z')),'michigan',new Date('2026-10-20T12:00:00Z'));
 assert.equal(stale.status,'stale');
});


test('NOAA ACSPO bay pixel: source coordinate, Celsius, recency and unavailable gates',()=>{
 const {parseGLSEABayGridCsv}=require('../lib/shorefeel/engine.js');
 const q={lat:44.795837,lon:-85.610003},now=new Date('2026-10-13T20:00:00Z');
 const csv='time,latitude,longitude,sst\nUTC,degrees_north,degrees_east,degree_C\n2026-10-11T12:00:00Z,44.792,-85.606,16.5';
 const s=parseGLSEABayGridCsv(csv,q,now);
 assert.equal(s.tempF,61.7);
 assert.equal(s.observedAt,'2026-10-11T12:00:00.000Z');
 assert.equal(parseGLSEABayGridCsv(csv,q,new Date('2026-10-17T20:00:00Z')),null);
 assert.equal(parseGLSEABayGridCsv(csv,{lat:45.2,lon:-85.6},now),null);
 assert.equal(parseGLSEABayGridCsv('<html><h1>Access Denied by Anubis</h1></html>',q,now),null);
 assert.equal(parseGLSEABayGridCsv('time,latitude,longitude,sst\nUTC,degrees_north,degrees_east,degree_C\n2026-10-12T12:00:00Z,44.792,-85.606,-99999',q,now),null);
 assert.equal(parseGLSEABayGridCsv('time,latitude,longitude,sst\nUTC,degrees_north,degrees_east,degree_C\n2026-10-15T12:00:00Z,44.792,-85.606,22',q,now),null);
});
