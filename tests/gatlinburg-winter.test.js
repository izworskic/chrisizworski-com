"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const route=require("../lib/gatlinburg-winter/route.js");
const T=route._test;

function ctx(overrides={}){
  const weather={state:"live",tempHigh:40,tempLow:31,precipMax:10,windMax:8,snowSignal:false,rainStarts:null,cloudCover:25,visibilityMeters:16000,alerts:[],...overrides.weather};
  const sun={state:"calculated",sunrise:"07:30",sunset:"17:20",...overrides.sun};
  const nps={state:"live",newfoundGapClosed:false,...overrides.nps};
  const attractions={
    skypark:{openState:"unverified"},anakeesta:{openState:"unverified"},"ober-mountain":{openState:"unverified"},"ripley-aquarium":{openState:"unverified"},...overrides.attractions
  };
  const crowd=overrides.crowd||{level:"moderate",label:"Moderate"};
  return {weather,sun,nps,attractions,crowd,weatherFacts:T.weatherFacts(weather,sun)};
}
function decide(query={},context=ctx()){
  const input=T.normalizeInput({date:"2026-12-12",start:"14:00",end:"22:00",...query});
  context.crowd=T.crowdPressure(input); context.weatherFacts=T.weatherFacts(context.weather,context.sun);
  const scored=T.CANDIDATES.map(candidate=>{const gate=T.hardGate(candidate,input,context);return {candidate,valid:gate.valid,gateReasons:gate.reasons,score:gate.valid?T.scoreCandidate(candidate,input,context):null}});
  const bundles=T.buildBundles(scored,input,context);const best=bundles[0];const itinerary=T.buildItinerary(best,scored,input,context);
  return {input,scored,bundles,best,itinerary};
}
const names=r=>r.itinerary.map(x=>x.name).join(" | ");

test("candidate universe stays bounded and source-backed",()=>{
  assert.ok(T.CANDIDATES.length>=15&&T.CANDIDATES.length<=30);
  for(const c of T.CANDIDATES){assert.ok(c.id&&c.name&&c.officialUrl);assert.ok(Number.isFinite(c.durationMinutes));}
});

test("Winter Magic and fixed events use published date gates",()=>{
  assert.equal(T.inSeason("2026-11-05"),true);assert.equal(T.inSeason("2027-02-15"),true);assert.equal(T.inSeason("2027-02-16"),false);
  assert.ok(T.eventsForDate("2026-12-04").some(e=>/Parade/.test(e.name)));
  assert.ok(T.eventsForDate("2026-12-31").some(e=>/New Year/.test(e.name)));
});

test("official NPS closure hard-gates Newfound Gap",()=>{
  const context=ctx({nps:{newfoundGapClosed:true}});const input=T.normalizeInput({date:"2026-12-12",start:"09:00",end:"20:00"});context.weatherFacts=T.weatherFacts(context.weather,context.sun);
  const c=T.CANDIDATES.find(x=>x.id==="newfound-gap");assert.equal(T.hardGate(c,input,context).valid,false);
});

test("confirmed closed attraction never survives hard gate",()=>{
  const context=ctx({attractions:{skypark:{openState:"closed"}}});const input=T.normalizeInput({date:"2026-12-12",start:"10:00",end:"22:00"});context.weatherFacts=T.weatherFacts(context.weather,context.sun);
  assert.equal(T.hardGate(T.CANDIDATES.find(x=>x.id==="skypark"),input,context).valid,false);
});

test("benchmark 1 — first-visit family gets a feasible kid-weighted December plan",()=>{
  const r=decide({persona:"family",kids:"6,10"});assert.ok(r.itinerary.length>=2);assert.ok(r.scored.find(x=>x.candidate.id==="ripley-aquarium").score>45);assert.ok(r.itinerary.every(x=>x.end<="22:00"));
});

test("benchmark 2 — one-evening couple keeps Christmas atmosphere in the pool",()=>{
  const r=decide({persona:"couple",start:"16:00",end:"22:30",mustLights:"1"});assert.ok(r.bundles.some(b=>b.itemIds.some(id=>/lights|magic/.test(id))));assert.ok(names(r).length>0);
});

test("benchmark 3 — family arriving after 6 PM loses daylight-only mountain options",()=>{
  const r=decide({persona:"family",kids:"6,10",start:"18:15",end:"22:30"});
  assert.equal(r.scored.find(x=>x.candidate.id==="skypark").valid,false);assert.equal(r.scored.find(x=>x.candidate.id==="newfound-gap").valid,false);
});

