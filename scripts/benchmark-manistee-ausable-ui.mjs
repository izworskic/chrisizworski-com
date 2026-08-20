#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('public/manistee-river-map/index.html','utf8');
const data=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const ui=fs.readFileSync('public/assets/manistee-ausable-ui.js','utf8');
const css=fs.readFileSync('public/assets/manistee-ausable-ui.css','utf8');
const map=fs.readFileSync('public/assets/manistee-river-map.js','utf8');
const checks=[];
const add=(name,points,ok)=>checks.push({name,points,ok:Boolean(ok)});

add('Map-first field shell',20,
  /\.shell\{display:flex!important;flex-direction:column!important/.test(css)&&
  /height:min\(61vh,690px\)!important/.test(css)&&
  /\.panel\{border:0!important/.test(css));
add('Four-task hierarchy',15,
  ['places','plan','river','guide'].every(x=>html.includes(`data-tab="${x}"`))&&
  ui.includes("riverTab.textContent='River'")&&
  /repeat\(4,minmax\(0,1fr\)\)/.test(css));
add('Places decision flow',15,
  html.includes('id="place-search"')&&ui.includes('River reach filters')&&ui.includes('>Plan by</div>')&&ui.includes('reach-divider'));
add('Planner directness',15,
  ui.includes('Popular starts')&&ui.includes('Copy trip link')&&ui.includes("searchParams.set('from'")&&
  map.includes('routeGraph(state.graphs[from.waterway],from,to)'));
add('Progressive disclosure',10,
  ui.includes('River, weather & field details')&&ui.includes('Seasonal gauge detail')&&/\.field-more>summary/.test(css));
add('Conditions at a glance',10,
  ui.includes('conditions-now-strip')&&['Upper flow','Upper water','Lower flow','Pine flow'].every(x=>ui.includes(x)));
add('Mobile field ergonomics',10,
  /height:58svh!important/.test(css)&&/min-height:44px!important/.test(css)&&/\.place-row\{min-height:52px!important\}/.test(css));
add('Clutter control',5,
  /\.persona-deck\{display:none!important\}/.test(css)&&/\.source-strip\{display:none!important\}/.test(css)&&/\.detail-badges\{display:none!important\}/.test(css));

const score=checks.reduce((sum,c)=>sum+(c.ok?c.points:0),0);
const fatal=[];
if(!data.includes('/assets/manistee-ausable-ui.js'))fatal.push('new UI layer is not loaded');
if(!map.includes("fetch('/api/manistee-river-hydrography')"))fatal.push('source-backed hydrography was lost');
if(!map.includes('Planner refuses cross-waterway routing'))fatal.push('planner truth guard was lost');
if(!/\.persona-deck\{display:none!important\}/.test(css))fatal.push('persona wall remains in primary workflow');
if(!/\.shell\{display:flex!important;flex-direction:column!important/.test(css))fatal.push('permanent sidebar layout remains');

console.log('Manistee human-UX / Au Sable interaction benchmark');
console.log(`Previous interface baseline: 35/100 (capability-rich, interaction-heavy)`);
console.log(`Candidate: ${score}/100`);
for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${String(c.ok?c.points:0).padStart(2)}/${c.points}  ${c.name}`);
if(fatal.length)for(const f of fatal)console.log(`FATAL ${f}`);
if(process.argv.includes('--check')&&(score<95||fatal.length))process.exit(1);
