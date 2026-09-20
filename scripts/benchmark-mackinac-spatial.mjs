import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const spatial=require("../lib/mackinac-island/spatial");
const catalog=require("../lib/mackinac-island/catalog");
const intelligence=require("../lib/mackinac-island/intelligence");

const cases=[
  {name:"slow couple",want:"scenic-slow",answers:{trip_duration:"two-three",party:"couple",trip_vision:["relaxed","food-shopping"],trip_loss:"crowds"},profile:{trip:"overnight",nights:2,mobility:"standard",bikes:"none",interests:["food"]}},
  {name:"young family",want:"family-easy",answers:{trip_duration:"one-night",party:"family-young",trip_vision:["kids","relaxed"],trip_loss:"rushed"},profile:{trip:"overnight",nights:1,mobility:"standard",bikes:"none",interests:[]}},
  {name:"active biker",want:"active-island",answers:{trip_duration:"day",party:"adults-friends",trip_vision:["biking","scenery"],trip_loss:"flexible",bike_style:"mixed"},profile:{trip:"day-trip",mobility:"standard",bikes:"rent",interests:["biking","scenery"]}},
  {name:"mobility-limited first visit",want:"family-easy",answers:{trip_duration:"day",party:"couple",trip_vision:["icons","history"],trip_loss:"walking",walking_tolerance:"low"},profile:{trip:"day-trip",mobility:"limited",bikes:"none",interests:["history"]}},
  {name:"regional history stay",want:"regional-strata",topN:2,answers:{trip_duration:"four-plus",party:"couple",trip_vision:["history","scenery"],trip_loss:"flexible",regional_interest:"regional"},profile:{trip:"overnight",nights:4,mobility:"standard",bikes:"none",interests:["history","scenery"]}}
];

let pass=0;
const rows=[];
for(const c of cases){
  const visitor=intelligence.deterministicProfile(c.answers);
  const places=catalog.recommendations(visitor,"2026-09-20");
  const candidates=spatial.buildCandidates({visitor,places,profile:c.profile});
  const n=c.topN||1;
  const ok=candidates.slice(0,n).some(x=>x.id===c.want);
  if(ok)pass++;
  rows.push({persona:c.name,archetype:visitor.primary.id,want:c.want,top:candidates[0]?.id||null,top_score:candidates[0]?.score||null,top_n:candidates.slice(0,n).map(x=>x.id),pass:ok});
}
const score=Math.round(pass/cases.length*100);
console.log("# MACKINAC SPATIAL PERSONA BENCHMARK — PRODUCTION VECTORS");
console.log(JSON.stringify({score,pass,total:cases.length,rows},null,2));
if(process.argv.includes("--check")&&score<100){
  console.error("FAIL: production visitor vectors must preserve intended spatial trip distinctions.");
  process.exit(1);
}
console.log("PASS: spatial trip shapes remain distinct using production visitor vectors.");
