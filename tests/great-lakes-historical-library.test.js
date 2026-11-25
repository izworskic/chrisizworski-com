'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const lib=require('../lib/great-lakes-historical-library.cjs');
const plan=require('../data/freighter-history/pilot-2025.json');
const date=plan.dates[0],sha='a'.repeat(64),header='MMSI,BaseDateTime,LAT,LON,SOG,COG,Heading,VesselType,Length';
const deps={parseCsvLine:s=>s.split(','),noaaUtc:s=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s)?new Date(s).toISOString():null};
const day=()=>{const d=lib.createLibraryDay({date,regions:plan.regions,archiveSha256:sha,...deps});d.accept(header);return d};
const row=(sec=0,lat=46.5,lon=-84.35,type=70,speed='12',mmsi='366904910',d=date)=>[mmsi,d+'T12:00:'+String(sec).padStart(2,'0')+'Z',lat,lon,speed,90,91,type,230].join(',');
test('official 2025 aliases and order are checked, not guessed',()=>{
 assert.equal(lib.columns(header.split(',')).lat,2);
 assert.equal(lib.columns('mmsi,base_date_time,longitude,latitude,sog,cog,heading,vessel_type,vessel_length'.split(',')).lat,3);
 assert.throws(()=>lib.columns(header.replace('SOG','speed').split(',')),/Missing/);
});
test('one scan groups separate waterways, excludes other classes and retains unknown speed',()=>{
 const d=day();
 for(const r of [row(),row(1,41.49,-81.70,80,''),row(2,46.5,-84.35,52),row(3,46.5,-84.35,''),row(4,46.5,-84.35,70,'102.2'),row(5,46.5,-84.35,70,'0'),row(6,46.5,-84.35,70,12,'bad')])d.accept(r);
 const result=d.finish(),soo=result.regions.find(r=>r.id==='soo'),c=result.regions.find(r=>r.id==='cuyahoga');
 assert.equal(soo.points,3);assert.equal(soo.unknownTypeRows,1);assert.equal(soo.outsideCohortRows,1);assert.equal(soo.invalidIdentityTime,1);
 assert.equal(soo.tracks[0].points[1][3],null);assert.equal(soo.tracks[0].points[2][3],0);
 assert.equal(c.points,1);assert.equal(c.unknownSpeed,1);assert.equal(result.forecastEnabled,false);
});
test('duplicate conflicts are not selected by feed order; wrong day and empty coordinates fail closed',()=>{
 const d=day();d.accept(row());d.accept(row());d.accept(row(0,46.51));d.accept(row(1));d.accept(row(2,46.5,-84.35,70,12,'366904910','2025-06-16'));d.accept(row(3,'',-84.35));
 const r=d.finish(),s=r.regions.find(r=>r.id==='soo');
 assert.equal(s.points,1);assert.equal(s.duplicates,1);assert.equal(s.conflictingTimestamps,1);assert.equal(s.invalidIdentityTime,1);assert.equal(r.invalidPositionRows,1);
});
test('missing dates and empty coverage cannot become zero traffic or calibrated passage data',()=>{
 const d=day();d.accept(row());const result=d.finish(),s=lib.summarize([result],plan);
 assert.equal(s.state,'PARTIAL');assert.equal(s.missingDates.length,2);assert.equal(s.forecastEnabled,false);
 assert.equal(s.regions.find(r=>r.id==='montreal').days[0].state,'NO_QUALIFYING_REPORTS_NOT_ABSENCE');
 assert.throws(()=>lib.summarize([result,result],plan),/repeated/);
});