test("benchmark 4 — January snow seeker materially favors Ober",()=>{
  const r=decide({date:"2027-01-09",persona:"snow",mustSnow:"1",start:"09:30",end:"21:00"},ctx({weather:{snowSignal:true,tempHigh:31,tempLow:22}}));
  const ober=r.scored.find(x=>x.candidate.id==="ober-mountain");const aq=r.scored.find(x=>x.candidate.id==="ripley-aquarium");assert.ok(ober.score>aq.score);assert.ok(r.bundles.some(b=>b.id==="snow-first"));
});

test("benchmark 5 — rain creates a weather-pivot alternative and rewards indoor fallback",()=>{
  const r=decide({persona:"family"},ctx({weather:{precipMax:85,rainStarts:"19:30",cloudCover:90}}));assert.ok(r.bundles.some(b=>b.id==="weather-pivot"));assert.ok(r.scored.find(x=>x.candidate.id==="ripley-aquarium").score>r.scored.find(x=>x.candidate.id==="skypark").score-20);
});

test("benchmark 6 — budget visitor penalizes ticket-heavy choices",()=>{
  const r=decide({persona:"budget",budget:"low",mustLights:"1",start:"16:00"});const free=r.scored.find(x=>x.candidate.id==="winter-magic-walk").score;const sky=r.scored.find(x=>x.candidate.id==="skypark").score;assert.ok(free>sky);assert.ok(r.bundles.some(b=>b.id==="mostly-free"));
});

test("benchmark 7 — three-night couple still receives a realistic daily composition, not hotel booking",()=>{
  const r=decide({persona:"multi-day",start:"13:00",end:"22:00"});assert.ok(r.itinerary.length>=2);assert.equal(r.scored.some(x=>/hotel/i.test(x.candidate.name)),false);
});

test("benchmark 8 — stroller input penalizes long-walk lights loops",()=>{
  const normal=decide({persona:"family",mobility:"normal"});const stroller=decide({persona:"family",mobility:"stroller"});const a=normal.scored.find(x=>x.candidate.id==="moonshine-free-loop").score;const b=stroller.scored.find(x=>x.candidate.id==="moonshine-free-loop").score;assert.ok(b<a);
});

test("benchmark 9 — older low-walk couple keeps a lower-friction bundle available",()=>{
  const r=decide({persona:"couple",mobility:"low-walk"});assert.ok(r.bundles.some(b=>b.id==="easy-winter"));
});

test("benchmark 10 — Ober-focused snow visitor has a snow-first bundle",()=>{
  const r=decide({date:"2027-01-16",persona:"snow",mustSnow:"1",start:"09:00",end:"21:00"},ctx({weather:{snowSignal:true}}));assert.ok(r.bundles.find(b=>b.id==="snow-first")?.itemIds.some(id=>id.startsWith("ober")));
});

test("benchmark 11 — Christmas-light visitor retains Winter Magic after dark",()=>{
  const r=decide({persona:"christmas",mustLights:"1",start:"14:00",end:"22:00"});const light=T.CANDIDATES.find(x=>x.id==="winter-magic-walk");const scored=r.scored.find(x=>x.candidate.id===light.id);assert.equal(scored.valid,true);assert.ok(scored.score>60);
});

test("benchmark 12 — New Year's plan exposes the fixed event candidate",()=>{
  const r=decide({date:"2026-12-31",persona:"couple",start:"16:00",end:"23:50"});assert.equal(r.scored.find(x=>x.candidate.id==="new-years").valid,true);assert.ok(r.bundles.some(b=>b.id==="event-anchor"));
});

test("benchmark 13 — crowd avoidance heavily penalizes parade-night event anchor",()=>{
  const normal=decide({date:"2026-12-04",crowds:"normal",start:"15:00",end:"23:00"});const avoid=decide({date:"2026-12-04",crowds:"avoid",start:"15:00",end:"23:00"});const n=normal.scored.find(x=>x.candidate.id==="parade").score;const a=avoid.scored.find(x=>x.candidate.id==="parade").score;assert.ok(a<n-8);
});

test("benchmark 14 — three-hour visitor cannot be over-scheduled",()=>{
  const r=decide({persona:"first",start:"18:00",end:"21:00"});const total=r.itinerary.reduce((s,x)=>s+x.durationMinutes,0);assert.ok(total<=155);assert.ok(r.itinerary.every(x=>x.end<="21:00"));
});

test("benchmark 15 — late January still treats Winter Magic as seasonally valid",()=>{
  const r=decide({date:"2027-01-27",persona:"christmas",start:"15:00",end:"21:30"});assert.equal(r.scored.find(x=>x.candidate.id==="winter-magic-walk").valid,true);assert.ok(T.eventsForDate("2027-01-27").some(e=>e.id==="winter-magic"));
});

test("itinerary carries buffer and never runs past the user's end time",()=>{
  const r=decide({start:"14:30",end:"20:00",persona:"first"});for(const x of r.itinerary)assert.ok(x.end<="20:00");
});
