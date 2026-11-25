'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {plan,inspect}=require('../scripts/shorefeel-archive-coverage.cjs');
test('fixed archive sample is bounded and distinguishes actual model products',()=>{
 const p=plan();assert.equal(p.length,16);assert.equal(p.filter(x=>x.kind==='regular-grid-schema').length,9);
 assert.ok(p.every(x=>x.cap<=1048576&&x.url.startsWith('https://')));
 assert.ok(p.some(x=>x.url.includes('2026/10/lmhofs.t00z.20261020.regulargrid.f048.nc.dds')));
});
test('schemas, catalog keys and observations are not interchangeable',()=>{
 assert.equal(inspect({kind:'regular-grid-schema'},'Dataset { Float32 temp[time = 1]; } x;').status,'SCHEMA_PRESENT');
 assert.equal(inspect({kind:'regular-grid-schema'},'<html>error</html>').status,'UNEXPECTED_SCHEMA');
 const c=inspect({kind:'native-catalog'},'<ListBucketResult><Key>lmhofs.stations.forecast.nc</Key><IsTruncated>false</IsTruncated></ListBucketResult>');
 assert.equal(c.keyCount,1);assert.equal(c.status,'CATALOG_RESPONSE');
 const o=inspect({kind:'ndbc-current-year'},'#YY MM DD hh mm WTMP\n#yr mo dy hr mn degC\n2026 11 22 00 00 0.0\n2026 11 22 00 01 MM\n2026 11 22 00 02 999\n');
 assert.equal(o.validWaterRows,1);assert.equal(o.sampledDays['2026-11-22'],1);
});
