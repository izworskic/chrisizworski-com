'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/space-coast-ksc-watch')._test;
const { AUDIENCE, _internal, authorizeKscWatchRequest } =
  require('../lib/space-coast-ksc-watch-auth');
const { trustedSnapshot } = require('../lib/space-coast-ksc-snapshot');
const NOW = Date.parse('2026-11-01T15:00:00Z');
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function res() {
  return { headers:{},statusCode:200,body:null,
    setHeader(k,v){this.headers[k.toLowerCase()]=v},
    status(c){this.statusCode=c;return this},
    json(body){this.body=body;return this}};
}
function req(method='GET', query={},token='') {
  return { method, query, headers: { authorization:token } };
}
function watch() {
  return {version:1,lastRunAt:new Date(NOW).toISOString(),
    lastCalendarCheckedAt:new Date(NOW).toISOString(),monitorStatus:'checked',
    lastChangeAt:null,missions:{},history:{}};
}
const snap = trustedSnapshot([{
  id: ID, name:'Falcon 9 | Starlink 10-54', net:'2026-11-05T15:00:00Z',
  pad:'Space Launch Complex 40'
}],NOW);

test('scheduled writes require signed identity, never plain public POST',async()=>{
  let writes=0;
  const handler=createHandler({now:()=>NOW,readSnapshot:async()=>snap,
    getWatchState:async()=>watch(),authorized:async x=>x.authorization==='Bearer signed-verified',
    run:async()=>{writes++;return {ok:true,checkedAt:new Date(NOW).toISOString()}}});
  const noAuth=res();
  await handler(req('POST'),noAuth);
  assert.equal(noAuth.statusCode,401);
  assert.equal(writes,0);
  const authorized=res();
  await handler(req('POST',{},'Bearer signed-verified'),authorized);
  assert.equal(authorized.statusCode,200);
  assert.equal(writes,1);
  assert.equal(authorized.headers['cache-control'],'no-store');
  const wrongMethod=res();await handler(req('PUT'),wrongMethod);
  assert.equal(wrongMethod.statusCode,405);
});

test('public read is read-only, mission-scoped and caches only verified data',async()=>{
  const handler=createHandler({now:()=>NOW,readSnapshot:async()=>snap,getWatchState:async()=>watch()});
  const health=res();await handler(req('GET'),health);
  assert.equal(health.statusCode,200);
  assert.equal(health.body.health.status,'checked');
  assert.equal(health.headers['cache-control'],'public, s-maxage=90, stale-while-revalidate=60');
  const mission=res();await handler(req('GET',{launchId:ID}),mission);
  assert.equal(mission.statusCode,200);
  assert.equal(mission.body.timeline.events.length,0);
  assert.equal(mission.body.selectedLaunchId,ID);
  const invalid=res();await handler(req('GET',{launchId:'bad'}),invalid);
  assert.equal(invalid.statusCode,400);
  const different=res();await handler(req('GET',{launchId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}),different);
  assert.equal(different.statusCode,503);
  assert.equal(different.headers['cache-control'],'no-store');
});

test('OIDC claims are tied to only the intended repository, workflow and main branch',()=>{
  const now=Math.floor(NOW/1000);
  const claims={iss:_internal.ISSUER,aud:AUDIENCE,iat:now-10,exp:now+300,
    repository:'izworskic/chrisizworski-com',
    repository_id:'1305741696',repository_owner:'izworskic',
    repository_owner_id:'46615230',repository_visibility:'public',
    ref:'refs/heads/main',ref_type:'branch',
    job_workflow_ref:_internal.JOB_WORKFLOW_REF,
    runner_environment:'github-hosted',event_name:'schedule',sha:'a'.repeat(40)};
  assert.equal(_internal.claimsMatch(claims,now),true);
  assert.equal(_internal.claimsMatch({...claims,event_name:'push'},now),true);
  for (const override of [
    {repository:'attacker/repo'},{ref:'refs/heads/feature'},
    {aud:'https://chrisizworski.com/api/other'},
    {event_name:'pull_request'},{runner_environment:'self-hosted'},
    {job_workflow_ref:'izworskic/chrisizworski-com/.github/workflows/other.yml@refs/heads/main'},
    {exp:now-300},{iat:now-10000}
  ]) assert.equal(_internal.claimsMatch({...claims,...override},now),false);
  assert.equal(AUDIENCE,'https://chrisizworski.com/api/space-coast-ksc-watch');
  assert.match(_internal.JOB_WORKFLOW_REF,/space-coast-ksc-watch.yml@refs\/heads\/main$/);
});

test('unsigned, malformed and empty tokens cannot trigger a scheduled check',async()=>{
  assert.equal(await authorizeKscWatchRequest({authorization:''}),false);
  assert.equal(await authorizeKscWatchRequest({authorization:'Bearer fake.jwt.token'}),false);
  assert.equal(await authorizeKscWatchRequest({authorization:'Basic abc'}),false);
});
