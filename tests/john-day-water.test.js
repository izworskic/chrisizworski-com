'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseHourly,localReportDate,sourceUrl}=require('../lib/john-day-water');
const original=fs.readFileSync(path.join(__dirname,'fixtures/john-day-2026-07-10.html'),'utf8');
test('actual 24-hour USACE fixture roundtrips dates, values, units and daily summary',()=>{
 const x=parseHourly(original,'2026-07-10');
 assert.equal(x.observations.length,24);assert.equal(x.observedHours,24);
 assert.equal(x.completeness,'complete');assert.deepEqual(x.missingHours,[]);
 assert.equal(x.observations[0].outflowKcfs,131);
 assert.equal(x.observations[6].outflowKcfs,203.2);
 assert.equal(x.observations[23].spillKcfs,50.9);
 assert.equal(x.summary.peakHour,7);assert.equal(x.summary.maximumOutflowKcfs,203.2);
 assert.equal(x.summary.averageOutflowKcfs,146.26);
 assert.equal(x.units.flow,'thousand cubic feet per second');
});
test('stale/wrong-date report cannot be displayed as the requested day',()=>{
 assert.throws(()=>parseHourly(original,'2026-10-21'),/date\/project/);
});
test('wrong project and shifted columns are rejected',()=>{
 assert.throws(()=>parseHourly(original.replace('John Day Dam</h1>','McNary Dam</h1>'),'2026-07-10'),/Wrong project/);
 assert.throws(()=>parseHourly(original.replace('Total Outflow kcfs','Turbine MW'),'2026-07-10'),/columns/);
});
test('invalid numeric and missing rows fail closed',()=>{
 const mutilated=original.replace(/<tr><td class="time">\s*1<\/td>[\s\S]*?<\/tr>/,'');
 assert.equal(parseHourly(mutilated,'2026-07-10').completeness,'partial');
 const fewer=original.replace(/<tr><td class="time">\s*(?:1|2|3|4|5|6|7|8|9|10)<\/td>[\s\S]*?<\/tr>/g,'');
 assert.throws(()=>parseHourly(fewer,'2026-07-10'),/Insufficient/);
});
test('local day at UTC boundary respects Pacific timezone',()=>{
 assert.equal(localReportDate(new Date('2026-07-10T02:10:00Z')),'2026-07-09');
 assert.equal(localReportDate(new Date('2026-12-10T02:10:00Z')),'2026-12-09');
});
test('formatted upstream query uses a specific date and project',()=>{
 assert.match(sourceUrl('2026-07-10'),/r=jda&date=7%2F10%2F2026/);
});
