'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const rule=require('../public/assets/playalinda-rule.js');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const HEDGES=/security access not yet confirmed|opening not confirmed|do not assume entry|cutoff is not confirmed/i;
const vulcan=net=>({pad:'Space Launch Complex 41',net,netPrecision:'second'});

test('Vulcan LV-01 at 12:11 PM EST gets the fixed verdict with an 11:41 AM EST cutoff',()=>{
  const d=rule.decide(vulcan('2026-11-15T17:11:30Z'),'America/New_York');
  assert.equal(d.cutoffLabel,'11:41 AM EST');
  assert.equal(d.headline,'Yes, Playalinda Beach lots 4-7 are open for viewing this launch. Park only in a beach parking lot. Vistas are closed during the launch, and the beach at parking area #1 is closed 1/4 mile south to the KSC boundary. Arrive before 11:41 AM EST: Playalinda closes to inbound traffic 30 minutes before launch.');
  assert.match(d.note,/Jetty Park is the alternate/);
  assert.doesNotMatch(d.headline,HEDGES);
});
test('the cutoff follows the launch time with no manual edit',()=>{
  assert.equal(rule.decide(vulcan('2026-11-16T18:01:00Z')).cutoffLabel,'12:31 PM EST');
  assert.equal(rule.decide(vulcan('2026-07-04T14:00:00Z')).cutoffLabel,'9:30 AM EDT');
});
test('only SLC-41 and LC-39A trigger the rule; approximate times get no invented cutoff',()=>{
  for(const pad of ['SLC-41','LC-39A','Launch Complex 39A','Space Launch Complex 41'])assert.ok(rule.applies(pad),pad);
  for(const pad of ['Space Launch Complex 40','Launch Complex 39B','SLC-410',''])assert.ok(!rule.applies(pad),pad);
  const approx=rule.decide({pad:'LC-39A',net:'2026-11-20T15:00:00Z',netPrecision:'hour'});
  assert.equal(approx.cutoffLabel,null);
  assert.match(approx.headline,/Arrive before the inbound cutoff: Playalinda closes/);
  assert.deepEqual(rule.OPEN_LOTS,[4,5,6,7]);
});
test('Space Coast Launch uses the shared rule and carries no Playalinda hedging',()=>{
  const app=read('public/synced-national-tools/space-coast-launch/app.js');
  const map=read('public/synced-national-tools/space-coast-launch/geo-map.js');
  const html=read('public/synced-national-tools/space-coast-launch/index.html');
  assert.match(app,/window\.PlayalindaRule\?\.decide\(data\?\.next/);
  assert.match(map,/window\.PlayalindaRule\?\.decide\(mission/);
  for(const src of [app,map,html])assert.doesNotMatch(src,HEDGES);
  assert.doesNotMatch(app,/Do not assume Playalinda/);
});
