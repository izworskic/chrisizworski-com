const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Detroit category benchmark sets a higher internal release bar than each comparator",()=>{
  const benchmark=JSON.parse(read("benchmarks/detroit-category-benchmark.json"));
  const highest=Math.max(...benchmark.comparators.map(x=>x.total));
  assert.ok(benchmark.releaseTarget.minimumTotal>highest);
  assert.equal(benchmark.releaseTarget.minimumTotal,48);
  assert.equal(benchmark.releaseTarget.minimumCriticalScore,5);
  assert.ok(benchmark.comparators.some(x=>x.name==="AllTrails"));
  assert.ok(benchmark.comparators.some(x=>x.name==="Windy"));
  assert.ok(benchmark.comparators.some(x=>x.name==="MarineTraffic"));
  assert.ok(benchmark.comparators.some(x=>x.name==="eBird"));
});

test("Detroit main page exposes the decision facts before deeper reading",()=>{
  const html=read("public/detroit-outdoors/index.html");
  for(const id of ["decision-summary","summary-best","summary-window","summary-drive","summary-confidence"]){
    assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
  }
  assert.match(html,/BEST WINDOW/);
  assert.match(html,/From central Detroit/);
  assert.match(html,/Evidence quality, not a safety rating/);
  assert.match(html,/Jump straight to the live decision/);
  for(const url of ["/detroit-river-freighters/","/detroit-birding-today/","/lake-st-clair-outdoors/","/detroit-sunset-tonight/"]){
    assert.ok(html.includes(`href="${url}"`),`missing decision route ${url}`);
  }
});

test("Detroit cards render timing, travel, confidence and final verification from sealed candidate data",()=>{
  const client=read("public/assets/detroit-outdoors.js");
  assert.match(client,/function windowLabel\(c\)/);
  assert.match(client,/c\.timeWindow&&c\.timeWindow\.label/);
  assert.match(client,/c\.travel&&c\.travel\.driveBand/);
  assert.match(client,/c\.confidence&&c\.confidence\.level/);
  assert.match(client,/function renderDecisionFacts\(c\)/);
  assert.match(client,/BEST WINDOW/);
  assert.match(client,/lead-card/);
  assert.match(client,/renderSummary\(data\.opportunities\|\|\[\]\)/);
  assert.match(client,/setInterval\(load,30\*60\*1000\)/);
});

test("Detroit visual system keeps the lead dominant without decorative dashboard effects",()=>{
  const css=read("public/assets/detroit-outdoors.css");
  assert.match(css,/\.card\.lead-card\{grid-column:1\/-1/);
  assert.match(css,/\.decision-facts\{display:grid/);
  assert.match(css,/\.glance\{display:grid/);
  assert.match(css,/\.route-grid\{display:grid/);
  assert.doesNotMatch(css,/linear-gradient|radial-gradient/i);
});

test("Detroit category upgrade does not replace deterministic safety or closed-set JEV architecture",()=>{
  const route=read("lib/detroit-outdoors/route.js");
  const benchmark=JSON.parse(read("benchmarks/detroit-category-benchmark.json"));
  assert.match(route,/decideClosedSet/);
  assert.match(route,/HARD_ALERT/);
  assert.equal(benchmark.implementationContract.deterministicSafetyUnchanged,true);
  assert.equal(benchmark.implementationContract.jevClosedSetUnchanged,true);
  assert.equal(benchmark.implementationContract.writerCannotInventFacts,true);
});
