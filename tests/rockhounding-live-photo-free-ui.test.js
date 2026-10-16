'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
const handler=require('../api/rockhounding-wave-pulse.js');
test('current photo-free wave condition card leads the existing historical storm research, without modifying ads',()=>{
 assert.match(ui,/id="live-offshore-pulse"/);
 assert.match(ui,/id="live-offshore-title"/);
 assert.match(ui,/id="liveOffshoreRefresh"/);
 assert.match(ui,/id="liveOffshorePhase"/);
 assert.match(ui,/id="liveOffshoreChart"/);
 assert.match(ui,/id="liveOffshoreHazards"/);
 assert.match(ui,/id="liveOffshoreAge"/);
 assert.match(ui,/id="liveOffshoreWarnings"/);
 assert.match(ui,/\/api\/rockhounding-wave-pulse/);
 assert.ok(ui.indexOf('id="live-offshore-pulse"')<ui.indexOf('id="photo-free-storm-pulse"'));
 assert.ok(ui.indexOf('id="photo-free-storm-pulse"')<ui.indexOf('id="research-archive"'));
 assert.match(ui,/No photos required/);
 assert.match(ui,/Source gaps longer than 90 minutes break the line/);
 assert.match(ui,/lower waves are not an all-clear|Lower waves are not an all-clear/);
 assert.match(ui,/OFFSHORE_SENSOR_STALE/);
 assert.match(ui,/NO_PROTECTED_HARBOR_WAVE_MEASUREMENT|Bayshore Park harbor wave conditions are NOT measured/);
 assert.match(ui,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(ui,/<script[^>]+adsbygoogle|googlesyndication|<link rel="canonical"/);
});
test('serverless live wave route exports one constrained GET handler, no visitor-provided external host or photo dependency',async()=>{
 assert.equal(typeof handler,'function');
 const res={
  h:{},code:200,output:null,
  setHeader(k,v){this.h[k]=v;return this},
  status(n){this.code=n;return this},
  json(v){this.output=v;return this},
  end(){return this}
 };
 const r=await handler({method:'POST',query:{url:'http://evil.com'}},res);
 assert.equal(r.code,405);
 assert.equal(r.h['Cache-Control'],'no-store');
 assert.equal(r.h['X-Robots-Tag'],'noindex, nofollow');
});
