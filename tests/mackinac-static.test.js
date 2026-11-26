const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = readFileSync(path.join(root, "public/mackinac-bridge-live/index.html"), "utf8");
const css = readFileSync(path.join(root, "public/assets/mackinac-bridge-live.css"), "utf8");
const js = readFileSync(path.join(root, "public/assets/mackinac-bridge-live.js"), "utf8");

test("Mackinac Bridge Live has indexable metadata and valid structured data", () => {
  assert.match(html, /<title>Mackinac Bridge Conditions Today: Live Status &amp; Wind<\/title>/);
  assert.ok(
    html.includes(
      '<link rel="canonical" href="https://chrisizworski.com/mackinac-bridge-live/">',
    ),
  );
  assert.match(html, /name="description" content="[^"]*official open or closure status/i);
  assert.ok(html.includes('"@type": "WebApplication"'));
  assert.ok(html.includes('"@type": "Offer"'));
  assert.match(html, /"@type": "FAQPage"/);
  assert.match(html, /og:image:alt" content="Photograph of the Mackinac Bridge/);
  assert.doesNotMatch(html, /Illustrated Mackinac Bridge/i);
  assert.ok(html.includes('id="mackinac-conditions-answer"'));
  assert.match(html, /Is the Mackinac Bridge open today\?/i);

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 2);
  blocks.forEach((block) => assert.doesNotThrow(() => JSON.parse(block[1])));
});

