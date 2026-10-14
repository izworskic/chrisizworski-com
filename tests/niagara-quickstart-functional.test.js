'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {plan}=require('../lib/niagara-falls/planner.js');
const defaults={visit_date:'2026-10-13',arrival_local:'11:00',duration_minutes:240,starting_side:'US',priority:'views',adults:2,youth:0};
function run(extra={}){return plan({...defaults,...extra},new Date('2026-10-13T14:30:00Z'));}
test('QSTART-01: two-hour button means public viewpoints ONLY (US and Canada)',()=>{
 for(const side of ['US','CA']){
  const r=run({trip_style:'short',priority:'views',duration_minutes:120,starting_side:side});
  assert.equal(r.visit_style,'short');
  assert.ok(r.stops.length>0,'no view route for '+side);
  assert.equal(r.stops.length,2,'two distinct public viewpoints fit with a 15-minute buffer on '+side);
  assert.ok(r.stops.every(s=>s.type==='view'),'a paid stop was slipped into '+side+' scenic plan');
  assert.equal(r.costs[0].known_admission_total,0);
  assert.match(r.verdict,/Short scenic visit/);
 }
});
test('QSTART-02: family button creates paced plan, not just same unrestricted boat ranking',()=>{
 for(const side of ['US','CA']){
  const r=run({trip_style:'family',priority:'kids',duration_minutes:360,starting_side:side,youth:1});
  assert.equal(r.visit_style,'family');
  assert.ok(r.stops.length>=1);
  assert.equal(r.stops[0].type,'view');
  assert.ok(r.stops.length<=3);
  assert.ok(r.stops.filter(s=>s.type==='paid').length<=1);
  assert.ok(r.timeline.estimated_walking_m<=1800);
  assert.match(r.verdict,/Family-paced visit/);
 }
});
test('QSTART-03: boat quick-start continues to require an actually feasible boat',()=>{
 const fit=run({trip_style:'boat',priority:'boat',duration_minutes:240});
 assert.equal(fit.visit_style,'boat');
 assert.equal(fit.boat_resolution?.included,true);
 assert.ok(fit.stops.some(s=>s.id==='maid'));
 const late=run({trip_style:'boat',priority:'boat',arrival_local:'20:00'});
 assert.equal(late.boat_resolution?.included,false);
 assert.equal(late.status,'BOAT_NOT_FEASIBLE');
 assert.ok(late.stops.every(s=>s.id!=='maid'));
});
test('QSTART-04: changing country or date does not borrow dates or cross the border',()=>{
 const a=run({trip_style:'short',starting_side:'CA',visit_date:'2026-10-14',duration_minutes:120});
 assert.ok(a.stops.every(s=>s.currency==='CAD'));
 assert.equal(a.cross_border_auto_planned,false);
 assert.ok(a.stops.every(s=>s.type==='view'));
});
test('QSTART-05: ordinary planner use is unchanged when no preset is chosen',()=>{
 const a=run({priority:'views',duration_minutes:120});
 assert.equal(a.visit_style,'standard');
 // The existing ordinary planner can rank a ticketed attraction; only the
 // explicitly requested quick-start scenic mode prohibits that choice.
 assert.ok(a.stops.length>0);
});
test('QSTART-06: actual controls feed a style to the engine and show acknowledgement immediately',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/niagara-falls-today/index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../public/assets/niagara-falls-today.js'),'utf8');
 for(const id of ['boat','short','family']){
  assert.match(html,new RegExp('data-niagara-preset="'+id+'" aria-controls="result-body" aria-pressed="false"'));
 }
 assert.match(html,/id="quick-start-note"/);
 assert.match(js,/trip_style:activePreset/);
 assert.match(js,/activePreset=id/);
 assert.match(js,/class="quick-loading"/);
 assert.match(js,/answer\.scrollIntoView/);
 assert.match(js,/activePreset='standard'/);
 assert.match(js,/niagara_map_render_degraded/);
});
