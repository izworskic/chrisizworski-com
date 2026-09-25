"use strict";

const oldEngine=require("./engine.js");
const {GATEWAYS,STOPS}=require("./catalog.js");
const T=oldEngine._test;

const NPS_ROAD_STATUS_URL="https://www.nps.gov/blri/planyourvisit/roadclosures.htm";
const NPS_MAPS_URL="https://www.nps.gov/blri/planyourvisit/maps.htm";
const NPS_AUTO_TOUR_URL="https://www.nps.gov/blri/planyourvisit/auto-touring.htm";
const NPS_DIRECTIONS_URL="https://www.nps.gov/blri/planyourvisit/directions.htm";
const NPS_WEATHER_URL="https://www.nps.gov/blri/planyourvisit/weather.htm";
const PARKWAY_GEOJSON_URL="https://cicgis.org/arcgis/rest/services/BRPF_buffer_10mi/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson";
const USER_AGENT="BlueRidgeParkwayLive/3.0 (+https://chrisizworski.com/blue-ridge-parkway/)";
const TIMEZONE="America/New_York";
const MODELED_PARKWAY_MPH=32;
const WRITER_MODEL=process.env.BLUE_RIDGE_WRITER_MODEL||"claude-haiku-4-5-20251001";
const BANNED=["breathtaking","stunning","nestled","hidden gem","magical","unforgettable","perfect day","something for everyone","whether you're","whether you’re","must-see","must see","bucket list","picture-perfect","picture perfect","embark","journey awaits"];

