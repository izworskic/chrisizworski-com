const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const daily=require("../lib/fall-color/daily-editorial");
const national=require("../lib/fall-color/routes/national-briefings");
const cron=fs.readFileSync(path.join(__dirname,"../lib/fall-color/routes/cron.js"),"utf8");
const dispatch=fs.readFileSync(path.join(__dirname,"../api/fall-color.js"),"utf8");
const vercel=require("../vercel.json");
test("only dedicated environment variable is used, and AI is output bounded",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../lib/fall-color/daily-editorial.js"),"utf8");
 assert.match(source,/ANTHROPIC_API_KEY_FALL_COLOR/);
 assert.match(source,/max_tokens: 420/);
 assert.match(source,/AbortSignal.timeout\(12000\)/);
 assert.doesNotMatch(source,/process\.env\.ANTHROPIC_API_KEY(?!_FALL_COLOR)/);
 assert.equal(daily.compactRegions([{name:"North",pct:50,phase:"rising"},{name:"Bad",pct:NaN}]).length,1);
});
test("Michigan AI never runs from a public reader and must reserve a unique daily attempt",()=>{
 assert.match(cron,/\["SET", "fallcolor:anthropic:mi:attempt:" \+ dateKey, "1", "EX", 172800, "NX"\]/);
 assert.match(cron,/reserved \? await generateDailyFallEditorial\(snap\) : null/);
 assert.match(cron,/aiBody \|\| writeModelReport\(snap\)/);
 assert.doesNotMatch(fs.readFileSync(path.join(__dirname,"../lib/fall-color/routes/report.js"),"utf8"),/generateDailyFallEditorial|api\.anthropic\.com/);
});
test("the 15 national region briefings share one cron, not visitor-triggered generation",()=>{
 assert.equal(national._test.IDS.length,15);
 assert.equal(new Set(national._test.IDS).size,15);
 assert.match(dispatch,/"national-briefings-cron"/);
 assert.match(dispatch,/"national-briefings"/);
 assert.deepEqual(vercel.crons.filter(c=>c.path.includes("national-briefings")).map(c=>c.schedule),["15 11 * * *"]);
 const src=fs.readFileSync(path.join(__dirname,"../lib/fall-color/routes/national-briefings.js"),"utf8");
 assert.match(src,/process\.env\.ANTHROPIC_API_KEY_FALL_COLOR/);
 assert.match(src,/"NX"/);
 assert.match(src,/max_tokens:1300/);
 assert.doesNotMatch(src,/process\.env\.ANTHROPIC_API_KEY(?!_FALL_COLOR)/);
 assert.ok(src.indexOf("await redis([\"SET\",\"fallcolor:anthropic:national:attempt:")<src.indexOf("const notes=await generate(evidence)"));
});
test("national notes are evidence constrained and stale editions are not promoted",()=>{
 const {dateKey,isSeason,compactRegion,parseBriefings}=national._test;
 assert.equal(dateKey(new Date("2026-10-10T02:00:00Z")),"2026-10-09");
 assert.equal(isSeason("2026-10-10"),true);
 assert.equal(isSeason("2026-12-10"),false);
 const e=compactRegion({region:{id:"ozarks",name:"Ozarks"},today:{status:"Within window",planning_index_pct:75},
 this_weekend:{date:"2026-10-10",verdict:{grade:"CONDITIONAL"},weather:null},drives:[],status:"CLIMATOLOGY_ONLY"});
 assert.equal(e.forecast,null);
 assert.equal(e.forecastAvailable,false);
 const result=parseBriefings({content:[{type:"text",text:JSON.stringify({ozarks:"Today's modeled timing is promising but no current NWS forecast is available; check local sources.",nope:"Ignore this unlisted region."})}]},[e]);
 assert.deepEqual(Object.keys(result),["ozarks"]);
 assert.equal(parseBriefings({stop_reason:"max_tokens",content:[{type:"text",text:'{"ozarks":"Long incomplete text"}'}]},[e]),null);
});
