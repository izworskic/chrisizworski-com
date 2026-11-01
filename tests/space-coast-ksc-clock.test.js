'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ksc = require('../lib/space-coast-ksc-viewing');

function mission(net, netPrecision='minute') {
  return {name:"Falcon 9 Block 5 | Crew-13",net,netPrecision,pad:"Space Launch Complex 40"};
}
function header(date, time) {
  return '<div class="event-header-dates__single-row"><span>NET</span>' +
    '<span>' + date + '</span>' + (time ? '<span>' + time + '</span>' : '') + '</div>';
}
test('mission KSC event exact local clock and LL2 agree in EDT', () => {
  const result = ksc.officialClockComparison(
    mission('2026-10-01T15:10:00Z'), '2026-10-01',
    header('October 1, 2026','11:10am')
  );
  assert.equal(result.state,'consistent');
  assert.equal(result.sourceTime,'11:10 AM ET');
});
test('KSC viewing time disagrees with launch schedule by four hours', () => {
  const result = ksc.officialClockComparison(
    mission('2026-10-01T19:10:00Z'), '2026-10-01',
    header('October 1, 2026','11:10am')
  );
  assert.equal(result.state,'different-time');
  assert.equal(result.differenceMinutes,240);
  assert.match(result.detail,/confirm/i);
});
test('source and selected launch are on different local calendar days',()=>{
  const result=ksc.officialClockComparison(
    mission('2026-10-02T15:10:00Z'), '2026-10-01',
    header('October 1, 2026','11:10am')
  );
  assert.equal(result.state,'different-day');
  assert.equal(result.sourceDate,'2026-10-01');
});
test('hour-level and day-level launch targets cannot support exact time comparison',()=>{
  for(const p of ['day','hour','year','unknown']){
    const result=ksc.officialClockComparison(
      mission('2026-10-01T15:10:00Z',p),'2026-10-01',
      header('October 1, 2026','11:10am')
    );
    assert.equal(result.state,'not-comparable');
  }
});
test('official event without published clock time cannot be compared',()=>{
  const result=ksc.officialClockComparison(
    mission('2026-10-01T15:10:00Z'),'2026-10-01',
    header('October 1, 2026',null)
  );
  assert.equal(result.state,'not-comparable');
  assert.equal(result.sourceTime,null);
});
test('time comparison uses America/New_York even on DST transition',()=>{
  const result=ksc.officialClockComparison(
    mission('2026-11-01T06:30:00Z'),'2026-11-01',
    header('November 1, 2026','1:30am')
  );
  assert.equal(result.state,'consistent');
});
