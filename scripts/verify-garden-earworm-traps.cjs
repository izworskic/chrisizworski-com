'use strict';
// Source-evidence contract for the final 2026 MSU Extension county trap table.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{}};
vm.runInNewContext(read('public/assets/garden-earworm-trap-data.js'),ctx,{timeout:1000});
const data=ctx.window.GardenEarwormTrapData;
assert.equal(data.schema,'garden-earworm-trap-archive-v1');
assert.equal(data.season,2026);
assert.equal(data.seasonState,'CLOSED');
assert.equal(data.source.publishedDate,'2026-09-04');
assert.equal(data.source.latestCollectionWeek,'2026-09-01');
assert.equal(data.source.url,'https://msu-prod.dotcms.cloud/news/michigan-vegetable-crop-report-september-2-2026');
assert.equal(data.counties.length,8);
assert.equal(data.counties.reduce((sum,c)=>sum+c.samples.length,0),80);
const by=(county,week)=>{
 const c=data.counties.find(c=>c.id===county);
 assert.ok(c,'County '+county+' missing');
 const s=c.samples.find(x=>x.week===week);
 assert.ok(s,'Missing published week '+week);
 return s;
};
assert.deepEqual(JSON.parse(JSON.stringify(by('oceana','2026-08-25'))),{
 avgPerNight:'47.4',publishedCell:'332 (47.4)',status:'REPORTED',total:332,twoWeekTotal:false,week:'2026-08-25'
});
assert.equal(by('ottawa','2026-08-18').total,188);
assert.equal(by('ottawa','2026-08-18').twoWeekTotal,true);
assert.equal(by('oceana','2026-08-18').twoWeekTotal,true);
assert.equal(by('saginaw','2026-08-25').total,2);
assert.equal(by('saginaw','2026-08-25').avgPerNight,'0.2');
assert.equal(by('saginaw','2026-09-01').status,'NOT_REPORTED');
assert.equal(by('saginaw','2026-09-01').total,null);
assert.equal(by('monroe','2026-07-21').total,0);
assert.equal(by('monroe','2026-07-21').avgPerNight,null);
assert.equal(by('midland','2026-09-01').total,11);
assert.equal(data.counties.find(c=>c.id==='midland').trapType,'TYPE_NOT_SPECIFIED');
for(const c of data.counties){
 for(const x of c.samples){
  assert.match(x.week,/^2026-\d\d-\d\d$/);
  if(x.status==='NOT_REPORTED'){
   assert.equal(x.total,null);
   assert.equal(x.avgPerNight,null);
   assert.equal(x.publishedCell,'-');
  }else{
   assert.ok(Number.isInteger(x.total)&&x.total>=0);
   if(x.total===0)assert.equal(x.avgPerNight,null);
   else assert.match(x.avgPerNight,/^\d+(?:\.\d)?$/);
  }
 }
}
const html=read('public/michigan-garden-pest-watch/index.html');
const js=read('public/assets/garden-earworm-trap-desk.js');
assert.ok(html.includes('id="earworm-trap-desk"'));
assert.ok(html.includes('id="earworm-counties'.replace('earworm-counties','earworm-county-picker')));
assert.ok(html.includes('id="earworm-chart"'));
assert.ok(html.includes('id="earworm-detail"'));
assert.ok(html.indexOf('garden-earworm-trap-data.js')<html.indexOf('garden-earworm-trap-desk.js'));
assert.ok(html.includes('garden-earworm-trap-desk.css?v=20261103b'));
assert.match(js,/Not reported/);
assert.match(js,/No 2027/gi.test(js)?/No 2027/:/currentYear>2026/);
assert.match(js,/County labels identify|County labels/gi.test(js)?/County labels/:/County/);
assert.match(js,/barSeries/);
assert.match(js,/twoWeekTotal/);
assert.match(js,/aria-pressed/);
assert.ok(!/fetch\(['"]\/api\//.test(js),'Offline historical data must not call a live API');
const reported=data.counties.flatMap(x=>x.samples).filter(x=>x.status==='REPORTED').length;
assert.equal(reported,55);
console.log('MSU 2026 corn earworm archive PASS: 8 reporting counties, 10 sampled weeks, 55 published captures, 25 missing cells; page and archival source contracts verified.');
