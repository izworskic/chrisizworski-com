"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("ten Blue Ridge Parkway pages preserve search identity and give place-specific interpretation",()=>{
  const slugs=["","closures","weather","best-stops","itinerary","map","asheville","boone","roanoke","cherokee"];
  const distinct=["cloud-wrapped ridges","Parkway gate","cloud","carriage road","mountain","mileposts","rhododendron","carriage roads","Sharp Top","Richland Balsam"];
  slugs.forEach((slug,i)=>{
    const html=read("public/blue-ridge-parkway/"+(slug?slug+"/":"")+"index.html");
    assert.match(html,/"dateModified":"2026-11-22"/,slug||"main");
    assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/blue-ridge-parkway\//,slug||"main");
    assert.ok(html.toLowerCase().includes(distinct[i].toLowerCase()),slug+" lacks grounded landscape text");
    assert.doesNotMatch(html,/breathtaking vistas|hidden gems|unforgettable journey|something for everyone/i,slug);
  });
});
test("stop catalog still exposes all route geometry and usable interpretive field notes",()=>{
 const {STOPS,ROUTES}=require("../lib/blue-ridge-parkway/catalog.js");
 assert.equal(Object.keys(STOPS).length,28);
 assert.equal(ROUTES.length,16);
 for(const [id,stop] of Object.entries(STOPS)){
   assert.ok(stop.practical.length>=100 && stop.practical.length<600,id+": field note missing or too long");
   assert.ok(Number.isFinite(stop.lat)&&Number.isFinite(stop.lon),id+": location missing");
   assert.doesNotMatch(stop.practical,/breathtaking|hidden gem|unforgettable journey/i,id);
 }
 for(const route of ROUTES)assert.ok(route.character.length>55,route.id+": route character too thin");
});
test("visitor story cannot replace official access and weather evidence",()=>{
 const html=read("public/blue-ridge-parkway/index.html"),js=read("public/assets/blue-ridge-parkway.js");
 assert.match(html,/Official NPS road status/);
 assert.match(js,/Google Maps place search is for orientation, not verified parking or driving directions/);
 assert.match(js,/NPS road table unavailable/);
 const script=read("scripts/add-yosemite-firefall-to-sitemap.mjs");
 const section=script.slice(script.indexOf("// Blue Ridge Parkway"),script.indexOf("fs.writeFileSync(file, xml);"));
 assert.doesNotMatch(section,/2026-09-25/);
});
