import fs from "node:fs";
const slugs=["day-trip","with-kids","2-day-itinerary","ferry-planner","from-detroit","from-chicago","from-traverse-city","from-grand-rapids"];
let fail=false;
const asset=fs.readFileSync("public/assets/mackinac-intent.js","utf8");
for(const event of ["mackinac_intent_landing","mackinac_intent_to_planner"])if(!asset.includes(event)){console.error("missing intent event "+event);fail=true;}
for(const slug of slugs){
  const html=fs.readFileSync("public/mackinac-island/"+slug+"/index.html","utf8");
  if(!html.includes("data-mackinac-intent=")){console.error(slug+" missing intent id");fail=true;}
  if(!html.includes("data-mackinac-planner-cta")){console.error(slug+" missing tracked CTA");fail=true;}
  if(!html.includes("/assets/mackinac-intent.js?v=20260920-intent2")){console.error(slug+" missing funnel script");fail=true;}
}
if(fail)process.exit(1);
console.log("PASS: Mackinac intent landing-to-planner funnel is instrumented.");

const plannerJs=fs.readFileSync("public/assets/mackinac-island.js","utf8");
if(!plannerJs.includes("origin_text:cleanOrigin(qs.get('from')||'')")){console.error("planner does not consume origin seed");fail=true;}
if(fail)process.exit(1);
