'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const registry=require('../data/rockhounding/lake-superior-regional-water-level-sources.json');
const {validateConfig,sourceURL,decodeGaugeData,summarizeGauge,lakeLevelContext}=
 require('../lib/rockhounding/noaa-regional-water-level.cjs');
const {waveEvolution,pictureFreeReport}=
 require('../lib/rockhounding/photo-free-poststorm.cjs');
const {capture}=require('../scripts/rockhounding/capture-photo-free-poststorm.cjs');
const now='2026-10-15T15:00:00.000Z',T=Date.parse(now),H=3600000;
function gauge(id,vals=70,{flags='0,0,0,0',q='p'}={}){
 const st=registry.stations.find(x=>x.id===id);
 const data=Array.from({length:vals},(_,i)=>{
  const t=new Date(T-(vals-1-i)*6*60000).toISOString().slice(0,16).replace('T',' ');
  return {t,v:(183.4+i*.001).toFixed(3),s:'0.003',f:flags,q};
 });
 return {metadata:{id,name:st.name,lat:String(st.lat),lon:String(st.lon)},data};
}
function rowsForWave({stale=false,renew=false}={}){
 const base=T-(stale?96:24)*H;
 const records=Array.from({length:49},(_,i)=>{
  const t=new Date(base+i*H/2).toISOString().replace('.000Z','Z');
  const h=i===5?2.0:(i>35?(renew?1.5:.8):.75);
  return {time:t,waveHeightM:h,waveFromDeg:329,meanPeriodS:4.5,
    source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
    lat:46.695671,lon:-86.003799};
 });
 return {stationId:'SPOT-1361',originalObservationsOnly:true,records};
}
test('NOAA Great Lakes CO-OPS source preserves correct station, UTC, IGLD datum and public measurement units',()=>{
 assert.equal(validateConfig(),true);
 const u=sourceURL('9099018',{startISO:'2026-10-12T12:00:00Z',endISO:now});
 assert.ok(u.startsWith('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?'));
 assert.match(u,/station=9099018/);assert.match(u,/datum=IGLD/);
 assert.match(u,/product=water_level/);assert.match(u,/time_zone=gmt/);
 assert.match(u,/units=metric/);
 assert.throws(()=>sourceURL('GRMM4',{startISO:'2026-10-12T12:00:00Z',endISO:now}),/Unregistered/);
 assert.throws(()=>sourceURL('9099004',{startISO:'2026-10-01T00:00:00Z',endISO:now}),/0-96 hours/);
});
test('preliminary observations are clearly distinguished and only actual QC flagged water level rows discarded',()=>{
 const x=gauge('9099018');
 x.data[1].f='1,0,0,0'; // the first flag is a sample-count, not a flat/rate sensor warning
 x.data[2].f='0,0,1,0'; // NOAA rate-of-change flag, reject
 x.data[3].q='x';
 const parsed=decodeGaugeData(x,'9099018');
 assert.equal(parsed.rawRows,70);
 assert.equal(parsed.accepted.length,68);
 assert.equal(parsed.rejectedRows,2);
 assert.equal(parsed.accepted[0].quality,'PRELIMINARY');
 assert.equal(parsed.accepted[1].elevationIGLD85M,183.401);
 assert.equal(parsed.canClaimBeachSafe,false);
 assert.throws(()=>decodeGaugeData({...x,metadata:{...x.metadata,id:'9099004'}},'9099018'),/sensor/);
 assert.throws(()=>decodeGaugeData({error:{message:'Invalid station'}},'9099018'),/sensor/);
});
test('independent regional gauge spread over six hours is contextual, not Grand Marais waterline',()=>{
 const a=decodeGaugeData(gauge('9099018'),'9099018');
 const b=decodeGaugeData(gauge('9099004'),'9099004');
 const context=lakeLevelContext([a,b],{nowISO:now});
 assert.equal(context.state,'TWO_REGIONAL_STATIONS_OBSERVED_NOT_BEACH_STAGE');
 assert.equal(context.hasCompleteRegionalObservations,true);
 assert.equal(context.stations[0].recordCount,61);
 assert.equal(context.stations[0].observedRangeM,.06);
 assert.equal(context.stations[0].latestMeasuredIGLD85M,183.469);
 assert.equal(context.regionalNotBeachStage,true);
 assert.equal(context.canCalculateStormSeicheArrivalAtAgate,false);
 assert.equal(context.canPredictExposedAgates,false);
 assert.equal(context.canClaimBeachSafe,false);
});
test('one stale, gappy or unavailable gauge must prevent a falsely confident level report',()=>{
 const fresh=decodeGaugeData(gauge('9099018'),'9099018');
 const unavailable={station:'9099004',accepted:[],rejectedRows:0};
 const out=lakeLevelContext([fresh,unavailable],{nowISO:now});
 assert.equal(out.hasCompleteRegionalObservations,false);
 assert.equal(out.state,'REGIONAL_SOURCE_STALE_OR_INCOMPLETE');
 assert.equal(out.stations[1].dataStatus,'UNAVAILABLE');
 assert.equal(out.canClaimBeachSafe,false);
});
test('a measured offshore decline can be reported only with fresh sustained 6h readings',()=>{
 const wave=waveEvolution(rowsForWave(),{nowISO:now});
 assert.equal(wave.status,'MEASURED_OFFSHORE_WAVES_EASING');
 assert.equal(wave.sustainedDrop,true);
 assert.equal(wave.peak36hM,2);
 assert.equal(wave.latestSignificantWaveM,.8);
 assert.equal(wave.shoreNormalNotCurrentlySurveyed,true);
 assert.equal(wave.canClaimNewAgates,false);
 assert.equal(wave.canRecommendVisit,false);
 const renewed=waveEvolution(rowsForWave({renew:true}),{nowISO:now});
 assert.equal(renewed.sustainedDrop,false);
 assert.equal(renewed.status,'MEASURED_OFFSHORE_ACTIVITY_NOT_SUSTAINABLY_EASING');
 const old=waveEvolution(rowsForWave({stale:true}),{nowISO:now});
 assert.equal(old.status,'NO_RECENT_WAVE_OBSERVATIONS');
 assert.equal(old.canClaimSafeShore,false);
});
test('active NWS alerts outrank all observation easing, while no alert is never an all-clear',()=>{
 const regional=lakeLevelContext(['9099018','9099004'].map(id=>decodeGaugeData(gauge(id),id)),{nowISO:now});
 const base={waveLedger:rowsForWave(),regionalWaterLevels:regional,nowISO:now};
 const alert=pictureFreeReport({...base,nwsHazards:{status:'ACTIVE',alerts:[{event:'Gale Warning'}]}});
 assert.equal(alert.state,'NWS_ALERTS_ACTIVE');assert.equal(alert.nwsAlertEvents[0],'Gale Warning');
 assert.equal(alert.canRecommendVisit,false);assert.equal(alert.canClaimSafeShore,false);
 const unknown=pictureFreeReport({...base,nwsHazards:{status:'UNKNOWN'}});
 assert.equal(unknown.state,'NWS_HAZARDS_UNKNOWN');
 const observed=pictureFreeReport({...base,nwsHazards:{status:'CLEAR'}});
 assert.equal(observed.state,'MEASURED_OFFSHORE_WAVE_EASING_RESEARCH_ONLY');
 assert.equal(observed.activityNotRockProbability,true);
 assert.equal(observed.regionalSeicheCouldPersistAfterWavesEase,true);
 assert.equal(observed.canClaimNewAgates,false);
});
test('original NOAAs can be retrieved once and recorded without any image or user query',async()=>{
 let calls=0;
 const r=await capture({waveLedger:rowsForWave(),nowISO:now,
  fetchFn:async url=>{
   calls++;const id=new URL(url).searchParams.get('station');
   return {ok:true,status:200,text:async()=>JSON.stringify(gauge(id))};
  },
  hazardsFn:async()=>({status:'CLEAR',alerts:[]})});
 assert.equal(calls,2);
 assert.equal(r.noaaSourceAudit.length,2);
 assert.ok(r.noaaSourceAudit.every(x=>x.sourceResult==='ORIGINAL_OBSERVATIONS'&&
  /^[0-9a-f]{64}$/.test(x.sha256)));
 assert.equal(r.noPhotosOrSatelliteRequired,true);
 assert.equal(r.paidApiKeysRequired,false);
 assert.equal(r.state,'MEASURED_OFFSHORE_WAVE_EASING_RESEARCH_ONLY');
 assert.equal(r.canRecommendVisit,false);
});
test('source outages and NOAA station ID mismatch become unavailable, not measured calm or no hazard',async()=>{
 const r=await capture({waveLedger:rowsForWave(),nowISO:now,
  fetchFn:async url=>({ok:true,text:async()=>JSON.stringify(gauge('9099018'))}),
  hazardsFn:async()=>{throw Error('NWS offline')}});
 assert.equal(r.nwsHazardStatus,'UNKNOWN');
 assert.equal(r.noaaSourceAudit[1].sourceResult,'UNAVAILABLE');
 assert.equal(r.regionalLakeLevelContext.hasCompleteRegionalObservations,false);
 assert.equal(r.canClaimSafeShore,false);
});
