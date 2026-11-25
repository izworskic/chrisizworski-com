'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {audit}=require('../scripts/audit-great-lakes-crossing-references.cjs');
test('official dimensions expose wider provisional references, without moving gates',()=>{
 const a=audit(),by=Object.fromEntries(a.rows.map(x=>[x.gate,x]));
 assert.equal(a.rows.length,3);
 assert.equal(by['soo-poe'].source.widthFeet,110);
 assert.equal(by['soo-macarthur'].source.widthFeet,80);
 assert.equal(by['duluth-bridge'].source.widthFeet,300);
 assert.ok(Math.abs(by['soo-poe'].publishedWidthMeters-33.528)<1e-8);
 assert.ok(Math.abs(by['soo-macarthur'].publishedWidthMeters-24.384)<1e-8);
 assert.ok(Math.abs(by['duluth-bridge'].publishedWidthMeters-91.44)<1e-8);
 for(const row of a.rows){assert.equal(row.exceedsPublishedWidth,true);assert.ok(row.widthExcessMeters>0);assert.equal(row.historicalAxisVerified,false);assert.equal(row.targetEquivalent,false);assert.equal(row.independentPassageVerified,false);assert.equal(row.eligibleForReplay,false);}
 assert.ok(by['duluth-bridge'].modelPointOffsetMeters>150);
 assert.equal(a.independentlyReviewedCrossings,0);assert.equal(a.productionCalibrationAuthorized,false);
});
