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
    assert.match(html,/\/assets\/detroit-intent\.css\?v=20260921a/);
    assert.match(html,/\/assets\/detroit-intent\.js\?v=20260921a/);
    assert.match(html,/See all Detroit opportunities/);
  }
  const js=read("public/assets/detroit-intent.js");
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/\/api\/detroit-outdoors\?intent=/);
  assert.match(js,/detroit_growth_handoff/);
});

test("Detroit intent API exposes only safety-gated candidates and returns before JEV board writing",()=>{
  const route=read("lib/detroit-outdoors/route.js");
  const safeIndex=route.indexOf("const safePool=mixed.candidates;");
  const intentIndex=route.indexOf("if(requestedIntent)");
  const boardIndex=route.indexOf("const boardDecision=await editBoard(safePool,4);");
  assert.ok(safeIndex>=0&&intentIndex>safeIndex&&boardIndex>intentIndex);
  assert.match(route,/function intentSnapshot/);
  assert.match(route,/allowed:\["freighter","birding","water","sunset"\]/);
  assert.match(route,/candidate:candidate\?\{\.\.\.candidate,slot:"Live now",story:storyFor\(candidate,0\)\}:null/);
  assert.match(route,/rejected:rejected\.map/);
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

test("Detroit freighter and sunset pages preserve evidence limitations",()=>{
  const freighter=read("public/detroit-river-freighters/index.html");
  const sunset=read("public/detroit-sunset-tonight/index.html");
  assert.match(freighter,/AIS is informational, not a passage schedule/);
  assert.match(freighter,/30 minutes/);
  assert.match(freighter,/roughly 12 miles/);
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
