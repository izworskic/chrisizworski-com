import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const page=read("public/national-tools/cape-hatteras-beach-access/index.html");
const api=read("api/cape-hatteras-access.js");
const engine=read("lib/cape-hatteras-access.js");
const benchmark=JSON.parse(read("benchmarks/cape-hatteras-access.json"));
const checkMode=process.argv.includes("--check");
const failures=[];
const dimensions={};

function has(text,pattern){return pattern instanceof RegExp?pattern.test(text):text.includes(pattern)}
function scoreDimension(name,checks,weight){const passed=checks.filter(c=>c.ok).length;const score=Math.round((passed/checks.length)*weight*10)/10;dimensions[name]={score,weight,checks};for(const c of checks)if(!c.ok)failures.push(`${name}: ${c.label}`);return score}
function item(label,ok){return{label,ok:Boolean(ok)}}
function renderedMeta(name){const m=page.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)`,"i"));return m?.[1]||""}
function renderedTitle(){return page.match(/<title>([^<]*)<\/title>/i)?.[1]||""}

scoreDimension("userDecisionUsefulness",[
 item("activity selector exists",has(page,'data-mode="drive"')&&has(page,'data-mode="walk"')&&has(page,'data-mode="ocracoke"')),
 item("area selector exists",has(page,'data-area="buxton"')&&has(page,'data-area="ocracoke"')),
 item("first answer names a ramp target",has(page,'id="answer-ramp"')&&has(page,"Best ramp to try first")),
 item("directional NPS status remains visible",has(page,'id="direction-grid"')&&has(page,"d.direction")),
 item("better access window is explicitly derived context",has(page,'id="window-title"')&&has(page,"Lower water may leave more beach exposed")),
 item("official NPS handoff is one click from answer",has(page,"Official NPS status")),
],24);

scoreDimension("dataTruthAndSourceFidelity",[
 item("NPS failure withholds recommendation",has(api,'status:"official-access-unavailable"')&&has(api,"will not guess which ramps are open")),
 item("engine excludes non-open ORV states from ranking",has(engine,'if (!["open","limited"].includes(access.public_state)) return { eligible:false')),
 item("pedestrian-only is distinct from closed",has(engine,'"pedestrian_only"')&&has(page,"Is pedestrian-only the same as closed?")),
 item("tide is explicitly not proof of driveability",has(page,"does not prove the sand is safe or driveable")&&has(api,"Tides are convenience context")),
 item("field-sign authority is prominent",has(page,"Field signs are the final authority")&&has(api,"signs posted in the field are the final authority")),
],20);

scoreDimension("mapAndGeographicComprehension",[
 item("real Leaflet map is used",has(page,"leaflet@1.9.4")&&has(page,'id="access-map"')),
 item("only independently verified coordinates are pinned",has(api,"Only ramps with independently verified coordinates are pinned")&&has(page,"No missing coordinates are interpolated")),
 item("map legend differentiates access states",["ORV open","Limited ORV","Pedestrian only","Closed","Unknown"].every(v=>has(page,v))),
],15);

scoreDimension("repeatVisitValue",[
 item("browser remembers last trustworthy ramp snapshot",has(page,"caha-status-snapshot")&&has(page,"since your last successful check")),
 item("official and tool timestamps are surfaced",has(page,"NPS page update:")&&has(page,"Tool checked")),
 item("next low tide creates a repeatable timing cue",has(page,'id="tide"')&&has(page,"next_low")),
],12);

const title=renderedTitle();const meta=renderedMeta("description");
scoreDimension("searchValue",[
 item("canonical is exact public owner",has(page,'rel="canonical" href="https://chrisizworski.com/national-tools/cape-hatteras-beach-access/"')),
 item("title is query-aligned and <=60 rendered characters",title.includes("Cape Hatteras Beach Access")&&title.length<=60),
 item("meta description is <=158 rendered characters",meta.length>70&&meta.length<=158),
 item("crawlable FAQ and explanatory content exist",has(page,"Cape Hatteras beach access questions")&&has(page,'"@type":"FAQPage"')),
 item("launch surface does not link to thin internal ramp pages",!has(page,/href=["'][^"']*\/ramp-?\d+/i)),
],10);

scoreDimension("mobileUsabilityAndPerformance",[
 item("responsive viewport is present",has(page,'name="viewport"')),
 item("390-ish mobile layout has explicit <=430px treatment",has(page,"@media(max-width:430px)")),
 item("core answer markup precedes Leaflet runtime",page.indexOf('id="answer-card"')>-1&&page.indexOf('id="answer-card"')<page.indexOf("leaflet@1.9.4/dist/leaflet.js")),
 item("map has non-map list fallback",has(page,"complete status view")&&has(page,'id="ramp-list"')),
],8);

scoreDimension("maintainability",[
 item("source normalization lives in a separate engine module",has(engine,"parseNpsStatus")&&has(engine,"scoreRamp")),
 item("API orchestration is separate from UI",has(api,"fetchNps")&&has(api,"fetchTide")&&has(api,"fetchSurf")),
 item("machine-readable benchmark and loss contract are committed",benchmark.releaseThreshold===90&&benchmark.productionTarget===92&&benchmark.lossFunction?.weights?.falseAccessClaims===10),
],6);

scoreDimension("accessibility",[
 item("interactive groups are labelled",has(page,'role="group" aria-label="Activity"')&&has(page,'role="group" aria-label="Area"')),
 item("toggle state uses aria-pressed",has(page,"aria-pressed")),
 item("map region has accessible label",has(page,'role="region" aria-label="Cape Hatteras beach access map"')),
 item("reduced-motion preference is honored",has(page,"prefers-reduced-motion")),
 item("critical answer is not map-only",has(page,'id="direction-grid"')&&has(page,'id="ramp-list"')),
],5);

const firstScreen=page.slice(page.indexOf("<section class=\"hero\""),page.indexOf("<section class=\"section\"><div class=\"wrap\"><h2>What changed?"));
const lossEvents={
 falseAccessClaims: has(page,"tide does not substitute for official access")?0:(has(engine,'eligible:false')?0:1),
 staleOrUnlabeledOfficialData: has(page,"NPS page update:")?0:1,
 unsafeImplication: /Safe driving window|safe to drive until|beach is safe to drive/i.test(page)?1:0,
 wrongGeographicAssociation: has(page,"No missing coordinates are interpolated")&&has(api,"Cape Point — check both NWS north and south risks")?0:1,
 userCannotIdentifyBestRamp: has(page,'id="answer-ramp"')?0:1,
 mapConfusion: has(page,"ORV open")&&has(page,"Pedestrian only")&&has(page,"map-note")?0:1,
 firstScreenJargon: /CO-OPS|MLLW|datum|parser|composite score|phenology/i.test(firstScreen)?1:0,
 unnecessaryClicks: has(page,"Official NPS status")&&has(page,"direction-grid")?0:1,
 latency: page.indexOf('id="answer-card"')<page.indexOf("leaflet@1.9.4/dist/leaflet.js")?0:1,
 seoDuplication: title&&meta&&has(page,'rel="canonical"')?0:1,
 visualClutter: (firstScreen.match(/<section/g)||[]).length<=3?0:1,
};
const lossWeights=benchmark.lossFunction.weights;
const loss=Object.entries(lossEvents).reduce((sum,[key,count])=>sum+(lossWeights[key]||0)*count,0);
const score=Object.values(dimensions).reduce((sum,d)=>sum+d.score,0);
const hardVetoes=[];
if(!has(engine,'eligible:false'))hardVetoes.push("Non-open ORV states are not explicitly ineligible.");
if(!has(api,'status:"official-access-unavailable"'))hardVetoes.push("NPS source failure does not explicitly withhold the recommendation.");
if(/Safe driving window|safe to drive until/i.test(page))hardVetoes.push("UI implies a safe-driving guarantee.");
if(!has(page,"Field signs are the final authority"))hardVetoes.push("Field-sign authority is missing.");
if(!has(page,'rel="canonical" href="https://chrisizworski.com/national-tools/cape-hatteras-beach-access/"'))hardVetoes.push("Canonical owner is wrong.");
if(has(page,'name="robots" content="noindex'))hardVetoes.push("Production page is noindex.");

const report={product:benchmark.product,score:Math.round(score*10)/10,target:benchmark.productionTarget,releaseThreshold:benchmark.releaseThreshold,loss,lossTarget:benchmark.lossFunction.releaseLossTarget,hardVetoes,dimensions,lossEvents};
console.log(JSON.stringify(report,null,2));
if(checkMode&&(score<benchmark.releaseThreshold||loss>benchmark.lossFunction.releaseLossTarget||hardVetoes.length||failures.length)){
 console.error("Cape Hatteras benchmark failed.");
 for(const f of failures)console.error("- "+f);
 for(const v of hardVetoes)console.error("VETO: "+v);
 process.exit(1);
}
