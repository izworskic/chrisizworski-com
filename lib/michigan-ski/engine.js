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

// Wind-alignment is an educational climatological signal, never proof of an active snowband.
// Northern Lower MI sectors: https://www.weather.gov/apx/les
// Southern Lake Superior tendency: https://www.weather.gov/dlh/lakesnow
const WIND_SECTORS=Object.freeze({
  'boyne-mountain':{from:280,to:305,lake:'Lake Michigan',source:'NWS Gaylord: Boyne Falls WNW'},
  'treetops':{from:280,to:305,lake:'Lake Michigan',source:'NWS Gaylord: Gaylord WNW'},
  'shanty-creek':{from:305,to:325,lake:'Lake Michigan',source:'NWS Gaylord: Mancelona NW'},
  'nubs-nob':{from:235,to:270,lake:'Lake Michigan',source:'NWS Gaylord: Harbor Springs WSW'},
  'the-highlands':{from:235,to:270,lake:'Lake Michigan',source:'NWS Gaylord: Harbor Springs WSW'},
  'mt-bohemia':{from:315,to:45,lake:'Lake Superior',source:'NWS Duluth: northerly component (regional)'},
  'marquette-mountain':{from:315,to:45,lake:'Lake Superior',source:'NWS Duluth: northerly component (regional)'},
  'porcupine-mountains':{from:315,to:45,lake:'Lake Superior',source:'NWS Duluth: northerly component (regional)'},
  'big-powderhorn':{from:315,to:45,lake:'Lake Superior',source:'NWS Duluth: northerly component (regional)'},
  'snowriver':{from:315,to:45,lake:'Lake Superior',source:'NWS Duluth: northerly component (regional)'}
});
function withinSector(deg,sector){
  const d=((deg%360)+360)%360;
  return sector.from<=sector.to?d>=sector.from&&d<=sector.to:d>=sector.from||d<=sector.to;
}
function lakeEffectWind(resort,grid,now=Date.now()){
  const sector=WIND_SECTORS[resort.slug];
  if(!sector)return {status:'NOT_MODELED',lake:null,source:'Wind sector not individually established'};
  const series=grid?.properties?.windDirection||grid?.windDirection;
  if(!Array.isArray(series?.values))return {status:'DATA_UNAVAILABLE',lake:sector.lake,source:sector.source};
  const observed=series.values.filter(v=>{
    const t=Date.parse(String(v.validTime||'').split('/')[0]);
    return Number.isFinite(t)&&t>=now-3600000&&t<=now+48*3600000&&Number.isFinite(v.value);
  }).slice(0,16);
  if(!observed.length)return {status:'DATA_UNAVAILABLE',lake:sector.lake,source:sector.source};
  const hits=observed.filter(v=>withinSector(v.value,sector));
  return {status:hits.length?'WIND_ALIGNED':'NOT_ALIGNED',lake:sector.lake,source:sector.source,
    sector:sector.from+'°–'+sector.to+'°',matchedPeriods:hits.length,examinedPeriods:observed.length,
    note:'Wind-only climatological alignment, not an active lake-effect snowband, forecast accumulation, or confirmed ski conditions.'};
}

