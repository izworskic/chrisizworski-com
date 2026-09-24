"use strict";

const v8 = require("./route-v8.js");
const { decideClosedSet } = require("../mackinac-island/harness.js");

const WRITER_MODEL = process.env.GATLINBURG_WRITER_MODEL || "claude-haiku-4-5-20251001";
const VOICE = "Gatlinburg Winter Desk Editor";
const LENSES = Object.freeze({
  orientation: "First-visit orientation: explain geography, sequence, and what not to waste time moving the car for.",
  family: "Family pacing: reduce backtracking, walking friction, weather exposure, and unrealistic attraction stacking.",
  couple: "Couple pacing: favor a coherent day-to-evening rhythm over attraction density.",
  christmas: "Christmas atmosphere: preserve daylight for daylight-dependent stops and make the after-dark Winter Magic portion earn its time.",
  snow: "Snow operations: separate downtown weather from mountain operations and emphasize operator/road rechecks.",
  attractions: "Attraction efficiency: get value from paid stops without burning the visit on movement.",
  foodLights: "Food and lights rhythm: keep the downtown sequence compact and transition cleanly into the lights window.",
  budget: "Low-friction value: make the free/lower-cost pieces already selected do more work and avoid needless paid add-ons.",
  evening: "One-evening efficiency: protect scarce after-dark minutes from parking and cross-town movement.",
  fullDay: "Full-day rhythm: use daylight first and finish with an intentionally different after-dark block.",
  multiDay: "Trip-shape orientation: explain which pieces belong together instead of forcing the whole destination into one day."
});
const FALLBACK = Object.freeze({
  first:"orientation", family:"family", couple:"couple", christmas:"christmas", snow:"snow", attractions:"attractions",
  "food-lights":"foodLights", budget:"budget", evening:"evening", "full-day":"fullDay", "multi-day":"multiDay"
});

