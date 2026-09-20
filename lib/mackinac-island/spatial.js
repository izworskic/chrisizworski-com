"use strict";

const ZONES=Object.freeze({
  downtown:{id:"downtown",name:"Downtown ferry harbor",lat:45.8494,lon:-84.6178,accuracy:"known-area",detail:"Ferry docks, Main Street and the compact downtown core."},
  fort:{id:"fort",name:"Fort Mackinac",lat:45.8528,lon:-84.6176,accuracy:"known-place",detail:"Historic bluff above downtown; interior approach is steep."},
  "arch-rock":{id:"arch-rock",name:"Arch Rock",lat:45.8568,lon:-84.6097,accuracy:"known-place",detail:"East bluff landmark; interior approaches involve climbing."},
  "grand-hotel":{id:"grand-hotel",name:"Grand Hotel area",lat:45.8510,lon:-84.6253,accuracy:"known-area",detail:"About a 10–15 minute walk from downtown; uphill from the waterfront."},
  "mission-district":{id:"mission-district",name:"Mission District",lat:45.8499,lon:-84.6049,accuracy:"area-anchor",detail:"Southeast shore area around Mission Point; roughly a 15-minute walk from downtown."},
  "west-end":{id:"west-end",name:"West end of downtown",lat:45.8487,lon:-84.6230,accuracy:"area-anchor",detail:"Waterfront west end near Windermere Point and Hotel Iroquois."},
  "harbor-east":{id:"harbor-east",name:"Harbor / east edge of downtown",lat:45.8512,lon:-84.6136,accuracy:"area-anchor",detail:"State Harbor and east edge of downtown."},
  "stonecliffe-area":{id:"stonecliffe-area",name:"Stonecliffe / sunset side",lat:45.8617,lon:-84.6537,accuracy:"area-anchor",detail:"Quiet west-side planning anchor; not a property entrance pin."},
  "british-landing":{id:"british-landing",name:"British Landing",lat:45.8724,lon:-84.6387,accuracy:"known-place",detail:"West-side stop on the M-185 perimeter."}
});

const PLACE_ZONE=Object.freeze({
  "grand-hotel":"grand-hotel",
  "mission-point":"mission-district",
  "inn-at-stonecliffe":"stonecliffe-area",
  "hotel-iroquois":"west-end",
  "island-house":"harbor-east",
  "lake-view":"downtown",
  "sunset-condos":"stonecliffe-area",
  "carriage-house":"west-end",
  "woods":"stonecliffe-area",
  "1852-grill-room":"harbor-east",
  "pink-pony":"downtown",
  "fort-tea-room":"fort",
  "great-turtle":"downtown",
  "douds-picnic":"downtown",
  "mighty-mac":"downtown"
});

