'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),path=require('node:path');
const script=path.join(__dirname,'../scripts/rockhounding/glwu-extract.py');
test('no-key NOAA GRIB2 URL includes a small bbox, height, wave-from direction and period',()=>{
 const p=spawnSync('python3',[script,'--date','20261015','--cycle','06','--print-url'],{encoding:'utf8',timeout:10000});
 assert.equal(p.status,0,p.stderr);
 const url=new URL(p.stdout.trim());
 assert.equal(url.host,'nomads.ncep.noaa.gov');
 assert.equal(url.searchParams.get('file'),'glwu.grlc_2p5km_sr.t06z.grib2');
 assert.equal(url.searchParams.get('dir'),'/glwu.20261015');
 for(const field of ['HTSGW','WVHGT','WVPER','WVDIR'])assert.equal(url.searchParams.get('var_'+field),'on');
});
test('UTC model hours outside 00-23 are rejected without network access',()=>{
 const p=spawnSync('python3',[script,'--date','20261015','--cycle','24','--print-url'],{encoding:'utf8',timeout:10000});
 assert.notEqual(p.status,0);assert.match(p.stderr,/invalid choice/);
});

test('higher-resolution NOAA 500m Great Lakes wave product is available as explicit research option',()=>{
 const p=spawnSync('python3',[script,'--date','20261015','--cycle','12','--grid','500m-greatlakes','--print-url'],{encoding:'utf8',timeout:10000});
 assert.equal(p.status,0,p.stderr);
 const url=new URL(p.stdout.trim());
 assert.equal(url.searchParams.get('file'),'glwu.grlr_500m.t12z.grib2');
 assert.equal(url.searchParams.get('dir'),'/glwu.20261015');
 for(const param of ['HTSGW','WVHGT','WVPER','WVDIR'])assert.equal(url.searchParams.get('var_'+param),'on');
});
test('unsupported NOAA model resolution is rejected before any download',()=>{
 const p=spawnSync('python3',[script,'--date','20261015','--cycle','12','--grid','100m','--print-url'],{encoding:'utf8',timeout:10000});
 assert.notEqual(p.status,0);
 assert.match(p.stderr,/invalid choice/);
});

test('NOAA also publishes hourly Great Lakes research issues without requiring a six-hour boundary',()=>{
 const p=spawnSync('python3',[script,'--date','20261015','--cycle','21','--grid','500m-greatlakes','--print-url'],{encoding:'utf8',timeout:10000});
 assert.equal(p.status,0,p.stderr);
 const url=new URL(p.stdout.trim());
 assert.equal(url.searchParams.get('file'),'glwu.grlr_500m.t21z.grib2');
});
