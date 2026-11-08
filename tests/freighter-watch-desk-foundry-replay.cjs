'use strict';
// Trusted, fixture-only Foundry replay. Runs unchanged against baseline and candidate source roots.
// No provider/network access; missing new source at baseline is a genuine unmet visitor capability.
const fs=require('node:fs');
const path=require('node:path');
const root=process.argv[process.argv.indexOf('--source-root')+1];
if(!root||!path.isAbsolute(root))throw Error('Source root required');
const html=fs.readFileSync(path.join(root,'public/great-lakes-ship-watching-spots/index.html'),'utf8');
const enginePath=path.join(root,'public/assets/freighter-watch-desk.js');
const installed=fs.existsSync(enginePath);
const engine=installed?require(enginePath):null;
const now=Date.parse('2026-11-08T15:00:00Z');
const iso=ms=>new Date(ms).toISOString();
const ship={
  mmsi:'366123456',name:'Fixture freighter',lat:46.52,lon:-84.39,
  seen:iso(now-4*60000),confidence:.82,speedKnots:8,
  window:{start:iso(now+20*60000),end:iso(now+70*60000)}
};
const report={
  ok:true,checkedAt:iso(now-45000),vessels:[],
  nextShip:{ok:true,pick:ship,candidates:[ship]}
};
const cases=[];
function item(id,passed,observed){cases.push({id,passed:Boolean(passed),observed});}
item('shore-selection',installed&&html.includes('id="fwd-place"')&&html.includes('id="fwd-when"'),
  installed?'Place and time selectors are present on the canonical shore guide.':'The original guide provides editorial links but has no source-aware place-and-time decision.');
if(installed){
  const result=engine.evaluate('soo',report,'now',now);
  item('source-window',result.status==='window'&&result.pick?.window?.start===ship.window.start&&result.observations.some(v=>v.mmsi===ship.mmsi),
    result.status==='window'?'The chosen fresh Soo candidate retains its original window and is visible in the evidence list.':'No complete source-matched Soo window and map vessel were returned.');
  const generic=engine.evaluate('port',{ok:true,checkedAt:iso(now-45000),vessels:[{...ship,lat:42.98,lon:-82.42}]} ,'today',now);
  item('no-invented-eta',generic.status==='observed'&&!generic.pick,
    generic.status==='observed'?'Port Huron reports remain observations without a manufactured ETA.':'The Port Huron observation-only boundary was not preserved.');
  const stale=engine.evaluate('soo',{...report,checkedAt:iso(now-10*60000)},'today',now);
  const future=engine.evaluate('soo',report,'tomorrow',now);
  item('uncertain-state',stale.status==='unavailable'&&!stale.pick&&future.status==='unknown'&&!future.pick,
    stale.status==='unavailable'&&future.status==='unknown'?'Stale provider evidence and tomorrow both fail closed with distinct unknown states.':'Stale or next-day evidence was promoted into a current recommendation.');
}else{
  item('source-window',false,'The baseline does not interpret specialist passage candidates on this shore guide.');
  item('no-invented-eta',false,'The baseline offers no chosen-area source state that separates observations from arrivals.');
  item('uncertain-state',false,'The baseline does not vary a live source decision by freshness and chosen day.');
}
item('canonical-guide',html.includes('rel="canonical" href="https://chrisizworski.com/great-lakes-ship-watching-spots/"')&&
  html.includes('Frequently asked questions')&&html.includes('Visitor sources')&&html.includes('winter layup'),
  'The canonical shore guide, visitor source citations, FAQ and winter context remain discoverable.');
item('creator-identity',html.includes('https://chrisizworski.com/#person')&&html.includes('Built by <a href="https://chrisizworski.com/chris-izworski/"'),
  'The existing canonical Person identity and visible author credit remain intact.');
process.stdout.write(JSON.stringify({cases}));
