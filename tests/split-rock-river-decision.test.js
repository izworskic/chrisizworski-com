const test=require('node:test');const assert=require('node:assert/strict');const e=require('../public/assets/split-rock-river-engine.js');
test('east/west reopened while bridge is always missing',()=>{assert.equal(e.RECORD.bridge,false);assert.equal(e.RECORD.westOpenSince,'2026-07-10');assert.equal(e.RECORD.eastOpenSince,'2025-06-16')});
test('a requested ford never receives a safety clearance',()=>{const r=e.evaluate({goal:'ford'});assert.equal(r.code,'UNBRIDGED_CROSSING');assert.match(r.summary,/cannot certify a ford/i)});
test('out-and-back bypasses river crossing',()=>{for(const goal of ['east','west']){const r=e.evaluate({goal});assert.equal(r.code,'OUT_AND_BACK');assert.match(r.summary,/avoids relying on a river ford/i)}});
test('loop uses official paved underpass alternate',()=>{const r=e.evaluate({goal:'loop'});assert.ok(r.steps.some(s=>/underpass/i.test(s)));assert.ok(r.steps.some(s=>/no.*river crossing|never.*river crossing/i.test(s)))});
test('short window does not produce an invented loop time',()=>{const r=e.evaluate({goal:'loop',time:'short'});assert.equal(r.code,'TIME_NOT_VERIFIED');assert.equal(r.estimate,null)});
test('future bulletin dates require reconfirmation',()=>{const r=e.evaluate({goal:'loop',date:'2027-05-01'});assert.equal(r.code,'RECHECK_BULLETIN')});
