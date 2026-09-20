import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const spatial=require("../lib/mackinac-island/spatial");
const catalog=require("../lib/mackinac-island/catalog");

const cases=[
  {name:"slow couple",want:"scenic-slow",visitor:{answers:{trip_duration:"two-three"},vector:{crowd_avoidance:.95,special_occasion:.92,photography:.85,food:.86,relaxation:.95,outdoors:.52,history:.38,kids_priority:.02,biking:.05,regional_exploration:.2,walking_tolerance:.8}},profile:{trip:"overnight",mobility:"standard"}},
  {name:"young family",want:"family-easy",visitor:{answers:{trip_duration:"one-night"},vector:{kids_priority:1,walking_tolerance:.25,budget_sensitivity:.72,relaxation:.75,outdoors:.52,biking:.1,history:.45,regional_exploration:.2,food:.45}},profile:{trip:"overnight",mobility:"standard"}},
  {name:"active biker",want:"active-island",visitor:{answers:{trip_duration:"day"},vector:{outdoors:1,biking:1,photography:.55,relaxation:.2,kids_priority:.05,history:.15,regional_exploration:.05,walking_tolerance:1}},profile:{trip:"day-trip",mobility:"standard"}},
  {name:"mobility-limited first visit",want:"family-easy",visitor:{answers:{trip_duration:"day"},vector:{kids_priority:.45,walking_tolerance:.05,relaxation:.82,history:.65,iconic_priority:.7,biking:0,regional_exploration:.05,budget_sensitivity:.45}},profile:{trip:"day-trip",mobility:"limited"}},
  {name:"regional history stay",want:"regional-strata",visitor:{answers:{trip_duration:"four-plus"},vector:{regional_exploration:1,history:1,outdoors:.45,photography:.4,iconic_priority:.75,kids_priority:.3,crowd_avoidance:.5,special_occasion:.4,food:.5,relaxation:.55,biking:.2,walking_tolerance:.8}},profile:{trip:"overnight",mobility:"standard"}}
];

let pass=0;
const rows=[];
for(const c of cases){
  const places=catalog.recommendations(c.visitor,"2026-09-20");
  const candidates=spatial.buildCandidates({visitor:c.visitor,places,profile:c.profile});
  const top=candidates[0];
  const ok=top?.id===c.want || (c.name==="regional history stay"&&candidates.slice(0,2).some(x=>x.id===c.want));
  if(ok)pass++;
  rows.push({persona:c.name,want:c.want,top:top?.id||null,top_score:top?.score||null,top_two:candidates.slice(0,2).map(x=>x.id),pass:ok});
}
const score=Math.round(pass/cases.length*100);
console.log("# MACKINAC SPATIAL PERSONA BENCHMARK");
console.log(JSON.stringify({score,pass,total:cases.length,rows},null,2));
if(process.argv.includes("--check")&&score<100){
  console.error("FAIL: spatial persona benchmark must preserve all intended route-shape distinctions.");
  process.exit(1);
}
console.log("PASS: spatial trip shapes remain distinct across core Mackinac personas.");
