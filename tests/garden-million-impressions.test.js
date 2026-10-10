const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const growth=JSON.parse(fs.readFileSync(path.join(root,"benchmarks/garden-million-impressions-2026-10-09.json"),"utf8"));
const vercel=JSON.parse(fs.readFileSync(path.join(root,"vercel.json"),"utf8"));
const xml=fs.readFileSync(path.join(root,"public/sitemap.xml"),"utf8");
const slug=url=>new URL(url).pathname;
test("all twelve garden tool canonicals have unique intent, live-routed paths and owner",()=>{
  assert.equal(growth.cohort.length,12);
  assert.equal(new Set(growth.cohort.map(t=>t.canonical)).size,12);
  assert.equal(new Set(growth.cohort.map(t=>t.intent)).size,12);
  assert.equal(growth.gardenHub.cards,12);
  for(const tool of growth.cohort){
    assert.ok(tool.owner?.startsWith("izworskic/"));
    assert.ok(tool.intent.length>12);
    assert.ok(tool.canonical.startsWith("https://chrisizworski.com/"));
    assert.ok(["REPAIR","PROTECT","PUSH","EXPAND","CONNECT"].includes(tool.action));
  }
});
test("new garden decisions are declared once in XML sitemap, not duplicate path variants",()=>{
 const newer=growth.cohort.filter(t=>/\/national-tools\/(planting\/(garlic|spring-bulbs|tomato-ripening|dig-dahlias|cover-crops|prune-hydrangeas|soil-temperature-ready|harden-off-seedlings)|frost\/cover-plants-tonight)\/$/.test(slug(t.canonical)));
 assert.equal(newer.length,9);
 const listed=[...xml.matchAll(/<loc>(https:\/\/chrisizworski\.com\/national-tools\/(?:planting|frost|garden)[^<]+)<\/loc>/g)].map(x=>x[1]);
 for(const tool of newer)assert.equal(listed.filter(u=>u===tool.canonical).length,1,tool.canonical);
 for(const tool of newer) {
   const prefix=slug(tool.canonical);
   for(const path of [prefix,prefix.replace(/\/$/,"")]){
     const rules=vercel.rewrites.filter(r=>r.source===path);
     assert.equal(rules.length,1,path);
     assert.ok(rules[0].destination.endsWith(prefix+"index.html"),path);
   }
 }
});
test("GSC baseline is dated real observation, new cohorts are not assigned false zeroes",()=>{
 const b=growth.gscBaseline;
 assert.equal(b.property,"sc-domain:chrisizworski.com");
 assert.equal(b.dateFrom,"2026-09-10");assert.equal(b.dateTo,"2026-10-07");
 assert.equal(b.impressions,109592);assert.equal(b.clicks,2815);
 assert.equal(growth.adsenseRevenue.status,"NOT AVAILABLE");
 assert.ok(growth.cohort.some(t=>t.measured28d===null));
 assert.ok(growth.exactlyOneNextAction.doneWhen?.includes("13 canonical URLs"));
});
