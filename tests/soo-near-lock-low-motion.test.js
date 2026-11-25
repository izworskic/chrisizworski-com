'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {runs,analyze,aggregate}=require('../scripts/soo-near-lock-low-motion.cjs');
const M=60000,t=Date.parse('2025-06-15T12:00:00Z');
const slot=(m,state='low_reported_speed',band='0_to_1')=>({t:t+m*M,state,band});
test('low-speed span is observed only; gaps, stale states and other bands break runs',()=>{
 const r=runs([slot(0),slot(5),slot(10,'stale_or_missing',null),slot(15),slot(25),slot(30,'forecast_available'),slot(35,'low_reported_speed','1_to_3')]);
 assert.deepEqual(r.map(x=>[x.ticks,x.spanMinutes,x.exit]),[[2,5,'stale_or_missing'],[1,0,'grid_gap'],[1,0,'forecast_available']]);
 assert.equal(r[1].exitObserved,false);
 assert.equal(runs([slot(0)])[0].exit,'episode_end');
});
test('retrospective first-low reference delay is conditional and no unresolved label is imputed',()=>{
 const slots=[slot(0),slot(5),slot(10,'forecast_available'),slot(15,'after_observed_chamber',null)];
 const first={direction:'upbound',outcome:{state:'OBSERVED_CHAMBER_REFERENCE_BRACKET',previousOutsideAt:new Date(t+12*M).toISOString(),firstInsideAt:new Date(t+13*M).toISOString()}};
 const a=analyze(first,slots),b=analyze({...first,outcome:{state:'RIGHT_CENSORED_BY_DAY_END'}},slots),c=analyze(first,[slot(15)]);
 assert.equal(a.firstLowToBracketLower,12);assert.equal(a.firstLowToBracketUpper,13);
 assert.equal(b.firstLowToBracketLower,null);assert.equal(c.firstLowToBracketLower,null);
 const z=aggregate([a,b,c]);assert.equal(z.episodesWithLow,3);assert.equal(z.lowTicks,5);
 assert.equal(z.matchedFirstLowEpisodes,1);assert.equal(z.episodesWithLaterForecast,2);
 assert.equal(z.meanFirstLowToReferenceLowerMinutes,12);
});
