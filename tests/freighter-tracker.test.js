const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("Great Lakes ship tracker matches live search intent without changing the canonical", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");

  assert.ok(html.includes("<title>Great Lakes Ship Tracker Live Now | Chris Izworski</title>"));
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-freighter-tracking/">'));
  assert.ok(html.includes('id="freighter-tracker-answer"'));
  assert.ok(html.includes("Track Great Lakes Freighters Live"));
  assert.ok(html.includes('id="live-map"'));
  assert.ok(!html.includes('href="/advertise/"'));
});

test("ship tracker exposes seven useful map views on one crawlable page", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");
  const script = read("public/assets/freighter-tracker.js");
  const expectedViews = ["overview", "soo", "mackinac", "duluth", "port-huron", "detroit", "saginaw"];

  for (const view of expectedViews) {
    assert.ok(html.includes(`data-freighter-view="${view}"`), view);
    assert.ok(script.includes(`${view === "port-huron" ? '"port-huron"' : view}: {`) || script.includes(`${view}: {`), view);
  }
  assert.equal((html.match(/class="view-tab"/g) || []).length, 7);
  assert.ok(script.includes("window.history.replaceState"));
  assert.ok(script.includes('name: "Freighter Map View"'));
  assert.ok(!script.includes("localStorage"));
  assert.ok(!script.includes("document.cookie"));
});

test("ship tracker uses supported no-key AIS and existing same-origin NOAA data", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");
  const script = read("public/assets/freighter-tracker.js");

  assert.ok(!html.includes("https://embed.myshiptracking.com/embed?myst"));
  assert.ok(script.includes('fetch("/api/freighter-ais"'));
  assert.ok(html.includes("https://openwaters.io/ais/"));
  assert.ok(html.includes("https://ais.boatnerd.com/passage/port/soo-locks"));
  assert.ok(html.includes("must not be used for navigation"));
  assert.ok(script.includes('fetch("/api/buoys"'));
  assert.ok(script.includes("distanceMiles"));
  assert.ok(script.includes("Vessel reports unavailable"));
  assert.ok(!html.includes("AISSTREAM_API_KEY"));
  assert.ok(!script.includes("AISSTREAM_API_KEY"));
  assert.ok(!script.includes("fetch(\"https://ais.boatnerd.com"));
});

test("ship tracker remains bounded on tablets and phones", () => {
  const css = read("public/assets/freighter-tracker.css");

  assert.ok(css.includes("#freighterMap,.map-stage{height:500px;min-height:500px}"));
  assert.ok(css.includes("#freighterMap,.map-stage{height:420px;min-height:420px}"));
  assert.ok(css.includes("#freighterMap,.map-stage{height:370px;min-height:370px}"));
  assert.ok(!css.includes("height:100vh"));
});

test("ship tracker structured data and internal discovery surfaces are aligned", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const tools = read("public/tools/index.html");
  const greatLakes = read("public/great-lakes/index.html");
  const home = read("public/index.html");
  const sitemap = read("public/sitemap.xml");
  const llms = read("public/llms.txt");

  assert.equal(blocks.length, 1);
  assert.doesNotThrow(() => JSON.parse(blocks[0][1]));
  assert.ok(tools.includes('data-featured-tool="great-lakes-freighter-tracking"'));
  assert.ok(tools.includes("Great Lakes Ship Tracker Live, Freighters and AIS Map"));
  assert.ok(greatLakes.includes("Great Lakes Ship Tracker Live"));
  assert.ok(home.includes("Track freighters &rarr;"));
  // lastmod is derived from git by scripts/stamp-freshness.mjs, so assert its shape and keep
  // the priority pinned, which is the part this test is actually protecting.
  assert.match(sitemap, /great-lakes-freighter-tracking\/<\/loc>\s*<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>[\s\S]*?<priority>0\.9<\/priority>/);
  assert.ok(llms.includes("## Great Lakes Ship Tracking"));
});

test("ship tracker remains active after growth experiment retirement", () => {
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  assert.equal(ledger.status, "retired");
  assert.equal(ledger.operatingMode, "ship-and-observe");
  assert.deepEqual(ledger.activeExperiments, []);
  assert.match(ledger.note, /No title, description, H1, canonical, structured-data, or indexability experiment freeze is active/);
});


test("NOAA missing readings do not become calm wind or freezing water", () => {
  const vm = require("node:vm");
  const script = read("public/assets/freighter-tracker.js");
  const context = {};
  vm.runInNewContext(script.slice(script.indexOf("  function finite("), script.indexOf("  function resetConditions(")), context);
  for (const value of [null, undefined, "", false]) {
    assert.equal(context.knots(value), "—");
    assert.equal(context.fahrenheit(value), "—");
    assert.equal(context.feet(value), "—");
  }
  assert.equal(context.knots(0), "0 kt");
  assert.equal(context.fahrenheit(0), "32°F");
});

