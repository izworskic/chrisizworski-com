#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const read=rel=>readFile(path.join(root,rel),"utf8");
const contract=JSON.parse(await read("benchmarks/national-outdoor-tools.json"));
const pages={
 hub:"public/national-tools/index.html",
 aurora:"public/national-tools/aurora/index.html",
 rivers:"public/national-tools/rivers/index.html",
 frost:"public/national-tools/frost/index.html",
 planting:"public/national-tools/planting/index.html",
 fall:"public/national-tools/fall-color/index.html"
};
const html=Object.fromEntries(await Promise.all(Object.entries(pages).map(async([k,p])=>[k,await read(p)])));
const apis=Object.fromEntries(await Promise.all(["national-geocode","national-aurora","national-rivers","national-frost","national-fall-color"].map(async n=>[n,await read("api/"+n+".js")])));
const sitemap=await read("public/sitemap.xml");
const registry=JSON.parse(await read("benchmarks/tool-network-registry.json"));
const failures=[];let score=0;
function check(name,ok,pts,detail=""){if(ok)score+=pts;else failures.push(detail?name+": "+detail:name)}
const lossTotal=Object.entries(contract.lossFunction).filter(([k])=>k!=="total").reduce((n,[,v])=>n+v,0);
check("Loss function totals 100",lossTotal===100&&contract.lossFunction.total===100,5,String(lossTotal));
check("National hub is separate from Michigan tools",/canonical" href="https:\/\/chrisizworski\.com\/national-tools\//.test(html.hub)&&/href="\/tools\/">Michigan Tools/.test(html.hub),5);
const routes=["/national-tools/","/national-tools/aurora/","/national-tools/rivers/","/national-tools/frost/","/national-tools/planting/","/national-tools/fall-color/"];
check("All Phase 1 routes are in sitemap",routes.every(r=>sitemap.includes("<loc>https://chrisizworski.com"+r+"</loc>")),5);
for(const [name,body] of Object.entries(html)){
 const title=(body.match(/<title>([^<]+)<\/title>/)||[])[1]||"";
 const desc=(body.match(/<meta name="description" content="([^"]+)"/)||[])[1]||"";
 check(name+" title length",title.length>0&&title.length<=60,2,title+" ("+title.length+")");
 check(name+" description length",desc.length>0&&desc.length<=158,2,String(desc.length));
 check(name+" canonical person",body.includes('"@id":"https://chrisizworski.com/#person"'),1);
 check(name+" freshness stamp",body.includes('"dateModified":"2026-08-31"'),1);
 check(name+" visible authorship",body.includes('class="brand" href="/">Chris Izworski</a>'),1);
}
check("Aurora explains Kp limitation",/Kp is not a local forecast|Kp number pretending/.test(html.aurora),4);
check("Aurora API exposes degraded/source semantics",/degraded:/.test(apis["national-aurora"])&&/sources:/.test(apis["national-aurora"]),3);
check("River page rejects safety scoring",/gauge cannot tell you that a river is safe/i.test(html.rivers)&&!/safe to paddle/i.test(apis["national-rivers"]),5);
check("River API labels provisional values",/provisional/i.test(apis["national-rivers"])&&/age_minutes/.test(apis["national-rivers"]),3);
check("Frost distinguishes climatology from live forecast",/1991–2020 normals \+ NWS forecast/.test(html.frost)&&/current_forecast/.test(apis["national-frost"]),4);
check("Hardiness is not used as frost date",/do <strong>not<\/strong> tell you the last spring frost date/.test(html.frost)&&/do not determine your spring planting date/.test(apis["national-frost"]),4);
check("Planting is frost-relative and not hardiness-only",/frost-relative/i.test(html.planting)&&/Hardiness zones describe perennial winter survival/.test(html.planting),4);
check("Fall beta discloses historical not live",/not a live 2026 leaf-color reading/i.test(html.fall)&&/historical satellite timing estimate/i.test(apis["national-fall-color"]),5);
check("Fall beta exposes variability/confidence",/mad_days/.test(apis["national-fall-color"])&&/confidence/.test(apis["national-fall-color"]),3);
check("APIs are noindex",Object.values(apis).every(x=>/X-Robots-Tag",\s*"noindex, nofollow"/.test(x)),4);
check("No generated location-page tree shipped",!sitemap.includes("/national-tools/aurora/michigan/")&&!sitemap.includes("/national-tools/frost/michigan/"),4);
check("Michigan handoffs exist",html.aurora.includes("/northern-lights-michigan/")&&html.frost.includes("/michigan-frost-dates/")&&html.planting.includes("/zone-6a-planting-calendar/")&&html.fall.includes("/fall-color/"),5);
const ids=new Set(registry.tools.map(t=>t.id));
check("National tools registered",["national-aurora","national-rivers","national-frost","national-planting","national-fall-color"].every(id=>ids.has(id)),5);
const groups=registry.cannibalizationGroups||[];
check("National/Michigan cannibalization rules encoded",groups.some(g=>g.owner==="national-aurora"&&(g.supports||[]).includes("aurora"))&&groups.some(g=>g.owner==="national-frost"&&(g.supports||[]).includes("frost-dates"))&&groups.some(g=>g.owner==="national-fall-color"&&(g.supports||[]).includes("fall-color")),5);
check("Master loss-function prompt exists",(await read("docs/NATIONAL_OUTDOOR_TOOLS_MASTER_PROMPT.md")).includes("## Loss function"),4);
const maxPoints=119;
const normalizedScore=Math.round((score/maxPoints)*100);
const summary={score:normalizedScore,rawScore:score,maxPoints,failures,hardVetoes:contract.hardVetoes};
process.stdout.write(JSON.stringify(summary,null,2)+"\n");
if(process.argv.includes("--check")&&failures.length)process.exit(1);
