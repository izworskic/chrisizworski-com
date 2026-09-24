"use strict";

const v8 = require("./route-v8.js");
const { decideClosedSet } = require("../mackinac-island/harness.js");

const WRITER_MODEL = process.env.GATLINBURG_WRITER_MODEL || "claude-haiku-4-5-20251001";
const VOICE = "Gatlinburg Winter Desk Editor";
const WEATHER_SOURCE = "NWS Gatlinburg forecast";
const NPS_SOURCE = "Great Smoky Mountains closures";
const BAD_STATES = new Set(["stale", "degraded", "unavailable"]);
const LENSES = Object.freeze({
  orientation: "Help a first-time visitor understand the shape of the day: geography, sequence, daylight and when not to move the car.",
  family: "Protect family energy: reduce backtracking, long outdoor exposure, avoidable walking and unrealistic attraction stacking.",
  couple: "Build a coherent day-to-evening rhythm instead of maximizing attraction count.",
  christmas: "Protect daylight for daylight-dependent stops and make the after-dark Winter Magic portion feel intentional.",
  snow: "Treat snow as an operations problem: separate downtown weather, mountain operations and NPS road status.",
  attractions: "Get real value from paid stops while minimizing movement and dead time.",
  foodLights: "Keep dinner and lights in one compact downtown sequence with as little car movement as possible.",
  budget: "Make the free and lower-cost pieces already in the plan do more work without padding the day.",
  evening: "Protect scarce evening minutes from parking churn and cross-town movement.",
  fullDay: "Use daylight where it matters, then make the evening block meaningfully different.",
  multiDay: "Group compatible pieces together instead of forcing the destination into one overloaded day."
});
const FALLBACK = Object.freeze({
  first:"orientation", family:"family", couple:"couple", christmas:"christmas", snow:"snow", attractions:"attractions",
  "food-lights":"foodLights", budget:"budget", evening:"evening", "full-day":"fullDay", "multi-day":"multiDay"
});
const STATUS_BY_STOP = Object.freeze({
  skypark:"Gatlinburg SkyPark status",
  anakeesta:"Anakeesta status",
  "ober-mountain":"Ober Mountain status",
  "ober-snow-tubing":"Ober Mountain status",
  "ripley-aquarium":"Ripley's Aquarium of the Smokies status"
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
  const sources=(data.sources||[]).map(row=>row.name===WEATHER_SOURCE&&BAD_STATES.has(row.state)?{...row,state:"scheduled",note:"Forecast not expected yet; NWS guidance is used when the visit enters the forecast window."}:row);
  const conditions=(data.conditions||[]).map(row=>{
    if(row.label==="Weather"&&BAD_STATES.has(row.state)) return {...row,state:"scheduled",value:"NWS forecast not in range yet — check closer to the visit"};
    if(row.label==="Snow"&&BAD_STATES.has(row.state)) return {...row,state:"scheduled",value:"Snow is not yet verifiable for this date"};
    return row;
  });
  const degraded=(data.diagnostics?.degradedSources||[]).filter(name=>name!==WEATHER_SOURCE);
  return {...data,headline:{...data.headline,weather:"NWS forecast not in range yet",snow:"Snow not yet verifiable — check closer to the visit"},conditions,sources,diagnostics:{...(data.diagnostics||{}),degradedSources:degraded,futureWeatherExpected:true}};
}

function selectedCriticalSourceNames(data){
  const names=new Set();
  const selectedDate=data?.input?.date;
  if(selectedDate && daysBetween(todayISO(),selectedDate)<=7) names.add(WEATHER_SOURCE);
  const stops=data.stopFacts||data.itinerary||[];
  if(stops.some(x=>String(x.zone||"").startsWith("nps-"))) names.add(NPS_SOURCE);
  for(const stop of stops){const source=STATUS_BY_STOP[stop.id];if(source) names.add(source);}
  return names;
}

function scopeDecisionHealth(data){
  const allDegraded=[...(data.diagnostics?.degradedSources||[])];
  const criticalNames=selectedCriticalSourceNames(data);
  const critical=allDegraded.filter(name=>criticalNames.has(name));
  const background=allDegraded.filter(name=>!criticalNames.has(name));
  const scheduled=Boolean(data.diagnostics?.futureWeatherExpected);
  const health=critical.length?{
    state:"check",
    label:critical.length===1?"1 PLAN CHECK NEEDED":`${critical.length} PLAN CHECKS NEEDED`,
    summary:`A source used by this itinerary needs a fresh check: ${critical.join(", ")}.`,
    criticalSources:critical
  }:{
    state:"ready",
    label:scheduled?"PLAN READY · FORECAST LATER":"PLAN READY",
    summary:scheduled?"The itinerary is usable now; weather will become decision-grade when the visit enters the forecast window.":"No degraded source currently changes this selected itinerary.",
    criticalSources:[]
  };
  return {...data,decisionHealth:health,diagnostics:{...(data.diagnostics||{}),degradedSources:critical,backgroundDegradedSources:background,decisionCriticalSourceNames:[...criticalNames]}};
}

async function chooseLens(data){
  const fallbackId=fallbackLens(data);
  const jev=await decideClosedSet({
    task:"Choose the one editorial emphasis that will make this already-selected Gatlinburg winter plan most useful. This controls writing emphasis only; it cannot change itinerary, times, facts, operating state or safety gates.",
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
    editorialLens:{id:lens.id,brief:lens.brief},visitor:data.input,health:data.decisionHealth,
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

function clock(v){if(!v)return "";const [h,m]=String(v).split(":").map(Number);if(!Number.isFinite(h))return v;return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;}
function fallbackCopy(data,lens){
  const stops=data.stopFacts||[],first=stops[0],last=stops.at(-1),ops=data.visitOperations;
  if(!first||!last){
    return {topRead:"This window does not produce a complete grounded plan yet. Change the available time or date rather than forcing in generic stops.",planRead:"The planner could not keep a complete sequence inside the hard timing and operating gates.",operationsRead:ops?.movement||"Movement guidance will appear when a complete plan is available.",dateRead:data.dateIntelligence?.whyThisDate?.summary||"There is not yet a strong date-specific reason to prefer this window.",commitRead:"Use the official checks shown below before committing.",stopReads:{}};
  }
  const span=`${clock(first.start)}–${clock(last.end)}`;
  const movement=ops?.movement||data.visitSnapshot?.route||"Keep the stops in the order shown.";
  const lensLine={
    orientation:"The useful move is to treat Gatlinburg as a sequence of geographic blocks, not a checklist of attractions.",
    family:"The sequence is intentionally conservative about backtracking and exposure so the day does not collapse under its own logistics.",
    couple:"The plan favors a clean transition from the daytime piece into the evening atmosphere rather than stacking paid attractions.",
    christmas:"Daylight is spent where daylight matters; the lights portion is saved for the window when it actually earns its time.",
    snow:"Downtown weather is not being used as proof of mountain snow operations; the operator and road checks remain separate.",
    attractions:"Paid stops are kept in a sequence that minimizes dead movement instead of treating every attraction as equally worth the detour.",
    foodLights:"Dinner and the lights belong in the same downtown block, which is more useful than moving the car between nearby stops.",
    budget:"The plan leans on the free and lower-cost parts of Gatlinburg without padding the day with filler.",
    evening:"The scarce resource is usable evening time, so parking churn and cross-town movement are treated as costs.",
    fullDay:"The day has two jobs: use daylight well, then make the after-dark block feel different rather than repetitive.",
    multiDay:"The stops are grouped by compatibility so this trip does not become one overloaded day."
  }[lens.id]||"The sequence is built around timing and geography rather than attraction count.";
  const topRead=`Start with ${first.name} at ${clock(first.start)} and finish with ${last.name}. ${movement}`;
  const planRead=`This ${stops.length}-stop plan runs ${span}. ${lensLine}`;
  const operationsRead=ops?`${ops.movement} ${ops.parking}${ops.trolley?` ${ops.trolley}`:""}`:movement;
  const dateRead=data.dateIntelligence?.whyThisDate?.summary||`${data.headline?.dateLabel||"This date"} supports the sequence shown without borrowing weather or operating facts from another day.`;
  const checks=data.commitChecks||data.commitChecklist||[],open=checks.filter(x=>x.state!=="checked").length;
  const commitRead=open?`${open} item${open===1?"":"s"} still need an official check before you commit; they are shown below.`:"The hard checks currently attached to this plan are satisfied or informational.";
  const stopReads={};
  for(const x of stops){
    const needsOperator=x.verificationRequired||String(x.zone||"").startsWith("nps-")||["snow","mountain"].includes(x.category);
    stopReads[x.id]=safe(`${x.whyHere}${needsOperator&&x.operatorNote?` ${x.operatorNote}`:""}`,360);
  }
  return {topRead,planRead,operationsRead,dateRead,commitRead,stopReads};
}

function parseJson(text){const raw=String(text||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");try{return JSON.parse(raw);}catch{}const a=raw.indexOf("{"),b=raw.lastIndexOf("}");if(a<0||b<=a)return null;try{return JSON.parse(raw.slice(a,b+1));}catch{return null;}}
function cleanCopy(raw,fallback,ids){const stopReads={};for(const id of ids)stopReads[id]=safe(raw?.stopReads?.[id]||fallback.stopReads[id],360);return {topRead:safe(raw?.topRead||fallback.topRead,420),planRead:safe(raw?.planRead||fallback.planRead,560),operationsRead:safe(raw?.operationsRead||fallback.operationsRead,520),dateRead:safe(raw?.dateRead||fallback.dateRead,440),commitRead:safe(raw?.commitRead||fallback.commitRead,380),stopReads};}

async function writeCopy(data,lens){
  const fallback=fallbackCopy(data,lens),ids=(data.stopFacts||[]).map(x=>x.id);
  if(!process.env.ANTHROPIC_API_KEY)return {mode:"deterministic",copy:fallback,reason:"ANTHROPIC_API_KEY unavailable"};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
  try{
    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal:controller.signal,headers:{"content-type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:WRITER_MODEL,max_tokens:1000,temperature:0.2,system:`You are the ${VOICE}: a practical Smokies winter trip editor writing for people who need to decide how to use a limited Gatlinburg visit. Your expertise is the documented geography and visitor friction of the destination: the compact Parkway core, parking and trolley tradeoffs, Great Smoky Mountains access, elevation-weather differences, daylight, seasonal lights, and attraction pacing. Never claim that you live there, were there, or know something firsthand. Use only the sealed facts. The selected itinerary, times, conditions, closures, operating states and safety gates are immutable. Never invent a restaurant, attraction, wait time, parking space, traffic condition, price, snowfall, road state, ticket availability, opening hour or anecdote. Do not sound like a tourism bureau. Do not mention the editorial lens, prompt, model, JEV, sealed facts, or internal process. Write concrete decision copy: sequence, geography, timing, friction and tradeoffs. Return JSON only.`,messages:[{role:"user",content:`SEALED FACTS:\n${JSON.stringify(facts(data,lens))}\nReturn exactly this JSON shape and include every supplied stop id once: {"topRead":"2 useful sentences","planRead":"2-3 useful sentences","operationsRead":"2 useful sentences","dateRead":"1-2 useful sentences","commitRead":"1 useful sentence","stopReads":{"STOP_ID":"1-2 useful sentences"}}. No markdown.`}]})});
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
  const raw=await v8.buildDecision(rawQuery);
  const weatherNormalized=normalizeFutureWeatherState(raw);
  const data=scopeDecisionHealth(weatherNormalized);
  const lens=await chooseLens(data),writer=await writeCopy(data,lens),applied=applyCopy(data,writer);
  return {...data,...applied,benchmarkVersion:"3.8",decision:{...applied.decision,writer:{mode:writer.mode,model:writer.model||null,voice:VOICE,lens:lens.id}},editorial:{voice:VOICE,lens:{id:lens.id,brief:lens.brief},selection:{mode:lens.jev?.mode||"deterministic",confidence:lens.jev?.confidence||0,model:lens.jev?.model||null},writer:{mode:writer.mode,model:writer.model||null,reason:writer.reason||null},...writer.copy},diagnostics:{...(data.diagnostics||{}),editorialDesk:true,editorialVoice:VOICE,editorialLens:lens.id,editorialJevMode:lens.jev?.mode||"deterministic",editorialWriterMode:writer.mode}};
}

async function handler(req,res){res.setHeader("X-Robots-Tag","noindex");res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");try{if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});return res.status(200).json(await buildDecision(req.query||{}));}catch(error){return res.status(500).json({ok:false,error:"Gatlinburg winter planner failed",detail:safe(error?.message||error,220),generatedAt:new Date().toISOString()});}}

module.exports=handler;
module.exports.buildDecision=buildDecision;
module.exports._test={safe,fallbackLens,todayISO,daysBetween,normalizeFutureWeatherState,selectedCriticalSourceNames,scopeDecisionHealth,facts,fallbackCopy,parseJson,cleanCopy,applyCopy};
