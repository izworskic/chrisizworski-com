"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
const parse=p=>{const s=read(p),m=s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);assert.ok(m,p+" must have JSON-LD");return {html:s,graph:JSON.parse(m[1])["@graph"]}};
const url="https://chrisizworski.com/lake-effect-snow/";
test("Michigan Tools has one canonical, actionable radar-rich lake-effect listing",()=>{
 const {html,graph}=parse("public/tools/index.html");
 assert.equal((html.match(/data-tool-id="lake-effect-snow"/g)||[]).length,1);
 const card=html.slice(html.indexOf('data-tool-id="lake-effect-snow"'),html.indexOf('data-tool-id="michigan-snow-totals"'));
 for(const term of ["NOAA","radar","72-hour","NWS","/lake-effect-snow/"])assert.ok(card.includes(term),"Missing "+term);
 const items=graph.find(x=>x["@id"]==="https://chrisizworski.com/tools/#toollist").itemListElement;
 assert.equal(items.filter(x=>x.item?.url===url).length,1);
 assert.match(items.find(x=>x.item?.url===url).item.description,/live NWS radar playback/);
 assert.equal(graph.find(x=>x["@id"]==="https://chrisizworski.com/tools/").dateModified,"2026-10-24");
});
test("U.S. Outdoor Tools contains a discoverable Northeast Great Lakes radar card and ItemList",()=>{
 const {html,graph}=parse("public/synced-national-tools/index.html");
 assert.equal((html.match(/data-search-card data-tool-id="lake-effect-snow"/g)||[]).length,1);
 const region=html.slice(html.indexOf('id="region-northeast-great-lakes"'),html.indexOf('id="region-appalachia-ohio-valley"'));
 assert.match(region,/data-search-card data-tool-id="lake-effect-snow"/);
 assert.match(region,/NOAA MRMS radar/);
 assert.match(region,/href="\/lake-effect-snow\/"/);
 const items=graph.find(x=>x["@id"]==="https://chrisizworski.com/national-tools/#toollist");
 assert.equal(items.itemListElement.filter(x=>x.url===url).length,1);
 assert.equal(items.numberOfItems,items.itemListElement.length);
 assert.deepEqual(items.itemListElement.map(x=>x.position),items.itemListElement.map((_,i)=>i+1));
 const cards=(html.match(/data-search-card/g)||[]).length;
 assert.equal(cards,items.numberOfItems);
 assert.match(html,new RegExp('id="finder-count" aria-live="polite">'+cards+' tools shown'));
 assert.equal(graph.find(x=>x["@id"]==="https://chrisizworski.com/national-tools/#page").dateModified,"2026-10-24");
});
test("Northeast Great Lakes desk links the live tool, without duplicate schema entities",()=>{
 const {html,graph}=parse("public/synced-national-tools/northeast-great-lakes/index.html");
 assert.equal((html.match(/data-tool-id="lake-effect-snow"/g)||[]).length,1);
 assert.match(html,/NOAA MRMS radar/);
 assert.match(html,/href="\/lake-effect-snow\/"/);
 const list=graph.find(x=>x["@id"]==="https://chrisizworski.com/national-tools/northeast-great-lakes/#tools");
 assert.equal(list.itemListElement.filter(x=>x.url===url).length,1);
 assert.deepEqual(list.itemListElement.map(x=>x.position),list.itemListElement.map((_,i)=>i+1));
});
test("Sitemap freshness and canonical lake-effect URL stay unchanged",()=>{
 const map=read("public/sitemap.xml"),shell=read("public/lake-effect-snow/index.html");
 for(const section of ["/tools/","/national-tools/"]){
  assert.match(map,new RegExp("https://chrisizworski.com"+section.replace(/\//g,"\\/")+"<\\/loc>\\s*<lastmod>2026-10-24<\\/lastmod>"));
 }
 assert.match(shell,/<link rel="canonical" href="https:\/\/chrisizworski.com\/lake-effect-snow\/"/);
});
