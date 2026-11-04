'use strict';
// Quality gate for Python-compiled regional climate evidence. No pest counts,
// observed emergence, present-year alerts, or runtime scraping are permitted.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const sandbox={window:{}};
vm.runInNewContext(file('public/assets/garden-pest-python-fieldbook-data.js'),sandbox,{timeout:1800});
const d=JSON.parse(JSON.stringify(sandbox.window.GardenPestRegionalFieldbook));
const ids=['bay-city','detroit','grand-rapids','kalamazoo','traverse-city','marquette','houghton'];
assert.equal(d.schema,'garden-pest-python-regional-fieldbook-v1');
assert.equal(d.purpose,'HISTORICAL_GRIDDED_HEAT_RECONSTRUCTION_NOT_FORECAST');
assert.deepEqual(d.sourceYears,[2021,2022,2023,2024,2025]);
assert.equal(d.audit.locationCount,7);
assert.equal(d.audit.yearsPerLocation,5);
assert.equal(d.audit.completeClimateLocationYears,35);
assert.equal(d.audit.dailyWeatherValuesVerified,12775);
assert.equal(d.audit.confirmedPestPresenceRecords,0);
assert.equal(d.audit.operationalModelParity,'NOT_ESTABLISHED');
assert.equal(d.weatherSource.provider,'NASA ORNL DAAC Daymet V4 R1');
assert.match(d.weatherSource.citation,/ORNLDAAC\/2129/);
assert.deepEqual(d.cities.map(c=>c.id),ids);
assert.deepEqual(d.models.map(m=>m.id),['japanese-beetle','cabbage-maggot']);
const japan=d.models[0],cabbage=d.models[1];
assert.equal(japan.method,'SINGLE_TRIANGLE_HORIZONTAL_CUTOFF');
assert.equal(japan.lowerF,50);assert.equal(japan.upperF,92);
assert.deepEqual(japan.stages.map(s=>s.thresholdGddF),[873,1543]);
assert.equal(japan.methodParity,'NOT_VALIDATED_AGAINST_LIVE_DDRP');
assert.equal(cabbage.method,'ASSUMED_DAILY_MEAN_BASE43');
assert.equal(cabbage.lowerF,43);assert.equal(cabbage.start,'March 1');
assert.equal(cabbage.methodParity,'MSU_DEGREE_DAY_METHOD_NOT_SPECIFIED_ON_PUBLIC_PAGE');
assert.deepEqual(cabbage.stages.map(s=>s.thresholdGddF),[300,1476,2652]);
for(const c of d.cities){
 assert.match(c.sourcePath,new RegExp('^data/garden-pest-daymet-2021-2025/'+c.id+'\\.csv$'));
 assert.ok(c.referencePoint.lat>=41&&c.referencePoint.lat<49);
 assert.ok(c.referencePoint.lon<=-81.9&&c.referencePoint.lon>=-90.7);
 assert.equal(c.years.length,5);
 const stages=[...japan.stages,...cabbage.stages];
 for(let i=0;i<5;i++){
  const y=c.years[i];assert.equal(y.year,d.sourceYears[i]);
  assert.deepEqual(Object.keys(y.events).sort(),stages.map(x=>x.id).sort());
  for(const s of stages){
   const value=y.events[s.id];
   if(value!==null)assert.match(value,new RegExp('^'+y.year+'-\\d\\d-\\d\\d$'));
  }
 }
 for(const s of stages){
  const summary=c.summary[s.id];
  assert.equal(summary.yearsTotal,5);
  assert.equal(summary.yearsReached,c.years.filter(y=>y.events[s.id]!==null).length);
  if(summary.yearsReached<5){
   assert.equal(summary.earliestMonthDay,null);assert.equal(summary.latestMonthDay,null);
  }else{
   const dates=c.years.map(y=>y.events[s.id].slice(5)).sort();
   assert.equal(summary.earliestMonthDay,dates[0]);
   assert.equal(summary.latestMonthDay,dates[4]);
  }
 }
}
const bay=d.cities.find(c=>c.id==='bay-city');
assert.equal(bay.summary['japanese-adults'].earliestMonthDay,'06-22');
assert.equal(bay.summary['japanese-adults'].latestMonthDay,'07-02');
assert.equal(bay.summary['cabbage-first'].earliestMonthDay,'05-04');
assert.equal(bay.summary['cabbage-first'].latestMonthDay,'05-14');
const html=file('public/michigan-garden-pest-watch/index.html');
const js=file('public/assets/garden-pest-python-fieldbook.js');
assert.ok(html.includes('id="pest-regional-fieldbook"'));
assert.ok(html.includes('id="pest-python-status"'));
assert.ok(html.includes('id="pest-python-ladder"'));
assert.ok(html.includes('id="pest-python-years"'));
assert.ok(html.includes('garden-pest-python-fieldbook.css?v=20261104a'));
assert.ok(html.indexOf('garden-pest-python-fieldbook-data.js')<html.indexOf('garden-pest-python-fieldbook.js'));
assert.ok(html.indexOf('id="history-lab"')<html.indexOf('id="pest-regional-fieldbook"'));
assert.ok(html.indexOf('id="pest-regional-fieldbook"')<html.indexOf('id="report-heading"'));
assert.match(js,/not observed flight|not observed/i);
assert.match(js,/2021|yearsExpected/);
assert.ok(!/\bfetch\(/.test(js),'Historical data are frozen into the page; no NASA requests at runtime');
assert.ok(!/\bDate\.now\(|new Date\(\)/.test(js),'Past archive data cannot claim to represent the current season');
console.log('Python pest regional fieldbook PASS: 7 actual Daymet region-series; 35 complete weather-years; five threshold stages; historical-only browser source contract.');
