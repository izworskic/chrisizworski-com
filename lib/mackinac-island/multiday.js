"use strict";

function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)));}
function addDays(date,days){
  const [y,m,d]=String(date||"").split("-").map(Number);
  const dt=new Date(Date.UTC(y,m-1,d+days,12,0,0));
  return [dt.getUTCFullYear(),String(dt.getUTCMonth()+1).padStart(2,"0"),String(dt.getUTCDate()).padStart(2,"0")].join("-");
}
function firstEligible(items=[],pred=()=>true){return items.find(x=>x.season_eligible!==false&&pred(x))||items.find(pred)||null;}
function lodgingFor(places){return firstEligible(places?.lodging?.recommended||[]);}
function diningFor(places,meal){return firstEligible(places?.dining?.recommended||[],x=>Array.isArray(x.meal)&&x.meal.includes(meal));}
function regionalFor(places){return firstEligible(places?.regional?.recommended||[]);}
function stop(id,name,role,anchor_id,why,source_url=null){return{id,name,role,anchor_id,why,source_url};}
function placeStop(item,role,anchorFallback="downtown"){
  if(!item)return null;
  const map={
    "grand-hotel":"grand-hotel","mission-point":"mission-district","inn-at-stonecliffe":"stonecliffe-area",
    "hotel-iroquois":"west-end","island-house":"harbor-east","lake-view":"downtown","sunset-condos":"stonecliffe-area",
    "carriage-house":"west-end","woods":"stonecliffe-area","1852-grill-room":"harbor-east","pink-pony":"downtown",
    "fort-tea-room":"fort","great-turtle":"downtown","douds-picnic":"downtown","mighty-mac":"downtown"
  };
  return stop("place-"+item.id,item.name,role,map[item.id]||anchorFallback,item.fit_reason||item.note||"Fits this trip profile.",item.source_url||null);
}
function dedupeStops(stops,used,{allowLodging=false}={}){
  const out=[];
  for(const s of stops.filter(Boolean)){
    if(!allowLodging&&used.has(s.id))continue;
    if(s.role!=="stay")used.add(s.id);
    out.push(s);
  }
  return out;
}
function intent(profile={},visitor={}){
  const v=visitor.vector||{},interests=new Set(profile.interests||[]),must=new Set(profile.must_do||[]);
  return {
    bike:(profile.bikes&&profile.bikes!=="none")||interests.has("biking")||must.has("m185")||visitor.answers?.trip_vision?.includes("biking"),
    history:v.history>=.58||interests.has("history")||must.has("fort"),
    scenery:v.photography>=.62||interests.has("scenery")||interests.has("photography")||must.has("arch-rock")||must.has("sunset"),
    food:v.food>=.7||interests.has("food"),
    quiet:v.crowd_avoidance>=.72||v.pace<=.35,
    family:v.kids_priority>=.65||Number(profile.children||0)>0,
    lowWalk:v.walking_tolerance<=.3||profile.mobility==="limited",
    regional:v.regional_exploration>=.55
  };
}
function themePool(profile,visitor){
  const x=intent(profile,visitor),themes=[];
  if(x.family||x.lowWalk)themes.push({id:"easy-flow",title:"Easy-flow Island day",weight:(x.family?30:0)+(x.lowWalk?28:0)});
  if(x.bike&&!x.lowWalk)themes.push({id:"bike-shore",title:"Bike + shoreline day",weight:36});
  if(x.history)themes.push({id:"history",title:"Fort + historic Mackinac",weight:28});
  if(x.scenery)themes.push({id:"scenic",title:"Scenery + quieter Island",weight:26});
  if(x.food)themes.push({id:"food",title:"Food + downtown rhythm",weight:20});
  if(!themes.length)themes.push({id:"classic",title:"Classic Mackinac day",weight:18});
  return themes.sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id));
}
function fullDayStops(theme,{profile,visitor,places,used}){
  const x=intent(profile,visitor);
  if(theme.id==="bike-shore")return dedupeStops([
    stop("m185","M-185 shoreline loop","activity","british-landing","Make the shoreline ride the day's anchor instead of squeezing it between attractions."),
    x.scenery?stop("arch-rock","Arch Rock / east bluff","scenery","arch-rock","Add one bluff viewpoint after the shoreline block if energy still supports it."):null,
    stop("mission-district","Mission District","recovery","mission-district","Use the southeast shore as a lower-friction recovery area before dinner."),
    placeStop(diningFor(places,"dinner")||diningFor(places,"lunch"),"meal")
  ],used);
  if(theme.id==="history")return dedupeStops([
    stop("fort","Fort Mackinac","anchor","fort",x.lowWalk?"Treat the uphill approach as a mobility decision and favor carriage/taxi-style movement instead of forcing the climb.":"Give Fort Mackinac a real block instead of treating it as a quick stop."),
    stop("grand-hotel","Grand Hotel / bluff corridor","history","grand-hotel",x.lowWalk?"Use horse-drawn transport or a gentler connection rather than stacking steep walking.":"Continue through the historic bluff corridor without crossing back through downtown."),
    placeStop(diningFor(places,"lunch"),"meal")
  ],used);
  if(theme.id==="scenic")return dedupeStops([
    stop("west-end","West-end waterfront","scenery","west-end","Use quieter waterfront and west-side light as the day's organizing idea."),
    x.lowWalk?null:stop("arch-rock","Arch Rock / east bluff","scenery","arch-rock","Use one higher viewpoint rather than collecting every interior stop."),
    placeStop(diningFor(places,"dinner")||diningFor(places,"lunch"),"meal")
  ],used);
  if(theme.id==="food")return dedupeStops([
    stop("downtown","Downtown + harbor","social","downtown","Keep this day geographically compact so meals, shops and people-watching don't create backtracking."),
    placeStop(diningFor(places,"lunch"),"lunch"),
    placeStop(diningFor(places,"dinner"),"dinner"),
    stop("west-end","West-end waterfront","scenery","west-end","Use the waterfront as the natural break between meal blocks.")
  ],used);
  if(theme.id==="easy-flow")return dedupeStops([
    stop("mission-district","Mission District / open-lawn break","recovery","mission-district","Use a lower-friction outdoor block before adding another formal attraction."),
    x.history?stop("fort","Fort Mackinac","anchor","fort",x.lowWalk?"Use carriage/taxi-style movement for the steep approach.":"Choose one major attraction instead of maximizing stop count."):null,
    placeStop(diningFor(places,"lunch"),"meal"),
    stop("downtown","Downtown flex time","flex","downtown","Leave slack for fatigue, fudge, shopping or an early stop.")
  ],used);
  return dedupeStops([
    stop("downtown","Downtown + harbor","arrival","downtown","Start compact and orient before climbing inland."),
    stop("fort","Fort Mackinac","anchor","fort","Use one major historic anchor."),
    stop("west-end","West-end waterfront","scenery","west-end","Finish with a lower-friction shoreline block."),
    placeStop(diningFor(places,"lunch"),"meal")
  ],used);
}
function arrivalDay({date,outbound,profile,visitor,places,used}){
  const stay=lodgingFor(places),dinner=diningFor(places,"dinner")||diningFor(places,"lunch");
  const x=intent(profile,visitor);
  const arrivalWhy=outbound?.arrival_time?"Plan around the published ferry arrival at about "+outbound.arrival_time+".":"Arrive through the downtown harbor; exact ferry timing still needs a verified plan.";
  return{
    date,role:"arrival",title:"Arrival + settle in",
    precision:"arrival logistics only",
    summary:"Use the ferry arrival as the only hard clock. Keep the rest of the day intentionally light.",
    stops:dedupeStops([
      stop("arrival-downtown","Island arrival","arrival","downtown",arrivalWhy),
      placeStop(stay,"stay"),
      x.quiet?stop("west-end","Quiet waterfront reset","scenery","west-end","Use the first evening to get away from the busiest downtown block instead of forcing another attraction."):stop("downtown","Downtown orientation","orientation","downtown","Use Main Street and the harbor as an easy first-day orientation."),
      placeStop(dinner,"dinner")
    ],used,{allowLodging:true})
  };
}
function returnDay({date,profile,visitor,places,returnPlan,used}){
  const regional=regionalFor(places),x=intent(profile,visitor);
  const returnWhy=returnPlan?.recommended?"Use the "+returnPlan.recommended.departure_time+" ferry to "+returnPlan.recommended.destination_port+".":"Choose from the published return-day departures; no exact ferry is forced without a deadline.";
  const stops=dedupeStops([
    stop("return-flex","Light Island morning","flex","downtown","Keep the final Island block light so luggage and ferry timing remain easy."),
    stop("return-ferry","Return ferry","transport","downtown",returnWhy),
    x.regional&&regional?{id:"regional-"+regional.id,name:regional.name,role:"regional",anchor_id:null,gateway:regional.gateway||null,why:"Use this after leaving the Island only if it lies naturally on the trip home.",source_url:regional.source_url||null}:null
  ],used);
  return{date,role:"return",title:"Return + gateway day",precision:"return-day logistics",summary:x.regional?"Leave room for one useful gateway stop after the ferry; don't turn departure day into another full Island itinerary.":"Protect an easy departure. Do not load the return day with another full Island itinerary.",stops};
}
function candidateSequence(order,{arrivalDate,nights,profile,visitor,places,outbound,returnPlan}){
  const used=new Set(),days=[arrivalDay({date:arrivalDate,outbound,profile,visitor,places,used})];
  const pool=themePool(profile,visitor),fullCount=Math.max(0,nights-1);
  const sequence=[];
  for(let i=0;i<fullCount;i++){
    const theme=pool[(i+order)%pool.length];
    sequence.push(theme);
    days.push({date:addDays(arrivalDate,i+1),role:"full-day",title:theme.title,precision:"day shape only",summary:"No fake hourly precision here: use live weather and verified attraction hours closer to this date to sequence the stops.",stops:fullDayStops(theme,{profile,visitor,places,used})});
  }
  days.push(returnDay({date:addDays(arrivalDate,nights),profile,visitor,places,returnPlan,used}));
  let score=58;
  const unique=new Set(sequence.map(x=>x.id)).size;
  score+=Math.min(18,unique*6);
  if(fullCount>1&&unique<Math.min(fullCount,pool.length))score-=8;
  if(days.some(d=>d.role==="full-day"&&d.stops.length<2))score-=12;
  return{id:"sequence-"+order,label:order===0?"Best-fit day order":order===1?"Alternate day order":"Flexible day order",score:clamp(score,0,100),themes:sequence.map(x=>x.id),days,truth:"Only arrival/return logistics may carry a published clock. Full-day blocks are sequence guidance, not invented future-hour schedules."};
}
function buildCandidates({arrivalDate,profile={},visitor={},places={},outbound=null,returnPlan=null}={}){
  const nights=Math.max(1,Math.min(7,Number(profile.nights)||1));
  if(profile.trip!=="overnight")return[];
  const pool=themePool(profile,visitor);
  const variants=Math.min(3,Math.max(1,pool.length));
  return Array.from({length:variants},(_,i)=>candidateSequence(i,{arrivalDate,nights,profile,visitor,places,outbound,returnPlan})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
function selectedPlan(candidate,engine){
  if(!candidate)return null;
  return{...candidate,engine:engine?.mode||"deterministic",jev_confidence:engine?.confidence||0,engine_note:engine?.reason||null};
}

module.exports={buildCandidates,selectedPlan,_test:{addDays,intent,themePool,fullDayStops}};