function localDate(now=Date.now()){
  const bits=new Intl.DateTimeFormat('en-CA',{timeZone:MI_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  const p=Object.fromEntries(bits.map(v=>[v.type,v.value]));
  return p.year+'-'+p.month+'-'+p.day;
}
// Daily 24-hour forecast windows ending at 4 PM local on Saturday and Sunday.
// This keeps the weather comparison in Michigan local time through EST/EDT transitions.
function localUtc(date,hour){
  const reference=new Date(date+'T12:00:00Z');
  const zone=new Intl.DateTimeFormat('en-US',{timeZone:MI_TZ,timeZoneName:'shortOffset'}).formatToParts(reference)
    .find(p=>p.type==='timeZoneName')?.value||'';
  const match=zone.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if(!match)throw Error('MICHIGAN_TIMEZONE_UNAVAILABLE');
  const offset=(match[1]==='-'?-1:1)*(Number(match[2])*60+Number(match[3]||0));
  return Date.parse(date+'T'+String(hour).padStart(2,'0')+':00:00Z')-offset*60000;
}
function weekendWindow(now=Date.now()){
  const today=localDate(now);
  const d=new Date(today+'T12:00:00Z');
  const day=d.getUTCDay();
  // On a Sunday before lifts normally close, retain this weekend; afterward use the next one.
  const isSunCurrent=day===0&&now<localUtc(today,16);
  const delta=isSunCurrent?-1:(6-day+7)%7;
  d.setUTCDate(d.getUTCDate()+delta);
  const sat=d.toISOString().slice(0,10);
  d.setUTCDate(d.getUTCDate()+1);
  const sun=d.toISOString().slice(0,10);
  d.setUTCDate(d.getUTCDate()-2);
  const fri=d.toISOString().slice(0,10);
  const saturday={date:sat,start:localUtc(fri,16),end:localUtc(sat,16)};
  const sunday={date:sun,start:localUtc(sat,16),end:localUtc(sun,16)};
  return {start:Math.max(now,saturday.start),end:sunday.end,saturday,sunday,
    label:'Michigan ski-weekend snowfall outlook',
    meaning:'Each interval runs from 4 PM to 4 PM Michigan local time (23 or 25 elapsed hours at DST changes); forecast only, not measured snow on slopes.'};
}
// NWS temperature grids are degrees Celsius; wind-speed grids are km/h.
// This is forecast exposure/snow-surface risk, not observed piste quality.
function intervalSamples(data,key,from,to){
 const series=data?.properties?.[key]||data?.[key];
 if(!Array.isArray(series?.values))return [];
 return series.values.filter(r=>{
   const start=Date.parse(String(r.validTime||'').split('/')[0]);
   const m=String(r.validTime||'').split('/')[1]?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
   const ms=m?((Number(m[1]||0)*24+Number(m[2]||0))*60+Number(m[3]||0))*60000:0;
   return Number.isFinite(start)&&ms>0&&start<to&&start+ms>from&&Number.isFinite(r.value);
 }).map(r=>r.value);
}
function dayWeather(grid,from,to){
 const temps=intervalSamples(grid,'temperature',from,to);
 const winds=intervalSamples(grid,'windSpeed',from,to);
 const snow=snowInWindow(grid,from,to);
 const low=temps.length?Math.round(Math.min(...temps)*9/5+32):null;
 const high=temps.length?Math.round(Math.max(...temps)*9/5+32):null;
 const peakWind=winds.length?Math.round(Math.max(...winds)*0.621371):null;
 let surface='UNKNOWN';
 if(low!==null&&high!==null){
   if(low<=29&&high>=37)surface='THAW_FREEZE_RISK';
   else if(high>=37)surface='WARM_WET_RISK';
   else if(high<=32&&snow!==null&&snow>=2)surface='COLD_SNOW_OPPORTUNITY';
   else if(high<=32)surface='FREEZING_TEMPS';
   else surface='ABOVE_FREEZING';
 }
 return {snowInches:snow,lowF:low,highF:high,maxWindMph:peakWind,surfaceSignal:surface,
   interpretation:'Temperature, wind and snow are NWS forecasts at the approximate hill location, not measured trail conditions.'};
}
function skiDays(grid,now=Date.now()){
  const window=weekendWindow(now);
  const fromWindow=period=>period.end<=now?{snowInches:null,lowF:null,highF:null,maxWindMph:null,surfaceSignal:'PAST'}:
    dayWeather(grid,Math.max(period.start,now),period.end);
  const saturday=fromWindow(window.saturday),sunday=fromWindow(window.sunday);
  const difference=(saturday.snowInches!==null&&sunday.snowInches!==null)?sunday.snowInches-saturday.snowInches:null;
  return {saturday:{date:window.saturday.date,...saturday},
    sunday:{date:window.sunday.date,...sunday},
    moreSnowForecast:difference===null?'UNKNOWN':difference>=1?'SUNDAY':difference<=-1?'SATURDAY':'SIMILAR',
    disclosure:window.meaning};
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
    .sort((a,b)=>a.distanceMiles-b.distanceMiles||b.inches-a.inches)[0]||null;
}
function priceForWeekend(resort){
  return resort.adultDayPrice2026?.sat??null;
}
function scoreResort(resort,{alerts=[],forecastSnowInches=null,report24=null,report48=null,baseDepthInches=null,forecastUpdatedAt=null}={},origin='detroit',now=Date.now()){
  if(resort.kind==='nordic')return {score:null,verdict:'NORDIC_ONLY',confidence:'NOT_RANKED',components:null};
  const time=resort.driveMinutes[origin];
  const price=priceForWeekend(resort);
  const activeWarning=alerts.some(a=>/Warning/i.test(a.event));
  const recent=report24||report48;
  const observedFresh=Number.isFinite(Date.parse(forecastUpdatedAt))&&now-Date.parse(forecastUpdatedAt)<=3*3600000&&now-Date.parse(forecastUpdatedAt)>=-120000;
  const components={
    snowfallEvidence:recent?Math.min(20,Math.round(recent.inches*2.5)):0,
    weekendForecast:forecastSnowInches===null?0:Math.min(25,Math.round(forecastSnowInches*4)),
    travelValue:Math.max(0,Math.round(27-time/30)),
    ticketValue:price===null?0:Math.max(0,Math.round(14-price/12)),
    baseDepth:baseDepthInches===null?0:Math.min(14,Math.round(baseDepthInches/4)),
    lakeEffectSignal:0, // Warnings are NEVER positive skiing evidence.
    warningTravelRisk:activeWarning?-12:0
  };
  const offSeason=![11,12,1,2,3,4].includes(Number(localDate(now).slice(5,7)));
  // No ski-day ranking in shoulder/off-season or when travel is under a winter warning.
  const score=activeWarning||offSeason?null:Math.max(0,Math.min(100,Object.values(components).reduce((a,b)=>a+b,0)));
  const missing=[...(forecastSnowInches===null?['NWS_SNOW_FORECAST']:[]),
    ...(price===null?['WEEKEND_TICKET_PRICE']:[]),
    ...(baseDepthInches===null?['RESORT_BASE_DEPTH']:[]),'LIVE_LIFTS_AND_TRAIL_STATUS'];
  return {score,components,missing,confidence:missing.length?'PROVISIONAL':'PARTIAL_VERIFICATION',
    verdict:offSeason?'OFF_SEASON_PLANNING':activeWarning?'WEATHER_WARNING_VERIFY_TRAVEL':
      'VERIFY_RESORT_OPEN_AND_PRICES',observedForecastFresh:observedFresh,
    disclaimer:'Indicative conditions comparison only. Lift openings, base depth, ticket inventory and road safety are not confirmed.'};
}
function assemble(resort,weather={},alerts=[],reports=[],origin='detroit',now=Date.now(),official=null){
  const related=matchedAlerts(resort,weather.zones||{},alerts,now);
  const report24=closestSnowReport(resort,reports,24,now);
  const report48=closestSnowReport(resort,reports,48,now);
  const weekend=weekendWindow(now);
  const predicted=weekend.end>now?snowInWindow(weather.grid,weekend.start,weekend.end):null;
  const days=skiDays(weather.grid,now);
  const wind=lakeEffectWind(resort,weather.grid,now);
  const base=official?.status==='PUBLISHED_OFFICIAL_REPORT'?official.baseDepthInches:null;
  const scored=scoreResort(resort,{alerts:related,report24,report48,forecastSnowInches:predicted,
    baseDepthInches:base,forecastUpdatedAt:weather.updatedAt||null},origin,now);
  return {...resort,official:official||{status:'NOT_CONNECTED',url:resort.snow},weather:{updatedAt:weather.updatedAt||null,forecastSnowInches:predicted,skiDays:days,lakeEffectWind:wind,
    forecastSource:weather.grid?'NWS digital forecast grid':'Unavailable',
    report24,report48,baseDepthInches:base,baseSource:base!==null?'Official resort report (as fetched)':'Not verified',
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
module.exports={RESORTS,miles,contains,matchedAlerts,withinSector,lakeEffectWind,localUtc,weekendWindow,skiDays,dayWeather,intervalSamples,snowInWindow,closestSnowReport,scoreResort,assemble,rank};
