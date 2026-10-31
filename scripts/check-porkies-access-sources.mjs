#!/usr/bin/env node
/* Official-source monitoring ONLY: never infer a reopened road, legal detour
 * or current lot availability from a missing notice, absent GIS flag, or HTTP 200.
 * No scraping of maps, private APIs, or social media; no site rebuild.
 */
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const SOURCES=Object.freeze([
 {id:"township-notice",url:"https://wakefieldtownship.com/north-county-road-519-will-be-closed/"},
 {id:"township-news",url:"https://wakefieldtownship.com/category/news/"},
 {id:"gogebic-road-commission",url:"https://gogebiccountyroadcommission.org/"}
]);
// Michigan DNR returns HTTP 403 to GitHub Actions' unattended fetch (verified
// 2026-10-31). Never represent it as a daily monitored feed. Read on the
// official site for a dated manual route/gate check before changing permissions.
export const MANUAL_SOURCES=Object.freeze([
 {id:"dnr-park",url:"https://www.michigan.gov/recsearch/parks/porkies",
  reason:"DNR public park page is not accessible to the unattended GitHub Actions runner (HTTP 403); manual authoritative review required."}
]);

export function plainText(html){
 return String(html||"")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/&(?:nbsp|#160);/gi," ")
  .replace(/&amp;/gi,"&").replace(/&#0*39;|&apos;/gi,"'")
  .replace(/&quot;/gi,'"').replace(/&[a-z0-9#]+;/gi," ")
  .replace(/\s+/g," ").trim();
}

function hasPotentialReopenPhrase(text){
 const windows=[...text.matchAll(/.{0,145}(?:county road\s*519|cr[-\s]*519|north road\s*519).{0,145}/gi)].map(m=>m[0]);
 return windows.some(w=>/\breopen(?:ed|ing)?\b|\bback open\b|\bnow open\b|\bopen to traffic\b/i.test(w));
}

export function assessSource(id,html){
 const t=plainText(html), reasons=[];
 if(t.length<120)return {id,checked:true,evidencePresent:false,reviewReasons:["official-page-content-missing"],textLength:t.length};
 if(id==="township-notice"){
  if(!/north county road 519 will be closed/i.test(t)||!/water main replacement/i.test(t)||!/johnson road/i.test(t))
   reasons.push("township-notice-anchor-changed");
  if(hasPotentialReopenPhrase(t))reasons.push("township-road-reopening-language-review");
 }else if(id==="township-news"){
  if(hasPotentialReopenPhrase(t))reasons.push("township-new-road-reopening-language-review");
 }else if(id==="dnr-park"){
  if(!/presque isle scenic area.{0,130}county road 519/i.test(t))
   reasons.push("dnr-west-approach-wording-changed");
  if(!/south boundary road.{0,180}pinkerton trailhead/i.test(t))
   reasons.push("dnr-seasonal-road-wording-changed");
 }else if(id==="gogebic-road-commission"){
  if(!/november 1st to april 15th/i.test(t)||!/2:00\s*am\s*[-–]\s*7:00\s*am/i.test(t))
   reasons.push("county-winter-roadside-parking-notice-changed");
 }else throw Error("Unrecognized official source "+id);
 return {id,checked:true,evidencePresent:reasons.length===0,reviewReasons:reasons,textLength:t.length};
}

export async function checkSources(loader,clock=()=>new Date()){
 const results=[];
 for(const item of SOURCES){
  try {
   const html=await loader(item);
   results.push({...assessSource(item.id,html),url:item.url,availability:"read"});
  }catch(error){
   results.push({id:item.id,url:item.url,availability:"unavailable",checked:false,
    evidencePresent:false,reviewReasons:[],error:String(error?.message||error).slice(0,240)});
  }
 }
 const reviewSignals=results.flatMap(r=>r.reviewReasons.map(reason=>({id:r.id,reason,url:r.url})));
 return {
  schemaVersion:1,checkedAt:clock().toISOString(),
  scope:"official-source-monitoring-not-live-road-clearance",
  accessOpenVerified:false,verifiedParkingEntrance:false,mayEnableDirections:false,
  conclusion:reviewSignals.length?"manual-source-review-needed":
   results.some(r=>r.availability!=="read")?"official-source-check-incomplete":"monitored-county-notices-unchanged-dnr-manual-only",
  manualSources:MANUAL_SOURCES,
  reviewSignals,
  results
 };
}

async function main(){
 const argv=process.argv.slice(2);
 const outIndex=argv.indexOf("--output"),fixtureIndex=argv.indexOf("--fixture-dir");
 const output=outIndex>=0?argv[outIndex+1]:"artifacts/porkies-access-watch/report.json";
 if(!output||output.startsWith("--"))throw Error("Missing --output destination");
 const fixtureDir=fixtureIndex>=0?argv[fixtureIndex+1]:null;
 if(fixtureIndex>=0&&(!fixtureDir||fixtureDir.startsWith("--")))throw Error("Missing --fixture-dir");
 const loader=fixtureDir
  ? async item=>readFile(path.join(fixtureDir,item.id+".html"),"utf8")
  : async item=>{
     const response=await fetch(item.url,{
      headers:{Accept:"text/html","User-Agent":"PorkiesAccessProof/1.0 (+https://chrisizworski.com/porcupine-mountains/; official-site-check)"},
      signal:AbortSignal.timeout(16000),redirect:"follow"
     });
     if(!response.ok)throw Error("Official source HTTP "+response.status);
     return response.text();
    };
 const report=await checkSources(loader);
 await mkdir(path.dirname(output),{recursive:true});
 await writeFile(output,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify({checkedAt:report.checkedAt,conclusion:report.conclusion,
  reviewSignals:report.reviewSignals,available:report.results.filter(x=>x.availability==="read").length,
  total:report.results.length,manualSources:report.manualSources.map(x=>x.id),sourceResults:report.results.map(r=>({id:r.id,availability:r.availability,
   reviewReasons:r.reviewReasons,error:r.error||null})),output},null,2));
 if(report.results.some(r=>r.availability==="unavailable"))
  console.warn("At least one official source was unreachable; no access/opening claim is possible.");
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(err=>{console.error(err);process.exitCode=1;});
