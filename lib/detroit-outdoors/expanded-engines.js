"use strict";

const BIRD_MIGRATION_API="https://michiganbirdingreport.com/api/migration-intelligence";
const BEACH_API="https://chrisizworski.com/api/beaches?slug=sterling-state-park";
const ICE_API="https://chrisizworski.com/api/ice";
const MOREL_API="https://morel.chrisizworski.com/api/morel";
const XC_MODEL_API="https://xcski.chrisizworski.com/api/xc-model?state=michigan";
const USGS_RIVER_API="https://waterservices.usgs.gov/nwis/iv/?format=json&sites=04174500,04165500&parameterCd=00060,00065&period=P2D&siteStatus=all";
const TZ="America/Detroit";

const PLACES=Object.freeze({
  westernLakeErie:{id:"western-lake-erie",name:"Western Lake Erie marshes",area:"Monroe County",setting:"Pointe Mouillee and western Lake Erie marshes",drive:"40–60 min",driveClass:"near",officialUrl:"https://michiganbirdingreport.com/"},
  sterling:{id:"sterling-state-park",name:"Sterling State Park",area:"Monroe",setting:"Lake Erie beach and coastal wetland",drive:"45–60 min",driveClass:"near",officialUrl:"https://chrisizworski.com/great-lakes-beaches/sterling-state-park/"},
  huronRiver:{id:"huron-river-ann-arbor",name:"Huron River at Ann Arbor",area:"Ann Arbor",setting:"Huron River corridor",drive:"45–60 min",driveClass:"near",officialUrl:"https://waterdata.usgs.gov/monitoring-location/USGS-04174500/"},
  clintonRiver:{id:"clinton-river-mount-clemens",name:"Clinton River at Mount Clemens",area:"Mount Clemens",setting:"Clinton River corridor",drive:"30–45 min",driveClass:"near",officialUrl:"https://waterdata.usgs.gov/monitoring-location/USGS-04165500/"},
  southernMorels:{id:"southern-michigan-morels",name:"Southern Michigan",area:"Southeast Michigan",setting:"Regional spring soil-warming window",drive:"varies",driveClass:"mid",officialUrl:"https://morel.chrisizworski.com/"},
  lakeStClair:{id:"lake-st-clair-ice",name:"Lake St. Clair",area:"Metro Detroit",setting:"Lake St. Clair ice-season context",drive:"35–50 min",driveClass:"near",officialUrl:"https://chrisizworski.com/michigan-ice/regions/lake-st-clair.html"},
  huronMeadows:{id:"huron-meadows-xc",name:"Huron Meadows Metropark",area:"Brighton",setting:"Nordic ski trails and snowmaking loop",drive:"45–60 min",driveClass:"near",officialUrl:"https://www.metroparks.com/huron-meadows-metropark/"}
});

