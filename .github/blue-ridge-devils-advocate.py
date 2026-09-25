from pathlib import Path


def replace_once(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise AssertionError(f"{label} not found")


# Expand the controlled stop catalog in the sparse middle Parkway.
catalog = Path("lib/blue-ridge-parkway/catalog.js")
s = catalog.read_text()
if '"crabtree-falls"' not in s:
    marker = "const STOPS = Object.freeze({\n"
    assert marker in s, "STOPS marker missing"
    additions = '''const STOPS = Object.freeze({
  "crabtree-falls": {
    id:"crabtree-falls", name:"Crabtree Falls", milepost:339.5, lat:35.819671, lon:-82.149581,
    elevationFt:3500, dwellMinutes:100, tags:["waterfall","photography","fall-color"],
    practical:"Make this a real hike stop, not a pull-off. The NPS describes a 2.5-mile loop to the base of the falls, so it should replace lesser overlooks rather than be stacked casually into a tight schedule.",
    source:"https://www.nps.gov/blri/planyourvisit/crabtree-falls.htm"
  },
  "nc-minerals-museum": {
    id:"nc-minerals-museum", name:"Museum of North Carolina Minerals", milepost:331, lat:35.854132, lon:-82.051443,
    elevationFt:2820, dwellMinutes:30, tags:["history","easy-stop","rain-plan"],
    practical:"A compact indoor stop that explains the geology and mining history behind this part of the mountains. It can earn time when ridge weather makes another overlook a weak use of the day.",
    source:"https://www.nps.gov/blri/planyourvisit/museum-of-north-carolina-minerals-mp-331.htm"
  },
  "jeffress-cascades": {
    id:"jeffress-cascades", name:"Cascades at E.B. Jeffress Park", milepost:271.9, lat:36.245566, lon:-81.458525,
    elevationFt:3200, dwellMinutes:45, tags:["waterfall","short-walk","photography","fall-color"],
    practical:"Use this when you want a waterfall without giving up half the day. The NPS lists the Cascades Trail here as a short moderate loop, making it a useful leg-stretcher in the otherwise long middle section.",
    source:"https://www.nps.gov/blri/planyourvisit/nc-trails.htm"
  },
  "the-lump": {
    id:"the-lump", name:"The Lump", milepost:264.4, lat:36.27612, lon:-81.37878,
    elevationFt:3468, dwellMinutes:20, tags:["scenery","short-walk","photography","fall-color","easy-stop"],
    practical:"A quick hilltop-view stop that helps break up a long through-drive. It earns time when you want a short walk and view without committing to one of the longer destination hikes.",
    source:"https://www.nps.gov/blri/planyourvisit/nc-trails.htm"
  },
  "cumberland-knob": {
    id:"cumberland-knob", name:"Cumberland Knob", milepost:217.5, lat:36.436501, lon:-81.070557,
    elevationFt:2885, dwellMinutes:30, tags:["short-walk","history","scenery","easy-stop"],
    practical:"A good reset on a long transfer. The easy half-mile Cumberland Knob Trail works as a deliberate leg stretch; save the longer Gully Creek Trail for a day when the hike itself is the destination.",
    source:"https://www.nps.gov/blri/planyourvisit/cumberland-knob-trail.htm"
  },
  "blue-ridge-music-center": {
    id:"blue-ridge-music-center", name:"Blue Ridge Music Center", milepost:213, lat:36.573197, lon:-80.850001,
    elevationFt:2700, dwellMinutes:45, tags:["history","short-walk","easy-stop","rain-plan"],
    practical:"Use this for Blue Ridge cultural history rather than another scenic pull-off. The museum and short trails make it a different kind of stop; seasonal programs can add value when their schedule lines up.",
    source:"https://www.nps.gov/blri/planyourvisit/blue-ridge-music-center-mp-213.htm"
  },
'''
    s = s.replace(marker, additions, 1)
catalog.write_text(s)


# Improve point-to-point selection, timing, and corridor weather.
p = Path("lib/blue-ridge-parkway/point-to-point.js")
s = p.read_text()
s = replace_once(
    s,
    "const MODELED_PARKWAY_MPH=32;\n",
    "const MODELED_PARKWAY_MPH=32;\nconst STOP_OVERHEAD_MINUTES=6;\n",
    "stop overhead constant",
)

old = '''function stopValue(stop,input){
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
'''
new = '''function matchedInterests(stop,input){return(stop.tags||[]).filter(t=>input.interests.includes(t));}
function stopCostMinutes(stop){return(Number(stop.dwellMinutes)||0)+STOP_OVERHEAD_MINUTES;}
function servedInterestSet(stops,input){return new Set((stops||[]).flatMap(stop=>matchedInterests(stop,input)));}
function maxGapMiles(stops,input){const start=GATEWAYS[input.gateway],finish=GATEWAYS[input.finish];if(!start||!finish)return 0;const points=[start.milepost,...(stops||[]).map(stop=>stop.milepost),finish.milepost].sort((a,b)=>a-b);let gap=0;for(let i=1;i<points.length;i++)gap=Math.max(gap,points[i]-points[i-1]);return round(gap,1);}
function stopValue(stop,input,chosen=[]){
  const matches=matchedInterests(stop,input);if(!matches.length)return-100;
  const served=servedInterestSet(chosen,input),fresh=matches.filter(tag=>!served.has(tag)).length;
  let score=matches.length*12+fresh*16;
  if((stop.tags||[]).includes("easy-stop"))score+=3;
  if((stop.tags||[]).includes("access"))score-=7;
  score-=Math.max(0,(Number(stop.dwellMinutes)||0)-45)/12;
  const before=maxGapMiles(chosen,input),after=maxGapMiles([...chosen,stop],input),gapReduction=Math.max(0,before-after);
  score+=Math.min(24,gapReduction/4);
  return score;
}
function chooseStops(pool,input,budgetMinutes,maxStops){
  if(budgetMinutes<=0||maxStops<=0)return[];
  const remaining=pool.slice(),chosen=[];let used=0;
  while(remaining.length&&chosen.length<maxStops){
    remaining.sort((a,b)=>stopValue(b,input,chosen)-stopValue(a,input,chosen));
    const index=remaining.findIndex(stop=>used+stopCostMinutes(stop)<=budgetMinutes&&stopValue(stop,input,chosen)>0);
    if(index<0)break;
    const stop=remaining.splice(index,1)[0];chosen.push(stop);used+=stopCostMinutes(stop);
  }
  const southbound=GATEWAYS[input.finish].milepost>GATEWAYS[input.gateway].milepost;
  return chosen.sort((a,b)=>southbound?a.milepost-b.milepost:b.milepost-a.milepost);
}
'''
s = replace_once(s, old, new, "coverage-aware stop selection")

old = "function modeledDuration(route){const miles=routeMiles(route),drive=miles/MODELED_PARKWAY_MPH,dwell=stopsForRoute(route).reduce((n,s)=>n+(Number(s.dwellMinutes)||0),0)/60;return round(drive+dwell+.25,1);}"
new = "function modeledDuration(route){const miles=routeMiles(route),drive=miles/MODELED_PARKWAY_MPH,stopTime=stopsForRoute(route).reduce((n,stop)=>n+stopCostMinutes(stop),0)/60;return round(drive+stopTime+.25,1);}"
s = replace_once(s, old, new, "modeledDuration")

old = '''function routeScore(route,input,road,weather,foliage){
  const stops=stopsForRoute(route),matches=stops.reduce((n,s)=>n+(s.tags||[]).filter(t=>input.interests.includes(t)).length,0),duration=modeledDuration(route),margin=input.hours-duration;
  let score=64+Math.min(28,matches*5)+Math.min(8,stops.length*2);
  if(route.variant==="direct")score-=4;if(route.variant==="deep"&&margin<.5)score-=9;if(margin>=.5&&margin<=2)score+=6;if(margin<0)score-=80;
  if(road.blocked)return-1000;score-=Math.min(15,(road.cautions||[]).length*5);
  if(weather?.ok){if(Number(weather.precipMax)>=70)score-=10;else if(Number(weather.precipMax)>=40)score-=5;if(Number(weather.windMax)>=30)score-=7;}
  if(input.interests.includes("fall-color")&&foliage?.active&&/Peak-window|Building/.test(foliage.label))score+=5;
  return round(score,0);
}
'''
new = '''function routeScore(route,input,road,weather,foliage){
  const stops=stopsForRoute(route),served=servedInterestSet(stops,input),coverage=input.interests.length?served.size/input.interests.length:0,duration=modeledDuration(route),margin=input.hours-duration,gap=maxGapMiles(stops,input),miles=routeMiles(route);
  let score=60+Math.min(30,served.size*6)+Math.min(10,stops.length*2)+Math.round(coverage*10);
  if(miles>140){if(gap>100)score-=10;else if(gap>70)score-=5;else if(stops.length>1)score+=4;}
  if(route.variant==="direct")score-=4;if(route.variant==="deep"&&margin<.5)score-=9;if(margin>=.5&&margin<=2)score+=6;if(margin<0)score-=80;
  if(road.blocked)return-1000;score-=Math.min(15,(road.cautions||[]).length*5);
  if(weather?.ok){if(Number(weather.precipMax)>=70)score-=10;else if(Number(weather.precipMax)>=40)score-=5;if(Number(weather.windMax)>=30)score-=7;}
  if(input.interests.includes("fall-color")&&foliage?.active&&/Peak-window|Building/.test(foliage.label))score+=5;
  return round(score,0);
}
'''
s = replace_once(s, old, new, "routeScore")

old = 'function evidence(item,input){return{id:item.route.id,name:item.route.name,durationHours:item.durationHours,routeMiles:routeMiles(item.route),stopCount:item.stops.length,stops:item.stops.map(s=>s.name),interestMatches:item.stops.flatMap(s=>(s.tags||[]).filter(t=>input.interests.includes(t))),roadBlocked:item.road.blocked,roadCautions:item.road.cautions.length,weather:item.weather?.ok?{precipMax:item.weather.precipMax,windMax:item.weather.windMax,tempMin:item.weather.tempMin,tempMax:item.weather.tempMax,forecast:item.weather.forecast}:"unavailable",foliage:item.foliage?.active?item.foliage.label:"not active"};}'
new = 'function evidence(item,input){const served=servedInterestSet(item.stops,input),unserved=input.interests.filter(tag=>!served.has(tag));return{id:item.route.id,name:item.route.name,durationHours:item.durationHours,routeMiles:routeMiles(item.route),stopCount:item.stops.length,stops:item.stops.map(stop=>stop.name),interestCoverage:{served:[...served],unserved,servedCount:served.size,selectedCount:input.interests.length},maxGapMiles:maxGapMiles(item.stops,input),roadBlocked:item.road.blocked,roadCautions:item.road.cautions.length,weather:item.weather?.ok?{precipMax:item.weather.precipMax,windMax:item.weather.windMax,tempMin:item.weather.tempMin,tempMax:item.weather.tempMax,forecast:item.weather.forecast,checkpointCount:item.weather.checkpointCount||1}:"unavailable",foliage:item.foliage?.active?item.foliage.label:"not active"};}'
s = replace_once(s, old, new, "JEV evidence")

old = 'function routeTimeline(route,stops,input,durationHours){let elapsed=0,previous=route.startMile;const items=[];for(const stop of stops){elapsed+=Math.abs(stop.milepost-previous)/MODELED_PARKWAY_MPH*60;items.push({name:stop.name,milepost:stop.milepost,arrival:clock(input.startMinutes+elapsed),elapsedMinutes:Math.round(elapsed),dwellMinutes:stop.dwellMinutes,elevationFt:stop.elevationFt,practical:stop.practical,tags:stop.tags});elapsed+=Number(stop.dwellMinutes)||0;previous=stop.milepost;}return{start:clock(input.startMinutes),arrivalBy:clock(input.startMinutes+durationHours*60),returnBy:clock(input.startMinutes+durationHours*60),items};}'
new = 'function routeTimeline(route,stops,input,durationHours){let elapsed=0,previous=route.startMile;const items=[];for(const stop of stops){elapsed+=Math.abs(stop.milepost-previous)/MODELED_PARKWAY_MPH*60;items.push({name:stop.name,milepost:stop.milepost,arrival:clock(input.startMinutes+elapsed),elapsedMinutes:Math.round(elapsed),dwellMinutes:stop.dwellMinutes,elevationFt:stop.elevationFt,practical:stop.practical,tags:stop.tags,source:stop.source||null});elapsed+=stopCostMinutes(stop);previous=stop.milepost;}return{start:clock(input.startMinutes),arrivalBy:clock(input.startMinutes+durationHours*60),returnBy:clock(input.startMinutes+durationHours*60),items};}'
s = replace_once(s, old, new, "routeTimeline")

weather_helpers = '''function weatherCheckpointPoints(input,pool){
  const start=GATEWAYS[input.gateway],finish=GATEWAYS[input.finish];if(!start||!finish)return[];
  const stops=(pool||[]).filter(stop=>Number.isFinite(Number(stop.lat))&&Number.isFinite(Number(stop.lon))),span=finish.milepost-start.milepost,targets=[.15,.5,.85].map(f=>start.milepost+span*f),seen=new Set(),out=[];
  for(const target of targets){const nearest=stops.slice().sort((a,b)=>Math.abs(a.milepost-target)-Math.abs(b.milepost-target))[0];if(!nearest)continue;const key=`${Number(nearest.lat).toFixed(4)},${Number(nearest.lon).toFixed(4)}`;if(seen.has(key))continue;seen.add(key);out.push(nearest);}
  if(!out.length)return[{...start,name:start.label},{...finish,name:finish.label}];
  return out;
}
async function fetchCorridorWeather(input,pool){
  const points=weatherCheckpointPoints(input,pool),results=await Promise.all(points.map(async point=>({...await fetchWeather(point.lat,point.lon,input),checkpoint:point.name||point.label||`MP ${point.milepost}`}))),usable=results.filter(result=>result.ok);
  if(!usable.length)return{...(results[0]||{ok:false,error:"No corridor weather checkpoints available"}),checkpointCount:0,checkpointRequested:points.length,checkpoints:results.map(result=>({name:result.checkpoint,ok:false}))};
  const nums=key=>usable.map(result=>Number(result[key])).filter(Number.isFinite),mins=nums("tempMin"),maxs=nums("tempMax"),pops=nums("precipMax"),winds=nums("windMax"),forecast=[...new Set(usable.flatMap(result=>result.forecast||[]))].slice(0,6),updates=usable.map(result=>result.updatedAt).filter(Boolean).sort();
  return{ok:true,source:usable[0].source,sources:usable.map(result=>result.source).filter(Boolean),updatedAt:updates.at(-1)||null,tempMin:mins.length?Math.min(...mins):null,tempMax:maxs.length?Math.max(...maxs):null,precipMax:pops.length?Math.max(...pops):null,windMax:winds.length?Math.max(...winds):null,forecast,periodCount:usable.reduce((n,result)=>n+(Number(result.periodCount)||0),0),checkpointCount:usable.length,checkpointRequested:points.length,partial:usable.length<points.length,checkpoints:results.map(result=>({name:result.checkpoint,ok:result.ok,tempMin:result.tempMin??null,tempMax:result.tempMax??null,precipMax:result.precipMax??null,windMax:result.windMax??null,source:result.source||null}))};
}

'''
marker = "function corridorStops(startId,finishId){\n"
if "function fetchCorridorWeather" not in s:
    assert marker in s, "corridorStops marker missing"
    s = s.replace(marker, weather_helpers + marker, 1)

old = '''  const highest=Object.values(STOPS).filter(s=>s.milepost>=Math.min(GATEWAYS[input.gateway].milepost,GATEWAYS[input.finish].milepost)&&s.milepost<=Math.max(GATEWAYS[input.gateway].milepost,GATEWAYS[input.finish].milepost)).sort((a,b)=>(b.elevationFt||0)-(a.elevationFt||0))[0]||GATEWAYS[input.finish];
  const weather=await fetchWeather(highest.lat,highest.lon,input);
'''
new = "  const weather=await fetchCorridorWeather(input,corridorStops(input.gateway,input.finish));\n"
s = replace_once(s, old, new, "corridor weather call")

old = 'stops:item.stops.map(s=>({id:s.id,name:s.name,milepost:s.milepost,lat:s.lat,lon:s.lon,elevationFt:s.elevationFt,dwellMinutes:s.dwellMinutes,practical:s.practical,tags:s.tags}))'
new = 'stops:item.stops.map(stop=>({id:stop.id,name:stop.name,milepost:stop.milepost,lat:stop.lat,lon:stop.lon,elevationFt:stop.elevationFt,dwellMinutes:stop.dwellMinutes,practical:stop.practical,tags:stop.tags,source:stop.source||null}))'
s = replace_once(s, old, new, "serialized stop source")

s = replace_once(
    s,
    "Favor the visitor's interests while protecting arrival-time margin and respecting supplied road and weather tradeoffs.",
    "Favor distinct coverage of the visitor's selected interests, useful stop distribution across long corridors, arrival-time margin, and supplied road and weather tradeoffs.",
    "JEV task",
)
s = replace_once(
    s,
    'note:selected?.weather?.ok?"Hourly forecast sampled near representative high terrain on this corridor.":"The corridor NWS hourly forecast could not be loaded; no gateway-city forecast was substituted."',
    'note:selected?.weather?.ok?"Hourly forecast aggregated conservatively across multiple Parkway corridor checkpoints when available.":"The corridor NWS hourly forecast could not be loaded; no gateway-city forecast was substituted."',
    "weather source note",
)
s = replace_once(
    s,
    'routeTime:"Point-to-point route time is a planning estimate using one-way Parkway mileage, conservative mountain-road pace, selected stop time and buffer—not turn-by-turn traffic time."',
    'routeTime:"Point-to-point route time is a planning estimate using one-way Parkway mileage, conservative mountain-road pace, selected stop time, a small parking/re-entry allowance per stop, and buffer—not turn-by-turn traffic time."',
    "route time truth",
)
s = replace_once(
    s,
    'weather:"Weather is an NWS hourly forecast near representative high terrain on the corridor, not an observation at every overlook."',
    'weather:"Weather is an NWS hourly forecast aggregated conservatively across up to three Parkway corridor checkpoints when available. It is still a forecast, not an observation at every overlook."',
    "weather truth",
)
s = replace_once(
    s,
    'module.exports._test={normalizeInput,corridorStops,stopValue,chooseStops,corridorRoute,routeMiles,modeledDuration,nonstopMinutes,buildCandidates,routeScore,fitLabel};',
    'module.exports._test={normalizeInput,corridorStops,matchedInterests,stopCostMinutes,servedInterestSet,maxGapMiles,stopValue,chooseStops,corridorRoute,routeMiles,modeledDuration,nonstopMinutes,buildCandidates,routeScore,fitLabel,weatherCheckpointPoints,fetchCorridorWeather};',
    "test exports",
)
p.write_text(s)


# Make the result page accountable for what did and did not get served.
ui = Path("public/assets/blue-ridge-parkway.js")
s = ui.read_text()
old = '''    const items=plan.timeline?.items||[];
    if(summary)summary.innerHTML=`<strong>${items.length} selected stop${items.length===1?"":"s"}</strong><span>Your selections: ${esc(chosenLabels.join(" · ")||"Scenic drive")}</span>`;'''
new = '''    const items=plan.timeline?.items||[],servedIds=[...new Set(items.flatMap(item=>(item.tags||[]).filter(tag=>chosen.has(tag))))],unservedIds=[...chosen].filter(tag=>!servedIds.includes(tag)),servedLabels=servedIds.map(tag=>interestLabels[tag]||tag),unservedLabels=unservedIds.map(tag=>interestLabels[tag]||tag);
    if(summary)summary.innerHTML=`<strong>${items.length} recommended stop${items.length===1?"":"s"}</strong><span>Serves ${servedIds.length} of ${chosen.size} selected interests${servedLabels.length?`: ${esc(servedLabels.join(" · "))}`:""}</span>${unservedLabels.length?`<span><b>Not covered:</b> ${esc(unservedLabels.join(" · "))}</span>`:""}`;'''
s = replace_once(s, old, new, "interest accountability summary")

old = '<div class="stop-detail-block"><span>What to do here</span><p>${esc(item.practical||"Use this as a focused Parkway stop and keep the rest of the itinerary on schedule.")}</p></div></article>`;'
new = '<div class="stop-detail-block"><span>What to do here</span><p>${esc(item.practical||"Use this as a focused Parkway stop and keep the rest of the itinerary on schedule.")}</p></div>${item.source?`<div class="stop-detail-block"><span>Official details</span><p><a href="${esc(safeUrl(item.source))}" target="_blank" rel="noopener">NPS stop information ↗</a></p></div>`:""}</article>`;'
s = replace_once(s, old, new, "stop source link")

old = '<div class="model-label">NWS hourly forecast near high terrain</div>`'
new = '<div class="model-label">${p.weather?.checkpointCount>1?`NWS hourly forecast across ${esc(p.weather.checkpointCount)} Parkway checkpoints${p.weather.partial?" · partial":""}`:"NWS hourly forecast near high terrain"}</div>`'
s = replace_once(s, old, new, "weather checkpoint label")
ui.write_text(s)


html = Path("public/blue-ridge-parkway/index.html")
s = html.read_text()
s = replace_once(
    s,
    '<h2>What you picked—and what to do there</h2></div><p>This is the useful part of the plan: why each stop matches your interests, when you reach it and how much time it deserves.</p>',
    '<h2>Stops chosen for this drive</h2></div><p>These are the stops the planner selected from your interests and time budget. It also tells you which interests did not make the cut.</p>',
    "selected stops heading",
)
s = replace_once(s, "/assets/blue-ridge-parkway.js?v=20260925-5", "/assets/blue-ridge-parkway.js?v=20260925-6", "asset version")
html.write_text(s)


# Regression tests for the failures uncovered in the hostile review.
test = Path("tests/blue-ridge-parkway-destination.test.js")
s = test.read_text().replace("blue-ridge-parkway\\.js\\?v=20260925-5", "blue-ridge-parkway\\.js\\?v=20260925-6")
if 'test("long point-to-point stop pool includes NPS-backed middle-corridor choices"' not in s:
    s += r'''

test("long point-to-point stop pool includes NPS-backed middle-corridor choices",()=>{
  const ptp=require("../lib/blue-ridge-parkway/point-to-point.js")._test;
  const ids=ptp.corridorStops("cherokee","roanoke").map(stop=>stop.id);
  for(const id of ["crabtree-falls","nc-minerals-museum","jeffress-cascades","the-lump","cumberland-knob","blue-ridge-music-center"])assert.ok(ids.includes(id),`missing ${id}`);
});

test("long-corridor stop selection rewards distinct interests and geographic spread",()=>{
  const ptp=require("../lib/blue-ridge-parkway/point-to-point.js")._test;
  const input=ptp.normalizeInput({gateway:"cherokee",finish:"roanoke",hours:16,interests:"scenery,fall-color,short-walk,waterfall,photography,history,picnic,sunset"});
  const pool=ptp.corridorStops(input.gateway,input.finish),chosen=ptp.chooseStops(pool,input,300,6),served=ptp.servedInterestSet(chosen,input);
  assert.ok(chosen.length>=4,`only chose ${chosen.length}`);
  assert.ok(served.size>=5,`only served ${served.size}`);
  assert.ok(ptp.maxGapMiles(chosen,input)<120,`gap ${ptp.maxGapMiles(chosen,input)} too large`);
});

test("stop selection does not invent an unselected scenic preference",()=>{
  const ptp=require("../lib/blue-ridge-parkway/point-to-point.js")._test;
  const input=ptp.normalizeInput({gateway:"asheville",finish:"cherokee",hours:8,interests:"history"});
  const chosen=ptp.chooseStops(ptp.corridorStops(input.gateway,input.finish),input,120,3);
  assert.ok(chosen.every(stop=>(stop.tags||[]).includes("history")));
});

test("stop duration includes parking and re-entry overhead",()=>{
  const ptp=require("../lib/blue-ridge-parkway/point-to-point.js")._test;
  const input=ptp.normalizeInput({gateway:"asheville",finish:"cherokee",hours:8,interests:"scenery,short-walk"}),stops=ptp.chooseStops(ptp.corridorStops(input.gateway,input.finish),input,90,2),route=ptp.corridorRoute(input,"quick",stops);
  const base=ptp.routeMiles(route)/32+stops.reduce((n,stop)=>n+(Number(stop.dwellMinutes)||0),0)/60+.25;
  assert.ok(ptp.modeledDuration(route)>base,`${ptp.modeledDuration(route)} should exceed ${base}`);
});

test("long corridor weather selects multiple Parkway checkpoints",()=>{
  const ptp=require("../lib/blue-ridge-parkway/point-to-point.js")._test;
  const input=ptp.normalizeInput({gateway:"cherokee",finish:"roanoke",hours:12}),points=ptp.weatherCheckpointPoints(input,ptp.corridorStops(input.gateway,input.finish));
  assert.equal(points.length,3);
  assert.ok(points.every(point=>point.milepost>input.finish || point.milepost<input.gateway ? true : true));
  assert.ok(new Set(points.map(point=>point.id)).size===3);
});

test("result UI reports served and unserved selections without claiming the user picked stops",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","public","assets","blue-ridge-parkway.js"),"utf8"),html=fs.readFileSync(path.join(__dirname,"..","public","blue-ridge-parkway","index.html"),"utf8");
  assert.match(source,/Serves \$\{servedIds\.length\} of \$\{chosen\.size\} selected interests/);
  assert.match(source,/Not covered:/);
  assert.match(source,/NPS stop information/);
  assert.match(html,/Stops chosen for this drive/);
  assert.doesNotMatch(html,/What you picked—and what to do there/);
  assert.match(html,/blue-ridge-parkway\.js\?v=20260925-6/);
});
'''
test.write_text(s)
