import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const data=JSON.parse(read("public/porcupine-mountains/experience-options.json"));
const parking=JSON.parse(read("public/porcupine-mountains/access-points.json")).points;
const trail=JSON.parse(read("public/porcupine-mountains/trail-reference-catalog.json")).entries;
const html=read("public/porcupine-mountains/index.html");
const css=read("public/assets/porkies-explorer.css");
const code=read("public/assets/porkies-experience-compare.js");
const mapCode=read("public/assets/porkies-access-map.js");
const {summary,comparison}=require("../public/assets/porkies-experience-compare.js");
const {seasonFor}=require("../public/assets/porkies-explorer.js");
const byId=id=>data.options.find(x=>x.id===id);
const ctx=(date="2026-10-31",other={})=>({date,arrival:"east",vehicle:"car",ability:"moderate",hours:4,...other});

test("all six choices identify a DNR-mapped parking asset and cited walking evidence",()=>{
 assert.equal(data.policy.accessVerified,false);
 assert.equal(data.policy.trailRouteCertified,false);
 assert.equal(data.options.length,6);
 assert.equal(new Set(data.options.map(o=>o.id)).size,6);
 for(const o of data.options){
  const pin=parking.find(p=>p.id===o.parkingId);
  assert.ok(pin,"parking reference missing: "+o.id);
  assert.equal(o.parkingAssetId,pin.parkingAssetId,"wrong parking asset for "+o.id);
  assert.equal(pin.status,"dnr-mapped-crosschecked-not-current");
  assert.ok(o.source.startsWith("https://www.michigan.gov/"),o.id);
  assert.ok(o.experience&&o.limits&&o.publishedDistance&&o.accessSurface);
  if(o.trailId)assert.equal(trail.find(t=>t.id===o.trailId)?.parkingId,o.parkingId,"trail-point identity drift: "+o.id);
  if(o.photo) {
   assert.ok(o.photo.alt&&o.photo.credit&&o.photo.creditUrl);
   if(["clouds","summit","river","escarpment"].includes(o.id))
    assert.ok(html.includes(o.photo.src), "initially used photo should already be rights-reviewed: "+o.id);
   if(["nature","winter"].includes(o.id)){
    assert.ok(o.photo.licenseUrl&&o.photo.creditUrl&&o.photo.capturedYear);
    assert.match(o.photoAbout,/NOT/);
    assert.match(o.photo.scope,/not-exact-trail|not-current-facility/);
   }
  }
 }
 assert.equal(byId("clouds").parkingAssetId,1409);
 assert.equal(byId("river").parkingAssetId,841);
 assert.equal(byId("escarpment").parkingId,"lake");
 assert.match(byId("escarpment").publishedDistance,/4\.3/);
 assert.match(byId("escarpment").publishedDistance,/3\.7/);
 assert.match(byId("river").limits,/NOT matched|not matched/i);
});

test("winter and May do not certify scenic roads",()=>{
 for(const date of ["2027-01-15","2027-05-15"])
  for(const id of ["clouds","summit","escarpment"]){
   const x=summary(byId(id),ctx(date),seasonFor);
   assert.equal(x.key,"limited");
   assert.equal(x.roadOpenVerified,false);
   assert.equal(x.routeCertified,false);
   assert.match(x.reasons.join(" "),/seasonally restricted/);
   if(id==="escarpment")assert.match(x.heading,/Poor fit for a short outing/);
   else assert.match(x.heading,/unverified/);
  }
 const winter=summary(byId("winter"),ctx("2027-01-15"),seasonFor);
 assert.match(winter.reasons.join(" "),/same-day snow/);
 assert.equal(winter.parkingOpenVerified,false);
});

test("date, large vehicle, arrival, short-hike comfort change decision text rather than CSS only",()=>{
 const lack=summary(byId("clouds"),ctx("2026-11-31"),seasonFor);
 assert.equal(lack.key,"unknown");
 const big=summary(byId("summit"),ctx("2027-08-12",{vehicle:"trailer"}),seasonFor);
 assert.match(big.reasons.join(" "),/staging area/);
 const region=summary(byId("river"),ctx("2027-08-12",{arrival:"east"}),seasonFor);
 assert.match(region.reasons.join(" "),/separate park district/);
 assert.match(region.reasons.join(" "),/work-zone reopening/);
 const es=summary(byId("escarpment"),ctx("2027-08-12",{hours:2,ability:"low"}),seasonFor);
 assert.equal(es.key,"limited");
 assert.match(es.reasons.join(" "),/short approach/);
 assert.match(es.reasons.join(" "),/not a quick scenic stop/);
 const peak=summary(byId("summit"),ctx("2027-08-12",{ability:"low"}),seasonFor);
 assert.match(peak.reasons.join(" "),/tower requires stairs/);
 const falls=summary(byId("river"),ctx("2027-08-12",{ability:"low",arrival:"west"}),seasonFor);
 assert.match(falls.reasons.join(" "),/Nawadaha/);
});

