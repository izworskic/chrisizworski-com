'use strict';
// NOAA NDBC offshore *context* for Great Lakes rockhounding research; never a beach wave claim.
// Live backend adapter only; not wired to a public page.
const {parseNdbcStdmet,latestObservationWindow}=require('./exposure-core.cjs');
const STATION=Object.freeze({id:'45004',name:'East Superior',lat:47.583,lon:-86.586,
  url:'https://www.ndbc.noaa.gov/data/realtime2/45004.txt',
  description:'Open-water regional reference, not Grand Marais nearshore measurements'});
function distanceKm(lat1,lon1,lat2,lon2){
 const rad=Math.PI/180,R=6371,dlat=(lat2-lat1)*rad,dlon=(lon2-lon1)*rad;
 const a=Math.sin(dlat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dlon/2)**2;
 return R*2*Math.asin(Math.min(1,Math.sqrt(a)));
}
function evaluateBuoyText(raw, nowISO){
 const rows=parseNdbcStdmet(raw);
 const window=latestObservationWindow(rows,nowISO,72,3);
 const grandMaraisReferenceKm=Math.round(distanceKm(STATION.lat,STATION.lon,46.675,-85.985));
 const recentRows=rows.filter(x=>Date.parse(x.timestamp)<=Date.parse(nowISO)&&Date.parse(x.timestamp)>=Date.parse(nowISO)-72*3600000);
 const latestWave=recentRows.at(-1)||null;
 return {
  station:STATION.id,
  stationName:STATION.name,
  source:STATION.url,
  referenceOnly:true,
  grandMaraisDistanceKm:grandMaraisReferenceKm,
  waveDataCoverage:window.status,
  window,
  lastWaveReading:latestWave?{at:latestWave.timestamp,waveHeightM:latestWave.waveHeightM,waveFromDeg:latestWave.waveFromDeg,periodSeconds:latestWave.periodSeconds}:null,
  beachConditions:'NOT_DERIVABLE_FROM_OFFSHORE_BUOY',
  waveExposureVerdict:'NOT_CALIBRATED',
  modelComparisonRequired:'NOAA_GLWU_GRIDDED_POINT_NEAR_EACH_SHORE'
 };
}
async function loadRegionalWaveReference({fetchFn=fetch,nowISO=new Date().toISOString()}={}){
 try{
  const res=await fetchFn(STATION.url,{headers:{'Accept':'text/plain'},signal:AbortSignal.timeout(8000)});
  if(!res?.ok)return {station:STATION.id,waveDataCoverage:'UNAVAILABLE',beachConditions:'NOT_DERIVABLE_FROM_OFFSHORE_BUOY',reason:'SOURCE_HTTP_ERROR'};
  const raw=await res.text();
  if(typeof raw!=='string'||raw.length>1000000||!/^#(?:YY|YYYY)\s/m.test(raw))
    return {station:STATION.id,waveDataCoverage:'UNAVAILABLE',beachConditions:'NOT_DERIVABLE_FROM_OFFSHORE_BUOY',reason:'SOURCE_FORMAT_INVALID'};
  return evaluateBuoyText(raw,nowISO);
 }catch{
  return {station:STATION.id,waveDataCoverage:'UNAVAILABLE',beachConditions:'NOT_DERIVABLE_FROM_OFFSHORE_BUOY',reason:'SOURCE_REQUEST_FAILED'};
 }
}
module.exports={STATION,distanceKm,evaluateBuoyText,loadRegionalWaveReference};