test("Mackinac Bridge Live contains the complete crossing decision flow", () => {
  assert.ok(html.includes("Will I have trouble crossing?"));
  assert.equal((html.match(/data-vehicle="/g) || []).length, 4);
  assert.equal((html.match(/data-direction="/g) || []).length, 2);
  assert.doesNotMatch(html, /Estimated best crossing window/i);
  assert.ok(html.includes("Mackinac Bridge Webcam"));
  assert.ok(html.includes("Straits of Mackinac Weather Radar"));
  assert.ok(html.includes("Mackinac Bridge Area Hourly Wind Forecast"));
  assert.ok(html.includes("RV, Camper and Trailer Guidance"));
  assert.ok(html.includes("Mackinac Bridge Traffic Today"));
  assert.ok(html.includes("Mackinac Bridge Toll Calculator"));
  assert.ok(html.includes("Nervous about crossing? Bridge staff can drive your vehicle."));
  assert.ok(html.includes("Approach-road incidents and construction"));
  assert.ok(html.includes("Status changes observed by this browser"));
});

test("the SMS text-alert link and share-report button are not present", () => {
  assert.ok(!html.includes("Share crossing report"));
  assert.ok(!html.includes("sms:67283?body=MacBridge"));
  assert.ok(!html.includes('id="shareButton"'));
  assert.ok(!html.includes('id="shareStatus"'));
});

test("the interface makes official status authoritative and nearby wind explicit", () => {
  assert.match(html, /Bridge Authority condition report is the controlling source/i);
  assert.match(html, /Nearby NOAA station/i);
  assert.match(html, /does not publish a real-time bridge-deck wind or gust reading/i);
  assert.doesNotMatch(html, /Official bridge wind/i);
  assert.ok(html.includes('id="windMismatchNotice"'));
  assert.match(html, /Planning aid, not an official safety decision/i);
  assert.ok(js.includes('var API_URL = "/api/mackinac"'));
  assert.ok(js.includes("showWindContextWarning"));
  assert.doesNotMatch(js, /bridge_wind/);
  assert.doesNotMatch(js, /bestWindow|showWindowButton|is-best/);
  assert.ok(js.includes("renderUnavailable"));
  assert.doesNotMatch(js, /title:\s*["']All Clear/i);
  assert.ok(js.includes("Notification.permission"));
});

test("Crossing Confidence is categorical, explainable, and does not use nearby weather as a score", () => {
  assert.ok(html.includes('id="confidenceScore">VERIFY</strong>'));
  assert.ok(html.includes('id="confidenceBasis"'));
  assert.doesNotMatch(html, /\/100/);
  assert.doesNotMatch(js, /confidence\.score|scores\s*=\s*highProfile|--confidence/);
  assert.ok(js.includes('code: "CLEAR"'));
  assert.ok(js.includes('code: "ESCORT"'));
  assert.match(js, /official condition report is unavailable, so this tool will not infer/i);
});

test("vehicle, toll, assistance, approach-road, and history differentiators are wired", () => {
  assert.equal((html.match(/data-vehicle-feature=/g) || []).length, 4);
  assert.equal((html.match(/data-comfort=/g) || []).length, 2);
  assert.ok(js.includes("classifyVehicleFeatures"));
  assert.ok(js.includes("calculateToll"));
  assert.ok(js.includes("renderApproachTraffic"));
  assert.ok(js.includes("recordStatusObservation"));
  assert.ok(js.includes("result.dataset.classification = vehicle"));
  assert.doesNotMatch(js, /result\.dataset\.vehicle\s*=/);
  assert.match(html, /device-local history, not an official Bridge Authority archive/i);
  assert.match(html, /does not publish a live crossing wait-time feed/i);
});

test("the sharing feature (SMS link and share button) was removed by design and stays removed", () => {
  assert.doesNotMatch(js, /navigator\.share|navigator\.clipboard|shareCrossingReport|shareUrl\(\)/);
});

test("the published toll formula handles passenger, trailer, motorhome, and auto-tow cases", () => {
  const start = js.indexOf("function calculateToll(");
  const end = js.indexOf("\n  function renderToll", start);
  const calculateToll = new Function(
    "clamp",
    `${js.slice(start, end)}; return calculateToll;`,
  )((value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value)));

  assert.equal(calculateToll("passenger", 2, 0, false).total, 4);
  assert.equal(calculateToll("passenger", 2, 2, false).total, 8);
  assert.equal(calculateToll("other", 2, 0, false).total, 10);
  assert.equal(calculateToll("other", 2, 2, true).total, 14);
  assert.equal(calculateToll("other", 2, 2, false).total, 20);
});

test("supporting search pages exist, cross-link, and use the real licensed photograph", () => {
  for (const route of [
    "mackinac-bridge-driver-assistance",
    "mackinac-bridge-rv-trailer-wind-rules",
    "mackinac-bridge-tolls",
  ]) {
    const page = readFileSync(path.join(root, "public", route, "index.html"), "utf8");
    assert.ok(page.includes(`https://chrisizworski.com/${route}/`));
    assert.ok(page.includes("/assets/search/mackinac-bridge-live.jpg"));
    assert.ok(page.includes('href="/mackinac-bridge-live/"'));
    assert.match(page, /Tammy Sue, CC0 public domain/);
    assert.doesNotMatch(page, /"@type": "FAQPage"/);
    for (const block of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(block[1]));
    }
  }
});

test("the tool includes official NWS area radar without presenting it as bridge conditions", () => {
  assert.ok(html.includes("https://radar.weather.gov/station/kapx/standard"));
  assert.match(html, /Radar shows precipitation, not bridge wind or crossing status/i);
  assert.ok(html.includes('id="radarImage"'));
  assert.ok(js.includes('/api/mackinac-media?asset=radar'));
  assert.ok(js.includes('RADAR_LOOP_URL.includes("?") ? "&" : "?"'));
  assert.ok(js.includes("The NWS radar loop is temporarily unavailable"));
});

test("northbound and southbound selections stay aligned with distinct camera feeds", () => {
  assert.match(
    js,
    /direction:\s*"northbound",\s*\n\s*camera:\s*"north"/,
  );
  assert.ok(js.includes('state.camera = direction === "southbound" ? "south" : "north"'));
  assert.match(
    html,
    /aria-selected="true"[^>]*data-camera="north">Northbound, Mackinaw City looking north/,
  );
  assert.match(
    html,
    /data-camera="south">Southbound, St\. Ignace looking south/,
  );
  assert.match(
    html,
    /Choosing Northbound or Southbound above selects the matching approach view\./,
  );
  const cameraUrls = [...js.matchAll(/\/api\/mackinac-media\?asset=camera&direction=(?:north|south)/g)].map(
    (match) => match[0],
  );
  assert.equal(new Set(cameraUrls).size, 2);
  assert.doesNotMatch(js, /mackinacbridge\.org\/wp-content\/camimages/);
});

test("the tool is responsive, reduced-motion aware, and analytics ready", () => {
  assert.ok(css.includes("@media (max-width: 680px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(html.includes('href="#main">Skip to bridge conditions</a>'));
  assert.ok(html.includes('/_vercel/insights/script.js'));
  assert.ok(html.includes('/_vercel/speed-insights/script.js'));
  assert.ok(js.includes('name: "Bridge Tool Interaction"'));
});


test("official snapshot age gate accepts the endpoint cache window and rejects missing, old and future check times", () => {
  const start = js.indexOf("function snapshotFresh(");
  const end = js.indexOf("\n  function invalidateStatus", start);
  assert.ok(start >= 0 && end > start);
  const fresh = new Function(js.slice(start, end) + "; return snapshotFresh;")();
  const now = Date.parse("2026-11-24T18:00:00Z");
  const data = offset => ({fetched_at:new Date(now+offset).toISOString()});
  assert.equal(fresh(data(0), now), true);
  assert.equal(fresh(data(-300000), now), true);
  assert.equal(fresh(data(-300001), now), false);
  assert.equal(fresh(data(60000), now), true);
  assert.equal(fresh(data(60001), now), false);
  assert.equal(fresh({fetched_at:"unknown"}, now), false);
  assert.equal(fresh(null, now), false);
});

test("failed or stale refresh replaces previous open verdict, not merely the ribbon", async () => {
  const start = js.indexOf("function snapshotFresh(");
  const end = js.indexOf("\n  function checkRestrictionChange", start);
  assert.ok(start >= 0 && end > start);
  const now = Date.parse("2026-11-24T18:00:00Z");
  const good = {fetched_at:new Date(now).toISOString(),official:{available:true,level:"open"}};
  const expired = {...good,fetched_at:new Date(now-300001).toISOString()};
  const state = {data:good,loading:false,selectedHour:null};
  const button = {disabled:false};
  let mode = "error",events = [],invalidations = 0,observations = 0,cleared = 0,timeoutDelay = 0;
  const fakeWindow = {
    dispatchEvent:event=>events.push(event.detail),
    setTimeout:(_fn,delay)=>{timeoutDelay=delay;return 1;},
    clearTimeout:()=>{cleared++;}
  };
  const deps = {
    window:fakeWindow, state, API_URL:"/api/mackinac", byId:()=>button,
    Date:class extends Date {static now(){return now;}},
    AbortController:class {constructor(){this.signal={};} abort(){}},
    CustomEvent:class {constructor(_name,options){this.detail=options.detail;}},
    fetch:async (_url,options)=>{
      assert.ok(options.signal);
      if(mode==="error")throw Error("offline");
      return {ok:true,json:async()=>mode==="stale"?expired:good};
    },
    renderUnavailable:()=>{invalidations++;state.data={official:{available:false,level:"unknown"}};},
    recordStatusObservation:()=>{observations++;},
    checkRestrictionChange:()=>{},renderAll:()=>{},track:()=>{}
  };
  const load = new Function(...Object.keys(deps),js.slice(start,end)+"; return loadData;")(...Object.values(deps));
  await load();
  assert.equal(state.data.official.level,"unknown");
  assert.deepEqual(events,[null]);
  assert.equal(observations,0);
  assert.equal(button.disabled,false);
  assert.equal(timeoutDelay,15000);
  assert.equal(cleared,1);
  mode="good";await load();
  assert.equal(state.data.official.level,"open");
  assert.equal(observations,1);
  mode="stale";await load();
  assert.equal(state.data.official.level,"unknown");
  assert.equal(observations,1);
  assert.equal(invalidations,2);
  assert.equal(events.at(-1),null);
  assert.equal(button.disabled,false);
  state.data=expired;state.loading=true;await load();
  assert.equal(state.data.official.level,"unknown","expired status on returning to an already-loading tab must be invalidated");
  assert.equal(invalidations,3);
});

test("missing forecast and nearby winds remain unavailable in browser decision code",()=>{
  const start=js.indexOf("function forecastBandForVehicle("),end=js.indexOf("\n  function renderForecastAnswer(",start);
  const band=new Function(js.slice(start,end)+";return forecastBandForVehicle")();
  assert.equal(band({wind_mph:null}),"unknown");assert.equal(band({wind_mph:0}),"open");assert.equal(band({wind_mph:-1}),"unknown");
  const a=js.indexOf("function formatNearbyWind("),b=js.indexOf("\n  function currentConfidence(",a);
  const format=new Function(js.slice(a,b)+";return formatNearbyWind")();
  assert.match(format({wind_mph:null,gust_mph:12}),/Sustained wind unavailable/);
  assert.match(format({wind_mph:0,gust_mph:null}),/0.0 mph.*gust unavailable/);
});
test("six-hour outlook requires complete sustained-wind coverage",()=>{
  const v2=readFileSync(path.join(root,"public/assets/mackinac-bridge-v2.js"),"utf8");
  const start=v2.indexOf("function blockWindEvidence("),end=v2.indexOf("\n  function renderRisk(",start);
  const assess=new Function(v2.slice(start,end)+";return blockWindEvidence")();
  const from=Date.parse("2026-11-26T12:00:00Z"),to=from+6*3600000;
  const hours=Array.from({length:6},(_,i)=>({start_time:new Date(from+i*3600000).toISOString(),end_time:new Date(from+(i+1)*3600000).toISOString(),wind_mph:i}));
  assert.equal(assess(hours,from,to),5);
  assert.equal(assess(hours.slice(1),from,to),null);
  assert.equal(assess(hours.filter((_,i)=>i!==3),from,to),null);
  assert.equal(assess(hours.map((h,i)=>i===3?{...h,wind_mph:null}:h),from,to),null);
  assert.equal(assess(hours.map(h=>({...h,wind_mph:0})),from,to),0);
});
