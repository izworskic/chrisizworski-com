import fs from "node:fs";
import path from "node:path";
import {PRIMARY_NAV,PRIMARY_GENERATED_SURFACES,SECONDARY_GOVERNED_SURFACES} from "./mackinac-site-architecture.mjs";

const read=p=>fs.readFileSync(p,"utf8");
const root=process.cwd();
const harness=read(path.join(root,"lib/mackinac-island/harness.js"));
const route=read(path.join(root,"lib/mackinac-island/route.js"));
const intel=read(path.join(root,"lib/mackinac-island/intelligence.js"));
const api=read(path.join(root,"api/mackinac-profile.js"));
const hub=read(path.join(root,"public/assets/mackinac-hub.js"));
const intelligenceClient=read(path.join(root,"public/assets/mackinac-intelligence-client.js"));
const css=read(path.join(root,"public/assets/mackinac-intent.css"));
const hubGen=read(path.join(root,"scripts/generate-mackinac-hub-pages.mjs"));
const intentGen=read(path.join(root,"scripts/generate-mackinac-intent-pages.mjs"));
const pkg=JSON.parse(read(path.join(root,"package.json")));

const rows=[];
function check(id,description,pass,weight=1){
  rows.push({id,description,pass:Boolean(pass),weight});
}
function allIncludes(text,items){return items.every(x=>text.includes(x));}

check("oidc-package","Vercel OIDC helper is installed",Boolean(pkg.dependencies?.["@vercel/oidc"]),8);
check("oidc-runtime","Shared harness client obtains a runtime Vercel OIDC token",allIncludes(harness,["@vercel/oidc","getVercelOidcToken","authorization:\"Bearer \"+auth.token"]),12);
check("closed-set","Shared harness owns choice/confidence/injection gates",allIncludes(harness,["ids.includes(id)","confidence<minConfidence","injection_dependency","maxInjectionDependency"]),10);
check("no-secret-copy","Mackinac modules never call TypeSafe directly",!route.includes("TYPESAFE_API_KEY")&&!intel.includes("TYPESAFE_API_KEY")&&!route.includes("api.typesafe.ai")&&!intel.includes("api.typesafe.ai"),8);
check("one-client","Route and intelligence both use the same Mackinac harness client",route.includes('require("./harness")')&&intel.includes('require("./harness")')&&route.includes("decideClosedSet")&&intel.includes("decideClosedSet"),10);
check("no-duplicate-auth","Route/intelligence no longer read HARNESS_ACCESS_KEY or VERCEL_OIDC_TOKEN directly",!route.includes("HARNESS_ACCESS_KEY")&&!route.includes("VERCEL_OIDC_TOKEN")&&!intel.includes("HARNESS_ACCESS_KEY")&&!intel.includes("VERCEL_OIDC_TOKEN"),8);

const primaryIds=PRIMARY_NAV.map(x=>x.id);
for(const id of primaryIds){
  check("surface-"+id,"Primary surface "+id+" is covered by shared trip intelligence",intel.includes(id+":[")||(id==="today"&&intel.includes("today:[")),3);
}
check("surface-api","Profile API can return a bounded surface decision",allIncludes(api,["chooseSurfaceFocus","surface_decision","mode:\"surface\"","primary_id"]),10);
check("cached-profile","Cross-page personalization reuses the saved JEV persona instead of reclassifying on each page",allIncludes(intel,["profileWithCachedPrimary","cached-jev-profile"])&&intelligenceClient.includes('mode:"surface"')&&intelligenceClient.includes("primary_id"),8);

check("four-questions","Every destination entry can run the four-question intake",allIncludes(hub,["base_questions","Question \"+step+\" of \"+total","mackinac_intake_answered","classifyAndRender"]),12);
check("one-followup","Client asks at most one adaptive follow-up before preserving the profile",allIncludes(intelligenceClient,["state.adaptiveAsked","next_question","Optional follow-up"]),6);
check("state-continuity","Cross-page CTAs preserve the shared Mackinac trip state",allIncludes(intelligenceClient,["mackinac-trip-plan-v1","MackinacTripState","plannerHref","rewritePlannerLinks"]),10);
check("surface-focus-ui","Each page can render its visitor-specific focus above generic content",allIncludes(intelligenceClient,["surface-focus","surface_decision","mackinac_surface_personalized"])&&css.includes(".surface-focus"),8);
check("nav-priority","Shared profile can prioritize destination navigation",intelligenceClient.includes("markPriorityTabs")&&css.includes(".trip-priority"),4);

check("hub-shell","Primary hub generator includes universal trip intelligence and trip-state client",allIncludes(hubGen,["data-trip-context-work","data-trip-context-actions","mackinac-trip-state.js?v=20260920-live20","mackinac-hub.js?v=20260920-hub2","mackinac-intelligence-client.js?v=20260920-intel1"]),8);
check("intent-shell","Search-intent generator includes universal trip intelligence and trip-state client",allIncludes(intentGen,["profileBox()","data-trip-context-work","mackinac-trip-state.js?v=20260920-live20","mackinac-hub.js?v=20260920-hub2","mackinac-intelligence-client.js?v=20260920-intel1"]),8);

const generatedPaths=[
  ...PRIMARY_GENERATED_SURFACES.map(slug=>path.join(root,"public/mackinac-island",slug,"index.html")),
  ...SECONDARY_GOVERNED_SURFACES.map(slug=>path.join(root,"public/mackinac-island",slug,"index.html"))
];
const generated=generatedPaths.filter(fs.existsSync).map(read);
check("generated-context","Every generated Mackinac surface carries the shared trip intelligence shell",generated.length===generatedPaths.length&&generated.every(x=>x.includes("data-trip-context")),10);
check("generated-state","Every generated Mackinac surface loads the shared trip-state client",generated.length===generatedPaths.length&&generated.every(x=>x.includes("mackinac-trip-state.js?v=20260920-live20")&&x.includes("mackinac-intelligence-client.js?v=20260920-intel1")),8);
check("no-visitor-jev-jargon","Generated visitor pages do not expose internal JEV jargon",generated.every(x=>!/\bJEV\b/.test(x)),6);

const total=rows.reduce((n,r)=>n+r.weight,0);
const lost=rows.filter(r=>!r.pass).reduce((n,r)=>n+r.weight,0);
const loss=Number((lost/total).toFixed(3));
const value=Number((1-loss).toFixed(3));
console.log("# MACKINAC JEV PLATFORM BENCHMARK");
console.log(JSON.stringify({loss,value,passed:rows.filter(x=>x.pass).length,total_checks:rows.length,rows},null,2));
if(process.argv.includes("--check")&&lost){
  console.error("FAIL: Mackinac JEV platform lost "+lost+"/"+total+" weighted points (loss="+loss+").");
  process.exit(1);
}
