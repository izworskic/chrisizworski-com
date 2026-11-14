'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
// Phrases written for maintainers that used to reach visitors on Rocket Launch Live.
const BANNED=['Discovery checked','Coverage is incomplete','Direct official-page checks',
  'enrichment cycle','bounded recent RSS','configured source groups','independently cleared NASA photo',
  'Evidence progression','minute-level or better','link discovery does not establish',
  'records returned within','rotates under the provider rate limit'];
const FILES=['public/synced-national-tools/rocket-launch-live/app.js','public/synced-national-tools/rocket-launch-live/index.html',
  'lib/rocket-launch-national.js','lib/rocket-launch-truth.js','lib/spaceflight-now-editorial.js','lib/space-coast-decision.js'];
test('visitor-facing rocket copy stays in plain language',()=>{
  for(const f of FILES){const s=read(f);
    for(const phrase of BANNED)assert.ok(!s.includes(phrase),f+' still says: '+phrase);}
});
test('plain wording keeps the safety meaning',()=>{
  assert.match(read('lib/space-coast-decision.js'),/Launches can still be delayed or scrubbed/);
  assert.match(read('lib/spaceflight-now-editorial.js'),/does not mean they have not covered it/);
  assert.match(read('public/synced-national-tools/rocket-launch-live/index.html'),/not a launch go-ahead/);
  assert.match(read('lib/rocket-launch-national.js'),/some flights may be missing/);
});
