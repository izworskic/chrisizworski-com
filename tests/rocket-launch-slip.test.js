'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {slipWindows,OFFSETS_HOURS}=require('../lib/rocket-launch-slip');
const {skyCompare}=require('../api/rocket-launch-usa')._test;
const oracle=path.join(__dirname,'../scripts/rocket_launch_slip_lab.py');

const grade=period=>({
  level:period?.risk||'unknown',
  label:period?'Mock surface weather':'Hourly forecast unavailable'
});
function sample(x,net){
  return {id:x.id,name:x.id,_grid:x.grid,
    _hourly:{properties:{periods:[{
      startTime:net,endTime:new Date(Date.parse(net)+7*86400000).toISOString(),
      risk:x.risk,shortForecast:'Clear'
    }]}}};
}
test('Python oracle independently agrees with production JS on all 24 delay samples',t=>{
  const process=spawnSync('python3',[oracle,'--oracle'],{encoding:'utf8',timeout:10000});
  if(process.error&&process.error.code==='ENOENT'){
    t.skip('Python not present locally; dedicated CI gate runs the Python oracle');
    return;
  }
  assert.equal(process.status,0,process.stderr||process.error?.message);
  const data=JSON.parse(process.stdout);
  assert.deepEqual(data.offsets,OFFSETS_HOURS);
  assert.equal(data.cases.length,6);
  for(const item of data.cases){
    const now=Date.parse(item.now);
    const launch={net:item.net,netPrecision:'minute',sourceStale:false};
    const found=slipWindows(item.sites.map(s=>sample(s,item.net)),launch,now,skyCompare,grade);
    assert.equal(found.scenarios.length,4,item.id);
    for(let i=0;i<4;i++){
      const actual=found.scenarios[i],expected=item.expected[i];
      assert.equal(actual.offsetHours,expected.offsetHours,item.id);
      assert.equal(actual.targetAt,expected.targetAt,item.id);
      assert.deepEqual(actual.places.map(p=>p.cloudCoverPercent),expected.clouds,item.id+' '+i);
      assert.deepEqual(actual.places.map(p=>p.cloudStatus),expected.cloudStatuses,item.id+' '+i);
      assert.equal(actual.comparison.state,expected.comparison.state,item.id+' '+i);
      assert.equal(actual.comparison.winner,expected.comparison.winner,item.id+' '+i);
    }
  }
});
test('date-only, no launch and one-point forecasts fail closed',()=>{
  const now=Date.parse('2026-11-03T12:00:00Z');
  for(const launch of [null,{net:'2026-11-03T13:00:00Z',netPrecision:'day'},
    {net:'garbage',netPrecision:'minute'}]){
    assert.equal(slipWindows([],launch,now,skyCompare,grade).status,'unavailable');
  }
  assert.equal(slipWindows([{id:'a'}],
    {net:'2026-11-03T13:00:00Z',netPrecision:'minute'},
    now,skyCompare,grade).status,'unavailable');
});
test('stale launch targets never produce a viewing-area winner',()=>{
  const now=Date.parse('2026-11-03T12:00:00Z');
  const grid={properties:{updateTime:'2026-11-03T12:00:00Z',skyCover:{
    uom:'wmoUnit:percent',values:[{validTime:'2026-11-03T13:00:00Z/PT7H',value:10}]}}};
  const grid2=JSON.parse(JSON.stringify(grid));grid2.properties.skyCover.values[0].value=90;
  const forecast={properties:{periods:[{startTime:'2026-11-03T12:00:00Z',endTime:'2026-11-03T22:00:00Z',shortForecast:'Clear'}]}};
  const r=slipWindows([{id:'a',name:'A',_grid:grid,_hourly:forecast},
    {id:'b',name:'B',_grid:grid2,_hourly:forecast}],
    {net:'2026-11-03T13:00:00Z',netPrecision:'minute',sourceStale:true},
    now,skyCompare,()=>({level:'good',label:'Clear'}));
  assert.equal(r.status,'schedule-overdue');
  assert.ok(r.scenarios.every(x=>x.comparison.winner===null&&x.comparison.state==='unknown'));
});
test('no sensitive grids or misleading probability claims reach the user interface',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
  const js=fs.readFileSync(path.join(__dirname,'../public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
  const api=fs.readFileSync(path.join(__dirname,'../api/rocket-launch-usa.js'),'utf8');
  assert.match(html,/id="rl-slip-options"/);
  assert.match(html,/id="rl-slip-detail"/);
  assert.match(html,/v=20261110-voice-v1/);
  assert.match(js,/renderSlipForecast\(data\)/);
  assert.match(js,/button\.addEventListener\('click'/);
  assert.match(api,/places:publicPlaces/);
  assert.match(api,/const slip=slipWindows\(places,launch,now,skyCompare,weatherGrade\)/);
  assert.doesNotMatch(html,/chance of launch after delay/i);
});
