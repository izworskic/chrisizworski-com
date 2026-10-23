'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/john-day-lock/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/assets/john-day-lock.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/john-day-lock.css'),'utf8');
test('one canonical page, one creator, correct source ledger',()=>{
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/john-day-lock\/"/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.match(html,/Built by Chris Izworski/);
 assert.match(html,/215019/);assert.match(html,/dvidshub.net\/image\/7361754/);
 assert.match(html,/not yet verified/i);assert.match(html,/Not independently verified here/);
 assert.doesNotMatch(html,/LIVE SHIPS NOW|LOCK IS OPEN|GUARANTEED ARRIVAL|PUBLIC VIEWING PLATFORM IS OPEN/);
});
test('four immediate mission controls, accessible switching and fallbacks',()=>{
 for(const mode of ['watch','boat','how','river']){
  assert.match(html,new RegExp('id="tab-'+mode+'"'));assert.match(html,new RegExp('id="panel-'+mode+'"'));
 }
 assert.match(js,/ArrowLeft/);assert.match(js,/aria-selected/);assert.match(js,/createElement\('h3'\)/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);
 assert.match(html,/Current published John Day lock control/);
 assert.match(html,/not an advertised lock-chamber viewpoint/);
});
test('historical data and simulator are labeled, with no real-time leap from chart',()=>{
 assert.match(html,/SIMULATED LOCK/);assert.match(html,/ILLUSTRATIVE CROSS-SECTION/);
 assert.match(html,/July 10, 2026/);assert.match(html,/not the current river state/);
 assert.match(js,/Historical example, never presented as a live measurement/);
 assert.match(js,/function summarize\(report\)/);
 for(const k of ['outflowKcfs','generationKcfs','spillKcfs'])assert.match(html,new RegExp('data-flow-series="'+k+'"'));
 assert.match(html,/id="reportSourceLink"/);
});
test('no unverified map access and no paid API dependencies',()=>{
 assert.doesNotMatch(html,/Google Maps directions to a public platform|mapbox\.com\/directions/);
 assert.doesNotMatch(js,/REDIS_URL|OPENAI_API_KEY|ANTHROPIC_API_KEY|CARTO_API_KEY/);
});
