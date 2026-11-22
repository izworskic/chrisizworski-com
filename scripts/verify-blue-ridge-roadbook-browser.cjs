#!/usr/bin/env node
"use strict";
/* Deterministic browser QA: simulated road data and basemap, no live-access claims. */
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"../public");
const out=path.resolve(__dirname,"../artifacts/blue-ridge-roadbook");
fs.mkdirSync(out,{recursive:true});
const stops=[
 {id:"folk-art-center",name:"Folk Art Center",milepost:382,lat:35.5928,lon:-82.4817,dwellMinutes:35,elevationFt:2200,tags:["history"],practical:"See the Parkway craft traditions.",source:"https://www.nps.gov/blri/planyourvisit/folk-art-center.htm"},
 {id:"craggy-gardens",name:"Craggy Gardens",milepost:364,lat:35.7042,lon:-82.3737,dwellMinutes:45,elevationFt:5500,tags:["scenery","short-walk"],practical:"Take a short walk into the high country.",source:"https://www.nps.gov/blri/planyourvisit/craggy-gardens.htm"}
];
function fixture(url){
 const none=new URL(url,"http://localhost").searchParams.get("hours")==="2",chosen=none?[]:stops;
 return {ok:true,generatedAt:"2026-11-22T13:00:00Z",road:{ok:true,updatedLabel:"QA fixture only"},
  input:{gateway:"asheville",finish:"return",hours:none?2:4,start:"09:00",interests:["scenery","history","short-walk"]},
  gateway:{label:"Asheville",lat:35.564,lon:-82.544},
  selected:{id:"fixture-drive",name:"Asheville short drive",tripMode:"round-trip",direction:"northbound",mileTurn:364,
   durationHours:3.4,routeMiles:40,fit:"Fits time",character:"A short mountain drive.",
   editorial:{text:"A compact Parkway drive with selected stops."},why:["Time model fixture"],changeTriggers:["Check NPS"],
   viewOutlook:{label:"Unknown",detail:"Fixture"},blocks:[],cautions:[],stops:chosen,
   timeline:{start:"9:00 AM",returnBy:"12:25 PM",items:chosen.map((s,i)=>Object.assign({},s,{arrival:i?"11:10 AM":"9:25 AM"}))},
   directionsUrl:"https://www.google.com/maps/",mapsHandoff:{plannedStopCount:chosen.length,complete:true},
   weather:{ok:false},foliage:{active:false,label:"Inactive"}},
  alternatives:[],sources:[],truth:{},fieldNotes:[],parkwayGeoJsonUrl:"/missing-fixture.geojson"};
}
const mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"application/javascript",".json":"application/json"};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,"http://localhost");
 if(u.pathname==="/api/blue-ridge-parkway"){res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify(fixture(req.url)));return;}
 let rel=decodeURIComponent(u.pathname);if(rel.endsWith("/"))rel+="index.html";
 const file=path.resolve(root,"."+rel);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end("Not found");return;}
 res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);
});
function routes(page,failedMap=false){
 const moduleRoot=process.env.BLUE_RIDGE_QA_MODULES||"/tmp/blue-ridge-roadbook-qa/node_modules";
 const leaflet=path.join(moduleRoot,"leaflet/dist");
 page.route("**/unpkg.com/leaflet@1.9.4/dist/leaflet.js",route=>route.fulfill({contentType:"application/javascript",body:failedMap?"":fs.readFileSync(path.join(leaflet,"leaflet.js"))}));
 page.route("**/unpkg.com/leaflet@1.9.4/dist/leaflet.css",route=>route.fulfill({contentType:"text/css",body:fs.readFileSync(path.join(leaflet,"leaflet.css"))}));
 const tile=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGN89vY5AwMDEwMDAwMDAwAg4QK+zQo9MQAAAABJRU5ErkJggg==","base64");
 page.route(/^https:\/\/[abc]\.tile\.openstreetmap\.org\//,route=>route.fulfill({contentType:"image/png",body:tile}));
 page.route("**/www.nps.gov/**",route=>route.abort());
}
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port+"/blue-ridge-parkway/";
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:["--no-sandbox"]});
  const views=[];
  for(const width of [360,390,768,1280,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"}),errors=[];
   page.on("pageerror",error=>errors.push(error.message));routes(page);
   await page.goto(base,{waitUntil:"domcontentloaded"});
   await page.locator("#stopFocus h3").waitFor({timeout:25000});
   assert.equal(await page.locator(".route-step").count(),2);
   assert.equal(await page.locator("#stopFocus h3").innerText(),"Folk Art Center");
   await page.locator(".route-step").nth(1).click();
   assert.equal(await page.locator("#stopFocus h3").innerText(),"Craggy Gardens");
   await page.locator("#parkwayMap .number-pin").nth(1).click();
   assert.equal(await page.locator("#stopFocus h3").innerText(),"Folk Art Center","First map marker selects its own stop");
   await page.locator("#parkwayMap .number-pin").nth(2).click();
   assert.equal(await page.locator("#stopFocus h3").innerText(),"Craggy Gardens","Second map marker selects its own stop");
   await page.locator(".timeline-stop-action").first().click();
   assert.equal(await page.locator("#stopFocus h3").innerText(),"Folk Art Center");
   await page.locator("#selectedStopDetails .stop-map-action").nth(1).click();
   assert.equal(await page.locator("#stopFocus h3").innerText(),"Craggy Gardens");
   assert.equal(await page.locator('#stopFocus a[href^="https://www.google.com/maps/search/"]').count(),1);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,"Horizontal overflow at width "+width+": "+overflow);
   assert.deepEqual(errors,[],"Browser JS errors at width "+width);
   if(width===390||width===1280)await page.locator("#route-map").screenshot({path:path.join(out,"roadbook-"+width+".png"),animations:"disabled"});
   views.push({width,overflow,errors:errors.length});
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});routes(page,true);
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.locator("#parkwayMapFallback").waitFor({state:"visible",timeout:25000});
  assert.equal(await page.locator("#parkwayMap").isVisible(),false);
  await page.close();
  const blocked=await browser.newPage({viewport:{width:390,height:844}});routes(blocked);
  await blocked.route(/^https:\/\/[abc]\.tile\.openstreetmap\.org\//,route=>route.abort());
  await blocked.goto(base,{waitUntil:"domcontentloaded"});
  await blocked.locator("#parkwayMapFallback").waitFor({state:"visible",timeout:25000});
  assert.equal(await blocked.locator("#parkwayMap").isVisible(),false,"Blank basemap collapses");
  assert.equal(await blocked.locator("#stopFocus h3").innerText(),"Folk Art Center","Map failure preserves stop field note");
  await blocked.close();
  const noStops=await browser.newPage({viewport:{width:390,height:844}});routes(noStops);
  await noStops.goto(base+"?gateway=asheville&hours=2",{waitUntil:"domcontentloaded"});
  await noStops.locator("#stopFocus h3").waitFor({timeout:25000});
  assert.equal(await noStops.locator(".route-step").count(),0);
  assert.match(await noStops.locator("#stopFocus h3").innerText(),/No sightseeing stops/);
  await noStops.close();
  fs.writeFileSync(path.join(out,"acceptance.json"),JSON.stringify({kind:"controlled browser fixture",views,failedLeaflet:true,failedTiles:true,zeroStops:true},null,2));
  console.log("Blue Ridge roadbook browser QA PASS");
 }catch(error){console.error(error);process.exitCode=1;}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})();