const safe=(v,max=300)=>String(v==null?"":v).replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=(n,d=1)=>Math.round(n*10**d)/10**d;
function todayParkway(){return new Intl.DateTimeFormat("en-CA",{timeZone:TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function parseTime(v){const m=String(v||"").match(/^(\d{1,2}):(\d{2})$/);if(!m)return{text:"09:00",minutes:540};const h=clamp(+m[1],0,23),min=clamp(+m[2],0,59);return{text:`${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`,minutes:h*60+min};}
function clock(minutes){const m=((Math.round(minutes)%1440)+1440)%1440,h=Math.floor(m/60),mm=m%60;const suffix=h>=12?"PM":"AM",hh=h%12||12;return`${hh}:${String(mm).padStart(2,"0")} ${suffix}`;}

function normalizeInput(q={}){
  const gateway=GATEWAYS[q.gateway]?q.gateway:"asheville";
  const requestedFinish=GATEWAYS[q.finish]?q.finish:null;
  const finish=requestedFinish&&requestedFinish!==gateway?requestedFinish:"return";
  const maxHours=finish==="return"?8:16;
  const hours=clamp(Number(q.hours)||4,2,maxHours),t=parseTime(q.start);
  const requestedDate=/^20\d{2}-\d{2}-\d{2}$/.test(String(q.date||""))?String(q.date):todayParkway();
  const allowed=new Set(["scenery","fall-color","short-walk","waterfall","photography","history","picnic","sunset","high-elevation"]);
  const raw=Array.isArray(q.interests)?q.interests.join(","):String(q.interests||"scenery,short-walk");
  const interests=[...new Set(raw.split(",").map(x=>x.trim()).filter(x=>allowed.has(x)))].slice(0,4);if(!interests.length)interests.push("scenery");
  return{gateway,finish,tripMode:finish==="return"?"round-trip":"point-to-point",hours,requestedDate,start:t.text,startMinutes:t.minutes,interests};
}

async function fetchText(url,timeout=8500){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{headers:{accept:"text/html,application/xhtml+xml","user-agent":USER_AGENT},signal:c.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text();}finally{clearTimeout(timer);}}
async function fetchRoadStatus(){try{const parsed=T.parseRoadStatus(await fetchText(NPS_ROAD_STATUS_URL));if(!parsed.rows.length)throw new Error("No Parkway road rows parsed");return{ok:true,...parsed,fetchedAt:new Date().toISOString(),source:NPS_ROAD_STATUS_URL};}catch(e){return{ok:false,updatedLabel:null,rows:[],fetchedAt:new Date().toISOString(),source:NPS_ROAD_STATUS_URL,error:safe(e?.message||e,180)};}}
function dateKey(d){try{return new Intl.DateTimeFormat("en-CA",{timeZone:TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);}catch{return"";}}
function windMph(v){const nums=[...String(v||"").matchAll(/(\d{1,2})/g)].map(m=>+m[1]).filter(Number.isFinite);return nums.length?Math.max(...nums):null;}
async function fetchWeather(lat,lon,input){
  const pointUrl=`https://api.weather.gov/points/${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`,headers={accept:"application/geo+json,application/json","user-agent":USER_AGENT},c=new AbortController(),timer=setTimeout(()=>c.abort(),8500);
  try{
    const p=await fetch(pointUrl,{headers,signal:c.signal});if(!p.ok)throw new Error(`NWS point HTTP ${p.status}`);const pj=await p.json(),hourlyUrl=pj?.properties?.forecastHourly;if(!hourlyUrl)throw new Error("NWS hourly forecast URL missing");
    const h=await fetch(hourlyUrl,{headers,signal:c.signal});if(!h.ok)throw new Error(`NWS forecast HTTP ${h.status}`);const j=await h.json(),periods=Array.isArray(j?.properties?.periods)?j.properties.periods:[],end=Math.min(1439,input.startMinutes+Math.round(input.hours*60));
    let selected=periods.filter(x=>{const d=new Date(x.startTime),parts=new Intl.DateTimeFormat("en-US",{timeZone:TIMEZONE,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d),mins=+(parts.find(y=>y.type==="hour")?.value||0)*60+ +(parts.find(y=>y.type==="minute")?.value||0);return dateKey(d)===input.requestedDate&&mins>=input.startMinutes&&mins<=end;});
    if(!selected.length)selected=periods.filter(x=>dateKey(new Date(x.startTime))===input.requestedDate).slice(0,12);if(!selected.length)throw new Error("Requested date is outside the available hourly forecast");
    const temps=selected.map(x=>+x.temperature).filter(Number.isFinite),pops=selected.map(x=>+x?.probabilityOfPrecipitation?.value).filter(Number.isFinite),winds=selected.map(x=>windMph(x.windSpeed)).filter(Number.isFinite),forecast=[...new Set(selected.map(x=>safe(x.shortForecast,80)).filter(Boolean))].slice(0,3);
    return{ok:true,source:hourlyUrl,pointSource:pointUrl,updatedAt:j?.properties?.updateTime||null,tempMin:temps.length?Math.min(...temps):null,tempMax:temps.length?Math.max(...temps):null,precipMax:pops.length?Math.max(...pops):null,windMax:winds.length?Math.max(...winds):null,forecast,periodCount:selected.length};
  }catch(e){return{ok:false,source:pointUrl,updatedAt:null,error:safe(e?.message||e,180)};}finally{clearTimeout(timer);}
}

function corridorStops(startId,finishId){
  const start=GATEWAYS[startId],finish=GATEWAYS[finishId];if(!start||!finish)return[];
  const lo=Math.min(start.milepost,finish.milepost),hi=Math.max(start.milepost,finish.milepost),southbound=finish.milepost>start.milepost;
  return Object.values(STOPS).filter(s=>s.milepost>=lo&&s.milepost<=hi).sort((a,b)=>southbound?a.milepost-b.milepost:b.milepost-a.milepost);
}
function stopValue(stop,input){
  const matches=(stop.tags||[]).filter(t=>input.interests.includes(t)).length;
  let score=matches*20;
  if((stop.tags||[]).includes("scenery"))score+=6;
  if((stop.tags||[]).includes("easy-stop"))score+=4;
  if((stop.tags||[]).includes("access"))score-=7;
  score-=Math.max(0,(Number(stop.dwellMinutes)||0)-45)/12;
  return score;
}
function chooseStops(pool,input,budgetMinutes,maxStops){
  if(budgetMinutes<=0||maxStops<=0)return[];
  const ranked=pool.slice().sort((a,b)=>stopValue(b,input)-stopValue(a,input));
  const chosen=[];let used=0;
  for(const stop of ranked){const dwell=Number(stop.dwellMinutes)||0;if(chosen.length>=maxStops)break;if(used+dwell>budgetMinutes)continue;if(stopValue(stop,input)<=0&&chosen.length)continue;chosen.push(stop);used+=dwell;}
  const southbound=GATEWAYS[input.finish].milepost>GATEWAYS[input.gateway].milepost;
  return chosen.sort((a,b)=>southbound?a.milepost-b.milepost:b.milepost-a.milepost);
}
function corridorRoute(input,variant,stops){
  const start=GATEWAYS[input.gateway],finish=GATEWAYS[input.finish],distance=round(Math.abs(finish.milepost-start.milepost),1),tags=[...new Set(stops.flatMap(s=>s.tags||[]))],highest=Math.max(0,...stops.map(s=>Number(s.elevationFt)||0));
  const labels={direct:"Drive-through plan",quick:"Best quick stops",balanced:"Balanced stop plan",deep:"More stops, slower day"};
  const chars={direct:`Keep ${GATEWAYS[input.gateway].label} → ${GATEWAYS[input.finish].label} as the fixed corridor and protect the arrival time; stops are optional.`,quick:"Use only the stops that best match your priorities without turning the transfer into an all-day sightseeing crawl.",balanced:"Use the destination as a hard constraint, then spend the available margin on the strongest stops along the way.",deep:"Use more of the available day on worthwhile corridor stops while keeping the same destination and direction."};
  return{id:`ptp-${input.gateway}-${input.finish}-${variant}`,gateway:input.gateway,finish:input.finish,tripMode:"point-to-point",variant,name:`${start.label} → ${finish.label}: ${labels[variant]}`,startMile:start.milepost,turnMile:finish.milepost,stopIds:stops.map(s=>s.id),elevationClass:highest>=5000?"high":"mid",minHours:0,tags,character:chars[variant],corridorMiles:distance};
}
function stopsForRoute(route){return(route.stopIds||[]).map(id=>STOPS[id]).filter(Boolean);}
function routeMiles(route){return round(Math.abs(route.turnMile-route.startMile),1);}
function modeledDuration(route){const miles=routeMiles(route),drive=miles/MODELED_PARKWAY_MPH,dwell=stopsForRoute(route).reduce((n,s)=>n+(Number(s.dwellMinutes)||0),0)/60;return round(drive+dwell+.25,1);}
function buildCandidates(input){
  const start=GATEWAYS[input.gateway],finish=GATEWAYS[input.finish],driveMinutes=Math.abs(finish.milepost-start.milepost)/MODELED_PARKWAY_MPH*60+15,spare=Math.max(0,input.hours*60-driveMinutes),pool=corridorStops(input.gateway,input.finish);
  const specs=[["direct",0,0],["quick",Math.min(spare*.45,85),2],["balanced",Math.min(spare*.75,180),4],["deep",Math.min(spare,300),6]];
  const seen=new Set(),routes=[];
  for(const [variant,budget,maxStops] of specs){const stops=chooseStops(pool,input,budget,maxStops),key=stops.map(s=>s.id).join("|");if(seen.has(key)&&variant!=="direct")continue;seen.add(key);routes.push(corridorRoute(input,variant,stops));}
  return routes;
}
function routeScore(route,input,road,weather,foliage){
  const stops=stopsForRoute(route),matches=stops.reduce((n,s)=>n+(s.tags||[]).filter(t=>input.interests.includes(t)).length,0),duration=modeledDuration(route),margin=input.hours-duration;
  let score=64+Math.min(28,matches*5)+Math.min(8,stops.length*2);
  if(route.variant==="direct")score-=4;if(route.variant==="deep"&&margin<.5)score-=9;if(margin>=.5&&margin<=2)score+=6;if(margin<0)score-=80;
  if(road.blocked)return-1000;score-=Math.min(15,(road.cautions||[]).length*5);
  if(weather?.ok){if(Number(weather.precipMax)>=70)score-=10;else if(Number(weather.precipMax)>=40)score-=5;if(Number(weather.windMax)>=30)score-=7;}
  if(input.interests.includes("fall-color")&&foliage?.active&&/Peak-window|Building/.test(foliage.label))score+=5;
  return round(score,0);
}
function fitLabel(score,blocked,duration,hours){if(blocked)return"Blocked by current road status";if(duration>hours+.3)return"Too long for this window";if(score>=88)return"Strong fit";if(score>=75)return"Good fit";return"Possible";}
function evidence(item,input){return{id:item.route.id,name:item.route.name,durationHours:item.durationHours,routeMiles:routeMiles(item.route),stopCount:item.stops.length,stops:item.stops.map(s=>s.name),interestMatches:item.stops.flatMap(s=>(s.tags||[]).filter(t=>input.interests.includes(t))),roadBlocked:item.road.blocked,roadCautions:item.road.cautions.length,weather:item.weather?.ok?{precipMax:item.weather.precipMax,windMax:item.weather.windMax,tempMin:item.weather.tempMin,tempMax:item.weather.tempMax,forecast:item.weather.forecast}:"unavailable",foliage:item.foliage?.active?item.foliage.label:"not active"};}
function routeTimeline(route,stops,input,durationHours){let elapsed=0,previous=route.startMile;const items=[];for(const stop of stops){elapsed+=Math.abs(stop.milepost-previous)/MODELED_PARKWAY_MPH*60;items.push({name:stop.name,milepost:stop.milepost,arrival:clock(input.startMinutes+elapsed),elapsedMinutes:Math.round(elapsed),dwellMinutes:stop.dwellMinutes,elevationFt:stop.elevationFt,practical:stop.practical,tags:stop.tags});elapsed+=Number(stop.dwellMinutes)||0;previous=stop.milepost;}return{start:clock(input.startMinutes),arrivalBy:clock(input.startMinutes+durationHours*60),returnBy:clock(input.startMinutes+durationHours*60),items};}
function whyPlan(item,input,roadOk){const why=[],margin=round(input.hours-item.durationHours,1),finish=GATEWAYS[input.finish];why.push(`${finish.label} stays fixed; the planner only chooses how much of your time to spend on stops along that corridor.`);if(roadOk&&!item.road.cautions.length)why.push("The current NPS road table does not show a hard closure across this corridor.");else if(roadOk)why.push("The corridor remains usable, but an official road note overlaps it and should be read before leaving.");else why.push("The official NPS road table did not load, so corridor feasibility needs a manual check before departure.");if(item.stops.length)why.push(`${item.stops.length} selected stop${item.stops.length===1?"":"s"} fit while leaving about ${Math.max(0,margin)} hours of modeled margin.`);else why.push(`The destination drive itself uses most of the ${input.hours}-hour window, so the plan protects arrival time instead of inventing stops.`);return why.slice(0,3);}
function changeTriggers(item,input,roadOk){const out=[],margin=round(input.hours-item.durationHours,1);if(!roadOk)out.push("Recheck the NPS road-status table before you commit; the live road source did not load.");if(item.road.cautions.length)out.push("An official road or construction note overlaps this corridor. Read it before leaving the access point.");if(item.weather?.ok&&Number(item.weather.precipMax)>=60)out.push(`Precipitation reaches ${item.weather.precipMax}% in the corridor forecast; protect the destination and cut optional stops first.`);if(item.weather?.ok&&Number(item.weather.windMax)>=30)out.push(`Forecast wind reaches about ${item.weather.windMax} mph; exposed high stops may be poor uses of time.`);if(margin<.5)out.push("There is little spare time. Skip optional stops rather than making the arrival schedule unrealistic.");if(!out.length)out.push("A new closure, sharp weather change or a shorter available window is the main reason to rebuild this plan.");return out.slice(0,3);}
function deterministicRead(plan,input){const start=GATEWAYS[input.gateway],finish=GATEWAYS[input.finish],margin=Math.max(0,round(input.hours-plan.durationHours,1)),names=plan.stops.slice(0,3).map(s=>s.name);let text=`Treat ${start.label} → ${finish.label} as the fixed trip, not a route the planner is free to reverse. The modeled Parkway portion is about ${plan.routeMiles} miles and ${plan.durationHours} hours.`;if(names.length)text+=` The stops earning time are ${names.join(", ")}.`;else text+=" The clock does not justify a sightseeing stop by default.";text+=` You have about ${margin} hours of modeled margin.`;if((plan.cautions||[]).length)text+=" An official road note overlaps the corridor, so read it before leaving.";return safe(text,850);}
function writerPasses(text){const v=String(text||"").trim(),lower=v.toLowerCase();return!!v&&v.split(/\s+/).length<=145&&!BANNED.some(x=>lower.includes(x));}
async function writePlanBrief(plan,input){const fallback=deterministicRead(plan,input);if(!process.env.ANTHROPIC_API_KEY)return{mode:"handcrafted",text:fallback};const facts={start:GATEWAYS[input.gateway].label,finish:GATEWAYS[input.finish].label,durationHours:plan.durationHours,routeMiles:plan.routeMiles,availableHours:input.hours,stops:plan.stops.map(s=>({name:s.name,practical:s.practical})),roadSourceAvailable:plan.roadSourceOk,roadCautions:plan.cautions.map(x=>safe(x.note,180)).slice(0,2),weather:plan.weather?.ok?{tempMin:plan.weather.tempMin,tempMax:plan.weather.tempMax,precipMax:plan.weather.precipMax,windMax:plan.weather.windMax,forecast:plan.weather.forecast}:null,foliage:plan.foliage?.active?{label:plan.foliage.label,detail:plan.foliage.detail,modeled:true}:null};const c=new AbortController(),timer=setTimeout(()=>c.abort(),5000);try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal:c.signal,headers:{"content-type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:WRITER_MODEL,max_tokens:230,temperature:.15,system:`You edit a practical Blue Ridge Parkway point-to-point trip brief. Write 70-115 words. The start and finish are hard constraints. Discuss only the sealed facts and which optional stops earn time. Sound like a knowledgeable road editor, not tourism marketing or a chatbot. Never invent road status, traffic, weather, crowds, travel time, hours, color, views, closures or safety claims. Never use: ${BANNED.join(", ")}. Return plain prose only.`,messages:[{role:"user",content:JSON.stringify(facts)}]})});if(!r.ok)throw new Error(`Anthropic HTTP ${r.status}`);const j=await r.json(),text=safe((j?.content||[]).map(x=>x?.text||"").join(" "),1000);if(!writerPasses(text))throw new Error("writer output failed anti-slop gate");return{mode:"sealed-fact-editor",text,model:j?.model||WRITER_MODEL};}catch(e){return{mode:"handcrafted",text:fallback,reason:safe(e?.message||e,160)};}finally{clearTimeout(timer);}}
function directionsUrl(stops,start,finish){const p=new URLSearchParams({api:"1",origin:`${start.lat},${start.lon}`,destination:`${finish.lat},${finish.lon}`,travelmode:"driving"}),waypoints=stops.map(s=>`${s.lat},${s.lon}`).slice(0,8).join("|");if(waypoints)p.set("waypoints",waypoints);return`https://www.google.com/maps/dir/?${p.toString()}`;}
function serialize(item,input,editorial,roadOk){const start=GATEWAYS[input.gateway],finish=GATEWAYS[input.finish],timeline=routeTimeline(item.route,item.stops,input,item.durationHours),outlook=T.viewOutlook(item.weather);return{id:item.route.id,name:item.route.name,tripMode:"point-to-point",roadSourceOk:roadOk,fit:item.fit,score:item.score,durationHours:item.durationHours,routeMiles:routeMiles(item.route),mileStart:item.route.startMile,mileTurn:item.route.turnMile,finishLabel:finish.label,character:item.route.character,blocked:item.road.blocked,blocks:item.road.blocks,cautions:item.road.cautions,stops:item.stops.map(s=>({id:s.id,name:s.name,milepost:s.milepost,lat:s.lat,lon:s.lon,elevationFt:s.elevationFt,dwellMinutes:s.dwellMinutes,practical:s.practical,tags:s.tags})),timeline,why:whyPlan(item,input,roadOk),changeTriggers:changeTriggers(item,input,roadOk),viewOutlook:outlook,weather:item.weather,foliage:item.foliage,direction:finish.milepost<start.milepost?"northbound":"southbound",directionsUrl:directionsUrl(item.stops,start,finish),editorial:editorial||null};}
function fallbackReason(selected,alt){if(!alt)return null;if(alt.blocked)return"Blocked by current road status.";const diff=(alt.stops||[]).length-(selected.stops||[]).length;if(diff<0)return"Same destination with fewer optional stops if the clock or weather tightens.";if(diff>0)return"Same destination with more sightseeing only if the day keeps enough margin.";return"Same destination with a different stop mix along the corridor.";}
async function buildDecision(input,road){
  const routes=buildCandidates(input),base=routes.map(route=>({route,stops:stopsForRoute(route),road:T.roadAssessment(route,road),foliage:T.foliageEstimate(route,input.requestedDate)}));
  const highest=Object.values(STOPS).filter(s=>s.milepost>=Math.min(GATEWAYS[input.gateway].milepost,GATEWAYS[input.finish].milepost)&&s.milepost<=Math.max(GATEWAYS[input.gateway].milepost,GATEWAYS[input.finish].milepost)).sort((a,b)=>(b.elevationFt||0)-(a.elevationFt||0))[0]||GATEWAYS[input.finish];
  const weather=await fetchWeather(highest.lat,highest.lon,input);
  const all=base.map(item=>{const durationHours=modeledDuration(item.route),score=routeScore(item.route,input,item.road,weather,item.foliage);return{...item,durationHours,weather,score,fit:fitLabel(score,item.road.blocked,durationHours,input.hours)};});
  const feasible=all.filter(x=>!x.road.blocked&&x.durationHours<=input.hours+.3).sort((a,b)=>b.score-a.score),direct=all.find(x=>x.route.variant==="direct"),fallback=feasible[0]||direct||all[0];let chosen=fallback,jev={mode:"deterministic",choiceId:fallback?.route?.id||null,confidence:0,reason:"Deterministic destination-preserving fallback"};
  if(feasible.length>1){const {decideClosedSet}=require("../mackinac-island/harness.js"),options=Object.fromEntries(feasible.map(x=>[x.route.id,evidence(x,input)]));jev=await decideClosedSet({task:"Choose the strongest already-valid stop plan for a fixed Blue Ridge Parkway point-to-point trip. The start and finish cannot change. Choose exactly one supplied option. Favor the visitor's interests while protecting arrival-time margin and respecting supplied road and weather tradeoffs.",options,context:{start:GATEWAYS[input.gateway].label,finish:GATEWAYS[input.finish].label,date:input.requestedDate,startTime:input.start,hours:input.hours,interests:input.interests},constraints:["Start and finish are hard constraints.","Never choose a blocked plan.","Do not alter mileage, duration, road status, weather, foliage labels or destination.","Foliage is a seasonal estimate, not a live canopy reading."],evidence:[{source:"NPS Blue Ridge Parkway road-status table",available:road.ok,updated:road.updatedLabel||"unknown"},{source:"National Weather Service hourly forecast",available:weather.ok}],fallbackId:fallback?.route?.id||null,minConfidence:.55});chosen=feasible.find(x=>x.route.id===jev.choiceId)||fallback;}
  if(!chosen)return{selected:null,alternatives:[],planB:null,jev};chosen.roadSourceOk=road.ok;const selectedRaw=serialize(chosen,input,null,road.ok),editorial=await writePlanBrief(selectedRaw,input),selected={...selectedRaw,editorial};const alternatives=all.filter(x=>x.route.id!==chosen.route.id).sort((a,b)=>b.score-a.score).map(x=>serialize(x,input,null,road.ok)).slice(0,4),planB=alternatives.find(x=>!x.blocked&&x.durationHours<=input.hours+.3)||alternatives.find(x=>!x.blocked)||null;if(planB)planB.fallbackReason=fallbackReason(selected,planB);return{selected,alternatives,planB,jev};
}
function sources(road,selected){return[
  {name:"NPS road status",url:NPS_ROAD_STATUS_URL,status:road.ok?"live":"unavailable",updated:road.updatedLabel||null,note:road.ok?"Official Parkway gate/section status and road notes.":road.error||"Road-status source could not be read."},
  {name:"National Weather Service",url:selected?.weather?.ok&&selected.weather.source?selected.weather.source:"https://www.weather.gov/",status:selected?.weather?.ok?"live":"unavailable",updated:selected?.weather?.updatedAt||null,note:selected?.weather?.ok?"Hourly forecast sampled near representative high terrain on this corridor.":"The corridor NWS hourly forecast could not be loaded; no gateway-city forecast was substituted."},
  {name:"NPS maps & detours",url:NPS_MAPS_URL,status:"reference",updated:null,note:"Official closure, detour and construction-map context."},
  {name:"NPS auto touring",url:NPS_AUTO_TOUR_URL,status:"reference",updated:null,note:"Official guidance on speed, fuel availability, overlooks and slow-road travel."},
  {name:"NPS directions",url:NPS_DIRECTIONS_URL,status:"reference",updated:null,note:"Official milepost and GPS guidance."},
  {name:"NPS seasonal weather",url:NPS_WEATHER_URL,status:"reference",updated:null,note:"Elevation and mountain-weather context."}
];}
function fieldNotes(){return[
  {label:"Fuel",text:"There are no gas stations on the Parkway itself. Fill up before the drive or use an access road to reach nearby communities.",source:NPS_AUTO_TOUR_URL},
  {label:"Navigation",text:"Use mileposts and road signs on the Parkway. NPS warns that ordinary GPS can be unreliable for Parkway destinations.",source:NPS_DIRECTIONS_URL},
  {label:"Signal",text:"Cell service can be unreliable in parts of the Parkway. Open the route and source links before you lose service.",source:"https://www.nps.gov/blri/faqs.htm"},
  {label:"Pace",text:"45 mph is the maximum on most of the Parkway, not a realistic sightseeing average. Curves, grades, traffic and stops take time.",source:NPS_AUTO_TOUR_URL}
];}
async function handler(req,res){
  if(req.method&&req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({ok:false,error:"Method not allowed"});}
  const input=normalizeInput(req.query||{});if(input.finish==="return")return oldEngine(req,res);
  try{const road=await fetchRoadStatus(),decision=await buildDecision(input,road),finishGateway=GATEWAYS[input.finish];res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");res.setHeader("X-Robots-Tag","noindex, nofollow");return res.status(200).json({ok:true,generatedAt:new Date().toISOString(),input,gateway:GATEWAYS[input.gateway],finishGateway,road:{ok:road.ok,updatedLabel:road.updatedLabel,fetchedAt:road.fetchedAt,error:road.error||null},selected:decision.selected,planB:decision.planB,alternatives:decision.alternatives,decisionMeta:{mode:decision.jev?.mode||"deterministic",confidence:decision.jev?.confidence||0},sources:sources(road,decision.selected),fieldNotes:fieldNotes(),parkwayGeoJsonUrl:PARKWAY_GEOJSON_URL,truth:{road:"Road closure status comes from the official NPS Parkway table when available. A hard closure removes the corridor before stop planning.",routeTime:"Point-to-point route time is a planning estimate using one-way Parkway mileage, conservative mountain-road pace, selected stop time and buffer—not turn-by-turn traffic time.",weather:"Weather is an NWS hourly forecast near representative high terrain on the corridor, not an observation at every overlook.",foliage:"Fall color is a calendar-and-elevation seasonal estimate. It is never presented as a live canopy reading.",selection:"Start and finish are hard constraints. The decision layer may choose only among stop plans on that fixed corridor; it cannot reverse direction or choose a different destination."}});}catch(e){return res.status(500).json({ok:false,error:"Blue Ridge Parkway point-to-point planner failed",detail:safe(e?.message||e,220),generatedAt:new Date().toISOString()});}
}

module.exports=handler;
module.exports._test={normalizeInput,corridorStops,stopValue,chooseStops,corridorRoute,routeMiles,modeledDuration,buildCandidates,routeScore,fitLabel};
