"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const js=fs.readFileSync("public/winter-eagle-watching/app.js","utf8");
const block=js.slice(js.indexOf("function eagleEvidenceCurrent("),js.indexOf("async function loadEvidence("));
const ctx=vm.createContext({});vm.runInContext(block,ctx);
const now=Date.parse("2026-11-28T10:00:00Z"),at=n=>new Date(now+n).toISOString();
test("eagle evidence packet age cannot be inferred from HTTP success",()=>{
 assert.equal(ctx.eagleEvidenceCurrent({asOf:at(-3600000)},now),true);
 for(const asOf of [null,"bad",at(-18*3600000-1),at(60001)])assert.equal(ctx.eagleEvidenceCurrent({asOf},now),false);
});
test("regional observation dates and ice age are recomputed, not trusted from cache",()=>{
 const r=ctx.admitEagleSources({observations:{status:"ok",observationsSampled:987,latestObservedOn:"2020-01-01",ageDays:0},ice:{status:"recent",percent:88,date:"2020-01-01",ageDays:0}},now);
 assert.equal(r.obs.status,"unavailable");assert.equal(r.ice.status,"historical");
 const recent=ctx.admitEagleSources({observations:{status:"ok",observationsSampled:1,latestObservedOn:"2026-11-27"},ice:{status:"recent",percent:0,date:"2026-11-27"}},now);
 assert.equal(recent.obs.ageDays,1);assert.equal(recent.ice.status,"recent");assert.equal(recent.ice.percent,0);
 const missing=ctx.admitEagleSources({observations:{status:"ok",observationsSampled:null},ice:{status:"recent",percent:null,date:"2026-11-27"}},now);
 assert.equal(missing.obs.status,"unavailable");assert.equal(missing.ice.status,"unavailable");
 for(const day of ["bad","2026-11-31","2026-11-29"])assert.equal(ctx.eagleCalendarAge(day,now),null);
 const none=ctx.admitEagleSources({observations:{status:"ok",observationsSampled:0,latestObservedOn:null},ice:{status:"not_applicable"}},now);assert.equal(none.obs.status,"ok");assert.equal(none.ice.status,"not_applicable");
});
test("NWS issue age must be independently admissible",()=>{
 assert.equal(ctx.eagleForecastCurrent(at(-3600000),now),true);
 for(const t of [null,"bad",at(-12*3600000-1),at(3600001)])assert.equal(ctx.eagleForecastCurrent(t,now),false);
 assert.match(js,/if\(!eagleForecastCurrent\(issued\)\)throw/);
 assert.match(js,/!eagleEvidenceCurrent\(result\)/);
 assert.match(js,/typeof p.temperature==="number"/);
});
