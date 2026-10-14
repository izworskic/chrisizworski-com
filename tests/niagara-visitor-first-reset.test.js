'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/niagara-falls-today/index.html');
const js=read('public/assets/niagara-falls-today.js');
const css=read('public/assets/niagara-falls-today.css');
test('NIAGARA-RESET-01 first-screen choices precede advanced detail and map precedes film',()=>{
 const p=html.indexOf('id="plan-form"'),side=html.indexOf('Where are you starting?'),goal=html.indexOf('data-niagara-preset="boat"'),time=html.indexOf('name="duration_minutes"'),advanced=html.indexOf('Fine-tune your plan'),map=html.indexOf('id="wayfinding"'),film=html.indexOf('id="falls-films"');
 assert.ok(p>=0&&p<side&&side<goal&&goal<time&&time<advanced&&advanced<map&&map<film);
 assert.match(html,/<details class="travel-details"><summary>Compare parking, walking and WEGO costs<\/summary>/);
 assert.match(html,/<details class="details">/);
});
test('NIAGARA-RESET-02 late afternoon defaults to an honestly labelled next-morning visit',()=>{
 assert.match(js,/function suggestedVisitEastern\(now\)/);
 assert.match(js,/if\(minutes>=14\*60\)/);
 assert.match(js,/Change this if you are already at the Falls/);
 assert.match(js,/visitDateNote\.textContent=t\.reason/);
 assert.doesNotMatch(js,/emit\('niagara_planner_view'\);submit\(\);/);
 assert.match(js,/if\(hasPlanned\)submit\(\)/);
});
test('NIAGARA-RESET-03 one clear route before optional source and field-note details',()=>{
 assert.match(js,/function draw\(r\)/);
 assert.match(js,/The boat fits your published operating window/);
 assert.match(js,/id=|#wayfinding/);
 assert.match(js,/start-parking/);
 assert.match(js,/compact-trip-facts/);
 assert.match(js,/class="stop-detail"/);
 assert.match(js,/class="trip-verification"/);
 assert.doesNotMatch(js,/out\+=filmPreview\(r,stops\)/);
 assert.match(css,/\.compact-stop/);
 assert.match(css,/\.trip-verification/);
});
test('NIAGARA-RESET-04 no accidental Javascript syntax errors after layout and calendar changes',()=>{
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'niagara-falls-today.js'}));
});
