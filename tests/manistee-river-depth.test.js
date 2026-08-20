const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const conditions=require('../api/manistee-river-conditions.js')._test;
const weather=require('../api/manistee-river-weather.js')._test;

const depth=fs.readFileSync('public/assets/manistee-river-live-depth.js','utf8');
const data=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const api=fs.readFileSync('api/manistee-river-conditions.js','utf8');
const wxApi=fs.readFileSync('api/manistee-river-weather.js','utf8');

test('seasonal USGS comparison is descriptive and preserves missing statistics',()=>{
  assert.deepEqual(conditions.flowContext(100,{p50:100}),{key:'near-median',label:'Near the seasonal median',percent_of_median:100});
  assert.equal(conditions.flowContext(150,{p50:100}).key,'well-above-median');
  assert.equal(conditions.flowContext(null,{p50:100}).key,'unknown');
  assert.equal(conditions.flowContext(100,{p50:null}).percent_of_median,null);
});

test('USGS daily-stat RDB parser resolves columns by name instead of brittle offsets',()=>{
  const fixture=[
    '# test',
    'agency_cd\tsite_no\tparameter_cd\tstat_cd\tbegin_yr\tend_yr\tmonth_nu\tday_nu\tp10_va\tp25_va\tp50_va\tp75_va\tp90_va',
    '5s\t15s\t5s\t5s\t4s\t4s\t2s\t2s\t10n\t10n\t10n\t10n\t10n',
    'USGS\t04123500\t00060\t00003\t1990\t2025\t8\t20\t110\t130\t150\t170\t200'
  ].join('\n');
  const out=conditions.parseStatsRdb(fixture,'04123500',new Date('2026-08-20T12:00:00Z'));
  assert.equal(out.p10,110);assert.equal(out.p50,150);assert.equal(out.p90,200);
});

test('Manistee condition endpoint requests Au Sable-depth sensor fields without requiring them',()=>{
  assert.match(api,/00010,00060,00065,63680,00300/);
  assert.match(api,/turbidity_fnu:null/);
  assert.match(api,/dissolved_oxygen_mgl:null/);
  assert.match(api,/USGS_STAT/);
  assert.match(api,/statTypeCd/);
  assert.match(api,/p10,p25,p50,p75,p90/);
});

test('selected-access weather is exact-point NWS context with hourly, daily and alerts',()=>{
  assert.equal(weather.validPoint(44.26,-85.94),true);
  assert.equal(weather.validPoint(40,-85),false);
  assert.equal(weather.precipContext([{probabilityOfPrecipitation:80}]).key,'high');
  assert.match(wxApi,/forecastHourly/);
  assert.match(wxApi,/alerts\/active\?point=/);
  assert.match(wxApi,/predict fish activity/);
});

test('river key is explicitly on the left and distinguishes river roles and map points',()=>{
  assert.match(depth,/left:14px/);
  assert.match(depth,/River key/);
  assert.match(depth,/Manistee mainstem/);
  assert.match(depth,/Pine \/ tributaries/);
  assert.match(depth,/Little Manistee companion/);
  assert.match(depth,/River access/);
  assert.match(depth,/USGS gauge/);
});

test('every selected place receives a deeper exact-access intelligence card',()=>{
  for(const token of ['Access type','Best for','Location trust','Reach context','River right now','Weather near this access','Before you go'])assert.match(depth,new RegExp(token));
  assert.match(depth,/nearestGauge\(p,conditions\.gauges\)/);
  assert.match(depth,/manistee-river-weather\?lat=\$\{p\.lat\}&lon=\$\{p\.lon\}/);
  assert.match(depth,/straight-line from the access/);
  assert.match(depth,/A gauge describes its own location, not the entire reach/);
});

test('deep context keeps source and safety boundaries visible',()=>{
  assert.match(depth,/Only shown when this USGS station reports it/);
  assert.match(depth,/does not measure river conditions or determine whether wading, paddling, boating or fishing is safe/);
  assert.doesNotMatch(depth,/Prime|Fishing Well|Blown Out|Drop everything|Stay home/);
  assert.doesNotMatch(depth,/localStorage|sessionStorage/);
});

test('optional depth layer does not become a dependency of the core map',()=>{
  assert.match(data,/Optional decision layers are additive/);
  assert.match(data,/manistee-river-live-depth\.js/);
  assert.match(data,/manistee-river-personas\.js/);
});