function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,value));}
function safeText(value,max=280){return String(value==null?"":value).replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function monthDetroit(){return Number(new Intl.DateTimeFormat("en-US",{timeZone:TZ,month:"numeric"}).format(new Date()));}
function ageHours(iso){const t=Date.parse(iso||"");return Number.isFinite(t)?Math.max(0,(Date.now()-t)/3600000):null;}
function travel(place){return{origin:"central Detroit",driveBand:place.drive||null,class:place.driveClass||null};}
async function fetchJson(url,timeoutMs=10000){
  const response=await fetch(url,{headers:{accept:"application/json","user-agent":"ChrisIzworski.com Detroit Outdoors reused-engine adapter"},signal:AbortSignal.timeout(timeoutMs),redirect:"follow"});
  if(!response.ok)throw new Error(new URL(url).hostname+" returned "+response.status);
  return response.json();
}
async function loadOne(url,name,timeoutMs=10000){
  try{return{ok:true,name,url,data:await fetchJson(url,timeoutMs),error:null};}
  catch(error){return{ok:false,name,url,data:null,error:safeText(error&&error.message||error)};}
}
function localMonthDay(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:TZ,month:"numeric",day:"numeric"}).formatToParts(now);
  const row=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return{month:Number(row.month),day:Number(row.day)};
}
function offSeasonState(name,url){
  return{ok:true,name,url,data:null,error:null,state:"off-season"};
}
async function loadExpandedEngineStates(now=new Date()){
  const {month,day}=localMonthDay(now);
  const beachSeason=(month>5&&month<9)||(month===5&&day>=15)||(month===9&&day<=15);
  const morelSeason=month>=3&&month<=6;
  const iceSeason=[11,12,1,2,3].includes(month);
  const xcSeason=[12,1,2,3].includes(month);
  const [birdMigration,beach,ice,morel,xc,rivers]=await Promise.all([
    loadOne(BIRD_MIGRATION_API,"bird-migration-live",11000),
    beachSeason?loadOne(BEACH_API,"great-lakes-beach",13000):Promise.resolve(offSeasonState("great-lakes-beach",BEACH_API)),
    iceSeason?loadOne(ICE_API,"lake-st-clair-ice",12000):Promise.resolve(offSeasonState("lake-st-clair-ice",ICE_API)),
    morelSeason?loadOne(MOREL_API,"morel-phenology",13000):Promise.resolve(offSeasonState("morel-phenology",MOREL_API)),
    xcSeason?loadOne(XC_MODEL_API,"xc-snow-screen",13000):Promise.resolve(offSeasonState("xc-snow-screen",XC_MODEL_API)),
    loadOne(USGS_RIVER_API,"southeast-river",10000)
  ]);
  return{birdMigration,beach,ice,morel,xc,rivers};
}
function baseCandidate({id,sourceEngine,opportunityType,place,activity,title,score,reasons,whyNow,evidence,confidence,specialistHandoff,uncertainty,timeWindow,hardStops=[]}){
  return{
    id,sourceEngine,opportunityType,place,activity,title,score:clamp(Math.round(score||0)),
    quality:score>=82?"Exceptional":score>=74?"Strong":score>=66?"Good":"Workable",
    reasons:(reasons||[]).filter(Boolean).slice(0,5),
    standout:true,
    timeWindow:timeWindow||{label:"Today",start:null,end:null},
    whyNow:safeText(whyNow,420),
    verifiedEvidence:(evidence||[]).filter(Boolean),
    confidence:confidence||{level:"medium",reason:"Owned specialist engine supplied a current decision signal."},
    hardStops:(hardStops||[]).filter(Boolean),
    specialistHandoff:specialistHandoff||null,
    travel:travel(place),
    uncertainty:(uncertainty||[]).filter(Boolean)
  };
}
function birdCandidate(state){
  if(!state||!state.ok||!state.data)return[];
  const d=state.data,season=d.season||{};
  if(!season.active)return[];
  const r=(d.regions||[]).find(x=>x&&x.id==="western-lake-erie");
  if(!r)return[];
  const count=finite(r.observations&&r.observations.speciesCount);
  const flight=String(r.flight&&r.flight.key||"");
  const morning=String(r.morning&&r.morning.label||"");
  if(!(count>=12||["fallout-watch","grounding-watch","favorable"].includes(flight)))return[];
  let score=66;
  if(/High-interest/i.test(morning))score+=12;
  else if(/Worth an early start/i.test(morning))score+=10;
  else if(/Worth checking/i.test(morning))score+=6;
  if(count!==null)score+=Math.min(8,Math.floor(count/10));
  const evidence=[
    {source:"Michigan Birding Report",sourceLabel:"Western Lake Erie migration intelligence",sourceUrl:"https://michiganbirdingreport.com/",text:`${safeText(r.flight&&r.flight.label,100)}. ${safeText(r.morning&&r.morning.reason,220)}`},
    count===null?null:{source:"eBird via Michigan Birding Report",sourceLabel:"Recent county observation aggregate",sourceUrl:"https://ebird.org/region/US-MI-115",text:`${count} distinct species are represented in the recent county observation summary; this is reporting evidence, not a site-level guarantee.`}
  ];
  return[baseCandidate({
    id:"western-lake-erie-live-birding",sourceEngine:"bird-migration-live",opportunityType:"migration-birding-window",place:PLACES.westernLakeErie,activity:"birding",
    title:"Western Lake Erie migration morning",score,reasons:[r.flight&&r.flight.label,r.morning&&r.morning.label,count===null?null:`${count} recent species represented`],
    whyNow:r.morning&&r.morning.reason||r.flight&&r.flight.explanation||"Recent observation evidence and migration-season weather make western Lake Erie worth a closer birding check.",
    evidence,confidence:{level:count>=20?"high":"medium",reason:"Current NWS migration-weather screen plus recent county eBird aggregate; BirdCast radar remains the authoritative movement confirmation."},
    specialistHandoff:{label:"Michigan Birding Report",url:"https://michiganbirdingreport.com/",requiredBeforeAction:true},
    uncertainty:["BirdCast radar is linked for confirmation but is not ingested by this first-party migration endpoint.","eBird reporting effort varies by hotspot and does not guarantee birds at a specific location."],
    timeWindow:{label:"Next useful morning",start:null,end:null}
  })];
}
function beachCandidate(state){
  if(!state||!state.ok||!state.data)return[];
  const d=state.data,b=(d.beaches||[])[0];
  if(!d.season||d.season.active!==true||!d.daily_ranking||d.daily_ranking.available!==true||!b||!b.rating||b.rating.eligible!==true)return[];
  const score=finite(b.rating.score);
  if(score===null||score<68)return[];
  const lake=b.lake_conditions||{},wx=b.weather&&b.weather.today||{},risk=b.swim_risk||{},quality=b.water_quality||{};
  return[baseCandidate({
    id:"sterling-state-park-beach-window",sourceEngine:"great-lakes-beach",opportunityType:"swim-beach-window",place:PLACES.sterling,activity:"beach",
    title:"Lake Erie beach window",score,reasons:[b.rating.label,risk.label,finite(lake.water_temp_f)===null?null:`water ${Math.round(lake.water_temp_f)}°F`,finite(lake.wave_height_ft)===null?null:`waves ${lake.wave_height_ft} ft`],
    whyNow:"Sterling State Park cleared the existing Michigan beach engine's complete-input, no-active-notice, no-hazard and low-swim-risk eligibility gate.",
    evidence:[
      {source:"Great Lakes Beach Conditions",sourceLabel:"Sterling State Park beach engine",sourceUrl:"https://chrisizworski.com/great-lakes-beaches/sterling-state-park/",text:`${safeText(b.rating.label,120)}; NWS swim risk ${safeText(risk.status,40)}; water-quality state ${safeText(quality.state,60)}.`},
      {source:"NOAA/NDBC + forecast",sourceLabel:"Lake/weather packet",sourceUrl:"https://chrisizworski.com/great-lakes-beaches/sterling-state-park/",text:`Water ${finite(lake.water_temp_f)===null?"unavailable":Math.round(lake.water_temp_f)+"°F"}, waves ${finite(lake.wave_height_ft)===null?"unavailable":lake.wave_height_ft+" ft"}, forecast high ${finite(wx.temperature_max_f)===null?"unavailable":Math.round(wx.temperature_max_f)+"°F"}.`}
    ],
    confidence:{level:b.rating.confidence||"medium",reason:"Existing beach engine requires complete weather/lake evidence, no matched official notice or alert, and explicit low NWS swim risk before eligibility."},
    specialistHandoff:{label:"Sterling State Park beach conditions",url:"https://chrisizworski.com/great-lakes-beaches/sterling-state-park/",requiredBeforeAction:true},
    uncertainty:["The NWS swim-risk forecast is not the posted beach flag.","No active EGLE notice is not a guarantee of safe water; local signs and flags must still be checked."],
    timeWindow:{label:"Today, while the beach engine remains eligible",start:d.generated_at||null,end:null}
  })];
}
function median(values){
  const a=(values||[]).filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return null;
  const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function parseRiverSeries(data){
  const out={};
  const rows=data&&data.value&&data.value.timeSeries||[];
  for(const series of rows){
    const site=series&&series.sourceInfo&&series.sourceInfo.siteCode&&series.sourceInfo.siteCode[0]&&series.sourceInfo.siteCode[0].value;
    const code=series&&series.variable&&series.variable.variableCode&&series.variable.variableCode[0]&&series.variable.variableCode[0].value;
    if(!site||!code)continue;
    const vals=((series.values||[])[0]&&series.values[0].value||[]).map(v=>({value:finite(v.value),time:v.dateTime})).filter(v=>v.value!==null&&v.time);
    if(!out[site])out[site]={};
    out[site][code]=vals;
  }
  return out;
}
function riverCandidate(state){
  if(!state||!state.ok||!state.data)return[];
  const parsed=parseRiverSeries(state.data);
  const defs=[
    {site:"04174500",place:PLACES.huronRiver,name:"Huron River"},
    {site:"04165500",place:PLACES.clintonRiver,name:"Clinton River"}
  ];
  const options=[];
  for(const def of defs){
    const vals=parsed[def.site]&&parsed[def.site]["00060"]||[];
    if(vals.length<6)continue;
    const latest=vals[vals.length-1],age=ageHours(latest.time),med=median(vals.map(v=>v.value));
    if(age===null||age>4||med===null||med<=0)continue;
    const change=(latest.value-med)/med*100,abs=Math.abs(change);
    if(abs<25)continue;
    options.push({def,latest,med,change,abs,score:clamp(64+Math.min(18,abs/4))});
  }
  if(!options.length)return[];
  const x=options.sort((a,b)=>b.abs-a.abs)[0];
  const direction=x.change>0?"above":"below";
  return[baseCandidate({
    id:`river-change-${x.def.site}`,sourceEngine:"southeast-river",opportunityType:"river-change",place:x.def.place,activity:"scenic",
    title:`${x.def.name} flow changed`,score:x.score,reasons:[`${Math.round(x.latest.value)} cfs now`,`${Math.round(Math.abs(x.change))}% ${direction} the recent two-day median`],
    whyNow:`The current USGS discharge is materially different from the recent two-day median, making the river itself a changed condition worth checking rather than an ordinary weather-only park suggestion.`,
    evidence:[{source:"USGS Water Data for the Nation",sourceLabel:`${x.def.name} streamgage ${x.def.site}`,sourceUrl:x.def.place.officialUrl,text:`Latest discharge ${Math.round(x.latest.value)} cfs at ${x.latest.time}; recent two-day median from the same provisional series about ${Math.round(x.med)} cfs.`}],
    confidence:{level:"high",reason:"Fresh USGS provisional discharge series; interpretation is limited to observed flow change."},
    specialistHandoff:{label:"USGS river gauge",url:x.def.place.officialUrl,requiredBeforeAction:false},
    uncertainty:["Flow change is not a paddling-safety or fishing-quality rating.","USGS real-time data are provisional and subject to revision."],
    timeWindow:{label:"Now, while the observed flow change persists",start:x.latest.time,end:null}
  })];
}
function morelCandidate(state){
  if(!state||!state.ok||!state.data||monthDetroit()<3||monthDetroit()>6)return[];
  const r=(state.data.regions||[]).find(x=>x&&x.slug==="southern-michigan");
  if(!r||!r.stage||!["watch","prime","fading"].includes(r.stage.key))return[];
  const score=r.stage.key==="prime"?84:r.stage.key==="watch"?72:66;
  return[baseCandidate({
    id:"southern-michigan-morel-window",sourceEngine:"morel-phenology",opportunityType:"morel-season-window",place:PLACES.southernMorels,activity:"foraging",
    title:"Southern Michigan morel window",score,reasons:[r.stage.label,finite(r.trailing7dayF)===null?null:`7-day mean ${r.trailing7dayF}°F`,finite(r.gddBase50)===null?null:`${r.gddBase50} GDD base 50`],
    whyNow:safeText(r.stage.why,300),
    evidence:[{source:"Michigan Morel Report",sourceLabel:"Southern Michigan soil-warming model",sourceUrl:"https://morel.chrisizworski.com/",text:`${safeText(r.stage.label,80)}; modeled from a trailing seven-day mean air-temperature proxy for shallow soil warming. Station completeness ${r.stationCompleteness==null?"unavailable":r.stationCompleteness+"%"}.`}],
    confidence:{level:r.stationBelowThreshold?"low":"medium",reason:"Regional timing model from ACIS air temperatures; soil temperature is modeled, not directly measured."},
    specialistHandoff:{label:"Michigan Morel Report",url:"https://morel.chrisizworski.com/",requiredBeforeAction:true},
    uncertainty:["This is regional timing guidance, not evidence that morels are present at a specific site.","Soil warming is modeled from air temperature and does not identify edible mushrooms or legal foraging locations."],
    timeWindow:{label:r.stage.label,start:r.observedThrough||null,end:null}
  })];
}
function cleanAirCandidate(placeStates){
  const rows=(placeStates||[]).map(p=>({p,aqi:finite(p&&p.weather&&p.weather.aqi)})).filter(x=>x.p&&x.p.ok&&x.p.place&&x.aqi!==null);
  if(rows.length<2)return[];
  rows.sort((a,b)=>a.aqi-b.aqi);
  const best=rows[0],worst=rows[rows.length-1],spread=worst.aqi-best.aqi;
  if(!(worst.aqi>=76&&best.aqi<=60&&spread>=15))return[];
  const place=best.p.place;
  return[baseCandidate({
    id:`clean-air-${place.id}`,sourceEngine:"clean-air-window",opportunityType:"cleaner-air-window",place,activity:"hiking",
    title:"Cleaner-air outdoor window",score:clamp(78-Math.max(0,best.aqi-40)/2+Math.min(10,spread/5)),
    reasons:[`AQI ${Math.round(best.aqi)} here`,`${Math.round(spread)} points cleaner than the weakest monitored Detroit-board place`],
    whyNow:"Air quality is meaningfully better at this candidate than at another place on today's Detroit board, creating a location choice that weather alone would miss.",
    evidence:[{source:"Michigan Outdoors Now",sourceLabel:`${place.name} place air-quality field`,sourceUrl:`https://michiganoutdoorsnow.chrisizworski.com/places/${place.id}`,text:`Current planning AQI field ${Math.round(best.aqi)} versus ${Math.round(worst.aqi)} at the weakest monitored board location.`}],
    confidence:{level:"medium",reason:"Same first-party place-condition feed across compared locations; use the dedicated air-quality tool when smoke or health sensitivity matters."},
    specialistHandoff:{label:"Wildfire Smoke & Outdoor Air Window",url:"https://chrisizworski.com/national-tools/smoke/",requiredBeforeAction:false},
    uncertainty:["This is a relative outdoor-planning signal, not individualized health advice.","AQI can change quickly and the dedicated air-quality tool should be checked during smoke events."],
    timeWindow:{label:"Today, while the air-quality contrast holds",start:null,end:null}
  })];
}
function iceCandidate(state){
  const m=monthDetroit();
  if(!state||!state.ok||!state.data||![11,12,1,2,3].includes(m))return[];
  const d=state.data,cover=finite(d.cover&&d.cover.stclair),cold=(d.cold||[]).find(x=>x&&x.slug==="lake-st-clair")||null;
  const afdd=finite(cold&&cold.afdd),normal=finite(cold&&cold.normal);
  if((cover===null||cover<5)&&(afdd===null||afdd<60))return[];
  let score=66;
  if(cover!==null)score+=Math.min(14,cover/4);
  if(afdd!==null&&normal!==null&&normal>0)score+=clamp((afdd-normal)/normal*10,-5,8);
  return[baseCandidate({
    id:"lake-st-clair-ice-season",sourceEngine:"lake-st-clair-ice",opportunityType:"ice-season-watch",place:PLACES.lakeStClair,activity:"ice-watching",
    title:"Lake St. Clair ice-season signal",score,reasons:[cover===null?null:`GLERL Lake St. Clair ice cover ${cover}%`,afdd===null?null:`${Math.round(afdd)} accumulated freezing-degree days`,normal===null?null:`10-year normal ${Math.round(normal)}`],
    whyNow:"The Michigan Ice engine is showing a meaningful cold/ice-season signal on Lake St. Clair. This is useful seasonal context, not an ice-thickness or travel-safety rating.",
    evidence:[
      cover===null?null:{source:"NOAA GLERL",sourceLabel:"Current Lake St. Clair ice concentration",sourceUrl:"https://www.glerl.noaa.gov/data/ice/",text:`Current-season Lake St. Clair aggregate ice concentration ${cover}%.`},
      afdd===null?null:{source:"ACIS via Michigan Ice Report",sourceLabel:"Detroit-area accumulated cold",sourceUrl:"https://chrisizworski.com/michigan-ice/regions/lake-st-clair.html",text:`${Math.round(afdd)} accumulated freezing-degree days; 10-year comparison ${normal===null?"unavailable":Math.round(normal)}.`}
    ],
    confidence:{level:"medium",reason:"Official regional ice-cover context plus accumulated cold; neither measures local ice thickness."},
    specialistHandoff:{label:"Michigan Ice — Lake St. Clair",url:"https://chrisizworski.com/michigan-ice/regions/lake-st-clair.html",requiredBeforeAction:true},
    uncertainty:["Remote ice cover and accumulated cold cannot establish local ice thickness or safe travel.","Never use this candidate as permission to walk, drive, fish or recreate on ice."],
    timeWindow:{label:"Current ice-season state",start:d.generatedAt||null,end:null}
  })];
}
function xcCandidate(state){
  const m=monthDetroit();
  if(!state||!state.ok||!state.data||![12,1,2,3].includes(m))return[];
  const row=(state.data.rows||[]).find(x=>x&&x.id==="huronmeadows");
  const cur=row&&row.current||null,score=finite(cur&&cur.snowScore);
  if(score===null||score<65)return[];
  return[baseCandidate({
    id:"huron-meadows-xc-screen",sourceEngine:"xc-snow-screen",opportunityType:"xc-snow-screen",place:PLACES.huronMeadows,activity:"xc-ski",
    title:"Huron Meadows XC snow screen",score,reasons:[cur.surface&&cur.surface.label||cur.surface,finite(cur.depth)===null?null:`modeled snow depth ${cur.depth} in`,cur.bestWindow&&cur.bestWindow.label],
    whyNow:"The existing XC model says the regional snow/surface setup is worth investigating at Huron Meadows. It does not claim the trail is open, groomed or skiable.",
    evidence:[{source:"Midwest XC Ski Conditions",sourceLabel:"Huron Meadows modeled snow screen",sourceUrl:"https://xcski.chrisizworski.com/",text:`Snow score ${Math.round(score)}; surface ${safeText(cur.surface&&cur.surface.label||cur.surface,80)}; modeled depth ${finite(cur.depth)===null?"unavailable":cur.depth+" in"}.`}],
    confidence:{level:"medium",reason:"Modeled regional snow and surface timing; operator/groomer remains trail truth."},
    specialistHandoff:{label:"Michigan XC live conditions",url:"https://xcski.chrisizworski.com/",requiredBeforeAction:true},
    uncertainty:["Weather and modeled snow cannot prove grooming, opening status or skiability.","Verify Huron Meadows' current operator report before driving."],
    timeWindow:{label:cur.bestWindow&&cur.bestWindow.label||"Current modeled snow window",start:cur.referenceTime||null,end:null}
  })];
}
function emitExpandedCandidates({placeStates,expandedStates}){
  const byEngine={
    "bird-migration-live":birdCandidate(expandedStates&&expandedStates.birdMigration),
    "great-lakes-beach":beachCandidate(expandedStates&&expandedStates.beach),
    "southeast-river":riverCandidate(expandedStates&&expandedStates.rivers),
    "morel-phenology":morelCandidate(expandedStates&&expandedStates.morel),
    "clean-air-window":cleanAirCandidate(placeStates),
    "lake-st-clair-ice":iceCandidate(expandedStates&&expandedStates.ice),
    "xc-snow-screen":xcCandidate(expandedStates&&expandedStates.xc)
  };
  return{byEngine,candidates:Object.values(byEngine).flat()};
}
function expandedSourceStatus(states){
  const ids={birdMigration:"bird-migration-live",beach:"great-lakes-beach",rivers:"southeast-river",morel:"morel-phenology",ice:"lake-st-clair-ice",xc:"xc-snow-screen"};
  return Object.fromEntries(Object.entries(ids).map(([key,id])=>{
    const state=states&&states[key]||null;
    return[id,{ok:Boolean(state&&state.ok),state:state&&state.state||Boolean(state&&state.ok)?"live":"error",error:state&&state.error||null}];
  }));
}

module.exports={
  BIRD_MIGRATION_API,BEACH_API,ICE_API,MOREL_API,XC_MODEL_API,USGS_RIVER_API,
  loadExpandedEngineStates,emitExpandedCandidates,expandedSourceStatus,
  _test:{birdCandidate,beachCandidate,riverCandidate,morelCandidate,cleanAirCandidate,iceCandidate,xcCandidate,parseRiverSeries,median,localMonthDay,offSeasonState}
};
