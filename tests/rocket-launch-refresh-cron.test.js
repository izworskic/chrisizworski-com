'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const national=require('../lib/rocket-launch-national');
const {createHandler,authorized}=require('../api/rocket-launch-refresh')._test;

const NOW=Date.parse('2026-11-02T23:17:00Z');
function reply(){return{headers:{},statusCode:200,body:null,
  setHeader(k,v){this.headers[k.toLowerCase()]=v;},
  status(n){this.statusCode=n;return this;},
  json(x){this.body=x;return this;}};}
const makeSnap=()=>({version:2,checkedAt:new Date(NOW).toISOString(),
  activeCount:68,complete:true,missions:[],
  health:[{id:'primary',status:'ok',returned:68,providerCount:68,truncated:false,
    horizonDays:120},{id:'specialist',status:'ok',returned:9,providerCount:9,
    truncated:false,horizonDays:120}]});
test('120-day horizon is passed as a bounded LL2 net__lte filter, not a silent client-side slice',()=>{
  assert.equal(national.HORIZON_DAYS,120);
  const u=new URL(national.queryUrl(national.QUERIES[0],NOW));
  assert.equal(u.searchParams.get('net__lte'),new Date(NOW+120*86400000).toISOString());
  assert.equal(u.searchParams.get('limit'),'100');
  assert.equal(u.searchParams.get('location__ids'),'11,12,27');
  assert.equal(u.searchParams.get('ordering'),'net');
  assert.equal(national.QUERIES.length,2);
});
test('full returned 120-day horizon is clearly scoped; remaining provider truncation is never complete',()=>{
  const group=national.QUERIES[0];
  const raw={count:68,results:[]};
  const parsed=national.normalizeFeed(raw,group,NOW);
  assert.equal(parsed.health.horizonDays,120);
  assert.equal(parsed.health.horizonUntil,new Date(NOW+120*86400000).toISOString());
  assert.equal(parsed.health.status,'truncated'); // provider count > supplied results
  const current=national.publicSchedule(makeSnap(),NOW);
  assert.equal(current.complete,true);
  assert.equal(current.horizonDays,120);
  assert.match(current.warning,/next 120 days/);
  const tooOld=national.publicSchedule(makeSnap(),NOW+76*60000);
  assert.equal(tooOld.complete,false);
  assert.match(tooOld.warning,/overdue/);
});
test('existing CRON_SECRET is required: missing/incorrect/forged headers cannot authorize',()=>{
  const secret='test_opaque_value_not_shared_with_visitor';
  const env={CRON_SECRET:secret};
  assert.equal(authorized({authorization:'Bearer '+secret},env),true);
  assert.equal(authorized({authorization:'Bearer '+secret},{CRON_SECRET:''}),false);
  assert.equal(authorized({authorization:'Bearer bad'},env),false);
  assert.equal(authorized({'x-vercel-cron':'1'},env),false);
  assert.equal(authorized({authorization:'bearer '+secret},env),false);
});
test('cron is GET only, untrusted visits never reach paid or limited sources',async()=>{
  let calls=0;
  const api=createHandler({guard:()=>false,
    refresh:async()=>{calls++;return{ok:true,snapshot:makeSnap()};}});
  for(const method of ['POST','PUT','DELETE','GET']){
    const res=reply();await api({method,headers:{}},res);
    assert.equal(res.statusCode,method==='GET'?401:405);
    assert.equal(res.body.ok,false);
  }
  assert.equal(calls,0);
});
test('authenticated cron refreshes one national snapshot, hands exact instance to both consumers',async()=>{
  const snap=makeSnap(),calls=[];
  const handler=createHandler({
    guard:()=>true,
    refresh:async()=>{calls.push('national');return{ok:true,snapshot:snap};},
    florida:async({nationalSnapshot})=>{
      assert.equal(nationalSnapshot,snap);calls.push('florida');return{ok:true,missions:3};},
    enrich:async({nationalSnapshot})=>{
      assert.equal(nationalSnapshot,snap);calls.push('truth');return{ok:true,monitored:4};}
  });
  const res=reply();await handler({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.ok,true);
  assert.equal(res.body.schedule.count,68);
  assert.equal(res.body.schedule.complete,true);
  assert.equal(res.body.checkedAt,snap.checkedAt);
  assert.deepEqual(calls.sort(),['florida','national','truth']);
  assert.equal(res.headers['cache-control'],'no-store');
  assert.equal(JSON.stringify(res.body).includes('CRON_SECRET'),false);
});
test('source outage does not erase last observation, nor expose internal exception',async()=>{
  const handler=createHandler({guard:()=>true,refresh:async()=>{
    throw Error('Secret credential endpoint unreachable');
  }});
  const res=reply();await handler({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.ok,false);
  assert.doesNotMatch(JSON.stringify(res.body),/credential/);
});
test('cron and signed GitHub runner target one shared Postgres collector',()=>{
  const root=path.resolve(__dirname,'..');
  const cfg=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  const cron=cfg.crons.filter(x=>x.path==='/api/rocket-launch-refresh');
  assert.equal(cron.length,1);
  assert.equal(cron[0].schedule,'8,23,38,53 * * * *');
  assert.equal(cfg.functions['api/rocket-launch-refresh.js'].maxDuration,35);
  const watcher=fs.readFileSync(path.join(root,'api/space-coast-ksc-watch.js'),'utf8');
  assert.match(watcher,/runNationalWatch/);
  assert.match(watcher,/runSchedule\(\{nationalSnapshot:shared\}\)/);
  assert.match(watcher,/runTruth\(\{nationalSnapshot:shared\}\)/);
  const cronSource=fs.readFileSync(path.join(root,'api/rocket-launch-refresh.js'),'utf8');
  assert.doesNotMatch(cronSource,/ll\.thespacedevs\.com/);
});
