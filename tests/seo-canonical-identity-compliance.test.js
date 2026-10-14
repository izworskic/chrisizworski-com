"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const ROOT=path.join(__dirname,"..");
const SITE="https://chrisizworski.com";
const PROFILE=SITE+"/chris-izworski/";
const PERSON=SITE+"/#person";
const paths=[
 "northern-lights-michigan","great-lakes-freighter-tracking","mackinac-bridge-live",
 "michigan-border-wait-times","great-lakes-ship-watching-spots",
 "mackinac-bridge-crossing-planner","mackinac-bridge-tolls","soo-locks",
 "soo-locks/plan-your-visit","tools","northern-lights-michigan/keweenaw",
 "northern-lights-michigan/mackinaw-city","northern-lights-michigan/marquette",
 "northern-lights-michigan/munising",
 "northern-lights-michigan/paradise-whitefish-point",
 "northern-lights-michigan/sleeping-bear-dunes"
];
const read=p=>readFileSync(path.join(ROOT,p),"utf8");
const all=Object.fromEntries(paths.map(p=>[p,read("public/"+p+"/index.html")]));
const sitemap=read("public/sitemap.xml");
const cap=(html,re)=>html.match(re)?.[1]||"";
const authored=new Set(["WebPage","CollectionPage","Article","NewsArticle","BlogPosting","WebApplication","SoftwareApplication"]);
for(const slug of paths){
 test("canonical identity compliance: "+slug,()=>{
  const html=all[slug],url=SITE+"/"+slug+"/";
  const title=cap(html,/<title[^>]*>([\s\S]*?)<\/title>/i);
  const heading=cap(html,/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]*>/g,"");
  assert.ok(title.length>20&&heading.trim().length>12,"retain a substantive query-led title and heading");
  assert.equal(cap(html,/<link rel="canonical" href="([^"]+)"/i),url);
  assert.match(html,/Built by\s*<a href="https:\/\/chrisizworski\.com\/chris-izworski\/">Chris Izworski<\/a>/,"visible linked creator credit");
  for(const [type,key] of [["property","og:title"],["property","og:description"],["property","og:url"],["property","og:site_name"],["name","twitter:card"],["name","twitter:title"],["name","twitter:description"]]){
   assert.ok(html.includes(type+'="'+key+'"'),"missing "+key);
  }
  assert.match(html,/property="og:site_name" content="Chris Izworski"/);
  assert.match(html,new RegExp('<meta property="og:url" content="'+url.replaceAll(".","\\.")+'"'));
  const schemas=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>JSON.parse(m[1]));
  assert.ok(schemas.length>0,"schema required");
  const nodes=schemas.flatMap(x=>x["@graph"]||[x]);
  const people=nodes.filter(x=>x["@type"]==="Person");
  assert.equal(people.length,1,"exactly one canonical Person node");
  assert.deepEqual({id:people[0]["@id"],name:people[0].name,url:people[0].url},{id:PERSON,name:"Chris Izworski",url:SITE+"/"});
  for(const n of nodes){
   const types=Array.isArray(n["@type"])?n["@type"]:[n["@type"]];
   if(types.includes("WebSite")){assert.equal(n["@id"],SITE+"/#website");assert.equal(n.publisher?.["@id"],PERSON);}
   if(types.some(t=>authored.has(t))){
    assert.equal(n.author?.["@id"],PERSON,(n["@type"]||"entity")+" author");
    assert.equal(n.publisher?.["@id"],PERSON,(n["@type"]||"entity")+" publisher");
    if(types.some(t=>["WebApplication","SoftwareApplication"].includes(t)))assert.equal(n.creator?.["@id"],PERSON);
   }
  }
  assert.ok(!/\bChris\s+(?:Hisworski|Izworsky|Izworksi)\b/i.test(html),"no identity variants");
  const editorialLastmod=["mackinac-bridge-tolls","mackinac-bridge-live","soo-locks"].includes(slug)?"2026-10-14":(slug==="tools"?"2026-10-14":(slug==="northern-lights-michigan/munising"?"2026-10-13":(["northern-lights-michigan","great-lakes-freighter-tracking"].includes(slug)?"2026-10-12":"2026-10-11")));
  assert.ok(sitemap.includes("<loc>"+url+"</loc>\n    <lastmod>"+editorialLastmod+"</lastmod>"),"sitemap matches truthful editorial date");
  const inward=paths.filter(s=>s!==slug&&all[s].includes('href="/'+slug+'/"'));
  const outward=[...html.matchAll(/<a\b[^>]*href="(\/[^"]+)"/g)].map(x=>x[1]);
  assert.ok(inward.length>0,"linked from tool network");
  assert.ok(outward.length>0,"links out to complementary tools");
 });
}
const newPages=["great-lakes-ship-watching-spots","mackinac-bridge-crossing-planner","soo-locks/plan-your-visit","northern-lights-michigan/paradise-whitefish-point","northern-lights-michigan/sleeping-bear-dunes"];
for(const slug of newPages){
 test("new pages discoverable from tools hub and two sibling pages: "+slug,()=>{
  const anchor='href="/'+slug+'/"';
  assert.ok(all.tools.includes(anchor),"/tools/ discovery required");
  const siblings=paths.filter(p=>p!=="tools"&&p!==slug&&all[p].includes(anchor));
  assert.ok(siblings.length>=2,"must have at least 2 sibling inbound links: "+siblings.join(", "));
 });
}
