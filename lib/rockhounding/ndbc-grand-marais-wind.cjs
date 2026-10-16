'use strict';
// Independent Grand Marais NWS GRMM4 anemometer measurements via NOAA NDBC.
// The GLOS SPOT-1361 "wind" field is estimated from waves and is NOT used.
// GRMM4 reports true measured wind, but it has NO measured wave heights.
const URL='https://www.ndbc.noaa.gov/data/realtime2/GRMM4.txt';
const STATION='GRMM4',HOUR=3600000;
const NO_CLAIMS=Object.freeze({
 photosRequired:false,windMeasurementIsNotBeachSurf:true,
 ndbcWaveHeightAvailable:false,
 modeledBeachBreakingWavesM:null,
 calibratedSedimentTransportRate:null,
 rockExposureProbability:null,
 canClaimNewlyExposedStones:false,canPublishVisitWindow:false,
 canClaimSafeBeach:false,canInferHarborSurf:false
});
function finiteDate(y,m,d,h,min){
 const a=[y,m,d,h,min];
 if(!a.every(Number.isInteger)||y<2010||y>2100||m<1||m>12||d<1||d>31||h<0||h>23||min<0||min>59)return null;
 const t=Date.UTC(y,m-1,d,h,min);
 const v=new Date(t);
 return v.getUTCFullYear()===y&&v.getUTCMonth()+1===m&&v.getUTCDate()===d&&
  v.getUTCHours()===h&&v.getUTCMinutes()===min?v.toISOString().replace('.000Z','Z'):null;
}
function num(s,limit){if(s==='MM'||s===''||s==null)return null;const x=Number(s);return Number.isFinite(x)&&x>=0&&x<=limit?x:null;}
function parseGRMM4(raw){
 if(typeof raw!=='string'||!raw.startsWith('#YY')||raw.length>1500000)
  throw Error('Missing or oversized NOAA GRMM4 original text');
 const lines=raw.trim().split(/\r?\n/);
 if(lines.length<3||lines.length>15000)throw Error('NDBC GRMM4 headers/data missing or oversized');
 const header=lines[0].trim().split(/\s+/);
 const expected=['#YY','MM','DD','hh','mm','WDIR','WSPD','GST','WVHT','DPD','APD','MWD','PRES','ATMP','WTMP','DEWP','VIS','PTDY','TIDE'];
 if(JSON.stringify(header)!==JSON.stringify(expected))
  throw Error('NDBC format changed: source header does not identify original wind measurement columns');
 const units=lines[1].trim().split(/\s+/);
 // Units row includes individual "m/s" tokens at column 6/7, "degT" at WDIR.
 if(units[5]!=='degT'||units[6]!=='m/s'||units[7]!=='m/s')
  throw Error('NDBC wind direction/speed source units changed');
 const found=new Map();let missingWindRows=0,badTimeRows=0;
 for(const line of lines.slice(2)){
  if(!line.trim()||line.startsWith('#'))continue;
  const fields=line.trim().split(/\s+/);
  if(fields.length!==19)throw Error('Unexpected original NDBC row shape');
  const when=finiteDate(...fields.slice(0,5).map(Number));
  if(!when){badTimeRows++;continue;}
  const dir=num(fields[5],360),speed=num(fields[6],80),gust=num(fields[7],100);
  if(speed===null||dir===null){missingWindRows++;continue;}
  // NOAA NDBC wind direction is from true north; 360 means N.
  const row={time:when,windFromDeg:dir%360,windSpeedMps:speed,
   gustMps:gust===null?null:Math.max(speed,gust),
   source:'NDBC_GRMM4_ORIGINAL_ANEMOMETER',latitude:46.684,longitude:-85.972};
  if(found.has(when)&&JSON.stringify(found.get(when))!==JSON.stringify(row))
   throw Error('Conflicting independently observed GRMM4 timestamps');
  found.set(when,row);
 }
 const observations=[...found.values()].sort((a,b)=>a.time.localeCompare(b.time));
 return {stationId:STATION,sourceUrl:URL,observations,rawLineCount:lines.length-2,
   missingWindRows,badTimeRows,unitWind:'m/s',unitDirection:'deg true',
   measuredWindNotEstimatedSpotterWind:true,sourceDoesNotMeasureWaves:true};
}
function angle(a,b){return Math.min(Math.abs(a-b),360-Math.abs(a-b))}
function describeGRMM4(parsed,{nowISO,waveObservation=null}={}){
 const now=Date.parse(nowISO);
 if(!Number.isFinite(now)||!parsed||parsed.stationId!==STATION||
  parsed.sourceUrl!==URL||parsed.measuredWindNotEstimatedSpotterWind!==true||
  parsed.sourceDoesNotMeasureWaves!==true||!Array.isArray(parsed.observations)||
  parsed.observations.length>15000)
  throw Error('Independent GRMM4 measured wind source not verified');
 const recent=parsed.observations.filter(r=>{
  if(r.source!=='NDBC_GRMM4_ORIGINAL_ANEMOMETER'||r.latitude!==46.684||
    r.longitude!==-85.972||!Number.isFinite(r.windSpeedMps)||
    r.windSpeedMps<0||r.windSpeedMps>80||
    !Number.isFinite(r.windFromDeg)||r.windFromDeg<0||r.windFromDeg>=360)
   throw Error('Unverified station wind provenance');
  const t=Date.parse(r.time);if(!Number.isFinite(t)||t>now+5*60000)
   throw Error('Invalid future station observation');
  return t>=now-12*HOUR;
 });
 const latest=recent.at(-1),age=latest?(now-Date.parse(latest.time))/HOUR:null;
 const recent3=recent.filter(r=>latest&&Date.parse(r.time)>=Date.parse(latest.time)-3*HOUR);
 let maxGap=0;
 for(let i=1;i<recent3.length;i++)
  maxGap=Math.max(maxGap,(Date.parse(recent3[i].time)-Date.parse(recent3[i-1].time))/HOUR);
 const adequate=latest&&age>=-.084&&age<=3&&recent3.length>=6&&maxGap<=1;
 const windArrow=()=>{
  if(!adequate)return null;
  let north=0,east=0,weights=0;
  for(const r of recent3){
   if(r.windSpeedMps<.5)continue;
   const rad=r.windFromDeg*Math.PI/180;
   north+=r.windSpeedMps*Math.cos(rad);
   east+=r.windSpeedMps*Math.sin(rad);
   weights+=r.windSpeedMps;
  }
  if(weights===0||Math.hypot(north,east)/weights<.5)return null;
  return (Math.atan2(east,north)*180/Math.PI+360)%360;
 };
 const dominant=windArrow();
 const waveTime=Date.parse(waveObservation?.latestMeasuredAtUTC);
 const waveComparable=adequate&&Number.isFinite(waveTime)&&
  waveTime<=now+5*60000&&now-waveTime<=3*HOUR&&
  Number.isFinite(waveObservation?.latestOffshoreWaveFromDeg)&&
  waveObservation.latestOffshoreWaveFromDeg>=0&&waveObservation.latestOffshoreWaveFromDeg<=360;
 const separation=waveComparable&&dominant!==null?
  +angle(dominant,waveObservation.latestOffshoreWaveFromDeg%360).toFixed(1):null;
 return {schemaVersion:'rockhounding-independent-grmm4-measured-wind-v1',
  stationId:STATION,station:'Grand Marais NWS weather station',
  sourceUrl:URL,sourceProvenance:'NWS_OWNED_GRMM4_DIRECT_WIND_ANEMOMETER_NOT_GLOS_WAVE_DERIVED_WIND',
  stationCoordinates:{lat:46.684,lon:-85.972},
  anemometerApproxAboveSiteMeters:9,
  checkedAtUTC:nowISO,
  sourceStatus:!latest?'NO_RECENT_ORIGINAL_WIND_READINGS':
    age>3?'WIND_SENSOR_STALE':
    adequate?'OBSERVED_STATION_WIND_RECENT':
      'STATION_WIND_COVERAGE_INSUFFICIENT',
  latestObservedAtUTC:adequate?latest.time:null,
  lastKnownObservedAtUTC:latest?.time??null,
  latestSourceAgeHours:age===null?null:+age.toFixed(2),
  latestObservedWindMps:adequate?latest.windSpeedMps:null,
  latestObservedWindFromDeg:adequate?latest.windFromDeg:null,
  latestObservedGustMps:adequate?latest.gustMps:null,
  peakObservedGustPast3hMps:adequate?Math.max(...recent3.map(r=>r.gustMps??r.windSpeedMps)):null,
  recentWindSampleCount:recent3.length,
  recentWindMaxGapHours:recent3.length>1?+maxGap.toFixed(2):null,
  weighted3hWindFromDeg:dominant===null?null:+dominant.toFixed(1),
  offshoreWaveAndLocalWindFresh:!!waveComparable,
  waveFromVsLocalWindFromSeparationDeg:separation,
  windWaveDifferenceMeaning:separation===null?'NO_VERIFIED_COMPARABLE_DIRECTION_DATA':
    'DIFFERENT_SENSORS_AND_LOCATIONS; SWELL_AND_FETCH_CAN_SEPARATE_LOCAL_WIND_FROM_OFFSHORE_WAVE_DIRECTION',
  sourceMissingGRMM4WaveHeights:true,
  waveDataMustRemainFromGLOSSpotter:true,
  currentNWSAlertStatusNotReplaced:true,
  sourceWindMayNotMatchOffshoreDueToSwell:true,
  ...NO_CLAIMS};
}
function missingWind(nowISO){
 return describeGRMM4({stationId:STATION,sourceUrl:URL,observations:[],
  measuredWindNotEstimatedSpotterWind:true,sourceDoesNotMeasureWaves:true},
 {nowISO});
}
module.exports={URL,STATION,NO_CLAIMS,parseGRMM4,describeGRMM4,missingWind};
