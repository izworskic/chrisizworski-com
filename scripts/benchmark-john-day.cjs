#!/usr/bin/env node
'use strict';
// Structural proxy, not an empirical usability score. Hard truth failures veto.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const h=read('public/john-day-lock/index.html'),j=read('public/assets/john-day-lock.js'),c=read('public/assets/john-day-lock.css');
const r=read('lib/john-day-rules.js'),w=read('lib/john-day-water.js'),a=read('api/john-day-water.js');
const checks={
 decision:[
  ['four user missions', ['watch','boat','how','river'].every(m=>h.includes('id="tab-'+m+'"')&&h.includes('id="panel-'+m+'"'))],
  ['current-status truth',h.includes('Not independently verified here')&&h.includes('No fabricated AIS approach time')],
  ['operator action visible',h.includes('541-739-1050')&&h.includes('channel 14')],
  ['authoritative notice link',h.includes('notices/navigation-notices')],
  ['source-backed historical sample',h.includes('July 10, 2026')],
 ],
 safety:[
  ['rules never claim clearance',r.includes("navigationClearance:false")],
  ['strict date validation',r.includes('function validDate')],
  ['2026 summer and 2026-27 winter boundaries',r.includes('2026-05-15')&&r.includes('2027-05-14')],
  ['published time directions isolated',r.includes("downstream:['9:30 AM'")],
  ['nonmotorized assist warning',r.includes("result.kind='assist-required'")],
  ['no official open status without feed',r.includes("liveStatus:'unknown'")],
 ],
 water:[
  ['bounds and numeric validation',w.includes('outflow>1500')&&w.includes('spill>1500')],
  ['missing observations are discarded',w.includes('if(vals.some(x=>x===null))continue')],
  ['unrecognized report fails closed',w.includes("throw Error('no recognized hourly observations')")],
  ['HTTP outage explicit',a.includes("state:'unavailable'")],
  ['local observation date',w.includes("America/Los_Angeles")],
  ['chart historical truth',h.includes('not the current river state')&&j.includes('Historical example')],
 ],
 comprehension:[
  ['one-tap mode changes',j.includes("t.addEventListener('click',()=>activate(t.dataset.mode))")],
  ['interactive lock levels',j.includes('move(95)')&&j.includes('move(10)')],
  ['interpretive chapters',h.includes('Salmon moving against the current')&&h.includes('A changed landscape')],
  ['source ledger',h.includes('Sources, evidence and limitations')],
  ['flow chart values and units',h.includes('thousand cubic feet/sec')&&h.includes('Forebay')],
 ],
 inclusiveness:[
  ['keyboard tabs',j.includes('ArrowLeft')&&j.includes('ArrowRight')],
  ['reduced motion',c.includes('prefers-reduced-motion')],
  ['mobile layout',c.includes('@media(max-width:390px)')],
  ['semantic labelled diagram',h.includes('aria-label="Schematic cross-section')],
  ['content and outbound sources without JS',h.includes('Current navigation notices')&&h.includes('Columbia DART')],
 ]
};
const weights={decision:.25,safety:.30,water:.20,comprehension:.15,inclusiveness:.10};
const scores=Object.fromEntries(Object.entries(checks).map(([key,items])=>[key,items.filter(x=>x[1]).length/items.length]));
const raw=Math.round(100*Object.keys(weights).reduce((sum,k)=>sum+weights[k]*scores[k],0));
const veto={
 unsafeClearance:checks.safety[0][1]&&checks.safety[5][1],
 unverifiedStatus:checks.decision[1][1],
 waterFailClosed:checks.water[2][1]&&checks.water[3][1],
 provenance:h.includes('Benjamin Rogers / USACE')&&h.includes('dvidshub.net/image/7361754'),
 sourceAttribution:h.includes('215019')
};
const score=Object.values(veto).every(Boolean)?raw:Math.min(raw,49);
const failures=Object.entries(checks).flatMap(([group,items])=>items.filter(([,pass])=>!pass).map(([name])=>group+': '+name));
console.log(JSON.stringify({type:'structural-code-proxy',score,weights,dimensionScores:scores,veto,failures},null,2));
if(score<90||failures.length||Object.values(veto).some(v=>!v))process.exitCode=1;
