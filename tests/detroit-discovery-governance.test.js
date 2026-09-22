const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const cluster=[
  ["detroit-outdoors","https://chrisizworski.com/detroit-outdoors/"],
  ["detroit-freighters","https://chrisizworski.com/detroit-river-freighters/"],
  ["detroit-birding","https://chrisizworski.com/detroit-birding-today/"],
  ["lake-st-clair-outdoors","https://chrisizworski.com/lake-st-clair-outdoors/"],
  ["detroit-sunset","https://chrisizworski.com/detroit-sunset-tonight/"]
];

test("Detroit five-page discovery cluster is registered with unique ownership",()=>{
  const registry=JSON.parse(read("benchmarks/tool-network-registry.json"));
  const ids=new Set(registry.tools.map(t=>t.id));
  for(const [id,url] of cluster){
    assert.ok(ids.has(id),`missing registry node ${id}`);
    assert.equal(registry.tools.find(t=>t.id===id).canonical,url);
  }
  const broad=registry.cannibalizationGroups.find(g=>g.intent==="Detroit outdoor things to do today");
  assert.equal(broad.owner,"detroit-outdoors");
  assert.deepEqual(new Set(broad.supports),new Set(["detroit-freighters","detroit-birding","lake-st-clair-outdoors","detroit-sunset"]));
  const ship=registry.cannibalizationGroups.find(g=>g.intent==="Great Lakes ship tracking");
  assert.equal(ship.owner,"ship-tracker");
  assert.ok(ship.supports.includes("detroit-freighters"));
});

test("Detroit focused pages are present in sitemap and answer-engine inventory",()=>{
  const sitemap=read("public/sitemap.xml");
  const llms=read("public/llms.txt");
  for(const [,url] of cluster){
    assert.match(sitemap,new RegExp(`<loc>${url.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&")}</loc>`));
    assert.ok(llms.includes(url),`llms.txt missing ${url}`);
  }
});

test("Detroit observation gate holds scope while allowing product fixes",()=>{
  const actions=JSON.parse(read("benchmarks/tool-network-actions.json"));
  const program=(actions.observationPrograms||[]).find(x=>x.id==="detroit-discovery-pilot-v1");
  assert.ok(program);
  assert.equal(program.status,"observing");
  assert.equal(program.started,"2026-09-21");
  assert.equal(program.earliestExpansionReview,"2026-10-19");
  assert.deepEqual(new Set(program.cluster),new Set(cluster.map(x=>x[0])));
  assert.match(program.rule,/Continue factual, safety, reliability and UX fixes/);
  assert.match(program.rule,/Do not add another Detroit canonical/);
  assert.ok(program.expansionGate.searchEvidence);
  assert.ok(program.expansionGate.networkEvidence);
  assert.ok(program.expansionGate.cannibalizationSafety);
});

test("Detroit discovery ledger starts with prelaunch evidence and comparable-window rules",()=>{
  const ledger=JSON.parse(read("benchmarks/detroit-discovery-observation.json"));
  assert.equal(ledger.launchDate,"2026-09-21");
  assert.equal(ledger.earliestExpansionReview,"2026-10-19");
  assert.equal(ledger.snapshots[0].window.start,"2026-09-11");
  assert.equal(ledger.snapshots[0].window.end,"2026-09-17");
  assert.equal(ledger.snapshots[0].site.impressions,23211);
  assert.equal(ledger.snapshots[0].site.clicks,611);
  assert.equal(ledger.snapshots[0].detroitCluster.impressions,0);
  assert.ok(ledger.rules.some(x=>/Never compare unlike Search Console windows/.test(x)));
  assert.ok(ledger.rules.some(x=>/Strengthen the current canonical owner/.test(x)));
});

test("Detroit discovery report and canonical audit are wired as repeatable commands",()=>{
  const pkg=JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["report:detroit-discovery"],"node scripts/report-detroit-discovery.mjs");
  assert.equal(pkg.scripts["audit:canonical-indexing"],"node scripts/audit-sitemap-canonicals.mjs");
  const report=read("scripts/report-detroit-discovery.mjs");
  const audit=read("scripts/audit-sitemap-canonicals.mjs");
  assert.match(report,/REVIEW_QUERY_GAP/);
  assert.match(report,/STRENGTHEN_EXISTING/);
  assert.match(report,/position 4–15 Detroit opportunities/i);
  assert.match(audit,/missing-canonical/);
  assert.match(audit,/canonical-mismatch/);
  assert.match(audit,/duplicateCanonicals/);
});

test("Detroit discovery pilot is a durable search-strategy source",()=>{
  const strategy=read("docs/SEARCH_STRATEGY.md");
  const pilot=read("docs/DETROIT_DISCOVERY_PILOT.md");
  assert.match(strategy,/DETROIT_DISCOVERY_PILOT\.md/);
  assert.match(pilot,/product-to-discovery loop/i);
  assert.match(pilot,/October 19, 2026/);
  assert.match(pilot,/Duplicate without user-selected canonical/);
});
