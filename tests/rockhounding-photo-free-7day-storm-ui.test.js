'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
test('seven-day storm-memory panel renders above 48-hour trend without requiring photographs',()=>{
 for(const id of ['sevenDayStormMemoryPanel','sevenDayStormMemoryTitle',
   'sevenDayStormMemoryHeadline','sevenDayStormMemoryDetails',
   'sevenDayStormMemorySource','sevenDayStormMemoryChart'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.ok(html.indexOf('id="sevenDayStormMemoryPanel"')<
   html.indexOf('id="liveWaveTendencyPanel"'));
 assert.match(html,/When was the last sustained offshore wave activity\?/);
 assert.match(html,/Up to 7 days/);
 assert.match(html,/measured peak/i);
 assert.match(html,/source gaps cannot be treated as calm conditions/);
 assert.match(html,/eighteenHourBelowResearchThresholdConfirmed/);
 assert.match(html,/Number\.isFinite/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
test('actual 7-day chart uses only verified one-request observed GLOS response with no interpolated gaps',()=>{
 assert.equal((html.match(/fetch\('\/api\/rockhounding-wave-pulse'/g)||[]).length,1);
 assert.match(html,/renderSevenDayChart\(memory\.sevenDayObservedWaveSeries\)/);
 assert.match(html,/prev!==null&&v\.t-prev<=1\.5\*3600000/);
 assert.match(html,/memory\.beachBreakingWaveHeightM===null/);
 assert.match(html,/memory\.agateExposureProbability===null/);
 assert.match(html,/memory\.canPredictNewAgates===false/);
 assert.match(html,/memory\.canClaimBeachSafe===false/);
 assert.match(html,/memory\.hazardStatus===r\.hazardStatus/);
 assert.match(html,/No reliable near-current GLOS source coverage/);
 assert.match(html,/stormMemoryChart\.replaceChildren\(\)/);
});
