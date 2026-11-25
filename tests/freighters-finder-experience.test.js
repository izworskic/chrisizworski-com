import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const html=readFileSync("public/freighters/index.html","utf8");
const script=readFileSync("public/assets/freighters-hub.js","utf8");
function run(source=script, mapReady=true) {
  const nodes={};
  const node=id=>nodes[id]??= {value:"",textContent:"",firstChild:{textContent:""},href:"",hidden:true,handlers:{},addEventListener(name,fn){(this.handlers[name]??=[]).push(fn)},fire(name,event={}){for(const fn of this.handlers[name]??[])fn(event)},classList:{contains:()=>mapReady},scrollIntoView(){this.scrolled=true}};
  const radio=node("radio");radio.value="track";node("corridor").value="soo";
  const tab=node("tab");tab.click=()=>{tab.clicked=true};
  vm.runInNewContext(source,{document:{getElementById:node,querySelector:s=>s.includes("intent")?radio:tab,querySelectorAll:()=>[radio]},window:{L:mapReady?{}:undefined}});
  return {node,radio,tab,find(q){node("finder-query").value=q;node("finder-search-go").fire("click")},choose(id){node("corridor").value=id;node("corridor").fire("change")}};
}
test("all four specialist corridors are reachable directly without fictitious tracker hashes",()=>{
  for(const [id,url,place] of [["calumet","/calumet-freighter-watch/","95th Street"],["cuyahoga","/cuyahoga-freighter-watch/","Scranton Flats"],["welland","/welland-canal/","Lock 3"],["seaway","/st-lawrence-seaway/","Eisenhower Lock"]]){
    const h=run();assert.ok(html.includes('option value="'+id+'"'));h.choose(id);
    assert.equal(h.node("finder-go").href,url);
    let prevented=false;h.node("finder-go").fire("click",{preventDefault(){prevented=true}});
    assert.equal(prevented,false);assert.equal(h.tab.clicked,undefined);
    h.radio.value="shore";h.radio.fire("change");assert.ok(h.node("finder-reason").textContent.includes(place));assert.equal(h.node("finder-go").href,url);
  }
});
test("place search, ambiguity, unknown and reversal never guess a corridor",()=>{
  const h=run();h.find("ships near 95th Street");assert.equal(h.node("corridor").value,"calumet");
  h.find("Cleveland");assert.equal(h.node("corridor").value,"cuyahoga");
  h.find("Cleveland and Chicago");assert.equal(h.node("corridor").value,"cuyahoga");assert.match(h.node("finder-search-status").textContent,/More than one/);
  h.find("Atlantic Ocean");assert.equal(h.node("corridor").value,"cuyahoga");assert.match(h.node("finder-search-status").textContent,/No matching/);
  h.node("finder-query").value="Lock 3";h.node("finder-query").fire("keydown",{key:"Enter",preventDefault(){}});assert.equal(h.node("corridor").value,"welland");
  h.choose("soo");assert.equal(h.node("finder-query").value,"");assert.equal(h.node("finder-go").href,"/great-lakes-freighter-tracking/#soo");
  h.find("Chicago");assert.equal(h.node("corridor").value,"calumet");
});
test("existing map click and no-map fallback are preserved",()=>{
  for(const ready of [true,false]){
    const h=run(script,ready);h.choose("duluth");let prevented=false;h.node("finder-go").fire("click",{preventDefault(){prevented=true}});
    assert.equal(prevented,ready);assert.equal(!!h.tab.clicked,ready);assert.equal(h.node("finder-go").href,"/great-lakes-freighter-tracking/#duluth");
    h.radio.value="news";h.radio.fire("change");assert.equal(h.node("finder-go").href,"https://gazette.chrisizworski.com/");
  }
});

test("every corridor retains a static named Google Maps search and never routes to a vessel",()=>{
 const cards=[...html.matchAll(/<article class="corridor-card">([\s\S]*?)<\/article>/g)];assert.equal(cards.length,10);
 const {placeSearch}=require('../public/assets/visitor-map-links.js');
 for(const [,card] of cards){const links=[...card.matchAll(/class="corridor-maps" href="([^"]+)"/g)];assert.ok(links.length>=1);for(const [,href] of links){const url=new URL(href.replaceAll('&amp;','&'));assert.equal(url.pathname,'/maps/search/');assert.equal(url.href,placeSearch({role:'public-place',query:url.searchParams.get('query')}));assert.ok(!/^[-\d., ]+$/.test(url.searchParams.get('query')));}}
});
