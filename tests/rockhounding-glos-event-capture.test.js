'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {capture,readArgs}=require('../scripts/rockhounding/rolling-glos-spotter-events.cjs');
const from='2026-10-14T00:16:01Z',H=3600000;
const csv=()=>{
 const lines=['time,longitude,latitude,sea_surface_wave_significant_height,sea_surface_wave_from_direction,sea_surface_wave_mean_period',
 'UTC,degrees_east,degrees_north,m,"\\u00b0",s'];
 for(let i=0;i<22;i++){
  const time=new Date(Date.parse(from)+i*H).toISOString().replace('.000Z','Z');
  lines.push([time,-86.00379943847656,46.69567108154297,i<9?1.5:.5,329.1,4.3].join(','));
 }
 return lines.join('\n');
};
const now='2026-10-15T00:00:00.000Z';
test('rolling source capture retains true observed wave episodes and separately recorded active NWS warnings',async()=>{
 const f=async()=>({ok:true,text:async()=>csv()});
 const h=async()=>({status:'ACTIVE',alerts:[{event:'Gale Warning',severity:'Severe',ends:'2026-10-15T08:00:00Z'}]});
 const a=await capture({nowISO:now,fetchFn:f,hazardsFn:h});
 assert.equal(a.report.sourceRecordCount,22);
 assert.equal(a.report.eventCount,1);
 assert.equal(a.report.qualifiedDistinctEvents,1);
 assert.equal(a.report.hazardSnapshot.status,'ACTIVE');
 assert.equal(a.report.hazardSnapshot.matchedAlertEvents[0].event,'Gale Warning');
 assert.equal(a.ledger.records[0].source,'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE');
 assert.equal(a.report.measuredBeachBreakingWaveHeightM,null);
 assert.equal(a.report.canPublishRockhoundingWindow,false);
 assert.equal(a.report.canClaimHazardFreeVisit,false);
 const b=await capture({previous:a.ledger,nowISO:now,fetchFn:f,hazardsFn:h});
 assert.equal(b.ledger.diagnostics.added,0);
 assert.equal(b.ledger.records.length,a.ledger.records.length);
});
test('three empty NWS feeds or network errors are not interpreted as safe',async()=>{
 const a=await capture({nowISO:now,fetchFn:async()=>({ok:true,text:async()=>csv()}),
  hazardsFn:async()=>{throw Error('NWS API unavailable')}});
 assert.equal(a.report.hazardSnapshot.status,'UNKNOWN');
 assert.equal(a.report.canClaimHazardFreeVisit,false);
 assert.equal(a.report.eventCount,1);
});
test('failed GLOS fetch cannot update the research ledger; invalid timestamp arguments reject',async()=>{
 await assert.rejects(()=>capture({nowISO:now,fetchFn:async()=>({ok:false,status:429})}),/unavailable/);
 await assert.rejects(()=>capture({nowISO:'not-a-time'}),/clock/);
 assert.throws(()=>readArgs(['--ledger','a.json']),/Missing/);
 assert.deepEqual(readArgs(['--ledger','x.json','--report','y.json']),{'--ledger':'x.json','--report':'y.json'});
});
