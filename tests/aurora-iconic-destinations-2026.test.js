"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const routes=JSON.parse(fs.readFileSync("vercel.json","utf8")).rewrites;
const sitemap=fs.readFileSync("public/sitemap-aurora-states.xml","utf8");
const intended={
  "montana": [
    "bozeman-hyalite",
    "missoula",
    "fort-peck-lake",
    "flathead-lake"
  ],
  "minnesota": [
    "split-rock-lighthouse",
    "itasca-state-park",
    "grand-portage",
    "lutsen"
  ],
  "north-dakota": [
    "theodore-roosevelt-national-park",
    "international-peace-garden",
    "devils-lake",
    "lake-metigoshe-state-park",
    "pembina-gorge"
  ],
  "maine": [
    "katahdin-woods-and-waters",
    "amc-maine-woods-dark-sky-park",
    "rangeley-lakes",
    "allagash-wilderness-waterway",
    "moosehead-lake"
  ],
  "alaska": [
    "talkeetna",
    "chena-hot-springs",
    "coldfoot-wiseman",
    "nome",
    "juneau"
  ]
};
const paths=Object.entries(intended).flatMap(([state,slugs])=>slugs.map(slug=>({state,slug,base:"/national-tools/aurora/"+state+"/"+slug})));
test("23 researched aurora landmark and city pages are routed to their owner project",()=>{
 assert.equal(paths.length,23);
 const declared=new Map();
 for(const route of routes.filter(r=>paths.some(p=>r.source===p.base||r.source===p.base+"/"))){
  assert.ok(!declared.has(route.source),"Duplicate rewrite "+route.source);
  declared.set(route.source,route.destination);
 }
 for(const p of paths){
  const destination="https://"+p.state+"-aurora-live.vercel.app/"+p.slug+"/index.html";
  assert.equal(declared.get(p.base),destination,"missing no-slash route: "+p.base);
  assert.equal(declared.get(p.base+"/"),destination,"missing trailing-slash route: "+p.base);
 }
});
test("the public aurora sitemap indexes only canonical, distinct destination URLs",()=>{
 const matches=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.equal(new Set(matches).size,matches.length);
 for(const p of paths){
  const url="https://chrisizworski.com"+p.base+"/";
  assert.ok(matches.includes(url),url+" missing in aurora sitemap");
  assert.ok(sitemap.includes("<loc>"+url+"</loc><lastmod>2026-10-13</lastmod>"),"fresh sitemap lastmod required "+url);
 }
 for(const state of Object.keys(intended)){
  assert.ok(routes.some(r=>r.source==="/national-tools/aurora/"+state+"/"),"existing state hub must remain routed: "+state);
 }
});
