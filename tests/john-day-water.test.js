'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseHourly,localReportDate}=require('../lib/john-day-water');
const sample='<h1>John Day Dam</h1><table><tr><th>Hour</th><th>Total Outflow kcfs</th><th>Generation Flow kcfs</th><th>Spill kcfs</th><th>Forebay Elevation</th><th>Tailwater Elevation</th><th>Average Head</th></tr><tr><td>1</td><td>131.00</td><td>79.20</td><td>50.90</td><td>263.62</td><td>160.72</td><td>102.90</td></tr><tr><td>2</td><td> </td><td></td><td></td><td></td><td></td><td></td></tr></table>';
test('extracts verified numerical row, does not convert blanks into zero',()=>{const a=parseHourly(sample,'2026-07-10');assert.equal(a.observations.length,1);assert.equal(a.observations[0].outflowKcfs,131);assert.equal(a.observations[0].spillKcfs,50.9);});
test('rejects unrelated projects and malformed reports',()=>{assert.throws(()=>parseHourly('<h1>McNary</h1>','2026-07-10'));assert.throws(()=>parseHourly('<h1>John Day</h1><table></table>','2026-07-10'));});
test('reads local date in Pacific time at UTC boundary',()=>{assert.equal(localReportDate(new Date('2026-07-10T02:10:00Z')),'2026-07-09');});
