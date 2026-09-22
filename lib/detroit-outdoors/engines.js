"use strict";

const {loadExpandedEngineStates,emitExpandedCandidates,expandedSourceStatus}=require("./expanded-engines.js");
const {DETROIT_ENGINE_REGISTRY}=require("./engine-registry.js");

const BUOY_API = "https://chrisizworski.com/api/buoys";
const AURORA_API = "https://chrisizworski.com/api/aurora";
const FREIGHTER_AIS_API = "https://chrisizworski.com/api/freighter-ais";
const TZ = "America/Detroit";
const DETROIT_RIVERFRONT = Object.freeze({
  id:"detroit-riverfront",
  name:"Detroit Riverfront",
  area:"Detroit",
  setting:"Detroit Riverwalk and riverfront parks",
  drive:"5–15 min",
  driveClass:"near",
  officialUrl:"https://www.detroitriverfront.org/plan-your-visit/parks-greenways/the-riverwalk"
});
const LAKE_ST_CLAIR_MARINE_ALERTS = "https://api.weather.gov/alerts/active/zone/LCZ460";
const WATER_HARD_ALERT = /(Small Craft Advisory|Gale Warning|Storm Warning|Hurricane Force Wind Warning|Hazardous Seas Warning|Special Marine Warning|Beach Hazards Statement|Lakeshore Flood Warning)/i;
const HARD_WEATHER_ALERT = /(Tornado Warning|Severe Thunderstorm Warning|Flash Flood Warning|Extreme Wind Warning|Blizzard Warning|Ice Storm Warning|Hurricane Warning|Tropical Storm Warning)/i;

