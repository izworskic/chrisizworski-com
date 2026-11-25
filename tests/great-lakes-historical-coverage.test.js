'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scope,audit}=require('../scripts/audit-great-lakes-historical-coverage.cjs');
const start='2024-09-01T12:00:00Z',end='2024-09-01T12:10:00Z';
const head='MMSI,time,Lat,Lon,SOG,COG,VesselType,Length\n,UTC,,,,,,\n';
const row=(time,more='46.48,-84.4,8,270,70,200',id='366123456')=>id+',2024-09-01T12:'+time+':00Z,'+more+'\n';
const run=raw=>audit(raw,'soo',start,end);
test('fixed host, site and ten-minute limit',()=>{
 const q=scope('soo',start,end);assert.match(q.url,/^https:\/\/data\.pmel\.noaa\.gov\/pmel\/erddap\/tabledap\/AIS2024_AIS\.csv\?/);
 assert.match(decodeURIComponent(q.url),/time>=2024-09-01T12:00:00Z/);assert.match(decodeURIComponent(q.url),/time<2024-09-01T12:10:00Z/);assert.match(decodeURIComponent(q.url),/Lat>=46.45/);
 assert.throws(()=>scope('other',start,end));assert.throws(()=>scope('soo',start,'2024-09-01T12:11:00Z'));assert.throws(()=>scope('soo','2024-08-31T23:59:00Z','2024-09-01T00:01:00Z'));assert.throws(()=>scope('soo','2024-09-31T00:00:00Z','2024-10-01T00:01:00Z'));
});
test('coverage counts gaps, duplicate rows and unavailable motion without tracks',()=>{
 const raw=head+row('00')+row('00')+row('07','46.48,-84.4,102.3,360,0,0')+row('10')+row('03','46.9,-84.4,8,270,70,200')+row('02','46.48,-84.4,8,270,70,200','366123457');
 const r=run(raw);assert.equal(r.rows,6);assert.equal(r.validUniqueRows,3);assert.equal(r.rejected,2);assert.equal(r.duplicates,1);assert.equal(r.distinctVessels,2);assert.equal(r.observedMinutes,3);assert.equal(r.adjacentPairs,1);assert.equal(r.gapsOverFiveMinutes,1);assert.equal(r.missingMotion,1);assert.equal(r.missingLength,1);assert.equal(r.unknownType,1);assert.equal(r.receiptTimesAvailable,false);assert.equal(r.fieldAccuracyVerified,false);assert.equal(r.productionCalibrationAuthorized,false);assert.equal(r.independentCrossingLabels,0);assert.equal(JSON.stringify(r).includes('366123456'),false);
});
test('reject malformed schema and conflicting records; empty sample is not accuracy',()=>{
 assert.throws(()=>run('<html>error</html>'));assert.throws(()=>run(head.replace('UTC','local')+row('00')));assert.throws(()=>run(head+row('00')+row('00','46.49,-84.4,8,270,70,200')));assert.equal(run(head).validUniqueRows,0);assert.equal(run(head).fieldAccuracyVerified,false);
});
