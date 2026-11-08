'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../public/assets/freighter-layup-model.js');

function sample(){
  const record=(harborId,status,statusAsOf)=>({id:harborId+'-'+status,name:'Synthetic vessel',harborId,status,statusAsOf});
  return {harbors:[{id:'superior'},{id:'sturgeon-bay'}],seasons:[
    {id:'2026-27',label:'Winter 2026–2027',state:'upcoming_unconfirmed',records:[]},
    {id:'2025-26',label:'Winter 2025–2026',state:'historical_snapshot',records:[
      record('superior','confirmed_historical','2026-01-15'),
      record('superior','reported_historical','2026-01-18'),
      record('sturgeon-bay','confirmed_historical','2026-02-03')]},
    {id:'2024-25',label:'Winter 2024–2025',state:'historical_snapshot',records:[
      record('superior','confirmed_historical','2025-01-08')]}
  ]};
}
test('unreported current winter is not filled from historical vessel records',()=>{
  const plan=model.harborEvidenceOptions(sample(),'superior','2026-27','2026-27');
  assert.equal(plan.current.count,0);
  assert.equal(plan.current.latestAsOf,null);
  assert.deepEqual(plan.history.map(x=>[x.id,x.count]),[['2025-26',2],['2024-25',1]]);
  assert.equal(plan.selected.id,'2026-27');
});
test('current confirmed/reported arrivals are distinct from departed ships and prior seasons',()=>{
  const data=sample();
  data.seasons[0].state='active_current';
  data.seasons[0].records=[
    {harborId:'superior',status:'confirmed_current',statusAsOf:'2026-11-07'},
    {harborId:'superior',status:'reported_current',statusAsOf:'2026-11-08'},
    {harborId:'superior',status:'departed_current',statusAsOf:'2026-11-09'},
    {harborId:'sturgeon-bay',status:'confirmed_current',statusAsOf:'2026-11-06'}
  ];
  const plan=model.harborEvidenceOptions(data,'superior','2026-27','2026-27');
  assert.deepEqual([plan.current.count,plan.current.confirmed,plan.current.reported,plan.current.latestAsOf],
    [2,1,1,'2026-11-08']);
  assert.equal(plan.history[0].count,2);
});
test('explicitly selected older archive is retained without silently changing winter',()=>{
  const plan=model.harborEvidenceOptions(sample(),'superior','2026-27','2024-25');
  assert.equal(plan.selected.id,'2024-25');
  assert.equal(plan.current.id,'2026-27');
  assert.equal(plan.history[0].id,'2025-26');
});
test('missing harbor, unverified season and no archived reports fail closed',()=>{
  assert.equal(model.harborEvidenceOptions(sample(),'unknown','2026-27','2026-27'),null);
  const a=sample();
  const plan=model.harborEvidenceOptions(a,'sturgeon-bay','2027-28','2027-28');
  assert.equal(plan.current.count,0);
  assert.equal(plan.history[0].count,1);
});
test('existing evidence classifier and totals remain authoritative',()=>{
  const record={status:'confirmed_historical',statusAsOf:'2026-01-15',harborId:'superior'};
  const season={state:'historical_snapshot',records:[record]};
  assert.equal(model.classify(record,season).confirmed,true);
  assert.deepEqual(model.totals(season),{documented:1,confirmed:1,reported:0,harbors:1});
});
test('port cards require explicit evidence selection, not a hidden archive switch',()=>{
  const js=fs.readFileSync(path.join(__dirname,'../public/assets/freighter-layup.js'),'utf8');
  const from=js.slice(js.indexOf('function initPortViewingGuide()'),js.indexOf('async function boot()'));
  assert.match(from,/harborEvidenceOptions/);
  assert.match(from,/data-harbor-evidence-choices/);
  assert.match(from,/chooseSeason\(s.id,'historical'\)/);
  assert.doesNotMatch(from,/if\(historical\)\{[^}]*setSeason\(/);
});