function finite(value){
  if(value===null||value===undefined||value==="") return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function clamp(value,min=0,max=100){
  return Math.max(min,Math.min(max,value));
}
function safeText(value,max=280){
  return String(value==null?"":value).replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
}
function ageHours(iso,now=Date.now()){
  const t=Date.parse(iso||"");
  return Number.isFinite(t)?Math.max(0,(now-t)/3600000):null;
}
function mphFromMs(ms){
  const n=finite(ms);
  return n===null?null:Math.round(n*2.23694*10)/10;
}
function feetFromMeters(m){
  const n=finite(m);
  return n===null?null:Math.round(n*3.28084*10)/10;
}
function fahrenheitFromC(c){
  const n=finite(c);
  return n===null?null:Math.round((n*9/5+32)*10)/10;
}
async function fetchJson(url,timeoutMs=6500){
  const response=await fetch(url,{
    headers:{accept:"application/json","user-agent":"ChrisIzworski.com Detroit Outdoors specialist adapter"},
    signal:AbortSignal.timeout(timeoutMs),
    redirect:"error"
  });
  if(!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.json();
}
async function loadOne(url,name,timeoutMs=6500){
  try{
    const data=await fetchJson(url,timeoutMs);
    return {ok:true,name,url,data,error:null};
  }catch(error){
    return {ok:false,name,url,data:null,error:safeText(error&&error.message||error)};
  }
}
async function loadSpecialistEngineStates(){
  const [water,nightSky,waterMarineAlerts,freighterAis,expanded]=await Promise.all([
    loadOne(BUOY_API,"great-lakes-water",10000),
    loadOne(AURORA_API,"night-sky-aurora",10000),
    loadOne(LAKE_ST_CLAIR_MARINE_ALERTS,"lake-st-clair-marine-alerts",5500),
    loadOne(FREIGHTER_AIS_API,"great-lakes-ais",10000),
    loadExpandedEngineStates()
  ]);
  water.marineAlerts=waterMarineAlerts;
  return {water,nightSky,freighterAis,...expanded};
}
function byPlace(placeStates,id){
  return (placeStates||[]).find(x=>x&&x.place&&x.place.id===id)||null;
}
function byAlertIndex(placeStates,alertStates,id){
  const index=(placeStates||[]).findIndex(x=>x&&x.place&&x.place.id===id);
  return index>=0?(alertStates||[])[index]||null:null;
}
function alertEvents(alertState){
  return alertState&&Array.isArray(alertState.alerts)?alertState.alerts:[];
}
function geoJsonAlertEvents(state){
  const features=state&&state.ok&&state.data&&Array.isArray(state.data.features)?state.data.features:[];
  return features.map(f=>({
    event:safeText(f&&f.properties&&f.properties.event,100),
    severity:safeText(f&&f.properties&&f.properties.severity,40),
    certainty:safeText(f&&f.properties&&f.properties.certainty,40),
    headline:safeText(f&&f.properties&&f.properties.headline,180)
  })).filter(a=>a.event);
}
function matchingAlert(alertState,re){
  return alertEvents(alertState).find(a=>re.test(String(a&&a.event||"")))||null;
}
function dangerousAlert(alertState,re=HARD_WEATHER_ALERT){
  return alertEvents(alertState).find(a=>
    re.test(String(a&&a.event||""))||
    (String(a&&a.severity||"")==="Extreme"&&/Observed|Likely/i.test(String(a&&a.certainty||"")))
  )||null;
}
function weatherPacket(placeState){
  const w=placeState&&placeState.weather||null;
  if(!w) return null;
  const value=name=>finite(w[name]);
  return {
    high:value("high"),
    low:value("low"),
    rainChance:value("precipitationProbability"),
    gust:value("windGust"),
    cloudCover:value("cloudCover"),
    aqi:value("aqi")
  };
}
function travelPacket(place){
  return {
    origin:"central Detroit",
    driveBand:place&&place.drive||null,
    class:place&&place.driveClass||null
  };
}

function michiganDateKey(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function localMinuteForIso(iso){
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime())) return null;
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
  const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  const h=Number(value.hour),m=Number(value.minute);
  return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null;
}
function localDateForIso(iso){
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime())) return null;
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function currentLocalMinute(now=new Date()){
  return localMinuteForIso(now.toISOString());
}
function solarMinutes(date,lat,lon,sunrise){
  const [y,m,d]=date.split("-").map(Number);
  const N=Math.floor((Date.UTC(y,m-1,d)-Date.UTC(y,0,0))/86400000);
  const lngHour=lon/15;
  const t=N+(((sunrise?6:18)-lngHour)/24);
  const M=(0.9856*t)-3.289;
  let L=M+1.916*Math.sin(M*Math.PI/180)+0.020*Math.sin(2*M*Math.PI/180)+282.634;
  L=(L+360)%360;
  let RA=Math.atan(0.91764*Math.tan(L*Math.PI/180))*180/Math.PI;
  RA=(RA+360)%360;
  const Lquadrant=Math.floor(L/90)*90;
  const RAquadrant=Math.floor(RA/90)*90;
  RA=(RA+(Lquadrant-RAquadrant))/15;
  const sinDec=0.39782*Math.sin(L*Math.PI/180);
  const cosDec=Math.cos(Math.asin(sinDec));
  const cosH=(Math.cos(90.833*Math.PI/180)-(sinDec*Math.sin(lat*Math.PI/180)))/(cosDec*Math.cos(lat*Math.PI/180));
  if(cosH>1||cosH<-1) return sunrise?420:1200;
  let H=sunrise?360-(Math.acos(cosH)*180/Math.PI):(Math.acos(cosH)*180/Math.PI);
  H/=15;
  const T=H+RA-(0.06571*t)-6.622;
  let UT=(T-lngHour)%24;
  if(UT<0) UT+=24;
  const offset=new Date(`${date}T12:00:00Z`).toLocaleString("en-US",{timeZone:TZ,timeZoneName:"longOffset"}).match(/GMT([+-])(\d{2}):(\d{2})/);
  let off=0;
  if(offset) off=(offset[1]==="-"?-1:1)*(Number(offset[2])*60+Number(offset[3]));
  return Math.round((((UT*60)+off)%1440+1440)%1440);
}
function clock(minutes){
  if(!Number.isFinite(minutes)) return null;
  const m=((Math.round(minutes)%1440)+1440)%1440;
  let h=Math.floor(m/60),min=m%60;
  const suffix=h>=12?"PM":"AM";
  h=h%12||12;
  return `${h}:${String(min).padStart(2,"0")} ${suffix}`;
}
function sunsetCloudWindow(region,date,sunsetMinute){
  const periods=Array.isArray(region&&region.sky_cover&&region.sky_cover.periods)?region.sky_cover.periods:[];
  const rows=periods.map(p=>{
    const start=Date.parse(p.start_time),end=Date.parse(p.end_time);
    const mid=Number.isFinite(start)&&Number.isFinite(end)?new Date((start+end)/2).toISOString():p.start_time;
    return {...p,localDate:localDateForIso(mid),minute:localMinuteForIso(mid),percent:finite(p.percent)};
  }).filter(p=>p.localDate===date&&p.minute!==null&&p.percent!==null&&p.minute>=sunsetMinute-90&&p.minute<=sunsetMinute+45);
  if(!rows.length) return null;
  return {
    cloudPercent:Math.round(rows.reduce((sum,p)=>sum+p.percent,0)/rows.length),
    start:rows[0].start_time,
    end:rows[rows.length-1].end_time,
    periods:rows.length
  };
}
function haversineMiles(lat1,lon1,lat2,lon2){
  const rad=x=>x*Math.PI/180,R=3958.8;
  const p1=rad(lat1),p2=rad(lat2),dp=rad(lat2-lat1),dl=rad(lon2-lon1);
  const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function normalizeOpportunityCandidate(raw){
  const place=raw&&raw.place||{};
  const verifiedEvidence=Array.isArray(raw&&raw.verifiedEvidence)?raw.verifiedEvidence.filter(Boolean):[];
  const hardStops=Array.isArray(raw&&raw.hardStops)?raw.hardStops.filter(Boolean):[];
  const uncertainty=Array.isArray(raw&&raw.uncertainty)?raw.uncertainty.filter(Boolean):[];
  return {
    ...raw,
    id:safeText(raw&&raw.id,140),
    sourceEngine:safeText(raw&&raw.sourceEngine||"unknown",80),
    opportunityType:safeText(raw&&raw.opportunityType||raw&&raw.activity||"outdoors",100),
    timeWindow:raw&&raw.timeWindow||{label:"Today",start:null,end:null},
    whyNow:safeText(raw&&raw.whyNow,420),
    verifiedEvidence,
    confidence:raw&&raw.confidence||{level:"medium",reason:"Evidence-backed planning lead"},
    hardStops,
    specialistHandoff:raw&&raw.specialistHandoff||null,
    travel:raw&&raw.travel||travelPacket(place),
    uncertainty
  };
}

function waterVetoCandidate(placeState,weather,hardStops,whyNow="Water-specific evidence is incomplete or outside the conservative paddling gate."){
  const place=placeState&&placeState.place||{};
  return normalizeOpportunityCandidate({
    id:"water-lake-st-clair-calm-window",
    sourceEngine:"great-lakes-water",
    opportunityType:"calm-water-paddle",
    place:{id:place.id,name:place.name,area:place.area,setting:place.setting,drive:place.drive,driveClass:place.driveClass,officialUrl:place.officialUrl},
    activity:"paddling",
    title:"Lake St. Clair calm-water window",
    score:0,
    quality:"Unavailable",
    reasons:(hardStops||[]).slice(0,4),
    weather:{
      high:weather&&weather.high!==null?Math.round(weather.high):null,
      low:weather&&weather.low!==null?Math.round(weather.low):null,
      rainChance:weather&&weather.rainChance!==null?Math.round(weather.rainChance):null,
      gust:weather&&weather.gust!==null?Math.round(weather.gust):null,
      cloudCover:weather&&weather.cloudCover!==null?Math.round(weather.cloudCover):null,
      aqi:weather&&weather.aqi!==null?Math.round(weather.aqi):null
    },
    standout:false,
    specialist:{
      label:"NOAA/NDBC water check",
      headline:"Water-specific verification unavailable or outside the conservative gate",
      detail:"Detroit Outdoors will not fall back to a weather-only paddling card when required water evidence is missing or unsafe.",
      sourceLabel:"NOAA/NDBC + National Weather Service",
      sourceUrl:"https://www.ndbc.noaa.gov/station_page.php?station=45147",
      toolUrl:"https://chrisizworski.com/great-lakes-buoys/"
    },
    verifyUrl:"https://chrisizworski.com/great-lakes-buoys/",
    caveat:"Paddling remains suppressed until required water observations and hazard checks pass the deterministic gate.",
    timeWindow:{label:"Unavailable until water checks pass",start:null,end:null},
    whyNow,
    verifiedEvidence:[],
    confidence:{level:"low",reason:"Required safety evidence is incomplete or outside the conservative gate."},
    hardStops:hardStops||[],
    specialistHandoff:{label:"Great Lakes Buoys",url:"https://chrisizworski.com/great-lakes-buoys/",requiredBeforeAction:true},
    travel:travelPacket(place),
    uncertainty:["This rejected candidate exists only to keep weaker weather-only paddling advice out of the JEV pool."]
  });
}
function waterCandidate({placeStates,alertStates,waterState}){
  const placeState=byPlace(placeStates,"lake-st-clair-metropark");
  if(!placeState||!placeState.place||!placeState.weather) return [];
  const weather=weatherPacket(placeState);
  if(!weather) return [];
  if(!waterState||!waterState.ok){
    return [waterVetoCandidate(placeState,weather,["Required Great Lakes buoy feed is unavailable."])];
  }
  const stations=Array.isArray(waterState.data&&waterState.data.stations)?waterState.data.stations:[];
  const station=stations.find(s=>String(s&&s.id)==="45147")||null;
  if(!station){
    return [waterVetoCandidate(placeState,weather,["Required NOAA/NDBC station 45147 observation is unavailable."])];
  }
  const waveFt=feetFromMeters(station.wave_ht);
  const buoyWindMph=mphFromMs(station.wind_spd);
  const waterTempF=fahrenheitFromC(station.water_t);
  const observedAge=ageHours(station.obs_time);
  if(waveFt===null||buoyWindMph===null){
    const missing=[];
    if(waveFt===null) missing.push("Required NOAA/NDBC wave-height observation is unavailable.");
    if(buoyWindMph===null) missing.push("Required NOAA/NDBC wind observation is unavailable.");
    return [waterVetoCandidate(placeState,weather,missing)];
  }

  const alertState=byAlertIndex(placeStates,alertStates,"lake-st-clair-metropark");
  const marineHazard=dangerousAlert(alertState,WATER_HARD_ALERT);
  const severeHazard=dangerousAlert(alertState,HARD_WEATHER_ALERT);
  const waterAlertState=waterState.marineAlerts||null;
  const waterAlertFeedValid=Boolean(waterAlertState&&waterAlertState.ok&&waterAlertState.data&&Array.isArray(waterAlertState.data.features));
  const waterAlertEvents=geoJsonAlertEvents(waterAlertState);
  const waterMarineHazard=waterAlertEvents.find(a=>
    WATER_HARD_ALERT.test(String(a.event||""))||
    (String(a.severity||"")==="Extreme"&&/Observed|Likely/i.test(String(a.certainty||"")))
  )||null;
  const hardStops=[];
  if(!alertState||alertState.ok!==true) hardStops.push("Required NWS park-point alert feed is unavailable.");
  if(observedAge===null||observedAge>4) hardStops.push("Required NOAA/NDBC water observation is older than four hours.");
  if(waterTempF===null) hardStops.push("Required NOAA/NDBC water-temperature observation is unavailable.");
  if(!waterAlertFeedValid) hardStops.push("Required NWS Lake St. Clair marine-hazard feed is unavailable.");
  if(marineHazard) hardStops.push(`Active marine/shoreline hazard at the park point: ${safeText(marineHazard.event,100)}.`);
  if(waterMarineHazard) hardStops.push(`Active marine/shoreline hazard at the water-station point: ${safeText(waterMarineHazard.event,100)}.`);
  if(severeHazard) hardStops.push(`Active dangerous weather warning: ${safeText(severeHazard.event,100)}.`);
  if(waveFt>1.5) hardStops.push(`Observed wave height ${waveFt} ft exceeds the conservative Detroit Outdoors paddling gate.`);
  if(buoyWindMph>10) hardStops.push(`Observed buoy wind ${buoyWindMph} mph exceeds the conservative calm-water gate.`);
  if(weather.gust!==null&&weather.gust>16) hardStops.push(`Forecast gusts ${Math.round(weather.gust)} mph exceed the conservative paddling gate.`);
  if(weather.rainChance!==null&&weather.rainChance>30) hardStops.push(`Forecast rain chance ${Math.round(weather.rainChance)}% exceeds the paddling gate.`);
  if(waterTempF!==null&&waterTempF<58) hardStops.push(`Observed water temperature ${Math.round(waterTempF)}°F is below the broad-audience cold-water gate.`);

  const score=clamp(Math.round(
    66+
    (waveFt<=0.7?12:waveFt<=1?9:4)+
    (buoyWindMph<=6?9:buoyWindMph<=9?6:2)+
    (weather.gust!==null&&weather.gust<=12?5:0)+
    (weather.rainChance!==null&&weather.rainChance<=15?4:0)
  ));
  const sourceUrl="https://www.ndbc.noaa.gov/station_page.php?station=45147";
  const place=placeState.place;
  return [normalizeOpportunityCandidate({
    id:"water-lake-st-clair-calm-window",
    sourceEngine:"great-lakes-water",
    opportunityType:"calm-water-paddle",
    place:{id:place.id,name:place.name,area:place.area,setting:place.setting,drive:place.drive,driveClass:place.driveClass,officialUrl:place.officialUrl},
    activity:"paddling",
    title:"Lake St. Clair calm-water window",
    score,
    quality:score>=82?"Exceptional":score>=74?"Strong":score>=66?"Good":"Workable",
    reasons:[
      `NOAA/NDBC 45147 reports waves around ${waveFt} ft`,
      `buoy wind around ${buoyWindMph} mph`,
      weather.gust===null?"forecast gust unavailable":`forecast gusts around ${Math.round(weather.gust)} mph`,
      weather.rainChance===null?"rain chance unavailable":`${Math.round(weather.rainChance)}% rain chance`
    ],
    weather:{
      high:weather.high===null?null:Math.round(weather.high),
      low:weather.low===null?null:Math.round(weather.low),
      rainChance:weather.rainChance===null?null:Math.round(weather.rainChance),
      gust:weather.gust===null?null:Math.round(weather.gust),
      cloudCover:weather.cloudCover===null?null:Math.round(weather.cloudCover),
      aqi:weather.aqi===null?null:Math.round(weather.aqi)
    },
    specialist:{
      label:"NOAA/NDBC water check",
      headline:`${waveFt} ft observed waves · ${buoyWindMph} mph buoy wind`,
      detail:`Station 45147 is about 12 miles from Lake St. Clair Metropark and is a regional water observation, not a launch-specific clearance.`,
      sourceLabel:"NOAA National Data Buoy Center — station 45147",
      sourceUrl,
      toolUrl:"https://chrisizworski.com/great-lakes-buoys/"
    },
    standout:true,
    verifyUrl:"https://chrisizworski.com/great-lakes-buoys/",
    caveat:"This candidate exists only after conservative weather and observed-water gates. Recheck marine alerts, waves, wind, currents, water temperature and launch conditions immediately before entering the water.",
    timeWindow:{label:"Today, while the observed calm holds",start:station.obs_time||null,end:null},
    whyNow:`A fresh Lake St. Clair water observation and the land forecast are aligned closely enough to create a temporary paddling decision, subject to the hard marine gates.`,
    verifiedEvidence:[
      {source:"NOAA NDBC",sourceLabel:"Station 45147",sourceUrl,text:`Observed ${station.obs_time||"time unavailable"}: wave height ${waveFt} ft, wind ${buoyWindMph} mph${waterTempF===null?"":`, water temperature ${waterTempF}°F`}.`},
      {source:"Michigan Outdoors Now",sourceLabel:"Lake St. Clair Metropark place conditions",sourceUrl:"https://michiganoutdoorsnow.chrisizworski.com/places/lake-st-clair-metropark",text:`Forecast gusts ${weather.gust===null?"unavailable":Math.round(weather.gust)+" mph"}; rain chance ${weather.rainChance===null?"unavailable":Math.round(weather.rainChance)+"%"}.`}
    ],
    confidence:{level:observedAge!==null&&observedAge<=2?"high":"medium",reason:"Fresh nearby buoy observation plus place forecast; launch-scale conditions remain unresolved."},
    hardStops,
    specialistHandoff:{label:"Great Lakes Buoys",url:"https://chrisizworski.com/great-lakes-buoys/",requiredBeforeAction:true},
    travel:travelPacket(place),
    uncertainty:[
      "Station 45147 is a nearby regional observation, not a reading at the launch.",
      "Currents, boat traffic, launch status and very local wind shifts are not resolved by this candidate."
    ]
  })];
}
function localHour(iso){
  try{
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",hour:"2-digit",hourCycle:"h23"}).formatToParts(new Date(iso));
    return Number(parts.find(p=>p.type==="hour")&&parts.find(p=>p.type==="hour").value);
  }catch{return null;}
}
function bestNightCloudWindow(region,now=Date.now()){
  const periods=Array.isArray(region&&region.sky_cover&&region.sky_cover.periods)?region.sky_cover.periods:[];
  const horizon=now+20*3600000;
  const rows=periods.map(p=>{
    const start=Date.parse(p.start_time),end=Date.parse(p.end_time);
    const mid=Number.isFinite(start)&&Number.isFinite(end)?new Date((start+end)/2).toISOString():p.start_time;
    return {...p,startMs:start,endMs:end,hour:localHour(mid),percent:finite(p.percent)};
  }).filter(p=>Number.isFinite(p.startMs)&&p.startMs>=now-3600000&&p.startMs<=horizon&&p.percent!==null&&(p.hour>=20||p.hour<=4));
  if(!rows.length) return null;
  let best=null;
  const windowSize=Math.min(3,rows.length);
  for(let i=0;i<=rows.length-windowSize;i++){
    const group=rows.slice(i,i+windowSize);
    const avg=Math.round(group.reduce((s,p)=>s+p.percent,0)/group.length);
    if(!best||avg<best.cloudPercent) best={cloudPercent:avg,start:group[0].start_time,end:group[group.length-1].end_time};
  }
  return best;
}
function nightSkyCandidate({placeStates,alertStates,nightSkyState}){
  const placeState=byPlace(placeStates,"port-crescent-state-park");
  if(!placeState||!placeState.place||!placeState.weather||!nightSkyState||!nightSkyState.ok) return [];
  const regions=Array.isArray(nightSkyState.data&&nightSkyState.data.ovation&&nightSkyState.data.ovation.regions)?nightSkyState.data.ovation.regions:[];
  const region=regions.find(r=>r&&r.id==="bay-city")||null;
  if(!region) return [];
  const window=bestNightCloudWindow(region);
  if(!window) return [];
  const level=String(region.level||"low");
  const auroraInteresting=["watch","possible","active","strong"].includes(level);
  if(!auroraInteresting&&window.cloudPercent>24) return [];
  const weather=weatherPacket(placeState);
  const alertState=byAlertIndex(placeStates,alertStates,"port-crescent-state-park");
  const severeHazard=dangerousAlert(alertState,HARD_WEATHER_ALERT);
  const hardStops=[];
  if(!alertState||alertState.ok!==true) hardStops.push("Required NWS alert feed is unavailable.");
  if(severeHazard) hardStops.push(`Active dangerous weather warning: ${safeText(severeHazard.event,100)}.`);
  if(window.cloudPercent>55) hardStops.push(`Best near-term night cloud window is still ${window.cloudPercent}%.`);
  if(weather&&weather.rainChance!==null&&weather.rainChance>35) hardStops.push(`Forecast rain chance ${Math.round(weather.rainChance)}% exceeds the night-sky gate.`);
  if(!nightSkyState.data||!nightSkyState.data.ovation||!nightSkyState.data.forecast) hardStops.push("Required NOAA aurora forecast packet is incomplete.");

  const signalBoost=level==="active"||level==="strong"?18:level==="possible"?12:level==="watch"?6:0;
  const score=clamp(Math.round(58+signalBoost+(window.cloudPercent<=10?22:window.cloudPercent<=20?16:window.cloudPercent<=35?9:2)));
  const place=placeState.place;
  const peak24=finite(nightSkyState.data&&nightSkyState.data.forecast&&nightSkyState.data.forecast.peak_24h);
  const ovation=finite(region.ovation_value);
  const label=auroraInteresting?"Dark-sky + aurora check":"Clear dark-sky window";
  return [normalizeOpportunityCandidate({
    id:"night-port-crescent-sky-window",
    sourceEngine:"night-sky-aurora",
    opportunityType:auroraInteresting?"aurora-dark-sky":"clear-dark-sky",
    place:{id:place.id,name:place.name,area:place.area,setting:place.setting,drive:place.drive,driveClass:place.driveClass,officialUrl:place.officialUrl},
    activity:"dark-sky",
    title:label,
    score,
    quality:score>=82?"Exceptional":score>=74?"Strong":score>=66?"Good":"Workable",
    reasons:[
      `best near-term night cloud window around ${window.cloudPercent}%`,
      `NOAA regional aurora posture: ${safeText(region.status_label||level,100)}`,
      peak24===null?"24-hour Kp peak unavailable":`24-hour Kp forecast peak ${peak24}`
    ],
    weather:{
      high:weather&&weather.high!==null?Math.round(weather.high):null,
      low:weather&&weather.low!==null?Math.round(weather.low):null,
      rainChance:weather&&weather.rainChance!==null?Math.round(weather.rainChance):null,
      gust:weather&&weather.gust!==null?Math.round(weather.gust):null,
      cloudCover:window.cloudPercent,
      aqi:weather&&weather.aqi!==null?Math.round(weather.aqi):null
    },
    specialist:{
      label:"NOAA space-weather + NWS sky check",
      headline:`${safeText(region.status_label||level,120)} · best near-term night clouds ~${window.cloudPercent}%`,
      detail:safeText(region.detail||"Aurora output is modeled and must be confirmed against live sky conditions.",220),
      sourceLabel:"NOAA SWPC + NWS digital sky cover",
      sourceUrl:"https://www.spaceweather.gov/products/aurora-30-minute-forecast",
      toolUrl:"https://chrisizworski.com/northern-lights-michigan/"
    },
    standout:auroraInteresting||window.cloudPercent<=15,
    verifyUrl:"https://chrisizworski.com/northern-lights-michigan/",
    caveat:"NOAA Kp and OVATION are modeled planning signals, not a visibility guarantee. Clouds, darkness, moonlight, horizon quality, light pollution and access still control the actual view.",
    timeWindow:{label:"Tonight",start:window.start,end:window.end},
    whyNow:auroraInteresting
      ?"A dark-sky site, a usable cloud window and a non-low NOAA aurora posture overlap tonight."
      :"The specialist sky engine found a notably clear near-term dark-sky window even though the aurora signal itself is not elevated.",
    verifiedEvidence:[
      {source:"NOAA SWPC",sourceLabel:"NOAA aurora forecast",sourceUrl:"https://www.spaceweather.gov/products/aurora-30-minute-forecast",text:`Regional posture ${safeText(region.status_label||level,120)}; OVATION grid ${ovation===null?"unavailable":ovation}; 24-hour Kp peak ${peak24===null?"unavailable":peak24}.`},
      {source:"NWS NDFD",sourceLabel:"NWS sky cover via existing Michigan aurora engine",sourceUrl:"https://www.weather.gov/documentation/services-web-api",text:`Best near-term nighttime sky-cover window averages about ${window.cloudPercent}% from ${window.start} to ${window.end}.`}
    ],
    confidence:{level:auroraInteresting&&window.cloudPercent<=25?"high":"medium",reason:"Shared Michigan aurora engine plus NWS sky-cover forecast; local visibility is not directly observed."},
    hardStops,
    specialistHandoff:{label:"Northern Lights Michigan",url:"https://chrisizworski.com/northern-lights-michigan/",requiredBeforeAction:true},
    travel:travelPacket(place),
    uncertainty:[
      "OVATION and Kp do not guarantee visible aurora at Port Crescent.",
      "Sky cover is a forecast grid value rather than an on-site observation."
    ]
  })];
}
function fallColorCandidates({placeStates,alertStates,fallSnapshot}){
  if(!fallSnapshot||!["rising","peak","falling"].includes(String(fallSnapshot.phase))||finite(fallSnapshot.pct)===null||fallSnapshot.pct<20) return [];
  const rows=[];
  for(const id of ["kensington-metropark","waterloo"]){
    const placeState=byPlace(placeStates,id);
    if(!placeState||!placeState.place||!placeState.weather) continue;
    const weather=weatherPacket(placeState);
    if(!weather) continue;
    const potential=(weather.rainChance===null||weather.rainChance<=40)&&(weather.gust===null||weather.gust<=24);
    if(!potential) continue;
    const alertState=byAlertIndex(placeStates,alertStates,id);
    const severeHazard=dangerousAlert(alertState,HARD_WEATHER_ALERT);
    const hardStops=[];
    if(!alertState||alertState.ok!==true) hardStops.push("Required NWS alert feed is unavailable.");
    if(severeHazard) hardStops.push(`Active dangerous weather warning: ${safeText(severeHazard.event,100)}.`);
    if(weather.rainChance!==null&&weather.rainChance>35) hardStops.push(`Forecast rain chance ${Math.round(weather.rainChance)}% is too high for the scenic-window gate.`);
    if(weather.gust!==null&&weather.gust>22) hardStops.push(`Forecast gusts ${Math.round(weather.gust)} mph are too high for the foliage-walk gate.`);
    const pct=Math.round(fallSnapshot.pct);
    const score=clamp(Math.round(58+Math.min(24,pct/4)+(weather.rainChance!==null&&weather.rainChance<=15?8:0)+(weather.gust!==null&&weather.gust<=12?6:0)));
    const place=placeState.place;
    rows.push(normalizeOpportunityCandidate({
      id:`fall-color-${id}`,
      sourceEngine:"fall-color-phenology",
      opportunityType:"fall-color-walk",
      place:{id:place.id,name:place.name,area:place.area,setting:place.setting,drive:place.drive,driveClass:place.driveClass,officialUrl:place.officialUrl},
      activity:"fall-color",
      title:"Fall-color walk window",
      score,
      quality:score>=82?"Exceptional":score>=74?"Strong":score>=66?"Good":"Workable",
      reasons:[
        `Southeast Lower fall-color model: ${safeText(fallSnapshot.label,80)} (~${pct}%)`,
        weather.rainChance===null?"rain chance unavailable":`${Math.round(weather.rainChance)}% rain chance`,
        weather.gust===null?"gust forecast unavailable":`gusts around ${Math.round(weather.gust)} mph`
      ],
      weather:{
        high:weather.high===null?null:Math.round(weather.high),
        low:weather.low===null?null:Math.round(weather.low),
        rainChance:weather.rainChance===null?null:Math.round(weather.rainChance),
        gust:weather.gust===null?null:Math.round(weather.gust),
        cloudCover:weather.cloudCover===null?null:Math.round(weather.cloudCover),
        aqi:weather.aqi===null?null:Math.round(weather.aqi)
      },
      specialist:{
        label:"Southeast Lower fall-color model",
        headline:`${safeText(fallSnapshot.label,90)} · modeled ~${pct}%`,
        detail:"Regional climatology blended with available seasonal drivers. It does not prove exact tree conditions at this park.",
        sourceLabel:"Chris Izworski Fall Color model",
        sourceUrl:"https://chrisizworski.com/fall-color/",
        toolUrl:"https://chrisizworski.com/fall-color/ann-arbor-irish-hills-fall-color/"
      },
      standout:fallSnapshot.phase==="peak"||pct>=65,
      verifyUrl:"https://chrisizworski.com/fall-color/ann-arbor-irish-hills-fall-color/",
      caveat:"This is a regional phenology lead, not an on-site leaf report. Expect species, exposure and individual trees to vary within the park.",
      timeWindow:{label:"Today / short seasonal window",start:null,end:null},
      whyNow:`Regional color is in the ${safeText(fallSnapshot.phase,40)} phase while dry, lower-wind outing weather overlaps the seasonal window.`,
      verifiedEvidence:[
        {source:"Shared fall-color model",sourceLabel:"Southeast Lower fall-color model",sourceUrl:"https://chrisizworski.com/fall-color/",text:`${safeText(fallSnapshot.label,80)}, about ${pct}%, phase ${safeText(fallSnapshot.phase,40)}; climatological peak window ${safeText(fallSnapshot.peakWindow,80)}.`},
        {source:"Michigan Outdoors Now",sourceLabel:`${place.name} place conditions`,sourceUrl:`https://michiganoutdoorsnow.chrisizworski.com/places/${place.id}`,text:`Rain chance ${weather.rainChance===null?"unavailable":Math.round(weather.rainChance)+"%"}; gusts ${weather.gust===null?"unavailable":Math.round(weather.gust)+" mph"}.`}
      ],
      confidence:{level:"medium",reason:"Regional phenology is evidence-backed but not a park-level observation."},
      hardStops,
      specialistHandoff:{label:"Southeast Michigan fall color",url:"https://chrisizworski.com/fall-color/ann-arbor-irish-hills-fall-color/",requiredBeforeAction:false},
      travel:travelPacket(place),
      uncertainty:[
        "Regional fall-color modeling cannot establish exact foliage at a specific park.",
        "Species and microclimate can shift color within the same destination."
      ]
    }));
  }
  return rows.slice(0,2);
}

function sunsetPhotographyCandidate({placeStates,alertStates,nightSkyState,now=new Date()}){
  const placeState=byPlace(placeStates,"belle-isle");
  if(!placeState||!placeState.weather||!nightSkyState||!nightSkyState.ok) return [];
  const weather=weatherPacket(placeState);
  if(!weather) return [];
  const regions=Array.isArray(nightSkyState.data&&nightSkyState.data.ovation&&nightSkyState.data.ovation.regions)?nightSkyState.data.ovation.regions:[];
  const region=regions.find(r=>r&&r.id==="detroit")||null;
  if(!region) return [];
  const date=michiganDateKey(now);
  const sunset=solarMinutes(date,42.3314,-83.0458,false);
  const nowMinute=currentLocalMinute(now);
  if(nowMinute!==null&&nowMinute>sunset+45) return [];
  const sky=sunsetCloudWindow(region,date,sunset);
  if(!sky||sky.cloudPercent>82) return [];
  const alertState=byAlertIndex(placeStates,alertStates,"belle-isle");
  const severeHazard=dangerousAlert(alertState,HARD_WEATHER_ALERT);
  const hardStops=[];
  if(!alertState||alertState.ok!==true) hardStops.push("Required NWS alert feed is unavailable.");
  if(severeHazard) hardStops.push(`Active dangerous weather warning: ${safeText(severeHazard.event,100)}.`);
  if(weather.rainChance!==null&&weather.rainChance>45) hardStops.push(`Forecast rain chance ${Math.round(weather.rainChance)}% is too high for the sunset-photo gate.`);
  if(weather.gust!==null&&weather.gust>28) hardStops.push(`Forecast gusts ${Math.round(weather.gust)} mph are too high for the sunset-photo gate.`);
  if(weather.aqi!==null&&weather.aqi>125) hardStops.push(`AQI ${Math.round(weather.aqi)} exceeds the clear-air gate.`);

  let score=52;
  score += sky.cloudPercent>=25&&sky.cloudPercent<=70?20:sky.cloudPercent>=10&&sky.cloudPercent<25?15:sky.cloudPercent<10?9:8;
  if(weather.rainChance!==null) score += weather.rainChance<=15?10:weather.rainChance<=30?5:0;
  if(weather.gust!==null) score += weather.gust<=12?9:weather.gust<=18?5:0;
  if(weather.aqi!==null) score += weather.aqi<=50?9:weather.aqi<=75?5:0;
  score=clamp(Math.round(score));
  if(score<72) return [];

  return [normalizeOpportunityCandidate({
    id:"riverfront-sunset-photo",
    sourceEngine:"sunset-photography",
    opportunityType:"sunset-photography",
    place:DETROIT_RIVERFRONT,
    activity:"photography",
    title:"Detroit River sunset / photography window",
    score,
    quality:score>=86?"Exceptional":score>=78?"Strong":"Good",
    reasons:[
      `sunset around ${clock(sunset)}`,
      `NWS sky-cover window around ${sky.cloudPercent}%`,
      weather.gust===null?"gust forecast unavailable":`gusts around ${Math.round(weather.gust)} mph`,
      weather.aqi===null?"AQI unavailable":`AQI ${Math.round(weather.aqi)}`
    ],
    weather:{
      high:weather.high===null?null:Math.round(weather.high),
      low:weather.low===null?null:Math.round(weather.low),
      rainChance:weather.rainChance===null?null:Math.round(weather.rainChance),
      gust:weather.gust===null?null:Math.round(weather.gust),
      cloudCover:sky.cloudPercent,
      aqi:weather.aqi===null?null:Math.round(weather.aqi)
    },
    specialist:{
      label:"Solar geometry + NWS sky-cover check",
      headline:`Sunset ~${clock(sunset)} · sky cover ~${sky.cloudPercent}%`,
      detail:"This combines deterministic sunset geometry with the existing NWS Detroit sky-cover feed and nearby live weather/AQI. It does not predict colorful clouds.",
      sourceLabel:"NWS digital sky cover + Detroit Riverfront Conservancy",
      sourceUrl:"https://www.weather.gov/documentation/services-web-api",
      toolUrl:"https://www.detroitriverfront.org/plan-your-visit/parks-greenways/the-riverwalk"
    },
    standout:score>=82,
    verifyUrl:"https://www.detroitriverfront.org/plan-your-visit/parks-greenways/the-riverwalk",
    caveat:"Sky-cover percentage does not resolve cloud type, western-horizon obstruction or whether the sunset will become colorful. Casual photography is allowed; commercial work has separate Riverfront rules.",
    timeWindow:{label:`Golden hour into ~${clock(sunset)} sunset`,start:sky.start,end:sky.end},
    whyNow:"Low travel friction, usable air/wind/rain conditions and a bounded NWS sky-cover window overlap the Detroit River sunset period.",
    verifiedEvidence:[
      {source:"NWS NDFD",sourceLabel:"NWS Detroit sky cover",sourceUrl:"https://www.weather.gov/documentation/services-web-api",text:`Near-sunset Detroit sky-cover periods average about ${sky.cloudPercent}% around a deterministic ${clock(sunset)} sunset.`},
      {source:"Michigan Outdoors Now",sourceLabel:"Nearby Belle Isle conditions",sourceUrl:"https://michiganoutdoorsnow.chrisizworski.com/places/belle-isle",text:`Nearby Detroit conditions: rain chance ${weather.rainChance===null?"unavailable":Math.round(weather.rainChance)+"%"}, gusts ${weather.gust===null?"unavailable":Math.round(weather.gust)+" mph"}, AQI ${weather.aqi===null?"unavailable":Math.round(weather.aqi)}.`},
      {source:"Detroit Riverfront Conservancy",sourceLabel:"Detroit Riverwalk",sourceUrl:"https://www.detroitriverfront.org/plan-your-visit/parks-greenways/the-riverwalk",text:"The Detroit Riverwalk is a nearly five-mile public riverfront corridor for walking, biking and river views; managed riverfront spaces are generally open 6 a.m. to 10 p.m."}
    ],
    confidence:{level:sky.periods>=2?"high":"medium",reason:"Deterministic solar timing plus NWS sky cover and nearby Detroit weather; cloud character remains unresolved."},
    hardStops,
    specialistHandoff:{label:"Detroit Riverfront",url:"https://www.detroitriverfront.org/plan-your-visit/parks-greenways/the-riverwalk",requiredBeforeAction:false},
    travel:travelPacket(DETROIT_RIVERFRONT),
    uncertainty:[
      "Sky-cover percentage cannot predict cloud color or texture.",
      "Belle Isle weather is nearby Detroit context rather than an observation on every Riverwalk segment."
    ]
  })];
}

function freighterWatchingCandidate({placeStates,alertStates,aisState}){
  if(!aisState||!aisState.ok||!aisState.data||!Array.isArray(aisState.data.vessels)) return [];
  const placeState=byPlace(placeStates,"belle-isle");
  const weather=weatherPacket(placeState);
  const alertState=byAlertIndex(placeStates,alertStates,"belle-isle");
  const severeHazard=dangerousAlert(alertState,HARD_WEATHER_ALERT);
  const hardStops=[];
  if(!alertState||alertState.ok!==true) hardStops.push("Required NWS alert feed is unavailable.");
  if(severeHazard) hardStops.push(`Active dangerous weather warning: ${safeText(severeHazard.event,100)}.`);

  const candidates=aisState.data.vessels.map(v=>{
    const lat=finite(v&&v.lat),lon=finite(v&&v.lon),type=finite(v&&v.shipType);
    if(lat===null||lon===null||type===null||type<70||type>89||!v.name) return null;
    const miles=haversineMiles(42.3314,-83.0458,lat,lon);
    if(miles>12) return null;
    return {...v,miles};
  }).filter(Boolean).sort((a,b)=>a.miles-b.miles);
  if(!candidates.length) return [];
  const vessel=candidates[0];
  const distance=Math.round(vessel.miles*10)/10;
  const score=clamp(Math.round((distance<=2?91:distance<=5?86:distance<=8?80:74)+(finite(vessel.speedKnots)!==null&&vessel.speedKnots>=5?3:0)));
  return [normalizeOpportunityCandidate({
    id:"riverfront-live-freighter",
    sourceEngine:"great-lakes-ais",
    opportunityType:"live-freighter-passage",
    place:DETROIT_RIVERFRONT,
    activity:"freighter-watching",
    title:"Detroit River live freighter window",
    score,
    quality:score>=88?"Exceptional":score>=80?"Strong":"Good",
    reasons:[
      `fresh AIS report: ${safeText(vessel.name,100)} about ${distance} mi from the riverfront reference point`,
      finite(vessel.speedKnots)===null?"speed unavailable":`reported speed ${vessel.speedKnots.toFixed(1)} kn`,
      `AIS report time ${safeText(vessel.seen,80)}`
    ],
    weather:weather?{
      high:weather.high===null?null:Math.round(weather.high),
      low:weather.low===null?null:Math.round(weather.low),
      rainChance:weather.rainChance===null?null:Math.round(weather.rainChance),
      gust:weather.gust===null?null:Math.round(weather.gust),
      cloudCover:weather.cloudCover===null?null:Math.round(weather.cloudCover),
      aqi:weather.aqi===null?null:Math.round(weather.aqi)
    }:null,
    specialist:{
      label:"Fresh Great Lakes AIS",
      headline:`${safeText(vessel.name,100)} · ~${distance} mi from Detroit Riverfront`,
      detail:"The shared Great Lakes tracker accepts only recent AIS reports (up to 30 minutes old). AIS may still be delayed, incomplete or disappear before arrival.",
      sourceLabel:"Open Waters AIS via Great Lakes Ship Tracker",
      sourceUrl:"https://chrisizworski.com/great-lakes-freighter-tracking/",
      toolUrl:"https://chrisizworski.com/great-lakes-freighter-tracking/"
    },
    standout:distance<=6,
    verifyUrl:"https://chrisizworski.com/great-lakes-freighter-tracking/",
    caveat:"AIS is informational and not a passage schedule. Vessel reports can be delayed, incomplete or absent; verify the live map before leaving.",
    timeWindow:{label:"Now / verify before leaving",start:vessel.seen||null,end:null},
    whyNow:`A fresh AIS report places a named commercial vessel about ${distance} miles from the Detroit Riverfront, creating a short-lived ship-watching opportunity if the live map still confirms it.`,
    verifiedEvidence:[
      {source:"Great Lakes Ship Tracker",sourceLabel:"Fresh AIS vessel report",sourceUrl:"https://chrisizworski.com/great-lakes-freighter-tracking/",text:`${safeText(vessel.name,100)} reported at ${safeText(vessel.seen,80)}, about ${distance} miles from the Detroit Riverfront reference point${finite(vessel.speedKnots)===null?"":`, speed ${vessel.speedKnots.toFixed(1)} kn`}.`},
      {source:"Detroit Riverfront Conservancy",sourceLabel:"Detroit Riverwalk",sourceUrl:"https://www.detroitriverfront.org/plan-your-visit/parks-greenways/the-riverwalk",text:"The Detroit Riverwalk is a public riverfront corridor with direct Detroit River views and nearly five miles of connected walking space."}
    ],
    confidence:{level:distance<=5?"high":"medium",reason:"Fresh normalized AIS position; future vessel movement and exact passage timing remain uncertain."},
    hardStops,
    specialistHandoff:{label:"Great Lakes Ship Tracker",url:"https://chrisizworski.com/great-lakes-freighter-tracking/",requiredBeforeAction:true},
    travel:travelPacket(DETROIT_RIVERFRONT),
    uncertainty:[
      "AIS does not guarantee the vessel will remain visible from a specific Riverwalk segment.",
      "Commercial-vessel position data may be delayed or incomplete."
    ]
  })];
}
function emitSpecialistCandidates({placeStates,alertStates,fallSnapshot,specialistStates}){
  const water=waterCandidate({placeStates,alertStates,waterState:specialistStates&&specialistStates.water});
  const nightSky=nightSkyCandidate({placeStates,alertStates,nightSkyState:specialistStates&&specialistStates.nightSky});
  const fallColor=fallColorCandidates({placeStates,alertStates,fallSnapshot});
  const sunset=sunsetPhotographyCandidate({placeStates,alertStates,nightSkyState:specialistStates&&specialistStates.nightSky});
  const freighter=freighterWatchingCandidate({placeStates,alertStates,aisState:specialistStates&&specialistStates.freighterAis});
  const expanded=emitExpandedCandidates({placeStates,expandedStates:specialistStates||{}});
  return {
    byEngine:{
      "great-lakes-water":water,
      "night-sky-aurora":nightSky,
      "fall-color-phenology":fallColor,
      "sunset-photography":sunset,
      "great-lakes-ais":freighter,
      ...expanded.byEngine
    },
    candidates:[...water,...nightSky,...fallColor,...sunset,...freighter,...expanded.candidates]
  };
}
function hardGateSpecialistCandidates(candidates){
  const safe=[],rejected=[];
  for(const candidate of candidates||[]){
    const stops=(candidate&&candidate.hardStops||[]).filter(Boolean);
    const requiredEvidence=Array.isArray(candidate&&candidate.verifiedEvidence)&&candidate.verifiedEvidence.length>0;
    if(!requiredEvidence) stops.push("Candidate has no verified evidence packet.");
    if(stops.length){
      rejected.push({
        id:candidate&&candidate.id||null,
        sourceEngine:candidate&&candidate.sourceEngine||null,
        placeId:candidate&&candidate.place&&candidate.place.id||null,
        activity:candidate&&candidate.activity||null,
        opportunityType:candidate&&candidate.opportunityType||null,
        reasons:[...new Set(stops)]
      });
    }else{
      safe.push(candidate);
    }
  }
  return {safe,rejected};
}
function dedupeMixedPool(parkCandidates,specialistCandidates,rejectedSpecialistCandidates=[]){
  const vetoKeys=new Map();
  for(const rejected of rejectedSpecialistCandidates||[]){
    if(!rejected||!rejected.placeId||!rejected.activity) continue;
    const key=`${rejected.placeId}|${rejected.activity}`;
    vetoKeys.set(key,rejected);
  }

  const out=[];
  const keyIndex=new Map();
  const replaced=[];
  const vetoedLegacy=[];
  for(const candidate of parkCandidates||[]){
    const normalized=normalizeOpportunityCandidate(candidate);
    const key=`${normalized.place&&normalized.place.id||""}|${normalized.activity||""}`;
    const veto=vetoKeys.get(key);
    if(veto&&normalized.sourceEngine==="park-weather"){
      vetoedLegacy.push({
        legacyId:normalized.id,
        specialistId:veto.id,
        sourceEngine:veto.sourceEngine,
        key,
        reasons:veto.reasons||[]
      });
      continue;
    }
    keyIndex.set(key,out.length);
    out.push(normalized);
  }
  for(const candidate of specialistCandidates||[]){
    const normalized=normalizeOpportunityCandidate(candidate);
    const key=`${normalized.place&&normalized.place.id||""}|${normalized.activity||""}`;
    if(keyIndex.has(key)){
      const index=keyIndex.get(key);
      const prior=out[index];
      if(prior&&prior.sourceEngine==="park-weather"){
        replaced.push({replacedId:prior.id,replacementId:normalized.id,key});
        out[index]=normalized;
        continue;
      }
    }
    keyIndex.set(key,out.length);
    out.push(normalized);
  }
  return {candidates:out,replaced,vetoedLegacy};
}
function bundleQuality(score){
  if(score>=86) return "Exceptional";
  if(score>=78) return "Strong";
  if(score>=68) return "Good";
  if(score>=58) return "Workable";
  return "Weak";
}
function uniqueStrings(values){
  return [...new Set((values||[]).map(v=>safeText(v,600)).filter(Boolean))];
}
function locationSignal(candidate){
  return {
    id:candidate.id,
    sourceEngine:candidate.sourceEngine,
    opportunityType:candidate.opportunityType,
    activity:candidate.activity,
    title:candidate.title,
    score:candidate.score,
    quality:candidate.quality,
    whyNow:candidate.whyNow,
    reasons:Array.isArray(candidate.reasons)?candidate.reasons.slice(0,4):[],
    timeWindow:candidate.timeWindow||null,
    specialist:candidate.specialist||null,
    specialistHandoff:candidate.specialistHandoff||null,
    verifyUrl:candidate.verifyUrl||null,
    caveat:candidate.caveat||null
  };
}
function bundleCandidatesByPlace(candidates){
  const groups=new Map();
  for(const candidate of candidates||[]){
    if(!candidate||!candidate.place||!candidate.place.id) continue;
    const key=candidate.place.id;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(candidate);
  }
  const bundled=[];
  for(const rows of groups.values()){
    const sorted=[...rows].sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0));
    const primary=sorted[0];
    const signals=sorted.map(locationSignal);
    const sourceEngines=uniqueStrings(sorted.map(row=>row.sourceEngine));
    const activities=uniqueStrings(sorted.map(row=>row.activity));
    if(sorted.length===1){
      bundled.push({...primary,bundleSignals:signals,sourceEngines,activities});
      continue;
    }
    const verifiedEvidence=[];
    const evidenceSeen=new Set();
    for(const row of sorted){
      for(const item of row.verifiedEvidence||[]){
        const key=safeText((item&&item.sourceUrl)||"")+"|"+safeText((item&&item.text)||"",240);
        if(!key||evidenceSeen.has(key)) continue;
        evidenceSeen.add(key);
        verifiedEvidence.push(item);
      }
    }
    const score=clamp(Math.round((Number(primary.score)||0)+Math.min(6,(sorted.length-1)*2)));
    const signalLabels=uniqueStrings(signals.map(signal=>signal.title||signal.opportunityType||signal.activity));
    const reasons=uniqueStrings(signals.map(signal=>signal.whyNow||(signal.reasons||[])[0]||signal.title)).slice(0,6);
    const uncertainty=uniqueStrings(sorted.flatMap(row=>row.uncertainty||[])).slice(0,8);
    const caveats=uniqueStrings(sorted.map(row=>row.caveat)).slice(0,3);
    bundled.push(normalizeOpportunityCandidate({
      ...primary,
      id:`location-${primary.place.id}`,
      sourceEngine:primary.sourceEngine,
      sourceEngines,
      activities,
      opportunityType:"location-bundle",
      title:`${signals.length} live reasons to go`,
      score,
      quality:bundleQuality(score),
      reasons,
      whyNow:`${primary.place.name} has ${signals.length} separate hard-safe reasons to consider it today: ${signalLabels.join("; ")}.`,
      verifiedEvidence,
      hardStops:[],
      uncertainty,
      caveat:caveats.length?caveats.join(" "):"Each live signal keeps its own verification requirement before you act.",
      bundleSignals:signals
    }));
  }
  return bundled;
}

