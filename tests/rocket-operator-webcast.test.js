'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const media=require('../lib/space-coast-media');
const app=fs.readFileSync(path.join(__dirname,'../public/synced-national-tools/rocket-launch-live/app.js'),'utf8');

test('every operator on the current U.S. calendar with a public stream page gets a link',()=>{
  const want={'United Launch Alliance':'ULA','SpaceX':'SpaceX','Blue Origin':'Blue Origin',
    'Rocket Lab':'Rocket Lab','Rocket Lab USA':'Rocket Lab','Firefly Aerospace':'Firefly','NASA':'NASA'};
  for(const [provider,short] of Object.entries(want)){
    const op=media.operatorDirectory(provider);
    assert.ok(op&&/^https:\/\//.test(op.url),provider);
    assert.equal(op.short,short);
  }
  assert.equal(media.operatorDirectory('Rocket Lab').url,'https://rocketlabcorp.com/missions/next-mission');
  assert.equal(media.operatorDirectory('Firefly Aerospace').url,'https://fireflyspace.com/missions/');
});
test('unknown operators still get no invented link',()=>{
  for(const p of ['Relativity Space','Astra Space','Unknown','Fireflies Inc','Pocket Lab'])
    assert.equal(media.operatorDirectory(p),null,p);
});
test('lookups return copies, so one launch cannot alter another',()=>{
  const a=media.operatorDirectory('United Launch Alliance');a.url='https://example.com';
  assert.match(media.operatorDirectory('United Launch Alliance').url,/ulalaunch\.com/);
});
test('with no listed stream the operator site is the main action, never a claim of a live stream',()=>{
  const block=app.slice(app.indexOf("No stream is listed on the public launch calendar yet"),
    app.indexOf("No stream is listed on the public launch calendar yet")+400);
  assert.match(app,/'Watch on '\+\(op\.short\|\|'the launch company'\)/);
  assert.match(block,/often only shortly before liftoff/);
  assert.doesNotMatch(block,/is live|streaming now/i);
});
