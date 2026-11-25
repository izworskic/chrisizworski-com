'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let mod;
before(async () => { mod = await import('../scripts/cuyahoga-noaa-points.mjs'); });
const select = () => mod.createCollector({name:'SUNNANVIK',imo:'7633375',from:'2025-06-20T00:00:00Z',to:'2025-06-21T00:00:00Z'});
const record = (time='2025-06-20T06:00:00',lon=-81.71,lat=41.49,name='SUNNANVIK',imo='IMO7633375') => [316018180,time,lon,lat,5.2,100,100,name,imo,'CALL',70].join(',');
test('NOAA 2025 lower snake_case and older upper/camel case columns resolve exactly',()=>{
 assert.deepEqual(mod.columnPositions('mmsi,base_date_time,longitude,latitude,sog,cog,heading,vessel_name,imo'),{mmsi:0,basedatetime:1,longitude:2,latitude:3,vesselname:7,imo:8});
 assert.deepEqual(mod.columnPositions('MMSI,BaseDateTime,LAT,LON,SOG,COG,Heading,VesselName,IMO'),{mmsi:0,basedatetime:1,longitude:3,latitude:2,vesselname:7,imo:8});
 assert.throws(()=>mod.columnPositions('mmsi,time,latitude,longitude,vessel_name,imo'),/basedatetime/);
});
test('UTC normalization is explicit and impossible dates are rejected',()=>{
 assert.equal(mod.noaaUtc('2025-06-20T06:00:00'),'2025-06-20T06:00:00.000Z');
 assert.equal(mod.noaaUtc('2025-06-20 06:00:00'),'2025-06-20T06:00:00.000Z');
 assert.equal(mod.noaaUtc('2025-02-30T01:00:00'),null);
 assert.equal(mod.noaaUtc('2025-06-20T06:00:00-04:00'),null);
});
test('quoted vessel name and commas do not shift columns',()=>{
 assert.deepEqual(mod.parseCsvLine('316018180,"2025-06-20T06:00:00","SUNNANVIK, II","IMO7633375"'),['316018180','2025-06-20T06:00:00','SUNNANVIK, II','IMO7633375']);
 assert.deepEqual(mod.parseCsvLine('"A""B",test'),['A"B','test']);
});
test('documented incident candidate preserves broadcast positions and refuses ETA', async()=>{
 const collector=select();
 await mod.scanNoaaRows([
  'mmsi,base_date_time,longitude,latitude,sog,cog,heading,vessel_name,imo,vessel_type,status',
  record('2025-06-20T06:00:00'),
  record('2025-06-20T06:01:00',-81.709,41.492),
  record('2025-06-20T06:25:00',-81.707,41.493),
  record('2025-06-20T06:25:00',-81.707,41.493),
  record('2025-06-20T08:00:00',-81.705,41.494),
  record('2025-06-20T08:30:00',-82,41.493),
  record('2025-06-19T23:59:00'),
  record('2025-06-20T06:05:00',-81.707,41.49,'OTHER','IMO7654321'),
 ] , collector);
 const result = collector.result();
 assert.equal(result.stats.lines,8);
 assert.equal(result.stats.matchedIdentity,7);
 assert.equal(result.stats.matchedTimeAndBox,5);
 assert.equal(result.stats.outsideResearchBox,1);
 assert.equal(result.stats.invalidPosition,0);
 assert.equal(result.tracks.length,1);
 assert.equal(result.audit.tracks[0].validUniquePoints,4);
 assert.equal(result.audit.tracks[0].maxGapMinutes,95);
 assert.equal(result.audit.assessment,'BRIDGE_ETA_NOT_VALIDATED');
 assert.equal(result.audit.tracks[0].bridgeEtaValidated,false);
});
test('blank and unrelated records are not fabricated as coverage or ship absence',async()=>{
 const collector=select();
 await mod.scanNoaaRows(['MMSI,BaseDateTime,LAT,LON,SOG,COG,Heading,VesselName,IMO', '987654321,2025-06-20T06:00:00,41.5,-81.7,1,22,22,OTHER,IMO7654321'],collector);
 assert.deepEqual(collector.result().tracks,[]);
 assert.equal(collector.stats.matchedTimeAndBox,0);
});
