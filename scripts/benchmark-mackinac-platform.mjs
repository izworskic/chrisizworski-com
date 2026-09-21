import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const intel=require("../lib/mackinac-island/intelligence.js");
const platform=require("../lib/mackinac-island/platform.js");

const cases=[
  {id:"A",name:"First-time day couple",answers:{trip_duration:"day",party:"couple",trip_vision:["icons"],trip_loss:"missing"},surface:"plan",expect:["priorities","trip-shape"]},
  {id:"B",name:"Young family",answers:{trip_duration:"day",party:"family-young",trip_vision:["kids"],trip_loss:"walking"},surface:"explore",expect:["easy-flow"]},
  {id:"C",name:"Active cyclist",answers:{trip_duration:"day",party:"solo",trip_vision:["biking"],trip_loss:"waiting",bike_style:"mixed"},surface:"explore",expect:["active-loop"]},
  {id:"D",name:"Overnight photographer",answers:{trip_duration:"one-night",party:"solo",trip_vision:["scenery"],trip_loss:"crowds"},surface:"today",expect:["photo-light","crowd-window"]},
  {id:"E",name:"Shoulder-season couple",answers:{trip_duration:"one-night",party:"couple",trip_vision:["icons"],trip_loss:"weather",weather_flexibility:"shift-hours"},surface:"today",expect:["outdoor-window","live-go"]},
  {id:"F",name:"Upper Peninsula visitor",answers:{trip_duration:"day",party:"couple",trip_vision:["icons"],trip_loss:"waiting"},surface:"ferries",expect:["reachability","port-choice"]},
  {id:"G",name:"Event-first visitor",answers:{trip_duration:"one-night",party:"couple",trip_vision:["special"],trip_loss:"missing"},surface:"events",expect:["event-anchor","lodging-pressure"]},
  {id:"H",name:"Last-minute day visitor",answers:{trip_duration:"day",party:"couple",trip_vision:["relaxed"],trip_loss:"rushed"},surface:"plan",expect:["pace","trip-shape"]},
  {id:"I",name:"Limited-walking visitor",answers:{trip_duration:"day",party:"couple",trip_vision:["history"],trip_loss:"walking",walking_tolerance:"low"},surface:"explore",expect:["easy-flow"]},
  {id:"J",name:"Multigenerational family",answers:{trip_duration:"one-night",party:"multigenerational",trip_vision:["kids"],trip_loss:"walking"},surface:"plan",expect:["movement","pace"]},
  {id:"K",name:"Weather-sensitive family",answers:{trip_duration:"day",party:"family-young",trip_vision:["kids"],trip_loss:"weather",weather_flexibility:"shift-hours"},surface:"today",expect:["outdoor-window","live-go"]},
  {id:"L",name:"History-first easy couple",answers:{trip_duration:"day",party:"couple",trip_vision:["history"],trip_loss:"rushed"},surface:"explore",expect:["iconic-core","easy-flow"]},
  {id:"M",name:"Food and downtown friends",answers:{trip_duration:"one-night",party:"adults-friends",trip_vision:["food-shopping"],trip_loss:"flexible"},surface:"eat",expect:["downtown-social","destination-dinner"]},
  {id:"N",name:"Special overnight couple",answers:{trip_duration:"two-three",party:"couple",trip_vision:["special","food-shopping"],trip_loss:"crowds",lodging_style:"resort"},surface:"stay",expect:["resort","quiet"]},
  {id:"O",name:"Regional road-trip visitor",answers:{trip_duration:"four-plus",party:"couple",trip_vision:["relaxed","scenery"],trip_loss:"flexible",regional_interest:"regional"},surface:"straits",expect:["regional-extension"]}
];

const rows=cases.map(c=>{
  const profile=intel.deterministicProfile(c.answers);
  const focus=platform.rankedFocus(c.surface,profile)[0];
  const nav=platform.navOrder(profile,c.surface);
  const places=platform.rankedPlaces(profile,"2026-09-25");
  const checks={
    complete:profile.complete===true,
    expectedFocus:c.expect.includes(focus?.id),
    currentSurfaceFirst:nav[0]?.id===platform.safeSurface(c.surface),
    allSurfaces:new Set(nav.map(x=>x.id)).size===8,
    boundedFocus:Boolean(platform.FOCUS[platform.safeSurface(c.surface)]?.some(x=>x.id===focus?.id)),
    knownPlaceRanking:Object.values(places).every(list=>Array.isArray(list)&&list.every(x=>x.id&&Number.isFinite(Number(x.fit_score))))
  };
  const pass=Object.values(checks).every(Boolean);
  return {id:c.id,persona:c.name,surface:c.surface,archetype:profile.primary.id,focus:focus?.id,pass,checks};
});

const distinctFocus=new Set(rows.map(x=>x.focus)).size;
const distinctArchetypes=new Set(rows.map(x=>x.archetype)).size;
const failed=rows.filter(x=>!x.pass);
const loss=failed.length/rows.length;
const value=(rows.filter(x=>x.pass).length/rows.length)*
  Math.min(1,distinctFocus/8)*
  Math.min(1,distinctArchetypes/8);

console.log("\nMACKINAC PLATFORM — 15 PERSONA ATTENTION BENCHMARK\n");
console.table(rows.map(x=>({id:x.id,persona:x.persona,surface:x.surface,archetype:x.archetype,focus:x.focus,result:x.pass?"PASS":"FAIL"})));
console.log(JSON.stringify({passes:rows.length-failed.length,total:rows.length,distinctFocus,distinctArchetypes,loss,value,failed},null,2));

if(process.argv.includes("--check")){
  const errors=[];
  if(failed.length)errors.push(`${failed.length} persona attention paths failed`);
  if(distinctFocus<8)errors.push(`only ${distinctFocus} distinct page focuses across 15 personas`);
  if(distinctArchetypes<7)errors.push(`only ${distinctArchetypes} distinct visitor archetypes`);
  if(loss>.05)errors.push(`loss ${loss.toFixed(2)} exceeds 0.05`);
  if(value<.75)errors.push(`attention diversity value ${value.toFixed(2)} below 0.75`);
  if(errors.length){console.error("FAIL:",errors.join("; "));process.exit(1);}
  console.log("PASS: 15 personas produce bounded, distinct cross-platform Mackinac attention paths.");
}
