from pathlib import Path


def replace_once(path, old, new):
    p=Path(path)
    text=p.read_text()
    if old not in text:
        raise SystemExit(f"expected text not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old,new,1))

# Round-trip engine: share one handoff builder and add drive-through Parkway anchors.
replace_once(
    "lib/blue-ridge-parkway/engine.js",
    'const {GATEWAYS,routesForGateway,stopsForRoute}=require("./catalog.js");\nconst {decideClosedSet}=require("../mackinac-island/harness.js");',
    'const {GATEWAYS,STOPS,routesForGateway,stopsForRoute}=require("./catalog.js");\nconst {buildGoogleMapsHandoff}=require("./google-maps.js");\nconst {decideClosedSet}=require("../mackinac-island/harness.js");'
)
replace_once(
    "lib/blue-ridge-parkway/engine.js",
    'function directionsUrl(stops,gateway){const start=`${gateway.lat},${gateway.lon}`,p=new URLSearchParams({api:"1",origin:start,destination:start,travelmode:"driving"}),waypoints=stops.map(s=>`${s.lat},${s.lon}`).slice(0,6).join("|");if(waypoints)p.set("waypoints",waypoints);return`https://www.google.com/maps/dir/?${p.toString()}`;}\nfunction serialize(item,input,gateway,editorial,roadOk){\n  const miles=routeMiles(item.route),timeline=routeTimeline(item.route,item.stops,input,item.durationHours),outlook=viewOutlook(item.weather);\n  return{id:item.route.id,name:item.route.name,fit:item.fit,score:item.score,durationHours:item.durationHours,routeMiles:miles,mileStart:item.route.startMile,mileTurn:item.route.turnMile,character:item.route.character,blocked:item.road.blocked,blocks:item.road.blocks,cautions:item.road.cautions,stops:item.stops.map(s=>({id:s.id,name:s.name,milepost:s.milepost,lat:s.lat,lon:s.lon,elevationFt:s.elevationFt,dwellMinutes:s.dwellMinutes,practical:s.practical,tags:s.tags})),timeline,why:whyPlan(item,input,roadOk),changeTriggers:changeTriggers(item,input,roadOk),viewOutlook:outlook,weather:item.weather,foliage:item.foliage,direction:item.route.turnMile<item.route.startMile?"northbound":"southbound",directionsUrl:directionsUrl(item.stops,gateway),editorial:editorial||null};\n}',
    'function routeAnchors(route){const lo=Math.min(route.startMile,route.turnMile),hi=Math.max(route.startMile,route.turnMile);return Object.values(STOPS).filter(stop=>Number.isFinite(Number(stop.lat))&&Number.isFinite(Number(stop.lon))&&Number(stop.milepost)>=lo&&Number(stop.milepost)<=hi);}\nfunction serialize(item,input,gateway,editorial,roadOk){\n  const miles=routeMiles(item.route),timeline=routeTimeline(item.route,item.stops,input,item.durationHours),outlook=viewOutlook(item.weather),mapsHandoff=buildGoogleMapsHandoff({start:gateway,destination:gateway,stops:item.stops,anchors:routeAnchors(item.route),startMile:item.route.startMile,endMile:item.route.turnMile,roundTrip:true});\n  return{id:item.route.id,name:item.route.name,fit:item.fit,score:item.score,durationHours:item.durationHours,routeMiles:miles,mileStart:item.route.startMile,mileTurn:item.route.turnMile,character:item.route.character,blocked:item.road.blocked,blocks:item.road.blocks,cautions:item.road.cautions,stops:item.stops.map(s=>({id:s.id,name:s.name,milepost:s.milepost,lat:s.lat,lon:s.lon,elevationFt:s.elevationFt,dwellMinutes:s.dwellMinutes,practical:s.practical,tags:s.tags})),timeline,why:whyPlan(item,input,roadOk),changeTriggers:changeTriggers(item,input,roadOk),viewOutlook:outlook,weather:item.weather,foliage:item.foliage,direction:item.route.turnMile<item.route.startMile?"northbound":"southbound",directionsUrl:mapsHandoff.url,mapsHandoff,editorial:editorial||null};\n}'
)

# Point-to-point engine: preserve every planned stop and add enough Parkway anchors to resist shortcut routing.
replace_once(
    "lib/blue-ridge-parkway/point-to-point.js",
    'const {GATEWAYS,STOPS}=require("./catalog.js");\nconst T=oldEngine._test;',
    'const {GATEWAYS,STOPS}=require("./catalog.js");\nconst {buildGoogleMapsHandoff}=require("./google-maps.js");\nconst T=oldEngine._test;'
)
replace_once(
    "lib/blue-ridge-parkway/point-to-point.js",
    'function directionsUrl(stops,start,finish){const p=new URLSearchParams({api:"1",origin:`${start.lat},${start.lon}`,destination:`${finish.lat},${finish.lon}`,travelmode:"driving"}),waypoints=stops.map(s=>`${s.lat},${s.lon}`).slice(0,8).join("|");if(waypoints)p.set("waypoints",waypoints);return`https://www.google.com/maps/dir/?${p.toString()}`;}\nfunction serialize(item,input,editorial,roadOk){const start=GATEWAYS[input.gateway],finish=GATEWAYS[input.finish],timeline=routeTimeline(item.route,item.stops,input,item.durationHours),outlook=T.viewOutlook(item.weather),nonstop=round(nonstopMinutes(input)/60,1),stopBudget=Math.max(0,Math.round(input.hours*60-nonstopMinutes(input)));return{id:item.route.id,name:item.route.name,tripMode:"point-to-point",roadSourceOk:roadOk,fit:item.fit,score:item.score,durationHours:item.durationHours,routeMiles:routeMiles(item.route),nonstopHours:nonstop,stopBudgetMinutes:stopBudget,mileStart:item.route.startMile,mileTurn:item.route.turnMile,finishLabel:finish.label,character:item.route.character,blocked:item.road.blocked,blocks:item.road.blocks,cautions:item.road.cautions,stops:item.stops.map(stop=>({id:stop.id,name:stop.name,milepost:stop.milepost,lat:stop.lat,lon:stop.lon,elevationFt:stop.elevationFt,dwellMinutes:stop.dwellMinutes,practical:stop.practical,tags:stop.tags,source:stop.source||null})),timeline,why:whyPlan(item,input,roadOk),changeTriggers:changeTriggers(item,input,roadOk),viewOutlook:outlook,weather:item.weather,foliage:item.foliage,direction:finish.milepost<start.milepost?"northbound":"southbound",directionsUrl:directionsUrl(item.stops,start,finish),editorial:editorial||null};}',
    'function serialize(item,input,editorial,roadOk){const start=GATEWAYS[input.gateway],finish=GATEWAYS[input.finish],timeline=routeTimeline(item.route,item.stops,input,item.durationHours),outlook=T.viewOutlook(item.weather),nonstop=round(nonstopMinutes(input)/60,1),stopBudget=Math.max(0,Math.round(input.hours*60-nonstopMinutes(input))),mapsHandoff=buildGoogleMapsHandoff({start,destination:finish,stops:item.stops,anchors:corridorStops(input.gateway,input.finish),startMile:start.milepost,endMile:finish.milepost});return{id:item.route.id,name:item.route.name,tripMode:"point-to-point",roadSourceOk:roadOk,fit:item.fit,score:item.score,durationHours:item.durationHours,routeMiles:routeMiles(item.route),nonstopHours:nonstop,stopBudgetMinutes:stopBudget,mileStart:item.route.startMile,mileTurn:item.route.turnMile,finishLabel:finish.label,character:item.route.character,blocked:item.road.blocked,blocks:item.road.blocks,cautions:item.road.cautions,stops:item.stops.map(stop=>({id:stop.id,name:stop.name,milepost:stop.milepost,lat:stop.lat,lon:stop.lon,elevationFt:stop.elevationFt,dwellMinutes:stop.dwellMinutes,practical:stop.practical,tags:stop.tags,source:stop.source||null})),timeline,why:whyPlan(item,input,roadOk),changeTriggers:changeTriggers(item,input,roadOk),viewOutlook:outlook,weather:item.weather,foliage:item.foliage,direction:finish.milepost<start.milepost?"northbound":"southbound",directionsUrl:mapsHandoff.url,mapsHandoff,editorial:editorial||null};}'
)

# UI: make the action explicit and show what is being handed off.
replace_once(
    "public/assets/blue-ridge-parkway.js",
    '<a class="primary-link" id="mapsHandoff" href="${esc(safeUrl(plan.directionsUrl))}" target="_blank" rel="noopener">Open route in Google Maps</a><button class="secondary-button" id="sharePlan" type="button">Share plan</button><button class="secondary-button" id="printPlan" type="button">Print</button></div>`;',
    '<a class="primary-link" id="mapsHandoff" href="${esc(safeUrl(plan.directionsUrl))}" target="_blank" rel="noopener">Open full drive in Google Maps</a><button class="secondary-button" id="sharePlan" type="button">Share plan</button><button class="secondary-button" id="printPlan" type="button">Print</button></div>${plan.mapsHandoff?`<div class="model-label maps-handoff-note">Google Maps handoff: ${esc(plan.mapsHandoff.plannedStopCount||0)} planned stop${Number(plan.mapsHandoff.plannedStopCount)===1?"":"s"}${plan.mapsHandoff.routeAnchorCount?` + ${esc(plan.mapsHandoff.routeAnchorCount)} Parkway routing anchor${Number(plan.mapsHandoff.routeAnchorCount)===1?"":"s"}`:""}. Stop order stays fixed.</div>`:""}`;'
)
replace_once(
    "public/assets/blue-ridge-parkway.js",
    'track("blue_ridge_maps_handoff",{route_id:plan.id,gateway:payload.input?.gateway||"",finish:payload.input?.finish||"return"})',
    'track("blue_ridge_maps_handoff",{route_id:plan.id,gateway:payload.input?.gateway||"",finish:payload.input?.finish||"return",planned_stops:plan.mapsHandoff?.plannedStopCount||0,route_anchors:plan.mapsHandoff?.routeAnchorCount||0,handoff_complete:plan.mapsHandoff?.complete!==false})'
)
replace_once(
    "public/blue-ridge-parkway/index.html",
    '/assets/blue-ridge-parkway.js?v=20260925-6',
    '/assets/blue-ridge-parkway.js?v=20260925-7'
)

# Extend route-handoff regression with integration assertions.
p=Path("tests/blue-ridge-google-maps.test.js")
s=p.read_text()
s += '''\n\ntest("both planner engines serialize the shared full-route Google Maps handoff",()=>{\n  const fs=require("node:fs");\n  const engine=fs.readFileSync(require.resolve("../lib/blue-ridge-parkway/engine.js"),"utf8");\n  const point=fs.readFileSync(require.resolve("../lib/blue-ridge-parkway/point-to-point.js"),"utf8");\n  const browser=fs.readFileSync(require.resolve("../public/assets/blue-ridge-parkway.js"),"utf8");\n  assert.match(engine,/buildGoogleMapsHandoff/);\n  assert.match(point,/buildGoogleMapsHandoff/);\n  assert.match(browser,/Open full drive in Google Maps/);\n  assert.match(browser,/Parkway routing anchor/);\n});\n'''
p.write_text(s)