test("visitor center seasonal building schedule does not become a false outdoor trail closure",()=>{
 const closed=summary(byId("nature"),ctx("2027-01-15"),seasonFor);
 assert.match(closed.reasons.join(" "),/building is seasonally closed/);
 assert.match(closed.reasons.join(" "),/Outdoor trail access is a separate unknown/);
 const summer=summary(byId("nature"),ctx("2027-08-15"),seasonFor);
 assert.doesNotMatch(summer.reasons.join(" "),/building is seasonally closed/);
 assert.equal(summer.roadOpenVerified,false);
});

test("outings stay two distinct parking pins, never a route-time estimate",()=>{
 assert.match(comparison(byId("summit"),byId("river"),ctx()),/Different park districts/);
 assert.match(comparison(byId("clouds"),byId("escarpment"),ctx()),/same DNR-mapped parking/);
 assert.match(comparison(byId("clouds"),byId("clouds"),ctx()),/Choose two different/);
 assert.match(comparison(byId("clouds"),byId("summit"),ctx()),/Different park districts/);
 assert.match(mapCode,/porkies:compare-parking/);
 assert.match(mapCode,/NOT a continuous route/);
 assert.doesNotMatch(code,/Google\.Maps\.Directions|drivingDistance|routeCalculation|walkingTimeMinutes/);
});

test("page provides linked truthful comparison even with JavaScript disabled",()=>{
 assert.match(html,/id="experience-compare"/);
 assert.match(html,/id="experience-choice-a"/);
 assert.match(html,/id="experience-choice-b"/);
 assert.match(html,/id="experience-a"/);
 assert.match(html,/id="experience-b"/);
 assert.match(html,/Lake of the Clouds overlook/);
 assert.match(html,/Summit Peak tower/);
 assert.match(html,/DNR has not verified a same-day driving connection/);
 assert.match(html,/porkies-experience-compare\.js/);
 assert.match(html,/noindex,follow/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/grid-template-columns:1fr/);
 assert.doesNotMatch(html,/parking available now|all roads open|bridge certified safe/i);
});


test("ranger notes deepen the real choice without inventing new access evidence",()=>{
  const expectedIds=["clouds","summit","river","nature","escarpment","winter"];
  assert.deepEqual(data.options.map(o=>o.id),expectedIds);
  for(const option of data.options){
    assert.ok(typeof option.fieldNote==="string"&&option.fieldNote.trim().split(/\s+/).length>=46,"Substantial, source-backed note missing: "+option.id);
    assert.ok(option.fieldNote.trim().split(/\s+/).length<=110,"Selection note is too long: "+option.id);
    assert.match(option.fieldNoteSource,/^https:\/\/www\.michigan\.gov\//,"DNR evidence required for "+option.id);
    assert.doesNotMatch(option.fieldNote,/currently open|safe crossing|available parking|guaranteed sighting/i,option.id);
    assert.ok(option.source&&option.limits&&option.publishedDistance,"Existing decision contract changed for "+option.id);
  }
  assert.match(code,/experience-fieldnote/);
  assert.match(code,/option\.fieldNoteSource/);
  assert.match(code,/elt\(doc,"details","experience-fieldnote"\)/);
  assert.match(code,/elt\(doc,"summary","experience-fieldnote-trigger"/);
  assert.equal((html.match(/class="journal-entry"/g)||[]).length,4);
  assert.equal((html.match(/class="experience-fieldnote"/g)||[]).length,2,"No-JS lake and summit reference notes required");
  for(const p of ["id="+'"'+"read-landscape"+'"',"The ancient ridge","The living forest","The western river","The wilderness decision"]){
    assert.ok(html.includes(p),"Interpretive journal missing "+p);
  }
  for(const url of ["https://www.michigan.gov/dnr/places/natural-areas/porcupine-mountains","https://www.michigan.gov/dnr/places/natural-areas/presque-isle-river-scenic-site"]){
    assert.ok(html.includes(url),"Primary landscape evidence missing: "+url);
  }
  assert.match(html,/name="robots" content="noindex,follow"/);
  assert.match(css,/\.porkies-journal/);
  assert.match(css,/\.experience-fieldnote/);
  assert.match(css,/@media\(max-width:600px\)/);
});
