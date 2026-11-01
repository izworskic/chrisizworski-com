#!/usr/bin/env node
"use strict";
/* Read-only, scripted visitor-journey evidence on the public production page.
 * Does not establish actual human user satisfaction or trail safety.
 */
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const OUT=path.resolve(__dirname,"../artifacts/porkies-personas");
const URL=process.env.PORKIES_URL||"https://chrisizworski.com/porcupine-mountains/";
const CASES=[{"id":"newcomer-east","goal":"2-hour scenic overlook, little walking","device":"phone","inputs":{"date":"2027-07-16","arrival":"east","vehicle":"car","hours":2,"ability":"low","interest":"views"},"focus":"clouds","alternative":"summit","desired":"Lake of the Clouds"},{"id":"waterfalls-west","goal":"Wisconsin visitor seeking falls","device":"phone","inputs":{"date":"2027-08-06","arrival":"west","vehicle":"car","hours":2,"ability":"moderate","interest":"falls"},"focus":"river","alternative":"clouds","desired":"Presque Isle"},{"id":"views-west","goal":"Western arrival wants a panorama","device":"desktop","inputs":{"date":"2027-07-16","arrival":"west","vehicle":"car","hours":2,"ability":"low","interest":"views"},"focus":"clouds","alternative":"river","desired":"Lake of the Clouds"},{"id":"family-stroller","goal":"Family with stroller and half a day","device":"phone","inputs":{"date":"2027-07-20","arrival":"east","vehicle":"car","hours":4,"ability":"low","interest":"mix"},"focus":"clouds","alternative":"nature","desired":"Lake of the Clouds"},{"id":"rv-keweenaw","goal":"Motorhome driver planning overlooks","device":"desktop","inputs":{"date":"2027-07-20","arrival":"east","vehicle":"rv","hours":4,"ability":"moderate","interest":"views"},"focus":"clouds","alternative":"summit","desired":"Lake of the Clouds"},{"id":"trailer-wisconsin","goal":"Towing trailer with full day available","device":"phone","inputs":{"date":"2027-08-08","arrival":"west","vehicle":"trailer","hours":8,"ability":"moderate","interest":"falls"},"focus":"river","alternative":"summit","desired":"Presque Isle"},{"id":"winter-ski-east","goal":"January skier arriving from east","device":"phone","inputs":{"date":"2027-01-22","arrival":"east","vehicle":"car","hours":8,"ability":"moderate","interest":"forest"},"focus":"winter","alternative":"clouds","desired":"Winter Sports Complex"},{"id":"winter-falls-west","goal":"Limited-mobility winter river visitor","device":"phone","inputs":{"date":"2027-02-16","arrival":"west","vehicle":"car","hours":4,"ability":"low","interest":"falls"},"focus":"river","alternative":"clouds","desired":"Presque Isle"},{"id":"spring-eastern","goal":"May visit amid uncertain road reopening","device":"desktop","inputs":{"date":"2027-05-10","arrival":"east","vehicle":"car","hours":4,"ability":"moderate","interest":"forest"},"focus":"nature","alternative":"clouds","desired":"Visitor Center"},{"id":"experienced-backcountry","goal":"Strong hiker seeking remote forests","device":"desktop","inputs":{"date":"2027-07-14","arrival":"east","vehicle":"car","hours":8,"ability":"high","interest":"forest"},"focus":"escarpment","alternative":"nature","desired":"Summit Peak"},{"id":"two-day-visitor","goal":"Two-day park-wide nature tourist","device":"tablet","inputs":{"date":"2027-08-12","arrival":"west","vehicle":"car","hours":16,"ability":"moderate","interest":"mix"},"focus":"river","alternative":"clouds","desired":"Presque Isle"},{"id":"accessible-falls","goal":"Mobility aids and waterfall interest","device":"phone","inputs":{"date":"2027-08-12","arrival":"west","vehicle":"car","hours":2,"ability":"low","interest":"falls"},"focus":"river","alternative":"nature","desired":"Presque Isle"},{"id":"falls-east-short","goal":"Eastern arrival insisting on waterfall in 2 hours","device":"phone","inputs":{"date":"2027-08-12","arrival":"east","vehicle":"car","hours":2,"ability":"moderate","interest":"falls"},"focus":"river","alternative":"clouds","desired":"Presque Isle"},{"id":"late-november","goal":"November day trip and high overlook hope","device":"phone","inputs":{"date":"2026-11-15","arrival":"east","vehicle":"car","hours":4,"ability":"moderate","interest":"views"},"focus":"clouds","alternative":"winter","desired":"Lake of the Clouds"},{"id":"crossing-backpacker","goal":"Two-day hiker aware of river crossings","device":"desktop","inputs":{"date":"2027-09-10","arrival":"inpark","vehicle":"car","hours":16,"ability":"high","interest":"forest"},"focus":"escarpment","alternative":"river","desired":"A sourced wilderness hike"},{"id":"winter-motorhome","goal":"Motorhome traveler near west falls in winter","device":"desktop","inputs":{"date":"2027-02-17","arrival":"west","vehicle":"rv","hours":4,"ability":"low","interest":"falls"},"focus":"river","alternative":"winter","desired":"Presque Isle"}];
function issue(r,id,severity,title,evidence,change,persona){
 let item=r.issues.find(x=>x.id===id);
 if(!item){item={id,severity,title,evidence,change,personas:[]};r.issues.push(item);}
 if(persona&&!item.personas.includes(persona))item.personas.push(persona);
}
function joined(x){return(x||[]).join(" ");}
async function scenario(browser,c,r){
 const views={phone:{width:390,height:844},tablet:{width:768,height:1024},desktop:{width:1440,height:900}};
 const ctx=await browser.newContext({viewport:views[c.device],isMobile:c.device==="phone",hasTouch:c.device!=="desktop",reducedMotion:c.inputs.ability==="low"?"reduce":"no-preference"});
 const p=await ctx.newPage(),errors=[];p.on("pageerror",e=>errors.push(e.message));
 await p.route("**/DNRTrailsOPENDATA/FeatureServer/*/query?**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({features:[]})}));
 await p.route("**/DNRReferenceAssetsOPENDATA/FeatureServer/0/query?**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({features:[]})}));
 const one={id:c.id,goal:c.goal,device:c.device,inputs:c.inputs,desired:c.desired,passed:[],flags:[],observations:{},errors};
 try{
  const res=await p.goto(URL,{waitUntil:"domcontentloaded",timeout:40000});
  one.observations.http=res?.status();
  if(res?.status()!==200)throw Error("Public page HTTP "+res?.status());
  await p.locator("#planner").waitFor({timeout:12000});
  await p.locator("#travel-date").fill(c.inputs.date);
  for(const k of ["arrival","vehicle","hours","ability","interest"])await p.locator("#"+k).selectOption(String(c.inputs[k]));
  await p.locator('#planner button[type="submit"]').click();
  await p.waitForFunction(()=>!!document.querySelector("#results .warnings"),null,{timeout:9000});
  const title=await p.locator("#results h3").innerText();
  const stops=await p.locator("#results .recommendations li").allInnerTexts();
  const warnings=await p.locator("#results .warnings li").allInnerTexts();
  const excluded=await p.locator("#results .excluded li").allInnerTexts();
  const vehicleCheck=await p.locator("#results .vehicle-check").allInnerTexts();
  const forkText=await p.locator("#results .plan-fork").allInnerTexts();
  const result=title+" "+joined(stops)+" "+joined(warnings)+" "+joined(excluded)+" "+joined(vehicleCheck)+" "+joined(forkText);
  one.observations={...one.observations,title,stops,warnings,excluded,vehicleCheck,choiceOffered:forkText.length>0};
  if(title&&warnings.length)one.passed.push("planner provided advice and caveats");
  else one.flags.push("main plan incomplete");
  const directIntent=joined(stops).toLowerCase().includes(c.desired.toLowerCase());
  const canChooseIntent=!directIntent&&joined(forkText).toLowerCase().includes(c.desired.toLowerCase())&&forkText.length>0;
  let chosenGoalConfirmed=false;
  if(canChooseIntent){
   await p.locator('#results [data-plan-path="desired"]').click();
   const wanted=await p.locator("#results .recommendations").innerText();
   const selected=await p.locator("#experience-a h3").innerText();
   const caveat=await p.locator("#results .result-intro").innerText();
   chosenGoalConfirmed=wanted.toLowerCase().includes(c.desired.toLowerCase()) &&
    selected.toLowerCase().includes(c.desired.toLowerCase()) &&
    /NOT confirmed within your/.test(caveat);
   if(chosenGoalConfirmed){
    await p.locator('#results [data-plan-path="local"]').click();
    const localResult=await p.locator("#results .recommendations").innerText();
    if(localResult.toLowerCase().includes(c.desired.toLowerCase()))chosenGoalConfirmed=false;
   }
  }
  const intent=directIntent||chosenGoalConfirmed;
  one.observations.requestedExperienceRepresented=intent;
  one.observations.destinationTradeoffReversible=chosenGoalConfirmed;
  if(intent)one.passed.push("stated experience represented");
  else{
   one.flags.push("stated destination absent from recommended stops");
   const tradeoff=["views-west","falls-east-short"].includes(c.id);
   issue(r,tradeoff?"P-INTENT-TRADEOFF":"P-INTENT-MISMATCH","P2",
     tradeoff?"Short visit ignores the preferred attraction":"Stated experience not recommended",
     "For "+c.id+" main stops were "+joined(stops).slice(0,260)+".",
     "Explain zone/time tradeoff and offer alternate choice rather than pretending to know driving time.",c.id);
  }
  if(c.inputs.vehicle!=="car"){
   const mentioned=/\b(rv|trailer|camper|motorhome|towing)\b/i.test(result);
   one.observations.mainPlanMentionsVehicle=mentioned;
   if(!mentioned){
    one.flags.push("main result does not reflect RV/trailer");
    issue(r,"P-VEHICLE","P1","Main planner ignores RV/trailer choice","RV/trailer selected but no vehicle-specific warning appears in the main output.",
      "Unify vehicle constraints across first recommendation, map, and A/B comparison.",c.id);
   }else one.passed.push("vehicle constraints visible in primary recommendation");
  }
  if(c.inputs.ability==="low"&&/summit peak/i.test(joined(stops))&&!/tower|stairs|excluded/i.test(joined(excluded))){
   one.flags.push("stair-dependent outing for low-mobility visitor");
   issue(r,"P-ACCESS-RISK","P0","Stair-dependent tower recommended as low-mobility stop","Potential unqualified Summit Peak selection.","Surface stair/grade limitations in initial result.",c.id);
  }
  if((c.inputs.date.includes("-01-")||c.inputs.date.includes("-02-")||c.inputs.date.includes("-05-"))&&/Lake of the Clouds overlook|Summit Peak/.test(joined(stops))&&!/closed|reopen|not assumed/i.test(result)){
   one.flags.push("winter or spring road not qualified");
   issue(r,"P-SEASONAL","P0","A road-restricted outing lacks caveats","Primary result omitted seasonal gate warning.","Fail closed on seasonal road status.",c.id);
  }
  if(c.inputs.ability==="high"&&c.inputs.interest==="forest"&&c.inputs.hours>=8&&!/crossing|ford|bridge/i.test(result)){
   one.flags.push("wilderness river-crossing caveat absent");
   issue(r,"P-REMOTE","P1","Backcountry recommendation lacks crossing caveat","Selected remote forest planning without verified crossing warning.","Make dangerous crossings explicit.",c.id);
  }
  if(await p.locator("#experience-compare").count()){
   await p.waitForFunction(()=>["yes","unavailable"].includes(document.querySelector("#experience-compare")?.dataset.loaded),null,{timeout:10000}).catch(()=>{});
   const state=await p.locator("#experience-compare").getAttribute("data-loaded");
   one.observations.compareState=state;
   if(state==="yes"){
    await p.locator("#experience-choice-a").selectOption(c.focus);
    await p.locator("#experience-choice-b").selectOption(c.alternative);
    const decision=await p.locator("#experience-a .experience-decision").innerText();
    const entry=await p.locator("#experience-a .experience-entry").innerText();
    one.observations.comparison={decision,entry:entry.slice(0,420),first:c.focus,second:c.alternative};
    if(decision&&/DNR|parking|trail/i.test(entry))one.passed.push("two-choice evidence and access response updated");
    else one.flags.push("A/B evidence missing");
   }else{
    one.flags.push("A/B comparison unavailable");
    issue(r,"P-COMPARISON","P1","Comparison cannot initialize on production","Browser data-loaded="+state,"Audit production JS, source JSON and cache.",c.id);
   }
  }else{
   one.flags.push("no comparison markup in public HTML");
   issue(r,"P-PRODUCTION-DRIFT","P0","Live HTML lacks the Experience OS comparison","No #experience-compare in production HTML.","Compare live deployment and main; resolve CDN/canonical drift.",c.id);
  }
  if(errors.length){one.flags.push("JavaScript runtime errors");issue(r,"P-JS","P1","Browser JS exceptions",errors.slice(0,3).join("; "),"Reproduce console stack.",c.id);}
  if(["newcomer-east","winter-ski-east","rv-keweenaw","family-stroller"].includes(c.id)){
   const fname=c.id+".png";await p.screenshot({path:path.join(OUT,fname),fullPage:false});one.screenshot=fname;
  }
 }catch(e){one.flags.push("scenario error: "+String(e.message||e).slice(0,180));issue(r,"P-SCRIPT-ERROR","P1","Scenario could not finish",String(e.message||e).slice(0,250),"Inspect browser and element availability.",c.id);}
 one.outcome=one.flags.length?"flagged":"passed-scripted-checks";
 await ctx.close().catch(()=>{});return one;
}
async function failureJourneys(browser,r){
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
 const p=await ctx.newPage();
 try{
  await p.goto(URL,{waitUntil:"domcontentloaded",timeout:40000});
  const baseline=await p.evaluate(()=>{
   const el=document.getElementById("decision");
   const first=document.querySelector('.hero-quickstart [data-porkies-start="views"]');
   return{
    date:document.getElementById("travel-date")?.value,
    quickStartTop:first?Math.round(first.getBoundingClientRect().top+scrollY):-1,
    decisionY:Math.round(el?.getBoundingClientRect().top+scrollY||0),
    viewportHeight:innerHeight,pageHeight:document.documentElement.scrollHeight,
    hasCompare:!!document.getElementById("experience-compare"),
    noindex:document.querySelector('meta[name="robots"]')?.content||null,
    heroCTA:document.querySelector(".hero .primary")?.getAttribute("href")||null};
  });
  r.baseline=baseline;
  if(baseline.date&&baseline.date<"2026-11-01")issue(r,"P-PAST-DATE","P1","Past date pre-filled in trip planner","As of 2026-11-01 the control defaults to "+baseline.date,"Hydrate local current date or require explicit future trip date.");
  if(baseline.quickStartTop<0||baseline.quickStartTop>baseline.viewportHeight-20)
   issue(r,"P-BURIED-DECISION","P2","First actionable visitor choice remains below the phone screen",
    "First purposeful visit choice is "+baseline.quickStartTop+"px down; main form is at "+baseline.decisionY+"px.",
    "Move accessible personalized first-screen entry above the fold.");
  if(baseline.noindex==="noindex,follow")issue(r,"P-NOINDEX","P1","Intentionally noindexed live tool","Public canonical still has noindex,follow.","Only change after route/access release safeguards and SEO checks.");
  const proof=p.locator("#porkies-access-proof");
  if(await proof.count()){await proof.locator("summary").focus();await p.keyboard.press("Enter");r.failureModes.push({id:"keyboard-proof",state:await proof.evaluate(e=>e.open)?"passed":"failed"});}
 }catch(e){r.failureModes.push({id:"baseline",state:"error",detail:String(e.message||e)});}
 await ctx.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const np=await nojs.newPage();
 try{
  await np.goto(URL,{waitUntil:"domcontentloaded",timeout:40000});
  const count={stories:await np.locator(".story").count(),parking:await np.locator(".parking-card").count(),comparison:await np.locator("#experience-a .experience-entry-static").count()};
  r.failureModes.push({id:"no-JS-mobile",state:count.stories>=3&&count.parking===6&&count.comparison===1?"passed":"incomplete",count});
  await np.screenshot({path:path.join(OUT,"no-js-mobile.png"),fullPage:false});
 }catch(e){r.failureModes.push({id:"no-JS-mobile",state:"error",detail:String(e.message||e)});}
 await nojs.close();
 const outage=await browser.newContext({viewport:{width:390,height:844}});
 const op=await outage.newPage();
 try{
  await op.route("**/porcupine-mountains/experience-entry-evidence.json",route=>route.fulfill({status:503,body:"unavailable"}));
  await op.goto(URL,{waitUntil:"domcontentloaded",timeout:40000});
  await op.waitForFunction(()=>["yes","unavailable"].includes(document.querySelector("#experience-compare")?.dataset.loaded),null,{timeout:10000}).catch(()=>{});
  const state=await op.locator("#experience-compare").getAttribute("data-loaded");
  const disabled=await op.locator("#experience-map-compare").isDisabled();
  r.failureModes.push({id:"evidence-503",state:state==="unavailable"&&disabled?"passed":"failed",details:{state,disabled}});
 }catch(e){r.failureModes.push({id:"evidence-503",state:"error",detail:String(e.message||e)});}
 await outage.close();
}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const r={started:new Date().toISOString(),target:URL,method:"Read-only actual production Chrome persona tasks; external DNR GIS responses mocked only during persona sweeps; not human users",cases:[],issues:[],failureModes:[],baseline:null};
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{for(const c of CASES){const o=await scenario(browser,c,r);r.cases.push(o);console.log("PERSONA "+JSON.stringify({id:o.id,outcome:o.outcome,stops:o.observations.stops?.map(x=>x.split("\n")[0]),flags:o.flags}));}
 await failureJourneys(browser,r);}
 finally{await browser.close();}
 r.finished=new Date().toISOString();
 r.summary={personas:r.cases.length,flagged:r.cases.filter(x=>x.outcome==="flagged").length,passedChecks:r.cases.filter(x=>x.outcome==="passed-scripted-checks").length,
 issuesByPriority:Object.fromEntries(["P0","P1","P2","P3"].map(x=>[x,r.issues.filter(y=>y.severity===x).length])),
 caveat:"Scripted criteria are not human task completion, engagement, or measured user research."};
 await fs.promises.writeFile(path.join(OUT,"persona-results.json"),JSON.stringify(r,null,2)+"\n");
 const lines=["# Porcupine Mountains scripted persona research","", "Public target: "+URL, "Time: "+r.started,
 "This is simulated visitor behavior in a real Chromium browser, not real human testing.","",
 "## Overview",JSON.stringify(r.summary),"","## Scenario evidence",
 "| Persona | Goal | Main recommendations | Flags |","|---|---|---|---|",
 ...r.cases.map(x=>"| "+x.id+" | "+x.goal+" | "+(x.observations.stops||[]).map(s=>s.split("\n")[0]).join("; ").replace(/\|/g,"/")+" | "+(x.flags.join("; ")||"None").replace(/\|/g,"/")+" |"),
 "","## Findings",...r.issues.sort((a,b)=>a.severity.localeCompare(b.severity)).map(x=>"### "+x.severity+" "+x.id+": "+x.title+"\n\nEvidence: "+x.evidence+"\n\nSuggested change: "+x.change+"\n\nAffected personas: "+x.personas.join(", ")+"\n"),
 "## Additional failure and baseline observations",JSON.stringify({baseline:r.baseline,failureModes:r.failureModes},null,2),
 "","## Interpretation boundaries","Do not interpret persona scripts as human satisfaction, field access verification, or traffic/click uplift. Some outbound GIS query responses were deliberately stubbed. Production HTML, planner JavaScript, source JSON and interactions were loaded from the published website."];
 await fs.promises.writeFile(path.join(OUT,"readout.md"),lines.join("\n")+"\n");
 console.log("AUDIT_SUMMARY "+JSON.stringify(r.summary));
 if(!r.cases.length||r.cases.every(x=>x.observations.http!==200))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