test("lake-wide AIS request stays within provider area limits and preserves a Duluth report", async t => {
  const handler = require("../api/freighter-ais");
  let requested;
  t.mock.method(global, "fetch", async url => {
    requested = new URL(url);
    return {ok:true,json:async()=>({type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:[-92.08,46.78]},properties:{mmsi:366904910,name:"TEST REPORT",seen:new Date().toISOString(),sog:0,source:"aishub"}}],attribution:{aishub:"AISHub via Open Waters"}})};
  });
  const res={setHeader(){},status(n){this.code=n;return this},json(d){this.data=d}};
  await handler({method:"GET"},res);
  const area=requested.searchParams.getAll("bbox").map(s=>s.split(",").map(Number)).reduce((sum,[s,w,n,e])=>sum+(n-s)*(e-w),0);
  assert.ok(area<=100);
  assert.equal(res.code,200);
  assert.equal(res.data.vessels.length,1);
  assert.equal(res.data.vessels[0].lon,-92.08);
  assert.equal(res.data.attribution[0].credit,"AISHub via Open Waters");
});

test("live map comes before the Gazette on the dedicated tracker", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");
  assert.ok(html.indexOf('id="live-map"') < html.indexOf('class="gazette-daily"'));
  assert.ok(html.indexOf('class="layup-handoff"') < html.indexOf('class="gazette-daily"'));
});


test("Cuyahoga selects the same Open Waters regional AIS pipeline as Soo and Duluth without changing the lake-wide route", async t => {
  const handler = require("../api/freighter-ais");
  const now = Date.now();
  const iso = ms => new Date(ms).toISOString();
  let called = 0, requested, headers;
  t.mock.method(global, "fetch", async (url, options) => {
    called++;
    requested = new URL(url);
    headers = options.headers;
    return { ok: true, json: async () => ({
      type: "FeatureCollection", features: [
        { type:"Feature", geometry:{type:"Point",coordinates:[-81.7033,41.4945]},
          properties:{mmsi:367111111,name:"CLEVELAND TEST SHIP",seen:iso(now-90000),sog:3.1,cog:115,type:70,length:190,source:"cleveland-receiver"} },
        // A second report of the same MMSI must not duplicate the ship.
        { type:"Feature", geometry:{type:"Point",coordinates:[-81.705,41.495]},
          properties:{mmsi:367111111,name:"CLEVELAND TEST SHIP",seen:iso(now-140000),sog:2,source:"cleveland-receiver"} },
        { type:"Feature", geometry:{type:"Point",coordinates:[-92.08,46.78]},
          properties:{mmsi:367222222,name:"OUTSIDE CLEVELAND",seen:iso(now-90000),source:"outside"} },
        { type:"Feature", geometry:{type:"Point",coordinates:[-81.704,41.493]},
          properties:{mmsi:367333333,name:"EXPIRED CLEVELAND",seen:iso(now-3600000),source:"expired"} }
      ], attribution: {"cleveland-receiver":"Licensed receiver credit via Open Waters"}
    })};
  });
  const res = { headers:{}, setHeader(key,value){this.headers[key]=value},
    status(code){this.code=code;return this}, json(data){this.data=data;return this} };
  await handler({method:"GET",query:{region:"cuyahoga"},headers:{}},res);
  assert.equal(called,1);
  assert.equal(requested.hostname,"ais.openwaters.io");
  assert.equal(requested.pathname,"/v1/vessels");
  assert.deepEqual(requested.searchParams.getAll("bbox"),["41.4,-81.85,41.6,-81.58"]);
  assert.equal(requested.searchParams.get("max_age"),"30m");
  assert.match(headers["User-Agent"],/CuyahogaRiverWatch/);
  assert.equal(res.code,200);
  assert.equal(res.data.scope,"cuyahoga-regional-openwaters");
  assert.deepEqual(res.data.bbox,[41.4,-81.85,41.6,-81.58]);
  assert.equal(res.data.vessels.length,1);
  assert.equal(res.data.vessels[0].mmsi,"367111111");
  assert.equal(res.data.vessels[0].name,"CLEVELAND TEST SHIP");
  assert.equal(res.data.vessels[0].course,115);
  assert.equal(res.data.attribution[0].credit,"Licensed receiver credit via Open Waters");
  assert.equal(res.headers["X-Robots-Tag"],"noindex, nofollow");
  assert.equal(res.headers["Cache-Control"],"public, s-maxage=45, stale-while-revalidate=60");
  // Do not silently serve a lake-wide feed on a mistyped regional query.
  const bad = {headers:{},setHeader(key,value){this.headers[key]=value},
    status(code){this.code=code;return this},json(data){this.data=data;return this}};
  await handler({method:"GET",query:{region:"unknown"},headers:{}},bad);
  assert.equal(bad.code,400);
  assert.equal(called,1);
});
