#!/usr/bin/env node
// Build a crawlable car toll answer from the same engine used by /api/nyc-crossing.
// Re-run after a verified agency rate change; do not hand-edit the generated rows.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {CROSSINGS,chargeFor}=require('../lib/nyc-crossing/engine.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'public/nyc-crossing/index.html');
const renderNycRates = function renderNycRates(CROSSINGS,chargeFor){
 const money=c=>c===0?'No toll':'$'+(c/100).toFixed(2);
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const quote=(c,payment,time)=>chargeFor(c,{payment,travelAt:time,vehicle:{type:'car'},destinationZone:false}).toll;
 const pa=CROSSINGS.find(c=>c.id==='gwb'),rfk=CROSSINGS.find(c=>c.id==='rfk');
 const rows=CROSSINGS.map(c=>`<tr><th scope="row">${esc(c.name)}</th><td>${money(quote(c,'ny-ezpass','2026-11-02T12:00'))}</td><td>${money(quote(c,'ny-ezpass','2026-11-02T08:00'))}</td><td>${money(quote(c,'mail','2026-11-02T08:00'))}</td><td>${esc(c.agency)}</td></tr>`).join('\n');
 return `<section class="panel" id="nyc-toll-rates" aria-labelledby="nyc-toll-rates-heading">
<p class="eyebrow">Published toll rates · reviewed November 7, 2026</p>
<h2 id="nyc-toll-rates-heading">2026 NYC bridge and tunnel tolls for cars</h2>
<p>For a qualifying E-ZPass car, the Port Authority's New York-bound toll is <strong>${money(quote(pa,'ny-ezpass','2026-11-02T12:00'))} off-peak</strong> or <strong>${money(quote(pa,'ny-ezpass','2026-11-02T08:00'))} peak</strong>. The MTA crossings covered here charge <strong>${money(quote(rfk,'ny-ezpass','2026-11-02T08:00'))}</strong> for a qualifying car, and four East River bridges have no bridge toll. <strong>Manhattan congestion pricing is a separate charge</strong> where applicable.</p>
<details><summary>Compare all ${CROSSINGS.length} bridges and tunnels by car toll</summary>
<div class="table-wrap"><table class="routes static-toll-rates"><caption>Base crossing toll only. Two-axle passenger cars, before congestion pricing, discounts, or qualifying credits.</caption>
<thead><tr><th scope="col">Bridge or tunnel</th><th scope="col">E-ZPass off-peak</th><th scope="col">E-ZPass peak</th><th scope="col">Tolls by Mail</th><th scope="col">Operator</th></tr></thead>
<tbody>${rows}</tbody></table></div></details>
<p class="detail">Port Authority E-ZPass peak hours: weekdays 6–10 a.m. and 4–8 p.m.; weekends 11 a.m.–9 p.m. The MTA crossings listed have the same base car rate throughout the day. Port Authority tolls are collected only toward New York; MTA collection directions vary by facility. A qualifying NYCSC E-ZPass tag is assumed at MTA crossings; Port Authority discounts require a qualifying NY/NJ account. Mid-tier, resident, commercial, multi-axle, and special-plan rates are not included in this table.</p>
<p class="detail">Authority references: <a href="https://www.mta.info/fares-tolls/tolls/vehicle-types" target="_blank" rel="noopener">MTA car tolls (effective January 4, 2026)</a> · <a href="https://www.panynj.gov/bridges-tunnels/en/tolls.html" target="_blank" rel="noopener">Port Authority toll schedule (July 2026)</a> · <a href="https://www.mta.info/fares-tolls/tolls/congestion-relief-zone/about" target="_blank" rel="noopener">Separate Manhattan congestion charge</a>. Rates can change; official agencies control billing.</p>
<p><a href="#crossingForm">Customize your crossing, payment, vehicle and departure time</a></p>
</section>`;
};

const begin='<!-- NYC_TOLL_RATE_TABLE_START -->',end='<!-- NYC_TOLL_RATE_TABLE_END -->';
const current=fs.readFileSync(target,'utf8');
if(!current.includes(begin)||!current.includes(end)) throw new Error('NYC crawlable toll surface markers missing');
const re=/<!-- NYC_TOLL_RATE_TABLE_START -->[\s\S]*?<!-- NYC_TOLL_RATE_TABLE_END -->/;
const next=current.replace(re,begin+'\n'+renderNycRates(CROSSINGS,chargeFor)+'\n'+end);
if(process.argv.includes('--check')){
  if(next!==current){console.error('NYC toll HTML differs from the shared engine; run node scripts/generate-nyc-toll-search-surface.mjs');process.exitCode=1;}
  else console.log('NYC crawlable toll prices match shared engine');
} else if(next!==current){fs.writeFileSync(target,next);console.log('Regenerated NYC crawlable toll prices');}
