'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const science=require('../lib/garden-pest-science.cjs');
const pest=require('../lib/garden-pest-watch.cjs');
const api=require('../api/garden-pest-timing-lab.js');
const YEARS=science.HISTORIC_YEARS;
function synth(years=YEARS,highC=25,lowC=10){
 const lines=['# Daymet SYNTHETIC TEST ONLY NOT HISTORY','year,yday,tmax (deg c),tmin (deg c)'];
 for(const year of years)for(let yday=1;yday<=365;yday++)lines.push([year,yday,highC,lowC].join(','));
 return lines.join('\n');
}
test('published Japanese beetle thresholds preserved with explicit research-only status',()=>{
 assert.equal(science.MODEL.lowerF,50);assert.equal(science.MODEL.upperF,92);
 assert.deepEqual(science.MODEL.thresholds.map(t=>t.gddF),[873,1543]);
 assert.equal(science.MODEL.status,'EXPERIMENTAL_HISTORICAL_ONLY');
 assert.equal(pest.MODELS.find(m=>m.pest==='japanese-beetle').status,'REFERENCE_ONLY');
 assert.ok(science.MODEL.methodCaveat.includes('NOT been established'));
});
test('single-triangle heat has exact boundary geometry',()=>{
 const d=science.singleTriangleGddF;
 assert.equal(d(40,40),0);assert.equal(d(30,49),0);assert.equal(d(50,50),0);
 assert.equal(d(60,80),20);assert.equal(d(50,70),10);
 assert.ok(Math.abs(d(80,100)-38.4)<1e-9);assert.equal(d(95,107),42);
 assert.ok(Math.abs(d(40,60)-2.5)<1e-9);
});
test('single triangle agrees with independent numerical integration',()=>{
 const cases=[[40,60],[20,95],[10,100],[52,95],[90,96],[45,145],[65,87]];
 for(const [low,high] of cases){
  let sum=0;const n=20000;
  for(let i=0;i<n;i++){
   const phase=(i+.5)/n,temp=low+(high-low)*(phase<.5?2*phase:2-2*phase);
   sum+=Math.max(0,Math.min(92,temp)-50);
  }
  assert.ok(Math.abs(science.singleTriangleGddF(low,high)-sum/n)<.005,low+'-'+high);
 }
});
test('simple-average DD43 is not interchangeable with DD50 triangle',()=>{
 const a=science.simpleAverageGddF(40,80,43),b=science.singleTriangleGddF(40,80,50,92);
 assert.equal(a,17);assert.notEqual(a,b);
});
test('reject unsupported/inverted temperature geometry',()=>{
 for(const args of [[NaN,70],[80,40],[40,Infinity],[-100,50],[50,200],[50,60,92,50]])
  assert.throws(()=>science.singleTriangleGddF(...args),/INVALID_MODEL_TEMPERATURE/);
});
test('Daymet request is bounded to Michigan and five approved historical years',()=>{
 const u=new URL(science.daymetURL(43.5945,-83.8889));
 assert.equal(u.hostname,'daymet.ornl.gov');
 assert.equal(u.searchParams.get('vars'),'tmax,tmin');
 assert.equal(u.searchParams.get('years'),'2021,2022,2023,2024,2025');
 for(const x of [[50,-83],[43.5,-40],[NaN,-83]])assert.throws(()=>science.daymetURL(...x));
 assert.throws(()=>science.daymetURL(43.5,-83.9,[2026]));
 assert.throws(()=>science.daymetURL(43.5,-83.9,[2024,2024]));
});
test('Daymet leap-year 365-day calendar never creates a Dec 31 leap-day record',()=>{
 const data=science.parseDaymetCsv(synth());
 assert.equal(data.size,5);assert.equal(data.get(2024).length,365);
 assert.equal(science.isoForDay(2024,365),'2024-12-30');
 assert.equal(science.isoForDay(2025,365),'2025-12-31');
});
test('missing or duplicate Daymet days void the year',()=>{
 const truncated=synth().split('\n').filter(s=>!s.startsWith('2024,120,')).join('\n');
 assert.throws(()=>science.parseDaymetCsv(truncated),/INCOMPLETE_YEAR_2024/);
 const duplicates=synth().split('\n');duplicates.push('2024,120,25,10');
 assert.throws(()=>science.parseDaymetCsv(duplicates.join('\n')),/DUPLICATE_DAY/);
});
test('reject null, inverted, impossible values and unfamiliar extra years',()=>{
 for(const bad of ['2025,200,,9','2025,200,NaN,9','2025,200,0,10','2025,200,85,10','2025,200,9,-75','2026,200,20,9']){
  const data=bad.startsWith('2026,')?synth()+'\n'+bad:synth().replace(/^2025,200,25,10$/m,bad);
  assert.throws(()=>science.parseDaymetCsv(data));
 }
 assert.throws(()=>science.parseDaymetCsv('<html>temporarily unavailable</html>'));
});
test('history produces two ordered modeled threshold crossing dates, not sightings',()=>{
 const byYear=science.parseDaymetCsv(synth());
 const rows=YEARS.map(y=>science.computeYear(y,byYear.get(y)));
 assert.ok(rows.every(x=>x.events.adults?.yday>0&&x.events.eggs?.yday>0));
 assert.ok(rows.every(x=>x.events.eggs.yday>x.events.adults.yday));
 assert.ok(rows.every(x=>x.eventDescription.includes('not an observed insect')));
 const events=science.summarize(rows);
 assert.equal(events[0].yearsCrossed,5);assert.equal(events[0].status,'HISTORIC_MODELLED');
});
test('missing threshold in one study year removes median and range',()=>{
 const cold=Array.from({length:365},(_,i)=>({year:2023,yday:i+1,tminC:-10,tmaxC:-1}));
 const warm=science.parseDaymetCsv(synth());
 const rows=YEARS.map(y=>y===2023?science.computeYear(y,cold):science.computeYear(y,warm.get(y)));
 const event=science.summarize(rows).find(x=>x.id==='adults');
 assert.equal(event.status,'INCOMPLETE');assert.equal(event.medianYday,null);assert.equal(event.yearsCrossed,4);
});
test('Daymet research data preserve provider, copyright attribution and forecast hold',async()=>{
 const fake=async()=>({ok:true,text:async()=>synth()});
 const d=await science.fetchHistorical(43.5945,-83.8889,fake,Date.UTC(2026,10,2));
 assert.equal(d.status,'HISTORIC_MODELLED_RESEARCH_ONLY');
 assert.equal(d.annual.length,5);
 assert.ok(d.source.url.includes('daymet.ornl.gov'));
 assert.equal(d.realTimeForecast,undefined);
 assert.ok(d.rightsAndParity.includes('DO NOT promote'));
});
test('bad provider response never yields a heat estimate',async()=>{
 for(const response of [{ok:false},{ok:true,text:async()=>'<html>bad</html>'}])
  await assert.rejects(()=>science.fetchHistorical(43.5,-83.9,async()=>response));
});
test('API invalid ZIP returns unavailable before fetching NASA weather',async()=>{
 const req={method:'GET',query:{zip:'99999'}};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(c){this.code=c;return this;},json(o){this.body=o;return this;}};
 await api(req,res);
 assert.equal(res.code,400);assert.equal(res.body.status,'UNAVAILABLE');
});
