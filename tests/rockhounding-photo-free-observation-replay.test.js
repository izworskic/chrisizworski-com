'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {replayAt,checkSeason}=require('../lib/rockhounding/photo-free-observation-replay.cjs');
const {analyzeObserved}=require('../lib/rockhounding/live-photo-free-pulse.cjs');
const H=3600000,END=Date.parse('2026-10-14T12:00:00Z');
function sourceRows(){
 const rows=[];
 for(let n=336;n>=0;n--){
  const t=END-n*H/2;
  const height=n>130?1.25:n>45?1.7:.45;
  rows.push({time:new Date(t).toISOString().replace('.000Z','Z'),
   waveHeightM:height,waveFromDeg:329.11,meanPeriodS:4.1,
   source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
   lat:46.695671,lon:-86.003799});
 }
 return rows;
}
const NOW=new Date(END).toISOString();
test('replay never consults future GLOS rows or fabricates marine warnings',()=>{
 assert.equal(checkSeason(),true);
 const rows=sourceRows();
 const r=replayAt(rows,NOW);
 assert.equal(r.atUTC,NOW);
 assert.equal(r.sensorStatus,'OFFSHORE_WAVES_EASING');
 assert.equal(r.sourceCovered,true);
 assert.equal(r.comparedTwo24hSourceWindows,true);
 assert.ok(r.waveActivityChangePct<0);
 assert.equal(r.historicalNwsStatus,'NOT_BACKFILLED');
 assert.equal(r.beachMorphologyOutcome,'NOT_MEASURED');
 assert.equal(r.canClaimSafeBeach,false);
 assert.equal(r.canPredictNewAgates,false);
 assert.equal(r.canPublishCollectingWindow,false);
 const after={...rows.at(-1),time:'2026-10-14T13:00:00Z'};
 assert.throws(()=>replayAt([...rows,after],NOW),/past original/);
});
test('simulated 6h reporting outage fails closed even though older buoy waves look low',()=>{
 const cut=sourceRows().filter(r=>Date.parse(r.time)<=END-6*H);
 const r=replayAt(cut,NOW);
 assert.equal(r.sourceCovered,false);
 assert.equal(r.comparedTwo24hSourceWindows,false);
 assert.equal(r.waveActivityChangePct,null);
 assert.equal(r.canClaimSafeBeach,false);
});
test('missing a source block within the previous wave comparison disables 48h trend without inventing calm',()=>{
 const gap=sourceRows().filter(r=>{
  const t=Date.parse(r.time);
  return t<END-30*H||t>END-18*H;
 });
 const r=replayAt(gap,NOW);
 assert.equal(r.sourceCovered,true);
 assert.equal(r.comparedTwo24hSourceWindows,false);
 assert.equal(r.waveActivityChangePct,null);
 assert.equal(r.historicalNwsStatus,'NOT_BACKFILLED');
 assert.equal(r.canPredictNewAgates,false);
});
test('empty original observations are data unavailable, never a low-wave beach invitation',()=>{
 const r=replayAt([],NOW);
 assert.equal(r.sourceCovered,false);
 assert.equal(r.lastWaveHeightM,null);
 assert.equal(r.offshorePhase,'SOURCE_STALE_GAPPY_OR_UNAVAILABLE');
 assert.equal(r.canClaimSafeBeach,false);
});
test('unsafe source tampering and invalid drift of checked seasonal wave provenance is rejected',()=>{
 const fake=require('../public/rockhounding-lab/glos-season-2026-research.json');
 const altered=structuredClone(fake);altered.actualRockExposureFieldObservations=10;
 assert.throws(()=>checkSeason(altered),/provenance/);
 const future=sourceRows();future.at(-1).waveHeightM=-1;
 assert.throws(()=>replayAt(future,NOW));
});
