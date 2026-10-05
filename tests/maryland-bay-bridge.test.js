const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateToll, evaluateVehicle, parseWindSignal, resolveOperationalState, summarizeTraffic, normalizeCamera, extractAdvisorySummary } = require('../lib/maryland-bay-bridge');

test('explicit MDTA wind states are parsed without deriving them from raw wind speed', () => {
  assert.equal(parseWindSignal('Bay Bridge - Limited Wind Restrictions are in effect').level, 'LIMITED');
  assert.equal(parseWindSignal('Bay Bridge Full Wind Restrictions in effect').level, 'FULL');
  assert.equal(parseWindSignal('Bay Bridge traffic hold - all traffic stopped').level, 'HOLD');
  assert.equal(parseWindSignal('US 50 wind gust 55 mph'), null);
});
test('operational status fails closed when official sources are unavailable', () => {
  const status = resolveOperationalState({ sourceHealth: { mdta:{state:'unavailable'}, chartEvents:{state:'unavailable'}, chartMessages:{state:'unavailable'} } });
  assert.equal(status.state, 'UNKNOWN'); assert.equal(status.restrictionLevel, 'UNKNOWN');
});
test('absence of an explicit restriction is not mislabeled OPEN', () => {
  const status = resolveOperationalState({ mdtaText:'Bay Bridge traveler information', sourceHealth:{mdta:{state:'ok'},chartEvents:{state:'ok'},chartMessages:{state:'ok'}} });
  assert.equal(status.state, 'NO_ACTIVE_RESTRICTION_FOUND'); assert.equal(status.restrictionLevel, 'NONE_REPORTED');
});
test('limited restrictions prohibit house and empty box trailers', () => {
  assert.equal(evaluateVehicle({type:'house_trailer'},'LIMITED').state,'PROHIBITED');
  assert.equal(evaluateVehicle({type:'empty_box_trailer'},'LIMITED').state,'PROHIBITED');
  assert.equal(evaluateVehicle({type:'car'},'LIMITED').state,'ALLOWED');
});
test('full restrictions preserve the 64,000-pound tractor-box rule', () => {
  assert.equal(evaluateVehicle({type:'tractor_box_trailer',grossWeightLb:63000},'FULL').state,'PROHIBITED');
  assert.equal(evaluateVehicle({type:'tractor_box_trailer',grossWeightLb:64000},'FULL').state,'ALLOWED');
  assert.equal(evaluateVehicle({type:'tractor_box_trailer'},'FULL').state,'NEEDS_WEIGHT');
});
test('warning cautions motorcycles but does not prohibit them', () => assert.equal(evaluateVehicle({type:'motorcycle'},'WARNING').state,'CAUTION'));
test('tolls are eastbound only and match published two-axle rates', () => {
  assert.equal(calculateToll({direction:'westbound',axles:2,payment:'video'}).amount,0);
  assert.equal(calculateToll({direction:'eastbound',axles:2,payment:'md_ezpass'}).amount,2.5);
  assert.equal(calculateToll({direction:'eastbound',axles:2,payment:'base'}).amount,4);
  assert.equal(calculateToll({direction:'eastbound',axles:2,payment:'video'}).amount,6);
});
test('commercial toll classes preserve MDTA axle schedule', () => {
  assert.equal(calculateToll({direction:'eastbound',axles:5,payment:'base'}).amount,24);
  assert.equal(calculateToll({direction:'eastbound',axles:6,payment:'video'}).amount,45);
});
test('camera normalization keeps nearby US-50 cameras with official video URLs', () => {
  const camera=normalizeCamera({id:'c1',routeNumber:50,description:'US 50 EB east of Exit 32 Oceanic Dr',lat:38.989,lon:-76.43,opStatus:'OK',publicVideoURL:'https://chart.maryland.gov/Video/GetVideo/c1',lastCachedDataUpdateTime:Date.now()});
  assert.ok(camera); assert.match(camera.videoUrl,/chart\.maryland\.gov/);
});
test('traffic summary does not invent travel time from sparse sensors', () => {
  const traffic=summarizeTraffic({events:[],travelTimes:[],messages:[],speeds:[{zones:[{speedMph:52}]},{zones:[{speedMph:48}]}]});
  assert.equal(traffic.state,'MOVING'); assert.equal(traffic.medianApproachSpeedMph,52); assert.equal(traffic.travelTimes.length,0);
});
test('planned advisory stays separate from live operational state', () => {
  const advisory=extractAdvisorySummary('Bay Bridge (US 50/301) Lane Closures and Traffic Patterns Scheduled\nThe eastbound span may be closed for maintenance.\nDuring the full eastbound closure, two-way traffic will operate on the westbound span.');
  assert.equal(advisory.available,true); assert.equal(advisory.twoWayMentioned,true);
});
