'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
const study=require('../data/rockhounding/grand-marais-glos-spotter-observed-run-2026-10-15.json');
test('GLOS near Grand Marais observations are clearly separate from all illustrative scenarios',()=>{
 assert.match(html,/id="grand-marais-spotter-evidence"/);
 assert.match(html,/GLOS original data/);
 assert.match(html,/interactive storm picker uses illustrative scenarios/);
 assert.match(html,/142 original readings/);
 assert.match(html,/October 14 at 23:46 UTC|2026-10-14 23:46 UTC/);
 assert.match(html,/not a validated collecting opportunity/i);
 assert.match(html,/not beach surf or predicted exposed stones/);
});
test('source-verified local Spotter snapshot cannot authorize agate opportunity from stale offshore data',()=>{
 assert.equal(study.station,'SPOT-1361');
 assert.equal(study.sourceCollection.retrievedObservations,144);
 assert.equal(study.sourceCollection.sourceLatestAtUTC,'2026-10-14T23:46:01Z');
 assert.equal(study.sourceCollection.statusAtVerification,'STALE_OBSERVATIONS');
 assert.equal(study.sourceCollection.observedPeakWaveHeightM,1.57);
 assert.equal(study.sourceCollection.latestObservedWaveHeightM,0.95);
 assert.equal(study.sourceCollection.latestObservedWaveFromDeg,329.11);
 assert.ok(Object.values(study.publicClaims).every(x=>x===false));
});