function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)));}
function firstEligible(items=[],predicate=()=>true){return items.find(x=>x.season_eligible!==false&&predicate(x))||items.find(predicate)||null;}
function mealFor(places,meal){
  return firstEligible(places?.dining?.recommended||[],x=>Array.isArray(x.meal)&&x.meal.includes(meal));
}
function lodgingFor(places){return firstEligible(places?.lodging?.recommended||[]);}
function regionalFor(places){return firstEligible(places?.regional?.recommended||[]);}
function placeStop(item,role){
  if(!item)return null;
  const zone=PLACE_ZONE[item.id]||"downtown";
  return {id:"place-"+item.id,name:item.name,role,anchor_id:zone,why:item.fit_reason||item.note||"Fits this trip profile.",source_url:item.source_url||null};
}
function coreStop(id,name,role,why){
  return {id,name,role,anchor_id:id,why};
}
function scoreCandidate(base,weights){
  let score=base;
  for(const [value,weight] of weights)score+=Number(value||0)*weight;
  return Math.round(clamp(score,0,100));
}
function dedupeStops(stops){
  const seen=new Set();return stops.filter(Boolean).filter(s=>{const key=s.id+"|"+s.role;if(seen.has(key))return false;seen.add(key);return true;});
}
function candidateCompact(v,places,overnight){
  const lunch=mealFor(places,"lunch")||mealFor(places,"dinner");
  const stops=[
    coreStop("downtown","Downtown + harbor","arrival","Start compact and learn the Island before climbing inland."),
    v.history>=.58?coreStop("fort","Fort Mackinac","anchor","Strong first-visit/history value without crossing the whole Island."):null,
    placeStop(lunch,"meal"),
    v.photography>=.7?coreStop("west-end","West-end waterfront","scenery","Adds water views without forcing a full-island route."):null
  ];
  const score=scoreCandidate(48,[[v.history,18],[v.iconic_priority,15],[v.kids_priority,14],[v.budget_sensitivity,5],[1-v.regional_exploration,8],[overnight?.2:1,5]]);
  return {id:"compact-core",label:"Compact Island core",score,summary:"Keep the trip concentrated around downtown, the Fort and one meal/scenery extension instead of zig-zagging across the Island.",days:[{role:"island-core",title:"Island core day",stops:dedupeStops(stops)}],avoid:["Do not add a distant stop just because there is time on paper.","Protect ferry margin before adding another attraction."]};
}
function candidateScenic(v,places,overnight){
  if(!overnight)return null;
  const stay=lodgingFor(places);const dinner=mealFor(places,"dinner")||mealFor(places,"lunch");
  const stayStop=placeStop(stay,"stay");
  const dinnerStop=placeStop(dinner,"dinner");
  const day1=[coreStop("downtown","Downtown arrival","arrival","Get off the ferry, orient, then stop treating downtown as the entire trip."),stayStop,dinnerStop];
  const day2=[
    v.photography>=.62?coreStop("west-end","West-end / sunset side","scenery","Use the quieter west side when light and crowd avoidance matter."):null,
    v.history>=.55?coreStop("fort","Fort Mackinac","anchor","Give history its own block instead of squeezing it between meals."):null,
    v.outdoors>=.55?coreStop("grand-hotel","Grand Hotel / bluff corridor","scenery","Connect the historic bluff with a slower walk or carriage-based segment."):null
  ];
  const score=scoreCandidate(46,[[v.crowd_avoidance,18],[v.special_occasion,17],[v.photography,15],[v.food,10],[v.relaxation,8],[overnight?1:0,10]]);
  return {id:"scenic-slow",label:"Slow Island escape",score,summary:"Use the overnight advantage: quieter edges, a meaningful dinner and a full day without ferry pressure.",days:[{role:"arrival",title:"Arrival + settle in",stops:dedupeStops(day1)},{role:"full-day",title:"Quiet-hours Island day",stops:dedupeStops(day2)}],avoid:["Do not backtrack into downtown for every meal.","Do not use the final ferry as the organizing principle of an overnight stay."]};
}
function candidateActive(v,places,overnight,mobility){
  if(mobility==="limited")return null;
  const meal=mealFor(places,"lunch")||mealFor(places,"dinner");
  const stops=[
    coreStop("downtown","Downtown / bike pickup","arrival","Start the active block soon after arrival."),
    coreStop("british-landing","M-185 shoreline loop","activity","The perimeter is the Island's flatter long-distance movement corridor."),
    v.photography>=.55?coreStop("arch-rock","Arch Rock / east bluff","scenery","Add one bluff viewpoint if energy and timing still support it."):null,
    coreStop("mission-district","Mission District","recovery","A natural southeast-shore recovery area before returning downtown."),
    placeStop(meal,"meal")
  ];
  const score=scoreCandidate(43,[[v.outdoors,23],[v.biking,24],[v.photography,10],[v.relaxation,-5],[v.kids_priority,3],[overnight?1:.45,5]]);
  return {id:"active-island",label:"Active Island loop",score,summary:"Make movement the trip: shoreline first, then one scenic extension, rather than scattering short stops across the map.",days:[{role:"active",title:overnight?"Active full Island day":"Active Island day",stops:dedupeStops(stops)}],avoid:["Do not stack a full interior climb on top of the perimeter loop unless conditions and energy are clearly favorable.","Keep meal and ferry buffers real."]};
}
function candidateFamily(v,places,overnight){
  const meal=mealFor(places,"lunch")||mealFor(places,"dinner");
  const stay=overnight?lodgingFor(places):null;
  const stops=[
    coreStop("downtown","Downtown arrival","arrival","Keep the first transition simple after the ferry."),
    coreStop("mission-district","Mission District / open-lawn break","recovery","A lower-friction outdoor break works better than chaining steep interior stops."),
    placeStop(meal,"meal"),
    stay?placeStop(stay,"stay"):null,
    v.history>=.55?coreStop("fort","Fort Mackinac","anchor","Use one major attraction rather than several smaller climbs."):null
  ];
  const score=scoreCandidate(45,[[v.kids_priority,28],[1-v.walking_tolerance,15],[v.budget_sensitivity,7],[v.relaxation,8],[v.history,5]]);
  return {id:"family-easy",label:"Family easy-flow",score,summary:"Reduce transitions, protect food/rest breaks and choose one major anchor instead of maximizing attraction count.",days:[{role:"family",title:"Easy-flow Island day",stops:dedupeStops(stops)}],avoid:["Do not let meal timing become an emergency.","Avoid unnecessary uphill crossings when a flatter shoreline segment gives enough value."]};
}
function candidateRegional(v,places,overnight,duration){
  if(!overnight||Number(v.regional_exploration||0)<.45)return null;
  const regional=regionalFor(places);if(!regional)return null;
  const stay=lodgingFor(places);const dinner=mealFor(places,"dinner");
  const score=scoreCandidate(35,[[v.regional_exploration,35],[v.history,10],[v.outdoors,8],[duration==="four-plus"?1:duration==="two-three"?.7:.25,10]]);
  return {id:"regional-strata",label:"Island + Straits trip",score,summary:"Keep Mackinac Island as the anchor, then use one mainland gateway stop only where it fits the approach or departure.",days:[
    {role:"island",title:"Island first",stops:dedupeStops([coreStop("downtown","Downtown arrival","arrival","The Island remains the reason for the trip."),placeStop(stay,"stay"),placeStop(dinner,"dinner")])},
    {role:"gateway",title:"Gateway add-on",stops:[{id:"regional-"+regional.id,name:regional.name,role:"regional",anchor_id:null,why:regional.fit_reason||regional.note,source_url:regional.source_url||null,gateway:regional.gateway||null}]}
  ],avoid:["Do not cross the bridge or leave the Island just to collect another attraction.","Use the regional stop before arrival or after departure when possible."]};
}
function buildCandidates({visitor={},places={},profile={}}={}){
  const v=visitor.vector||{};const duration=visitor.answers?.trip_duration||"day";
  const overnight=["one-night","two-three","four-plus"].includes(duration)||profile.trip==="overnight";
  const list=[
    candidateCompact(v,places,overnight),
    candidateScenic(v,places,overnight),
    candidateActive(v,places,overnight,profile.mobility),
    candidateFamily(v,places,overnight),
    candidateRegional(v,places,overnight,duration)
  ].filter(Boolean);
  return list.sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label));
}
function decorateMapPoints(selected){
  if(!selected)return[];
  const namesByAnchor=new Map();
  for(const day of selected.days||[])for(const stop of day.stops||[]){
    if(!stop.anchor_id||!ZONES[stop.anchor_id])continue;
    const arr=namesByAnchor.get(stop.anchor_id)||[];arr.push(stop.name);namesByAnchor.set(stop.anchor_id,arr);
  }
  return [...namesByAnchor.entries()].map(([id,names])=>{
    const z=ZONES[id];
    return {...z,name:names.length===1?names[0]:z.name+" · "+[...new Set(names)].join(" / "),detail:z.detail+" Planning orientation only; area anchors are not turn-by-turn navigation."};
  });
}
function selectedPlan(candidate,engine){
  if(!candidate)return null;
  const map_points=decorateMapPoints(candidate);
  const map_stop_ids=map_points.map(x=>x.id);
  return {...candidate,engine:engine?.mode||"deterministic",jev_confidence:engine?.confidence||0,engine_note:engine?.reason||null,map_points,map_stop_ids,truth:"This is a trip-shape recommendation. It sequences already-known places and areas; it does not claim live walking times, room/table availability or turn-by-turn routing."};
}
module.exports={ZONES,PLACE_ZONE,buildCandidates,selectedPlan,_test:{mealFor,lodgingFor,scoreCandidate,decorateMapPoints}};