function countByEngine(candidates){
  const counts={};
  for(const c of candidates||[]){
    const keys=Array.isArray(c&&c.sourceEngines)&&c.sourceEngines.length?c.sourceEngines:[c&&c.sourceEngine||"unknown"];
    for(const key of keys) counts[key]=(counts[key]||0)+1;
  }
  return counts;
}
function engineDiagnostics({parkCandidates,emitted,gated,mixedPool,boardPool,selected,specialistStates,replaced,vetoedLegacy}){
  const emittedCounts=Object.fromEntries(Object.entries(emitted&&emitted.byEngine||{}).map(([id,rows])=>[id,(rows||[]).length]));
  const safeCounts=countByEngine(gated&&gated.safe||[]);
  const selectedCounts=countByEngine(selected||[]);
  const mixedCounts=countByEngine(mixedPool||[]);
  const sourceStatus={
    "great-lakes-water":{
      ok:Boolean(specialistStates&&specialistStates.water&&specialistStates.water.ok&&specialistStates.water.marineAlerts&&specialistStates.water.marineAlerts.ok),
      error:specialistStates&&specialistStates.water&&(specialistStates.water.error||(specialistStates.water.marineAlerts&&specialistStates.water.marineAlerts.error))||null
    },
    "night-sky-aurora":{ok:Boolean(specialistStates&&specialistStates.nightSky&&specialistStates.nightSky.ok),error:specialistStates&&specialistStates.nightSky&&specialistStates.nightSky.error||null},
    "sunset-photography":{ok:Boolean(specialistStates&&specialistStates.nightSky&&specialistStates.nightSky.ok),error:specialistStates&&specialistStates.nightSky&&specialistStates.nightSky.error||null},
    "great-lakes-ais":{ok:Boolean(specialistStates&&specialistStates.freighterAis&&specialistStates.freighterAis.ok),error:specialistStates&&specialistStates.freighterAis&&specialistStates.freighterAis.error||null},
    "fall-color-phenology":{ok:true,error:null},
    "clean-air-window":{ok:true,error:null},
    ...expandedSourceStatus(specialistStates||{}),
    "park-weather":{ok:true,error:null}
  };
  return {
    registry:DETROIT_ENGINE_REGISTRY.map(engine=>({id:engine.id,family:engine.family,role:engine.role,status:engine.status,source:engine.source,handoff:engine.handoff})),
    sourceStatus,
    emittedCandidateCountByEngine:{"park-weather":(parkCandidates||[]).length,...emittedCounts},
    safeCandidateCountByEngine:{"park-weather":(parkCandidates||[]).length,...safeCounts},
    mixedSafeCandidateCount:(mixedPool||[]).length,
    mixedSafeCandidateCountByEngine:mixedCounts,
    boardLocationCandidateCount:(boardPool||mixedPool||[]).length,
    boardLocationCandidateCountByEngine:countByEngine(boardPool||mixedPool||[]),
    bundledLocations:(boardPool||[]).filter(c=>Array.isArray(c&&c.bundleSignals)&&c.bundleSignals.length>1).map(c=>({
      id:c.id,
      placeId:c.place&&c.place.id||null,
      place:c.place&&c.place.name||null,
      signalCount:c.bundleSignals.length,
      signalIds:c.bundleSignals.map(signal=>signal&&signal.id).filter(Boolean),
      sourceEngines:c.sourceEngines||[]
    })),
    selectedIds:(selected||[]).map(c=>c&&c.id).filter(Boolean),
    selectedEngineCountByEngine:selectedCounts,
    selectedEngineDiversity:Object.keys(selectedCounts).length,
    hardRejected:gated&&gated.rejected||[],
    replacedLegacyDuplicates:replaced||[],
    vetoedLegacyCandidates:vetoedLegacy||[]
  };
}

module.exports={
  BUOY_API,
  AURORA_API,
  FREIGHTER_AIS_API,
  LAKE_ST_CLAIR_MARINE_ALERTS,
  WATER_HARD_ALERT,
  loadSpecialistEngineStates,
  normalizeOpportunityCandidate,
  emitSpecialistCandidates,
  hardGateSpecialistCandidates,
  dedupeMixedPool,
  bundleCandidatesByPlace,
  countByEngine,
  engineDiagnostics,
  _test:{ageHours,feetFromMeters,mphFromMs,fahrenheitFromC,bestNightCloudWindow,solarMinutes,sunsetCloudWindow,haversineMiles,waterCandidate,nightSkyCandidate,fallColorCandidates,sunsetPhotographyCandidate,freighterWatchingCandidate}
};
