const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const intentPages=[
  ["detroit-river-freighters","freighter","Detroit River Freighters Today"],
  ["detroit-birding-today","birding","Detroit Birding Today"],
  ["lake-st-clair-outdoors","water","Lake St. Clair Conditions Today"],
  ["detroit-sunset-tonight","sunset","Detroit Sunset Tonight"]
];

test("Detroit growth pages are indexable, monetizable and share one live intent renderer",()=>{
  for(const [slug,intent,title] of intentPages){
    const html=read(`public/${slug}/index.html`);
    assert.match(html,new RegExp(`<title>${title.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g,"\\$&")}`));
    assert.match(html,new RegExp(`rel="canonical" href="https://chrisizworski\\.com/${slug}/"`));
    assert.match(html,/name="google-adsense-account" content="ca-pub-8222782620788075"/);
    assert.match(html,/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
    assert.match(html,new RegExp(`data-detroit-intent="${intent}"`));
    assert.match(html,/\/assets\/detroit-intent\.css\?v=20260922a/);
    assert.match(html,/\/assets\/detroit-intent\.js\?v=20260922b/);
    assert.match(html,/See all Detroit opportunities/);
  }
  const js=read("public/assets/detroit-intent.js");
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/\/api\/detroit-outdoors\?intent=/);
  assert.match(js,/detroit_growth_handoff/);
});

test("Detroit intent pages use shared cache and bounded refresh instead of per-open cache busting",()=>{
  const js=read("public/assets/detroit-intent.js");
  assert.doesNotMatch(js,/minuteBucket/);
  assert.doesNotMatch(js,/&fresh=/);
  assert.doesNotMatch(js,/cache:"no-store"/);
  assert.match(js,/intent==="freighter"\?5\*60\*1000:10\*60\*1000/);
  assert.match(js,/editorialSessionTtlMs=intent==="freighter"\?10\*60\*1000:30\*60\*1000/);
  assert.match(js,/Date\.now\(\)-lastLoadAt<refreshMs/);
  assert.match(js,/visibilitychange/);
  assert.match(js,/AIS report /);
  assert.match(js,/loadGeneration/);
  assert.match(js,/editorialSignature/);
  assert.match(js,/evidence:Array\.isArray\(candidate\.verifiedEvidence\)\?candidate\.verifiedEvidence:\[\]/);
  assert.match(js,/window:candidate\.timeWindow\|\|null/);
  assert.match(js,/editorialSig=/);
  assert.match(js,/sessionStorage/);
  assert.match(js,/signature!==lastEditorialSignature/);
});

test("Detroit intent core stays hard-gated while editorial enrichment is candidate-bound",()=>{
  const route=read("lib/detroit-outdoors/route.js");
  const dispatcher=read("api/fall-color.js");
  const safeIndex=route.indexOf("const safePool=mixed.candidates;");
  const intentIndex=route.indexOf("if(requestedIntent)");
  const boardIndex=route.indexOf("const boardDecision=await editBoard(boardPool,4);");
  assert.ok(safeIndex>=0&&intentIndex>safeIndex&&boardIndex>intentIndex);
  assert.match(route,/function intentSnapshot/);
  assert.match(route,/allowed:\["freighter","birding","water","sunset"\]/);
  assert.match(route,/candidate:candidate\?\{\.\.\.candidate,slot:"Live now",story:storyFor\(candidate,0\)\}:null/);
  assert.match(route,/metrics:intentMetricCards\(intent\.candidate,intent\.id\)/);
  assert.match(route,/query\.get\("mode"\)==="editorial"/);
  assert.match(route,/intent-candidate-stale/);
  assert.match(route,/const enrichment=await intentEditorial\(intent,fallSnapshot\)/);
  assert.match(route,/const plan=await planEditorialPlacement\(\[candidate\],false,fallSnapshot\)/);
  assert.match(route,/const result=await writeCardEditorial\(candidate,slot,date,fallSnapshot\)/);
  assert.match(dispatcher,/DETROIT_FREIGHTER_SAFE_CACHE_SECONDS = 60/);
  assert.match(dispatcher,/DETROIT_FOCUSED_CACHE_SECONDS = 300/);
  assert.match(dispatcher,/DETROIT_AIS_PUBLIC_MAX_AGE_MS = 10 \* 60 \* 1000/);
  assert.match(dispatcher,/responseAisRemainingSeconds/);
  assert.match(dispatcher,/detroit-ais-expired-during-render/);
  assert.match(dispatcher,/context\.mode === "editorial" && requestReferencesFreighter\(req\)/);
  assert.match(dispatcher,/Math\.min\(ttl, Math\.max\(0, Math\.floor\(aisRemainingSeconds\)\)\)/);
  assert.doesNotMatch(dispatcher,/stale-while-revalidate/);
});


