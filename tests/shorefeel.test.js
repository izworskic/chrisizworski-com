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
 assert.equal(bad.state,'limited');assert.match(bad.water,/No recent measurement/);assert.match(bad.water,/will not guess from the whole-lake average/);
 const family=comfort('family',58,{tempF:76,windMph:10,summary:'Mostly Sunny'});
 assert.match(family.decision,/Children/);assert.match(family.water,/cold/);
 const paddle=comfort('paddle',56,{tempF:84,windMph:20,summary:'Sunny'});
 assert.match(paddle.decision,/immersion/);assert.equal(paddle.band,'cold-shock');
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


test('NOAA GLSEA ACSPO request is a small box with an index time range, never a single land pixel',()=>{
 // The earlier single-pixel request (44.795837,-85.610003) snapped onto the land mask and
 // returned NaN every day, so Traverse City never got a bay reading. The API now asks for
 // a small box around each destination's cells and the engine picks the nearest valid
 // water pixel. This assertion was rewritten for that reason.
 const fs=require('node:fs'),path=require('node:path');
 const api=fs.readFileSync(path.resolve(__dirname,'../api/shorefeel.js'),'utf8');
 assert.ok(api.includes('sst[last-3:1:last]'));
 assert.ok(!api.includes('sst[(last-6):1:(last)]'),'ERDDAP (last-6) is axis-value offset (seconds for time), NOT the last daily observations');
 assert.ok(!api.includes('[(44.795837)][(-85.610003)]'),'single land-masked pixel request must not return');
 const tc=DESTINATIONS['traverse-city'];
 assert.equal(tc.cells.length,2);
 assert.ok(tc.cells.every(c=>c.maxKm<=4));
});

test('grid box: nearest VALID water pixel wins, NaN land mask and far pixels are ignored',()=>{
 const {parseGLSEAGridCsv,waterEvidence}=require('../lib/shorefeel/engine.js');
 const now=new Date('2026-10-13T20:00:00Z');
 const csv=['time,latitude,longitude,sst','UTC,degrees_north,degrees_east,degree_C',
  '2026-10-12T12:00:00Z,44.7895,-85.6084,NaN',      // land-masked pixel the old code requested
  '2026-10-12T12:00:00Z,44.8036,-85.6224,15.9',     // West Bay water
  '2026-10-11T12:00:00Z,44.8036,-85.6224,16.4',     // older day for the same pixel: ignored
  '2026-10-12T12:00:00Z,44.7615,-85.5664,16.1',     // East Bay water
  '2026-10-12T12:00:00Z,45.1000,-85.6000,14.0'].join('\n'); // far away
 const tc=DESTINATIONS['traverse-city'];
 const cells=parseGLSEAGridCsv(csv,tc.cells,now);
 assert.equal(cells['west-bay'].tempF,60.6);assert.equal(cells['west-bay'].observedAt,'2026-10-12T12:00:00.000Z');
 assert.equal(cells['east-bay'].tempF,61);
 const w=waterEvidence(tc,null,cells);
 assert.equal(w.kind,'satellite');assert.equal(w.cellKey,'west-bay');assert.match(w.caveat,/not a beach thermometer/);
 assert.ok(w.distanceKm>3&&w.distanceKm<5,'distance is measured from Clinch Park, got '+w.distanceKm);
 const b=waterEvidence(tc,{tempF:58.1,observedAt:'2026-10-13T19:30:00.000Z',ageHours:0.5},cells);
 assert.equal(b.kind,'buoy');assert.equal(b.tempF,58.1);
 assert.equal(waterEvidence(tc,null,parseGLSEAGridCsv(csv,tc.cells,new Date('2026-10-20T20:00:00Z'))),null,'stale pixels never become a reading');
 assert.equal(waterEvidence(tc,null,parseGLSEAGridCsv('<html>Access Denied</html>',tc.cells,now)),null);
});

test('comfort uses the best water evidence, names its source, and never the whole-lake mean',()=>{
 const {comfort,waterBand,nowPeriod,parseLongTermAverage}=require('../lib/shorefeel/engine.js');
 const sat={kind:'satellite',tempF:60.6,label:'West Grand Traverse Bay, 4 km north of Clinch Park',where:'Grand Traverse Bay'};
 const c=comfort('swim',sat,{tempF:56,windMph:5,summary:'Patchy Fog'});
 assert.equal(c.state,'contextual');assert.equal(c.band,'cold');
 assert.match(c.water,/60\.6°F at West Grand Traverse Bay/);
 assert.match(c.after,/56°F air and 5 mph wind/);
 assert.equal(waterBand(59.9).key,'cold-shock');assert.equal(waterBand(70).key,'cool');assert.equal(waterBand(77).key,'warm');assert.equal(waterBand(null),null);
 const periods=[{startsAt:'2026-10-13T20:00:00-04:00',daylight:false},{startsAt:'2026-10-13T21:00:00-04:00',daylight:false},{startsAt:'2026-10-14T08:00:00-04:00',daylight:true}];
 assert.equal(nowPeriod(periods,new Date('2026-10-14T01:30:00Z')).startsAt,'2026-10-13T21:00:00-04:00','now is the hour containing now, not the first daylight hour');
 const lt=parseLongTermAverage('lake,dayOfYear,temperature\n,count,degrees_C\ne,285,16.5978\nm,285,13.9243\ns,285,10.1922');
 assert.equal(lt.michigan,57.1);assert.equal(lt.erie,61.9);assert.equal(lt.huron,undefined);
});
