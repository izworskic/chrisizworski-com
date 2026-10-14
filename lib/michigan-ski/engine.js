'use strict';
const {RESORTS}=require('./resorts');
const MI_TZ='America/Detroit';
const WINTER=/snow|blizzard|winter storm|winter weather|ice storm/i;
const LAKE_EFFECT=/lake[\s-]*effect|snow squall/i;
const radians=x=>x*Math.PI/180;
function miles(a,b){
  const dLat=radians(a.lat-b.lat),dLon=radians(a.lon-b.lon);
  const x=Math.sin(dLat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLon/2)**2;
  return 3958.7613*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function ringContains(point,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j]; if(!Array.isArray(a)||!Array.isArray(b))continue;
    if((a[1]>point.lat)!==(b[1]>point.lat) && point.lon<(b[0]-a[0])*(point.lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
function contains(geometry,resort){
  if(!geometry||!geometry.coordinates)return false;
  const p={lat:resort.lat,lon:resort.lon};
  const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return polys.some(poly=>Array.isArray(poly)&&poly.length&&ringContains(p,poly[0])&&!poly.slice(1).some(h=>ringContains(p,h)));
}
function matchedAlerts(resort,zones,alerts,now=Date.now()){
  const keys=new Set([zones?.forecastZone,zones?.county,zones?.fireWeatherZone].filter(Boolean).map(x=>String(x).split('/').pop()));
  return (Array.isArray(alerts)?alerts:[]).filter(a=>{
    const p=a.properties||a;
    if(!WINTER.test(String(p.event||'')+' '+String(p.headline||'')))return false;
    const expiration=Date.parse(p.ends||p.expires||p.effective||0);
    if(Number.isFinite(expiration)&&expiration<now)return false;
    const zoneMatch=(p.affectedZones||[]).some(z=>keys.has(String(z).split('/').pop()));
    return zoneMatch||contains(a.geometry,resort);
  }).map(a=>{
    const p=a.properties||a,txt=[p.event,p.headline,p.description].join(' ');
    return {event:p.event||'Winter weather alert',headline:String(p.headline||'').slice(0,180),
      isLakeEffect:LAKE_EFFECT.test(txt),severity:p.severity||'Unknown',ends:p.ends||p.expires||null,
      url:p['@id']||p.id||a.id||'https://www.weather.gov/',
      affectedBy:'NWS forecast/county zone or warning polygon'};
  });
}
function localDate(now=Date.now()){
  const bits=new Intl.DateTimeFormat('en-CA',{timeZone:MI_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  const p=Object.fromEntries(bits.map(v=>[v.type,v.value]));
  return p.year+'-'+p.month+'-'+p.day;
}
function weekendWindow(now=Date.now()){
  const today=localDate(now);
  const d=new Date(today+'T12:00:00Z');
  const day=d.getUTCDay();
  const delta=(6-day+7)%7;
  d.setUTCDate(d.getUTCDate()+delta);
  const start=Date.parse(d.toISOString().slice(0,10)+'T11:00:00Z');
  // If it is already Saturday or Sunday locally, use the unelapsed part of this weekend.
  const adjusted=day===0?Math.max(now,start-86400000):Math.max(now,start);
  return {start:adjusted,end:start+36*3600000,label:'Next Michigan ski weekend'};
}
function snowInWindow(data,from,to){
  const series=data?.properties?.snowfallAmount||data?.snowfallAmount;
  if(!series||!Array.isArray(series.values))return null;
  let total=0,found=false;
  for(const r of series.values){
    if(typeof r.value!=='number'||!Number.isFinite(r.value)||!r.validTime)continue;
    const [time,period='PT1H']=r.validTime.split('/');
    const start=Date.parse(time);
    if(!Number.isFinite(start))continue;
    const duration=period.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
    if(!duration)continue;
    const len=((Number(duration[1]||0)*24+Number(duration[2]||0))*60+Number(duration[3]||0))*60000;
    if(len<=0)continue;
    const overlap=Math.max(0,Math.min(start+len,to)-Math.max(start,from));
    if(!overlap)continue;
    found=true;
    total+=Math.max(0,r.value)*overlap/len;
  }
  return found?Math.round(total/25.4*10)/10:null; // NWS snowfallAmount is in millimeters.
}
function closestSnowReport(resort,reports,hours,now=Date.now()){
  return (Array.isArray(reports)?reports:[])
    .filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&Number.isFinite(r.inches)&&r.inches>=0)
    .map(r=>({...r,distanceMiles:Math.round(miles(resort,r)*10)/10}))
    .filter(r=>r.distanceMiles<=35 && now-Date.parse(r.reportedAt)>=-120000 &&
      now-Date.parse(r.reportedAt)<=hours*3600000)
    .sort((a,b)=>b.inches-a.inches||a.distanceMiles-b.distanceMiles)[0]||null;
}
function priceForWeekend(resort){
  return resort.adultDayPrice2026?.sat??null;
}
function scoreResort(resort,{alerts=[],forecastSnowInches=null,report24=null,report48=null,baseDepthInches=null,forecastUpdatedAt=null}={},origin='detroit',now=Date.now()){
  if(resort.kind==='nordic')return {score:null,verdict:'NORDIC_ONLY',confidence:'NOT_RANKED',components:null};
  const time=resort.driveMinutes[origin];
  const price=priceForWeekend(resort);
  const activeWarning=alerts.some(a=>/Warning/i.test(a.event));
  const hasLakeAlert=alerts.some(a=>a.isLakeEffect);
  const recent=report24||report48;
  const observedFresh=Number.isFinite(Date.parse(forecastUpdatedAt))&&now-Date.parse(forecastUpdatedAt)<=3*3600000&&now-Date.parse(forecastUpdatedAt)>=-120000;
  const components={
    snowfallEvidence:recent?Math.min(20,Math.round(recent.inches*2.5)):0,
    weekendForecast:forecastSnowInches===null?0:Math.min(25,Math.round(forecastSnowInches*4)),
    travelValue:Math.max(0,Math.round(22-time/30)),
    ticketValue:price===null?0:Math.max(0,Math.round(14-price/12)),
    baseDepth:baseDepthInches===null?0:Math.min(14,Math.round(baseDepthInches/4)),
    lakeEffectSignal:hasLakeAlert?5:0,
    warningTravelRisk:activeWarning?-12:0
  };
  const score=Math.max(0,Math.min(100,Object.values(components).reduce((a,b)=>a+b,0)));
  const missing=[...(forecastSnowInches===null?['NWS_SNOW_FORECAST']:[]),
    ...(price===null?['WEEKEND_TICKET_PRICE']:[]),
    ...(baseDepthInches===null?['RESORT_BASE_DEPTH']:[])];
  const offSeason=![11,12,1,2,3,4].includes(Number(localDate(now).slice(5,7)));
  return {score,components,missing,confidence:missing.length?'PROVISIONAL':'PARTIAL_VERIFICATION',
    verdict:offSeason?'OFF_SEASON_PLANNING':activeWarning?'WEATHER_WARNING_VERIFY_TRAVEL':
      'VERIFY_RESORT_OPEN_AND_PRICES',observedForecastFresh:observedFresh,
    disclaimer:'Indicative conditions comparison only. Lift openings, base depth, ticket inventory and road safety are not confirmed.'};
}
function assemble(resort,weather={},alerts=[],reports=[],origin='detroit',now=Date.now()){
  const related=matchedAlerts(resort,weather.zones||{},alerts,now);
  const report24=closestSnowReport(resort,reports,24,now);
  const report48=closestSnowReport(resort,reports,48,now);
  const weekend=weekendWindow(now);
  const predicted=snowInWindow(weather.grid,weekend.start,weekend.end);
  const scored=scoreResort(resort,{alerts:related,report24,report48,forecastSnowInches:predicted,
    forecastUpdatedAt:weather.updatedAt||null},origin,now);
  return {...resort,weather:{updatedAt:weather.updatedAt||null,forecastSnowInches:predicted,
    forecastSource:weather.grid?'NWS digital forecast grid':'Unavailable',
    report24,report48,baseDepthInches:null,baseSource:'Official resort report — not yet ingested',
    alerts:related,zone:weather.zones?.forecastZone?.split('/').pop()||null,
    weatherCoverage:weather.grid?'NWS_GRID_RECEIVED':'UNAVAILABLE',weekend},
    ranking:scored};
}
function rank(resorts,origin='detroit',now=Date.now()){
  return resorts.map(r=>({...r,ranking:scoreResort(r,{alerts:r.weather?.alerts||[],
    report24:r.weather?.report24,report48:r.weather?.report48,
    forecastSnowInches:r.weather?.forecastSnowInches,
    baseDepthInches:r.weather?.baseDepthInches,forecastUpdatedAt:r.weather?.updatedAt},origin,now)}))
    .sort((a,b)=>(b.ranking.score??-1)-(a.ranking.score??-1)||a.name.localeCompare(b.name));
}
module.exports={RESORTS,miles,contains,matchedAlerts,weekendWindow,snowInWindow,closestSnowReport,scoreResort,assemble,rank};
