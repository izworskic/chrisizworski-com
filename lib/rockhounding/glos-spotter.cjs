'use strict';
// GLOS Spotter SPOT-1361 / Seagull obs_140. This is *measured offshore*
// wave evidence near Grand Marais, never breaking surf at Agate Beach.
const source=require('../../data/rockhounding/grand-marais-glos-spotter-source.json');
const HOUR=3600000;
const COLUMNS=['time','longitude','latitude','sea_surface_wave_significant_height',
               'sea_surface_wave_from_direction','sea_surface_wave_mean_period'];
function validateSpotterSource(s=source){
 if(s?.schemaVersion!=='grand-marais-glos-spotter-v1'||s?.datasetId!=='obs_140'||
    s?.spotterId!=='SPOT-1361'||
    s?.tabledap!=='https://seagull-erddap.glos.org/erddap/tabledap/obs_140.csv'||
    s?.sourceRole!=='NEAR_GRAND_MARAIS_OPEN_LAKE_OBSERVED_WAVE_CONTEXT'||
    s?.siteReference?.positionType!=='SOURCE_OBSERVED_OCT_14_2026'||
    Math.abs(s?.siteReference?.lat-46.69567108154297)>.000001||
    Math.abs(s?.siteReference?.lon+86.00379943847656)>.000001||
    s?.siteReference?.allowableCoordinateDriftDegrees!==.04||
    JSON.stringify(Object.values(s.fields||{}).sort())!==JSON.stringify([...COLUMNS].sort())||
    s?.units?.waveHeight!=='m'||s?.units?.wavePeriod!=='s'||
    s?.primaryObservationDateUTC!=='2026-10-14'||
    s?.isLocalBreakingSurfSensor!==false||
    s?.isProtectedHarborWaveSensor!==false||
    s?.buoyWindDerivedFromWaveMeasurements!==true||
    s?.actualShorelineNormalSurveyed!==false||
    JSON.stringify(s.publicClaims)!==
      JSON.stringify({canClaimSafeShore:false,canPredictNewStones:false,
       canClaimHarborWaveHeights:false,canPublishVisitWindow:false}))
  throw Error('GLOS Spotter source identity or offshore safety boundary changed');
 return true;
}
function validTime(s){
 return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s)&&
  Number.isFinite(Date.parse(s))&&new Date(s).toISOString().startsWith(s.slice(0,19));
}
function requestUrl({startISO,endISO,config=source}){
 validateSpotterSource(config);
 const t0=Date.parse(startISO),t1=Date.parse(endISO);
 if(!validTime(startISO)||!validTime(endISO)||t1<=t0||t1-t0>8*24*HOUR)
  throw Error('GLOS research query must cover 0-8 days of actual UTC observations');
 const query=COLUMNS.join(',')+'&time>='+startISO+'&time<='+endISO;
 return config.tabledap+'?'+query;
}
function parseSpotterCSV(raw,{config=source}={}){
 validateSpotterSource(config);
 if(typeof raw!=='string'||raw.length>2500000)throw Error('Oversized or missing GLOS Seagull response');
 const lines=raw.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 if(lines.length<2||lines.length>18000)
  throw Error('Invalid GLOS tabledap CSV response');
 const headers=lines[0].split(',').map(x=>x.trim().replace(/^"|"$/g,''));
 if(JSON.stringify(headers)!==JSON.stringify(COLUMNS))
  throw Error('GLOS column names/order changed; do not accidentally interpret wind direction as waves');
 const units=lines[1].split(',').map(x=>x.trim().replace(/^"|"$/g,''));
 if(units.length!==6||units[0]!=='UTC'||units[1]!=='degrees_east'||
    units[2]!=='degrees_north'||units[3]!=='m'||
    !['degree','degrees','degrees_true','°'].includes(units[4])||units[5]!=='s')
  throw Error('GLOS observation units or provenance changed');
 const found=new Map();
 let rejected=0;
 for(const line of lines.slice(2)){
  if(!line.trim())continue;
  const v=line.split(',').map(x=>x.trim().replace(/^"|"$/g,''));
  if(v.length!==6)throw Error('GLOS source row has changed shape');
  if(!validTime(v[0]))throw Error('Invalid GLOS observation UTC timestamp');
  const [lon,lat,h,dir,period]=v.slice(1).map(x=>x===''||x==='NaN'||x==='null'?NaN:Number(x));
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||
     Math.abs(lon-config.siteReference.lon)>.04||
     Math.abs(lat-config.siteReference.lat)>.04)
   throw Error('Wrong GLOS buoy location; Grand Marais MI observation not verified');
  if(!Number.isFinite(h)||h<0||h>18||!Number.isFinite(dir)||dir<0||dir>360||
     !Number.isFinite(period)||period<=0||period>30){rejected++;continue;}
  const rec={time:v[0],waveHeightM:+h.toFixed(3),
    waveFromDeg:+(dir%360).toFixed(2),meanPeriodS:+period.toFixed(2),
    source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
    lat:+lat.toFixed(6),lon:+lon.toFixed(6)};
  if(found.has(rec.time)&&JSON.stringify(found.get(rec.time))!==JSON.stringify(rec))
   throw Error('Conflicting duplicate GLOS observation timestamps');
  found.set(rec.time,rec);
 }
 const rows=[...found.values()].sort((a,b)=>a.time.localeCompare(b.time));
 return {rows,rejectedRows:rejected,sourceDatasetId:config.datasetId,
   stationId:config.spotterId,observedNotForecast:true,
   windDirectionNotSubstitutedForWaves:true};
}
function observedSpotterStudy(parsed,{nowISO=new Date().toISOString(),minRows=18,maxGapHours=3}={}){
 const status={schemaVersion:'grand-marais-spotter-observation-research-v1',
  source:'GLOS_SEAGULL_OBS_140_SPOT_1361',stationContext:'OPEN_LAKE_NEAR_GRAND_MARAIS_MI',
  status:'NO_OBSERVATIONS',latestAt:null,recordCount:0,rejectedRows:parsed?.rejectedRows??null,
  peakObservedWaveM:null,peakObservedAt:null,latestWaveM:null,latestWaveFromDeg:null,
  latestWavePeriodS:null,peakAgeHours:null,declineFromObservedPeakFraction:null,
  historicalShoreNormalUsed:false,
  recordOfObservedWaveChangeOnly:true,
  isSiteBreakingSurfMeasurement:false,
  canPredictRockExposure:false,canClaimSafeConditions:false,
  canClaimHarborWaves:false,canPublishVisitWindow:false};
 const now=Date.parse(nowISO);
 if(!Number.isFinite(now)||!parsed?.observedNotForecast||!Array.isArray(parsed.rows))
  throw Error('Invalid GLOS Spotter observed research input');
 const rows=parsed.rows.filter(r=>{
   const t=Date.parse(r.time);
   return Number.isFinite(t)&&t<=now+5*60000&&t>=now-96*HOUR;
 });
 if(!rows.length)return status;
 rows.sort((a,b)=>a.time.localeCompare(b.time));
 const newest=rows.at(-1),ageH=(now-Date.parse(newest.time))/HOUR;
 const hist=rows.filter(r=>Date.parse(r.time)>=now-72*HOUR);
 const peak=hist.reduce((a,b)=>!a||b.waveHeightM>a.waveHeightM?b:a,null);
 const gaps=rows.slice(1).map((r,i)=>(Date.parse(r.time)-Date.parse(rows[i].time))/HOUR);
 const maxGapH=gaps.length?Math.max(...gaps):null;
 const meaningful=hist.length>=minRows&&maxGapH!==null&&maxGapH<=maxGapHours;
 return {...status,status:ageH>3?'STALE_OBSERVATIONS':(!meaningful?'SPARSE_OR_GAPPY_OBSERVATIONS':'OBSERVED_OFFSHORE_WAVES_RESEARCH_ONLY'),
  latestAt:newest.time,recordCount:hist.length,maxTimeGapHours:maxGapH,
  peakObservedWaveM:peak?.waveHeightM??null,peakObservedAt:peak?.time??null,
  latestWaveM:newest.waveHeightM,latestWaveFromDeg:newest.waveFromDeg,
  latestWavePeriodS:newest.meanPeriodS,
  peakAgeHours:peak?+( (now-Date.parse(peak.time))/HOUR).toFixed(2):null,
  declineFromObservedPeakFraction:meaningful&&peak?.waveHeightM>0&&
    Date.parse(newest.time)>=Date.parse(peak.time)+4*HOUR
      ? +(1-newest.waveHeightM/peak.waveHeightM).toFixed(3):null};
}
module.exports={validateSpotterSource,requestUrl,parseSpotterCSV,observedSpotterStudy};
