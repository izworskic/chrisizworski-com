'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'../api/rockhounding-wave-pulse.js'),'utf8');
test('same original cached GLOS request powers 24h-vs-24h photo-free activity and existing NWS lake-level checks',()=>{
 assert.match(src,/const \{rollingWaveTendency\}=require/);
 assert.match(src,/rollingWaveTendency\(parsed\?\.rows\|\|\[\],\{nowISO,hazardStatus\}\)/);
 assert.match(src,/waveTendency48h,/);
 assert.match(src,/Promise\.allSettled/);
 assert.match(src,/getGLOS\(fetchFn,now\)/);
 assert.match(src,/getNWS\(fetchFn,nowISO\)/);
 assert.match(src,/getMarquetteLevel\(fetchFn,nowISO\)/);
});
test('current storm pulse explains photo-free wave activity to users with source coverage and explicit safety limits',()=>{
 assert.match(html,/id="liveWaveTendencyPanel"/);
 assert.match(html,/id="liveWaveTendencyTitle"/);
 assert.match(html,/id="liveWaveTendencyLabel"/);
 assert.match(html,/id="liveWaveTendencyDetail"/);
 assert.match(html,/waveTrend\.comparedWindowCoveragePct/);
 assert.match(html,/two full 24-hour periods/);
 assert.match(html,/Not physical wave power, breaking surf, measured gravel movement, safe conditions or odds of finding agates/);
 assert.match(html,/NWS marine warnings\/advisories are active/);
 assert.match(html,/Original buoy observations are stale, missing, or too gappy/);
 assert.ok(html.indexOf('id="liveWaveTendencyPanel"')<html.indexOf('id="photo-free-storm-pulse"'));
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
