"use strict";

const DISCOVERY_API="https://michiganoutdoorsnow.chrisizworski.com/api/discover";
const OPEN_METEO_API="https://api.open-meteo.com/v1/forecast";
const NWS_ALERTS_API="https://api.weather.gov/alerts/active";
const TZ="America/Detroit";
const DETROIT={name:"Detroit",latitude:42.3314,longitude:-83.0458};
const MAX_DISCOVERY_PLACES=40;
const MAX_EVALUATED_PLACES=12;
const HARD_ALERT=/(Tornado Warning|Severe Thunderstorm Warning|Flash Flood Warning|Extreme Wind Warning|Blizzard Warning|Ice Storm Warning|Hurricane Warning|Tropical Storm Warning)/i;
const LEGACY_NAMES=new Set([
  "belle isle park",
  "lake st clair metropark",
  "kensington metropark",
  "waterloo recreation area",
  "shiawassee national wildlife refuge",
  "port crescent state park"
]);

function finite(value){
  if(value===null||value===undefined||value==="")return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,value));}
function safeText(value,max=280){return String(value==null?"":value).replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function slug(value){return safeText(value,140).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function normalizedName(value){return safeText(value,180).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function todayDetroit(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const row=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${row.year}-${row.month}-${row.day}`;
}
function driveBand(place){
  const minutes=finite(place&&place.driveMinutes);
  const hours=minutes===null?finite(place&&place.driveHours):minutes/60;
  if(hours===null)return "varies";
  const center=Math.max(10,Math.round(hours*60/5)*5);
  const low=Math.max(5,center-10),high=center+10;
  return `${low}–${high} min`;
}
function driveClass(place){
  const minutes=finite(place&&place.driveMinutes);
  const hours=minutes===null?finite(place&&place.driveHours):minutes/60;
  if(hours===null)return "mid";
  if(hours<=1)return "near";
  if(hours<=1.75)return "mid";
  return "far";
}
function activityForCategory(category){
  if(category==="wildlife")return "birding";
  if(category==="trailhead"||category==="park"||category==="campground")return "hiking";
  return "scenic";
}
function settingFor(place){
  const label=safeText(place&&place.categoryLabel,100)||"Outdoor place";
  const source=place&&place.source==="OpenStreetMap"?"mapped outdoor place":"curated Michigan destination";
  return `${label} · ${source}`;
}
function placeShape(place){
  const curated=safeText(place&&place.curatedPlaceId,140);
  const rawId=safeText(place&&place.id,140);
  return {
    id:curated||`regional-${slug(rawId||place&&place.name||"place")}`,
    name:safeText(place&&place.name,180),
    area:safeText(place&&place.area||"Metro Detroit",120),
    setting:settingFor(place),
    drive:driveBand(place),
    driveClass:driveClass(place),
    officialUrl:safeText(place&&place.website||place&&place.sourceUrl,500),
    lat:finite(place&&place.latitude),
    lon:finite(place&&place.longitude)
  };
}
async function fetchJson(url,options={},timeoutMs=6500){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(timeoutMs),redirect:"follow"});
  if(!response.ok)throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.json();
}
async function discoverPlaces(){
  const payload={
    origin:"Detroit",
    originCoordinates:{latitude:DETROIT.latitude,longitude:DETROIT.longitude},
    query:"hiking birding scenic nature park wildlife beach viewpoint lighthouse trail",
    maxDriveHours:2,
    minDriveHours:0,
    surpriseMode:false,
    breadth:"regional",
    maxResults:MAX_DISCOVERY_PLACES
  };
  const data=await fetchJson(DISCOVERY_API,{
    method:"POST",
    headers:{accept:"application/json","content-type":"application/json","user-agent":"ChrisIzworski.com Detroit Outdoors regional discovery"},
    body:JSON.stringify(payload)
  },6500);
  const rows=Array.isArray(data&&data.places)?data.places:[];
  const seen=new Set();
  const usable=[];
  for(const row of rows){
    if(!row||!row.name||finite(row.latitude)===null||finite(row.longitude)===null)continue;
    const nameKey=normalizedName(row.name);
    if(!nameKey||LEGACY_NAMES.has(nameKey)||seen.has(nameKey))continue;
    seen.add(nameKey);
    usable.push(row);
    if(usable.length>=MAX_DISCOVERY_PLACES)break;
  }
  return {rows:usable,status:safeText(data&&data.status||"unknown",40),generatedAt:data&&data.generatedAt||null,sourceNote:safeText(data&&data.sourceNote,300)};
}
function diversitySelect(rows,max=MAX_EVALUATED_PLACES){
  const ranked=[...(rows||[])].sort((a,b)=>(finite(b&&b.score)||0)-(finite(a&&a.score)||0)||(finite(a&&a.driveHours)||9)-(finite(b&&b.driveHours)||9));
  const selected=[];
  const categoryCounts=new Map();
  const areaCounts=new Map();
  for(const row of ranked){
    const category=safeText(row&&row.category||"park",50);
    const area=normalizedName(row&&row.area||"metro detroit");
    const categoryCount=categoryCounts.get(category)||0;
    const areaCount=areaCounts.get(area)||0;
    if(categoryCount>=3||areaCount>=2)continue;
    selected.push(row);
    categoryCounts.set(category,categoryCount+1);
    areaCounts.set(area,areaCount+1);
    if(selected.length>=max)break;
  }
  if(selected.length<max){
    for(const row of ranked){
      if(selected.includes(row))continue;
      selected.push(row);
      if(selected.length>=max)break;
    }
  }
  return selected;
}
function asArray(payload){return Array.isArray(payload)?payload:[payload];}
function valueAt(values,index){const value=values&&values[index];return typeof value==="number"&&Number.isFinite(value)?value:null;}
async function weatherForPlaces(places,targetDate){
  if(!places.length)return new Map();
  const lat=places.map(p=>Number(p.latitude).toFixed(4)).join(",");
  const lon=places.map(p=>Number(p.longitude).toFixed(4)).join(",");
  const params=new URLSearchParams({
    latitude:lat,longitude:lon,timezone:TZ,
    daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max,cloud_cover_mean",
    temperature_unit:"fahrenheit",wind_speed_unit:"mph",forecast_days:"2"
  });
  const payload=await fetchJson(`${OPEN_METEO_API}?${params}`,{headers:{accept:"application/json","user-agent":"ChrisIzworski.com Detroit Outdoors regional discovery"}},7000);
  const forecasts=asArray(payload);
  const out=new Map();
  places.forEach((place,index)=>{
    const forecast=forecasts[index];
    const dayIndex=forecast&&forecast.daily&&Array.isArray(forecast.daily.time)?forecast.daily.time.indexOf(targetDate):-1;
    if(dayIndex<0)return;
    out.set(place.id,{
      high:valueAt(forecast.daily.temperature_2m_max,dayIndex),
      low:valueAt(forecast.daily.temperature_2m_min,dayIndex),
      precipitationProbability:valueAt(forecast.daily.precipitation_probability_max,dayIndex),
      windGust:valueAt(forecast.daily.wind_gusts_10m_max,dayIndex),
      cloudCover:valueAt(forecast.daily.cloud_cover_mean,dayIndex),
      weatherCode:valueAt(forecast.daily.weather_code,dayIndex)
    });
  });
  return out;
}
async function alertsForPlace(place){
  try{
    const url=`${NWS_ALERTS_API}?point=${Number(place.latitude).toFixed(4)},${Number(place.longitude).toFixed(4)}`;
    const data=await fetchJson(url,{headers:{accept:"application/geo+json","user-agent":"ChrisIzworski.com Detroit Outdoors regional discovery"}},4500);
    const alerts=(Array.isArray(data&&data.features)?data.features:[]).map(feature=>({
      event:safeText(feature&&feature.properties&&feature.properties.event,100),
      severity:safeText(feature&&feature.properties&&feature.properties.severity,40),
      certainty:safeText(feature&&feature.properties&&feature.properties.certainty,40),
      headline:safeText(feature&&feature.properties&&feature.properties.headline,180)
    })).filter(alert=>alert.event);
    return {ok:true,alerts};
  }catch(error){
    return {ok:false,alerts:[],error:safeText(error&&error.message||error)};
  }
}
function weatherScore(weather,discoveryScore){
  if(!weather)return null;
  let score=58;
  const pop=finite(weather.precipitationProbability),gust=finite(weather.windGust),high=finite(weather.high),clouds=finite(weather.cloudCover);
  if(pop!==null){if(pop<=20)score+=12;else if(pop<=40)score+=6;else if(pop>=70)score-=18;else if(pop>=55)score-=9;}
  if(gust!==null){if(gust<=18)score+=8;else if(gust<=28)score+=3;else if(gust>=40)score-=20;else if(gust>=32)score-=9;}
  if(high!==null){if(high>=50&&high<=78)score+=8;else if(high>=38&&high<=86)score+=4;else if(high<25||high>95)score-=8;}
  if(clouds!==null){if(clouds<=35)score+=5;else if(clouds>=88)score-=3;}
  const d=finite(discoveryScore);
  if(d!==null)score+=(d-70)*0.12;
  return clamp(Math.round(score));
}
function quality(score){return score>=82?"Exceptional":score>=74?"Strong":score>=66?"Good":score>=58?"Workable":"Weak";}
function reasonsFor(weather,place){
  const reasons=[];
  const pop=finite(weather&&weather.precipitationProbability),gust=finite(weather&&weather.windGust),high=finite(weather&&weather.high),clouds=finite(weather&&weather.cloudCover);
  if(pop!==null)reasons.push(`${Math.round(pop)}% rain chance`);
  if(gust!==null)reasons.push(`gusts ${Math.round(gust)} mph`);
  if(high!==null)reasons.push(`high near ${Math.round(high)}°F`);
  if(clouds!==null)reasons.push(`${Math.round(clouds)}% mean cloud cover`);
  const minutes=finite(place&&place.driveMinutes);
  if(minutes!==null)reasons.push(`about ${Math.round(minutes)} min routed drive`);
  return reasons.slice(0,5);
}
function candidateFrom(place,weather,alertState,targetDate){
  if(!weather||!alertState||!alertState.ok)return null;
  const hard=(alertState.alerts||[]).find(alert=>HARD_ALERT.test(alert.event)||(alert.severity==="Extreme"&&/Observed|Likely/i.test(alert.certainty)));
  const score=weatherScore(weather,place.score);
  if(score===null||score<58)return null;
  const shaped=placeShape(place);
  const activity=activityForCategory(place.category);
  const sourceUrl=safeText(place.sourceUrl||place.website,500);
  const forecastText=[
    finite(weather.high)===null?null:`high ${Math.round(weather.high)}°F`,
    finite(weather.precipitationProbability)===null?null:`rain chance ${Math.round(weather.precipitationProbability)}%`,
    finite(weather.windGust)===null?null:`gusts ${Math.round(weather.windGust)} mph`,
    finite(weather.cloudCover)===null?null:`mean cloud cover ${Math.round(weather.cloudCover)}%`
  ].filter(Boolean).join(", ");
  return {
    id:`regional-${slug(place.id||place.name)}-${activity}`,
    sourceEngine:"regional-discovery",
    opportunityType:"regional-place-window",
    place:shaped,
    activity,
    title:`${shaped.name} today`,
    score,
    quality:quality(score),
    reasons:reasonsFor(weather,place),
    weather:{high:weather.high,low:weather.low,rainChance:weather.precipitationProbability,gust:weather.windGust,cloudCover:weather.cloudCover,aqi:null},
    standout:false,
    timeWindow:{label:"Today",start:null,end:null},
    whyNow:`${shaped.name} entered today's board from the broader Detroit-area discovery pool, then cleared the current weather and National Weather Service warning checks.`,
    verifiedEvidence:[
      {source:place.source||"Michigan Outdoors Now",sourceLabel:`${safeText(place.categoryLabel||"Outdoor place",80)} discovery`,sourceUrl,text:`${shaped.name} was returned by the Detroit-radius discovery layer${finite(place.driveMinutes)===null?"":` with an approximately ${Math.round(place.driveMinutes)} minute routed drive`}.`},
      {source:"Open-Meteo",sourceLabel:`${targetDate} point forecast`,sourceUrl:"https://open-meteo.com/",text:forecastText},
      {source:"National Weather Service",sourceLabel:"Active point-alert check",sourceUrl:"https://www.weather.gov/",text:hard?`Active hard-stop alert: ${hard.event}.`:"No Detroit-board hard-stop warning was returned for this point at evaluation time."}
    ],
    confidence:{level:place.source==="Michigan Outdoors Now"?"high":"medium",reason:"Mapped/curated place discovery plus current point weather and a successful NWS active-alert check."},
    hardStops:hard?[`${hard.event}: ${hard.headline||"active warning"}`]:[],
    specialistHandoff:{label:place.source==="OpenStreetMap"?"Mapped place record":"Michigan Outdoors Now place",url:sourceUrl,requiredBeforeAction:false},
    travel:{origin:"central Detroit",driveBand:shaped.drive,class:shaped.driveClass},
    uncertainty:["Mapped-place discovery does not verify current hours, closures, parking capacity, trail condition or crowding.","A good weather window does not guarantee that every activity at this location is available today."],
    discovery:{source:place.source||null,category:place.category||null,discoveryScore:finite(place.score),driveMinutes:finite(place.driveMinutes),driveHours:finite(place.driveHours)}
  };
}
async function loadRegionalDiscoveryState(now=new Date()){
  const targetDate=todayDetroit(now);
  try{
    const discovery=await discoverPlaces();
    const selected=diversitySelect(discovery.rows,MAX_EVALUATED_PLACES);
    const weather=await weatherForPlaces(selected,targetDate);
    const alertRows=await Promise.all(selected.map(alertsForPlace));
    const candidates=selected.map((place,index)=>candidateFrom(place,weather.get(place.id),alertRows[index],targetDate)).filter(Boolean);
    return {
      ok:true,name:"regional-discovery",url:DISCOVERY_API,error:null,state:discovery.status||"live",
      data:{targetDate,discoveredCount:discovery.rows.length,evaluatedCount:selected.length,candidateCount:candidates.length,candidates,generatedAt:discovery.generatedAt,sourceNote:discovery.sourceNote}
    };
  }catch(error){
    return {ok:false,name:"regional-discovery",url:DISCOVERY_API,error:safeText(error&&error.message||error),state:"error",data:null};
  }
}
function regionalDiscoveryCandidates(state){
  return state&&state.ok&&state.data&&Array.isArray(state.data.candidates)?state.data.candidates:[];
}

module.exports={
  DISCOVERY_API,OPEN_METEO_API,NWS_ALERTS_API,HARD_ALERT,
  loadRegionalDiscoveryState,regionalDiscoveryCandidates,
  _test:{finite,normalizedName,driveBand,driveClass,activityForCategory,diversitySelect,weatherScore,candidateFrom,todayDetroit}
};