function safe(v,max=520){return String(v==null?"":v).replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function fallbackLens(data){return FALLBACK[data?.input?.persona]||"orientation";}
function todayISO(date=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const get=type=>parts.find(part=>part.type===type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function daysBetween(a,b){return Math.round((Date.parse(`${b}T12:00:00Z`)-Date.parse(`${a}T12:00:00Z`))/86400000);}
function normalizeFutureWeatherState(data,today=todayISO()){
  const selected=data?.input?.date;
  if(!selected||daysBetween(today,selected)<=7) return data;
  const weatherSourceName="NWS Gatlinburg forecast";
  const sources=(data.sources||[]).map(row=>row.name===weatherSourceName&&["unavailable","degraded","stale"].includes(row.state)?{...row,state:"scheduled",note:"Forecast not expected yet; NWS hourly guidance is used when the visit enters the forecast window."}:row);
  const conditions=(data.conditions||[]).map(row=>{
    if(row.label==="Weather"&&["unavailable","degraded","stale"].includes(row.state)) return {...row,state:"scheduled",value:"NWS forecast not in range yet — check closer to the visit"};
    if(row.label==="Snow"&&["unavailable","degraded","stale"].includes(row.state)) return {...row,state:"scheduled",value:"Snow is not yet verifiable for this date"};
    return row;
  });
  const degraded=(data.diagnostics?.degradedSources||[]).filter(name=>name!==weatherSourceName);
  return {
    ...data,
    headline:{...data.headline,weather:"NWS forecast not in range yet",snow:"Snow not yet verifiable — check closer to the visit"},
    conditions,
    sources,
    diagnostics:{...(data.diagnostics||{}),degradedSources:degraded,futureWeatherExpected:true}
  };
}

async function chooseLens(data){
  const fallbackId=fallbackLens(data);
  const jev=await decideClosedSet({
    task:"Choose the one editorial emphasis that will make this already-selected Gatlinburg winter plan most useful. This controls writing emphasis only; it cannot change the itinerary, times, facts, operating state, or safety gates.",
    options:LENSES,
    context:{visitor:data.input,plan:data.planBrief,stops:(data.stopFacts||[]).map(x=>({id:x.id,name:x.name,category:x.category,zone:x.zone})),headline:{weather:data.headline?.weather,mountainVisibility:data.headline?.mountainVisibility,crowdPressure:data.headline?.crowdPressure,sunset:data.headline?.sunset}},
    constraints:["Choose exactly one supplied lens.","Do not recommend a different plan.","Do not infer live conditions.","Preference cannot override official operating or safety gates."],
    evidence:Object.entries(LENSES).map(([id,brief])=>({id,brief})),fallbackId,minConfidence:0.5
  });
  const id=LENSES[jev?.choiceId]?jev.choiceId:fallbackId;
  return {id,brief:LENSES[id],jev};
}

function facts(data,lens){
  return {
    editorialLens:{id:lens.id,brief:lens.brief},visitor:data.input,
    plan:{label:data.decision?.label,brief:data.planBrief,reason:data.decision?.why,decisiveConstraint:data.decision?.decisiveConstraint},
    headline:{dateLabel:data.headline?.dateLabel,weather:data.headline?.weather,downtownSnow:data.headline?.snow,mountainVisibility:data.headline?.mountainVisibility,crowdPressure:data.headline?.crowdPressure,sunset:data.headline?.sunset},
    stops:(data.stopFacts||[]).map(x=>({id:x.id,order:x.order,name:x.name,start:x.start,end:x.end,durationMinutes:x.durationMinutes,category:x.category,zone:x.zone,cost:x.cost,walking:x.walking,weather:x.weather,reservation:x.reservation,verificationRequired:x.verificationRequired,whyHere:x.whyHere,operatorNote:x.operatorNote})),
    operations:data.visitOperations?{movementMode:data.visitOperations.movementMode,movement:data.visitOperations.movement,trolley:data.visitOperations.trolley,parking:data.visitOperations.parking,special:data.visitOperations.special}:null,
    decisionClock:data.decisionClock?{signature:data.decisionClock.signature,points:(data.decisionClock.points||[]).map(x=>({time:x.time,label:x.label,effect:x.effect,state:x.state})),pivots:data.decisionClock.pivots||[]}:null,
    dateIntelligence:data.dateIntelligence?{summary:data.dateIntelligence.whyThisDate?.summary,reasons:data.dateIntelligence.whyThisDate?.reasons||[],nearbyAdvantage:data.dateIntelligence.nearbyAdvantage?{dateLabel:data.dateIntelligence.nearbyAdvantage.dateLabel,potentialAdvantage:data.dateIntelligence.nearbyAdvantage.potentialAdvantage}:null}:null,
    commitChecks:(data.commitChecks||data.commitChecklist||[]).slice(0,8).map(x=>({label:x.label,detail:x.detail,state:x.state,priority:x.priority||null})),
    conditions:(data.conditions||[]).slice(0,12).map(x=>({label:x.label,value:x.value,state:x.state})),seasonFacts:data.seasonFacts||[]
  };
}

function fallbackCopy(data,lens){
  const stops=data.stopFacts||[],first=stops[0],last=stops.at(-1),ops=data.visitOperations;
  const topRead=first?`Start with ${first.name}${first.start?` at ${first.start}`:""}; let the clock and geography do the sorting instead of chasing attractions around town.`:"No complete grounded sequence fits this window yet; change the date or available time rather than forcing stops into it.";
  const planRead=first&&last?`${lens.brief} ${stops.length} selected stops fit from ${first.name} to ${last.name}. ${ops?.movement||data.visitSnapshot?.route||"Keep the order shown."}`:"No complete sequence survives the hard gates, so the desk is not filling the gap with generic recommendations.";
  const operationsRead=ops?`Movement is part of the answer here. ${ops.movement} ${ops.trolley}`:"Arrival and movement guidance is not grounded for this plan yet.";
  const dateRead=data.dateIntelligence?.whyThisDate?.summary||"The selected date does not have a strong date-specific distinction yet.";
  const checks=data.commitChecks||data.commitChecklist||[],open=checks.filter(x=>x.state!=="checked").length;
  const commitRead=checks.length?`${open||checks.length} item${(open||checks.length)===1?"":"s"} still deserve an official recheck before you commit; those checks are part of the plan, not fine print.`:"No additional commit-time checks are attached to this plan yet.";
  const stopReads=Object.fromEntries(stops.map(x=>[x.id,`${x.whyHere} ${x.operatorNote}`]));
  return {topRead,planRead,operationsRead,dateRead,commitRead,stopReads};
}

function parseJson(text){const raw=String(text||"").trim();try{return JSON.parse(raw);}catch{}const a=raw.indexOf("{"),b=raw.lastIndexOf("}");if(a<0||b<=a)return null;try{return JSON.parse(raw.slice(a,b+1));}catch{return null;}}
function cleanCopy(raw,fallback,ids){const stopReads={};for(const id of ids)stopReads[id]=safe(raw?.stopReads?.[id]||fallback.stopReads[id],360);return {topRead:safe(raw?.topRead||fallback.topRead,420),planRead:safe(raw?.planRead||fallback.planRead,520),operationsRead:safe(raw?.operationsRead||fallback.operationsRead,480),dateRead:safe(raw?.dateRead||fallback.dateRead,420),commitRead:safe(raw?.commitRead||fallback.commitRead,360),stopReads};}

async function writeCopy(data,lens){
  const fallback=fallbackCopy(data,lens),ids=(data.stopFacts||[]).map(x=>x.id);
  if(!process.env.ANTHROPIC_API_KEY)return {mode:"deterministic",copy:fallback,reason:"ANTHROPIC_API_KEY unavailable"};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5200);
  try{
    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal:controller.signal,headers:{"content-type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:WRITER_MODEL,max_tokens:1100,temperature:0.25,system:`You are the ${VOICE}. Write like a seasoned destination-desk editor who understands Gatlinburg's compact Parkway geography, downtown parking and trolley friction, Great Smoky Mountains access, elevation-weather differences, seasonal-light timing, attraction pacing, and the difference between downtown conditions and mountain operator status. You are not a tourism marketer and do not claim to live there, have visited, or possess firsthand knowledge. Use only sealed facts. The itinerary, times, conditions, closures, operating states, and safety gates are immutable. Never invent a restaurant, attraction, wait time, parking space, traffic condition, price, snowfall, road state, ticket availability, opening hour, or local anecdote. Avoid brochure language. Be specific about sequence, geography, timing, and tradeoffs. Return JSON only.`,messages:[{role:"user",content:`SEALED FACTS:\n${JSON.stringify(facts(data,lens))}\nReturn exactly this JSON shape and include every supplied stop id once: {"topRead":"2 concise sentences","planRead":"2-3 concise sentences","operationsRead":"2 concise sentences","dateRead":"1-2 concise sentences","commitRead":"1-2 concise sentences","stopReads":{"STOP_ID":"1-2 useful sentences"}}. No markdown.`}]})});
    const payload=await res.json().catch(()=>null);if(!res.ok)throw new Error(`Anthropic HTTP ${res.status}`);
    const parsed=parseJson((payload?.content||[]).find(x=>x.type==="text")?.text);if(!parsed)throw new Error("writer returned invalid JSON");
    return {mode:"anthropic-haiku",model:WRITER_MODEL,copy:cleanCopy(parsed,fallback,ids)};
  }catch(error){return {mode:"deterministic",copy:fallback,reason:safe(error?.message||error,180)};}finally{clearTimeout(timer);}
}

function applyCopy(data,writer){
  const copy=writer.copy;
  const itinerary=(data.itinerary||[]).map(row=>({...row,whyNow:copy.stopReads?.[row.id]||row.whyNow}));
  const visitOperations=data.visitOperations?{...data.visitOperations,movement:copy.operationsRead||data.visitOperations.movement}:data.visitOperations;
  const dateIntelligence=data.dateIntelligence?{...data.dateIntelligence,whyThisDate:{...(data.dateIntelligence.whyThisDate||{}),summary:copy.dateRead||data.dateIntelligence.whyThisDate?.summary}}:data.dateIntelligence;
  return {headline:{...data.headline,bestMove:copy.topRead||data.headline.bestMove},decision:{...data.decision,summary:copy.planRead||data.decision.summary},itinerary,visitOperations,dateIntelligence};
}

async function buildDecision(rawQuery={}){
  const raw=await v8.buildDecision(rawQuery),data=normalizeFutureWeatherState(raw),lens=await chooseLens(data),writer=await writeCopy(data,lens),applied=applyCopy(data,writer);
  return {...data,...applied,benchmarkVersion:"3.7",decision:{...applied.decision,writer:{mode:writer.mode,model:writer.model||null,voice:VOICE,lens:lens.id}},editorial:{voice:VOICE,lens:{id:lens.id,brief:lens.brief},selection:{mode:lens.jev?.mode||"deterministic",confidence:lens.jev?.confidence||0,model:lens.jev?.model||null},writer:{mode:writer.mode,model:writer.model||null,reason:writer.reason||null},...writer.copy},diagnostics:{...(data.diagnostics||{}),editorialDesk:true,editorialVoice:VOICE,editorialLens:lens.id,editorialJevMode:lens.jev?.mode||"deterministic",editorialWriterMode:writer.mode}};
}

async function handler(req,res){res.setHeader("X-Robots-Tag","noindex");res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");try{if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});return res.status(200).json(await buildDecision(req.query||{}));}catch(error){return res.status(500).json({ok:false,error:"Gatlinburg winter planner failed",detail:safe(error?.message||error,220),generatedAt:new Date().toISOString()});}}

module.exports=handler;
module.exports.buildDecision=buildDecision;
module.exports._test={safe,fallbackLens,todayISO,daysBetween,normalizeFutureWeatherState,facts,fallbackCopy,parseJson,cleanCopy,applyCopy};