test("Detroit intent pages expose adaptive editorial, evidence and uncertainty surfaces",()=>{
  for(const [slug] of intentPages){
    const html=read(`public/${slug}/index.html`);
    assert.match(html,/id="intent-metrics"/);
    assert.match(html,/id="intent-editorial"/);
    assert.match(html,/id="intent-editorial-title"/);
    assert.match(html,/id="intent-next"/);
    assert.match(html,/id="intent-evidence"/);
    assert.match(html,/id="intent-watch"/);
  }
  const js=read("public/assets/detroit-intent.js");
  assert.match(js,/mode=editorial&candidateId=/);
  assert.match(js,/renderEditorial/);
  assert.match(js,/renderMetrics/);
  assert.match(js,/renderEvidence/);
  assert.match(js,/renderWatch/);
  assert.match(js,/Today's editorial lens/);
  assert.match(js,/if\(res\.status===409\)\{lastLoadAt=0;return load\(true\);\}/);
});

test("Lake St Clair acquisition page publishes the same conservative thresholds as the engine",()=>{
  const html=read("public/lake-st-clair-outdoors/index.html");
  const engine=read("lib/detroit-outdoors/engines.js");
  for(const phrase of ["1.5 ft","10 mph","16 mph","30%","58°F"]){
    assert.ok(html.includes(phrase),`missing page threshold ${phrase}`);
  }
  assert.match(engine,/waveFt>1\.5/);
  assert.match(engine,/buoyWindMph>10/);
  assert.match(engine,/weather\.gust!==null&&weather\.gust>16/);
  assert.match(engine,/weather\.rainChance!==null&&weather\.rainChance>30/);
  assert.match(engine,/waterTempF!==null&&waterTempF<58/);
  assert.match(html,/not launch-specific/i);
});

test("Detroit freighter signal stays inside the public ten-minute AIS budget while lake-wide tracker stays broader",()=>{
  const freighter=read("public/detroit-river-freighters/index.html");
  const api=read("api/freighter-ais.js");
  const dispatcher=read("api/fall-color.js");
  assert.match(freighter,/10 minutes/);
  assert.match(freighter,/active reported movement/);
  assert.match(freighter,/roughly 12 miles/);
  assert.match(api,/Detroit Outdoors specialist adapter/);
  assert.match(api,/DETROIT_SIGNAL_MAX_AGE_MS = 8 \* 60 \* 1000/);
  assert.match(api,/publicDecisionMaxAgeMinutes: 10/);
  assert.match(api,/speed > 0\.5/);
  assert.match(api,/data\.detroitSignal/);
  assert.match(api,/s-maxage=10, must-revalidate/);
  assert.doesNotMatch(api,/s-maxage=10, stale-while-revalidate=10/);
  assert.match(dispatcher,/candidateAisRemainingSeconds/);
  assert.match(dispatcher,/timeWindow && signal\.timeWindow\.start/);
  assert.match(dispatcher,/s-maxage=\$\{ttl\}, must-revalidate/);
});

test("Detroit sunset page preserves evidence limitations",()=>{
  const sunset=read("public/detroit-sunset-tonight/index.html");
  assert.match(sunset,/Cloud cover is not sunset color/);
  assert.match(sunset,/cannot promise orange, pink or red skies/);
});

test("Detroit birding page keeps weather and migration separate from live sightings",()=>{
  const html=read("public/detroit-birding-today/index.html");
  assert.match(html,/not evidence that a particular species was seen there today/);
  assert.match(html,/https:\/\/michiganbirdingreport\.com\//);
  assert.match(html,/Window first, sightings second/);
});

test("Detroit network teaser is distributed across four existing traffic surfaces",()=>{
  const files=[
    "public/great-lakes-freighter-tracking/index.html",
    "public/great-lakes-buoys/index.html",
    "public/northern-lights-michigan/index.html",
    "public/fall-color/index.html"
  ];
  for(const file of files){
    const html=read(file);
    assert.match(html,/data-detroit-teaser/);
    assert.match(html,/\/assets\/detroit-network-teaser\.css\?v=20260921a/);
    assert.match(html,/\/assets\/detroit-network-teaser\.js\?v=20260921a/);
  }
  const js=read("public/assets/detroit-network-teaser.js");
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/detroit_network_open/);
});

test("Detroit main page owns broad things-to-do intent while focused pages own narrower questions",()=>{
  const main=read("public/detroit-outdoors/index.html");
  assert.match(main,/<title>Things to Do in Detroit Today \| Detroit Outdoors<\/title>/);
  assert.match(main,/See what’s worth doing outdoors around Detroit today/);
  for(const [slug] of intentPages) assert.match(main,new RegExp(`href="/${slug}/"`));
  const client=read("public/assets/detroit-outdoors.js");
  assert.match(client,/function intentPageFor/);
  assert.match(client,/Open Detroit River freighter read/);
  assert.match(client,/Check Lake St\. Clair window/);
  assert.match(client,/Check Detroit sunset tonight/);
  assert.match(client,/Open Detroit birding today/);
});

test("Michigan tools spotlight makes the live board itself clickable and shows evidence",()=>{
  const html=read("public/tools/index.html");
  assert.match(html,/<a class="detroit-live-board" href="\/detroit-outdoors\/"[^>]*data-placement="tools-spotlight-live-board"/);
  assert.match(html,/id="detroit-tools-evidence"/);
  assert.match(html,/lead\.specialist&&lead\.specialist\.headline/);
});

test("Detroit growth pages are indexed and benchmarked against AdSense volume",()=>{
  const sitemap=read("public/sitemap.xml");
  for(const [slug] of intentPages) assert.match(sitemap,new RegExp(`https://chrisizworski\\.com/${slug}/`));
  const benchmark=JSON.parse(read("benchmarks/detroit-outdoors-growth.json"));
  assert.equal(benchmark.currentScore,46);
  assert.equal(benchmark.targetScore,81);
  assert.equal(benchmark.targetMonthly.searchImpressions,80000);
  assert.equal(benchmark.targetMonthly.adsenseImpressionsLow,3900);
  assert.equal(benchmark.targetMonthly.adsenseImpressionsHigh,6900);
  assert.ok(benchmark.events.includes("detroit_network_open"));
});
