'use strict';
// Independent offshore buoy skill diagnostics, never a beach or stone forecast.
// Events require real observed elevated waves on separate dates.
const HOUR=3600000;
const elevatedThresholdM=1.0;
const round=v=>Number.isFinite(v)?+v.toFixed(4):null;
const leadGroups=[
 {id:'1-6h',min:1,max:6},
 {id:'7-12h',min:7,max:12},
 {id:'13-24h',min:13,max:24}
];
const heightGroups=[
 {id:'below-0.5m',min:0,max:.5},
 {id:'0.5-to-1m',min:.5,max:1},
 {id:'at-least-1m',min:1,max:18.00001}
];
function errorSummary(rows,{minimumPairs=5}={}){
 const n=rows.length,errors=rows.map(r=>r.modelMinusObservedM);
 const stat={pairs:n,distinctDays:[...new Set(rows.map(x=>x.buoyObservedAt.slice(0,10)))].sort(),
  maeM:null,rmseM:null,meanBiasM:null,canInterpret:false,
  status:n>=minimumPairs?'DESCRIPTIVE_OFFSHORE_SAMPLE_NOT_CALIBRATED':'INSUFFICIENT_PAIRS'};
 if(n<minimumPairs)return stat;
 return {...stat,maeM:round(errors.reduce((a,b)=>a+Math.abs(b),0)/n),
  rmseM:round(Math.sqrt(errors.reduce((a,b)=>a+b*b,0)/n)),
  meanBiasM:round(errors.reduce((a,b)=>a+b,0)/n),
  canInterpret:true,status:'DESCRIPTIVE_OFFSHORE_SAMPLE_NOT_CALIBRATED'};
}
function continuousHighWaveEpisodes(rows,{thresholdM=elevatedThresholdM,separationHours=48}={}){
 // Consecutive observations during one storm are ONE evidence episode, not
 // independent storms merely because they occur on adjacent calendar dates.
 const points=rows.filter(r=>r.observedHeightM>=thresholdM).sort((a,b)=>
   a.buoyObservedAt.localeCompare(b.buoyObservedAt));
 const out=[];let current=null;
 for(const item of points){
  const t=Date.parse(item.buoyObservedAt);
  if(!current||t-Date.parse(current.lastAt)>separationHours*HOUR){
   current={firstAt:item.buoyObservedAt,lastAt:item.buoyObservedAt,
    matchedHighWaveHours:0,peakObservedHeightM:0};
   out.push(current);
  }
  current.lastAt=item.buoyObservedAt;
  current.matchedHighWaveHours++;
  current.peakObservedHeightM=Math.max(current.peakObservedHeightM,item.observedHeightM);
 }
 return out;
}
function buildOffshoreSkillSlices(matches,{minimumPairs=5}={}){
 if(!Array.isArray(matches)||matches.length>30000||!Number.isInteger(minimumPairs)||minimumPairs<2)
  throw Error('Invalid offshore wave verification sample');
 const used=new Set(),rows=[];
 for(const r of matches){
  if(!r||r.buoyStation!=='45004'||r.modelGrid!=='2p5km'||
      !Number.isFinite(Date.parse(r.buoyObservedAt))||
      !Number.isFinite(Date.parse(r.forecastValidAt))||
      !Number.isFinite(Date.parse(r.issueAt))||
      !Number.isFinite(r.modelHeightM)||r.modelHeightM<0||r.modelHeightM>18||
      !Number.isFinite(r.observedHeightM)||r.observedHeightM<0||r.observedHeightM>18||
      !Number.isFinite(r.modelMinusObservedM)||!Number.isFinite(r.leadHours)||
      r.leadHours<1||r.leadHours>24||
      Math.abs((r.modelHeightM-r.observedHeightM)-r.modelMinusObservedM)>.00011||
      Math.abs(Date.parse(r.buoyObservedAt)-Date.parse(r.forecastValidAt))>30*60000)
   throw Error('Cannot characterize malformed or unaligned observed NOAA wave evidence');
  if(used.has(r.buoyObservedAt))throw Error('A real NDBC reading was double counted');
  used.add(r.buoyObservedAt);rows.push(r);
 }
 rows.sort((a,b)=>a.buoyObservedAt.localeCompare(b.buoyObservedAt));
 const group=(defs,choose)=>Object.fromEntries(defs.map(x=>[
  x.id,errorSummary(rows.filter(r=>choose(r)>=x.min&&choose(r)<x.max),{minimumPairs})
 ]));
 const byDay=Object.fromEntries([...new Set(rows.map(r=>r.buoyObservedAt.slice(0,10)))].sort()
   .map(d=>[d,errorSummary(rows.filter(r=>r.buoyObservedAt.startsWith(d)),{minimumPairs})]));
 const events=continuousHighWaveEpisodes(rows);
 const qualifyingEpisodes=events.filter(e=>e.matchedHighWaveHours>=minimumPairs);
 const observedDays=Object.keys(byDay).length;
 const evidence={
  matchedPairs:rows.length,distinctObservedDays:observedDays,
  highWaveObservedThresholdM:elevatedThresholdM,
  separatedElevatedWaveEpisodes:events.length,
  independentlySampledHighWaveEpisodes:qualifyingEpisodes.length,
  sufficientPairs:rows.length>=30,
  sufficientDistinctDays:observedDays>=3,
  sufficientSeparatedElevatedEvents:qualifyingEpisodes.length>=3,
  readyForScientificEventLevelValidation:false,
  reason:'No benchmark against held-out storm events or independent shoreline observations'
 };
 return {schemaVersion:'offshore-buoy45004-stratified-research-v1',
  source:'NDBC_45004_ACTUAL_OBSERVED_WAVE_HEIGHT',
  model:'GLWU_GRLC_2P5KM_SR_HTSGW',
  forecastSelection:'LATEST_NOMINAL_ISSUE_PER_VALID_HOUR',
  forecastReleaseLatencyUnknown:true,minimumPairsToDisplayBucket:minimumPairs,
  elevationIsNotNwsHazardThreshold:true,
  leadTime:group(leadGroups,r=>r.leadHours),
  observedHeight:group(heightGroups,r=>r.observedHeightM),
  observedUtcDay:byDay,highWaveEpisodes:events,evidence,
  referenceOnly:true,canPublishBeachSkill:false,canPublishRockhoundingOpportunity:false,
  limitations:'High-wave >=1m is a descriptive stratification boundary, NOT a storm-warning or beach safety threshold. Nearby buoy forecasts are not Agate shoreline waves.'};
}
module.exports={buildOffshoreSkillSlices,continuousHighWaveEpisodes,errorSummary};
