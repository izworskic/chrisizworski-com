"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const handler = require("../api/aurora-town-sky.js");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const towns = [
  { slug: "paradise-whitefish-point", region: "sault-ste-marie" },
  { slug: "sleeping-bear-dunes", region: "traverse-city" },
];

function mockRes() {
  return {
    headers: {},
    code: null,
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(n) { this.code = n; return this; },
    json(obj) { this.body = obj; return this; }
  };
}

test("town endpoint only allows two explicitly mapped town inputs", async () => {
  const result = mockRes();
  await handler({ method:"GET", query:{town:"not-a-town"} }, result);
  assert.equal(result.code,400);
  assert.ok(!result.body.available);
  const post = mockRes();
  await handler({ method:"POST", query:{town:"sleeping-bear-dunes"} }, post);
  assert.equal(post.code,405);
  assert.equal(post.headers.Allow,"GET, HEAD");
  assert.equal(handler.safeGridUrl({properties:{forecastGridData:"http://api.weather.gov/gridpoints/MQT/1,2"}}), null);
  assert.equal(handler.safeGridUrl({properties:{forecastGridData:"https://bad.example/gridpoints/MQT/1,2"}}), null);
  assert.equal(handler.safeGridUrl({properties:{forecastGridData:"https://api.weather.gov/gridpoints/MQT/1,2"}}), "https://api.weather.gov/gridpoints/MQT/1,2");
  assert.equal(handler.safeGridUrl({properties:{forecastGridData:"https://api.weather.gov/gridpoints/MQT/1,2?foo=bar"}}), "https://api.weather.gov/gridpoints/MQT/1,2?foo=bar");
});

test("spot cloud read returns a real NWS forecast with place-specific coordinate", async () => {
  const originalFetch = global.fetch;
  const callUrls = [];
  const now = new Date().toISOString();
  try {
    global.fetch = async (url) => {
      callUrls.push(url);
      return {ok:true, json:async () => url.includes("/points/") ?
        {properties:{forecastGridData:"https://api.weather.gov/gridpoints/MQT/32,12"}} :
        {properties:{updateTime:now,skyCover:{values:[{validTime:now+"/PT3H",value:65}]}}}};
    };
    const res = mockRes();
    await handler({method:"GET", query:{town:"paradise-whitefish-point"}},res);
    assert.equal(res.code,200);
    assert.equal(res.body.available,true);
    assert.equal(res.body.source,"National Weather Service");
    assert.equal(res.body.label,"Whitefish Point shoreline");
    assert.ok(res.body.sky_cover.periods.length>=1);
    assert.equal(res.body.sky_cover.periods[0].percent,65);
    assert.ok(callUrls[0].startsWith("https://api.weather.gov/points/"));
    assert.equal(callUrls[1],"https://api.weather.gov/gridpoints/MQT/32,12");
    assert.match(res.headers["Cache-Control"],/s-maxage=600/);
  } finally {global.fetch=originalFetch;}
});

test("NWS failure or stale data returns unknown, never zero cloud cover", async () => {
  const originalFetch=global.fetch;
  try {
    global.fetch=async () => {throw new Error("connection failure");};
    const res=mockRes();
    await handler({method:"GET",query:{town:"sleeping-bear-dunes"}},res);
    assert.equal(res.code,200);
    assert.equal(res.body.available,false);
    assert.deepEqual(res.body.sky_cover.periods,[]);
    assert.match(res.body.note,/unknown|unavailable|stale/i);
    assert.equal(handler.freshNwsSky({updated_at:"2020-01-01T00:00:00Z",periods:[{percent:0}]},Date.now()),false);
  } finally {global.fetch=originalFetch;}
});

test("new aurora landings are meaningful linked pages, not misleading copied regional forecasts",()=>{
  const sitemap=read("public/sitemap.xml");
  const hub=read("public/northern-lights-michigan/index.html");
  const tools=read("public/tools/index.html");
  for (const {slug,region} of towns) {
    const page=read("public/northern-lights-michigan/"+slug+"/index.html");
    const url="https://chrisizworski.com/northern-lights-michigan/"+slug+"/";
    const title=page.match(/<title>([^<]+)<\/title>/)?.[1];
    const desc=page.match(/<meta name="description" content="([^"]*)"/)?.[1];
    assert.ok(title?.length<=60,title);
    assert.ok(desc?.length<=158,desc);
    assert.ok(page.length>12000,"distinct substantial location guidance");
    assert.ok(page.includes('<link rel="canonical" href="'+url+'">'));
    assert.ok(page.includes("const REGION="+JSON.stringify(region)));
    assert.ok(page.includes("TOWN="+JSON.stringify(slug)));
    assert.ok(page.includes("'/api/aurora-town-sky?town='"),"local separate weather source");
    assert.ok(page.includes("source_freshness?.ovation_fresh"),"refuse stale NOAA model output");
    assert.ok(page.includes("local.status==='fulfilled'&&local.value.available"),"unknown local sky when unavailable");
    assert.ok(page.includes("Unknown") || page.includes("unknown"));
    const matches=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(matches.length,1);
    const json=JSON.parse(matches[0][1]);
    assert.equal(json["@context"],"https://schema.org");
    const graph=json["@graph"];
    assert.equal(graph.find(x=>x["@type"]==="WebPage")?.url,url);
    const editorialDate=slug==="paradise-whitefish-point"?"2026-10-19":"2026-10-11"; // Added contextual ice-viewing handoff.
    assert.equal(graph.find(x=>x["@type"]==="WebPage")?.dateModified,editorialDate);
    assert.ok(graph.find(x=>x["@type"]==="BreadcrumbList"));
    const faqs=graph.find(x=>x["@type"]==="FAQPage")?.mainEntity||[];
    assert.ok(faqs.length>=3);
    for (const q of faqs) {
      assert.ok(page.includes("<summary"+ "") && page.includes(q.name.replaceAll("&","&amp;")),q.name);
      assert.ok(q.acceptedAnswer.text.length>45);
    }
    assert.ok(sitemap.includes("<loc>"+url+"</loc>\n    <lastmod>"+editorialDate+"</lastmod>"));
    const anchor='href="/northern-lights-michigan/'+slug+'/"';
    assert.ok(hub.includes(anchor));
    assert.ok(tools.includes(anchor));
    for(const sibling of ["mackinaw-city","munising","marquette","keweenaw"]) {
      assert.ok(read("public/northern-lights-michigan/"+sibling+"/index.html").includes(anchor),sibling+" links "+slug);
    }
  }
  for(const slug of ["mackinaw-city","munising","marquette","keweenaw"])
    assert.ok(sitemap.includes("<loc>https://chrisizworski.com/northern-lights-michigan/"+slug+"/</loc>"),slug+" should be indexed in sitemap");
});
