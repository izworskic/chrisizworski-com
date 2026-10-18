'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../lib/shed-window.cjs');
const site=path.join(__dirname,'../public/michigan-shed-antlers');
test('location catalog has unique real regional forecast points, not shed locations',()=>{
 const ids=E.LOCATIONS.map(s=>s.id);
 assert.equal(ids.length,new Set(ids).size);
 assert.ok(ids.length>=12);
 for(const s of E.LOCATIONS){
  assert.ok(s.lat>40&&s.lat<49&&s.lon> -95&&s.lon< -82,s.id);
  assert.ok(s.name&&s.region);
 }
 assert.equal(E.lookup('something-invalid'),null);
});
test('seasonal context never turns weather into an antler drop forecast',()=>{
 assert.equal(E.phase(new Date('2026-10-18T12:00:00Z')),'OFF_SEASON');
 assert.equal(E.phase(new Date('2027-02-01T12:00:00Z')),'SEARCH_SEASON');
 const day={date:'2027-02-02',highF:45,lowF:27,snowHours:0,rainHours:0,thawHours:6,maxWindMph:9};
 assert.equal(E.judge(day,'bare','OFF_SEASON').score,null);
 assert.equal(E.judge(day,'unknown','SEARCH_SEASON').score,null);
 assert.equal(E.judge(day,'deep','SEARCH_SEASON').status,'protect-wildlife');
 assert.equal(E.judge(day,'bare','SEARCH_SEASON').status,'good');
});
test('fresh snow and harsh conditions decrease visibility suitability, not shedding probability',()=>{
 const day={date:'2027-02-02',highF:41,lowF:27,snowHours:0,rainHours:0,thawHours:6,maxWindMph:9};
 const good=E.judge(day,'patchy','SEARCH_SEASON');
 const snow=E.judge({...day,snowHours:10},'patchy','SEARCH_SEASON');
 const windy=E.judge({...day,maxWindMph:30},'patchy','SEARCH_SEASON');
 assert.ok(good.score>snow.score);
 assert.ok(good.score>windy.score);
 assert.equal(E.judge(null,'bare','SEARCH_SEASON').score,null);
});
test('daily forecast aggregates only dated actual NWS hourly periods',()=>{
 const periods=[];
 for(let h=0;h<24;h++)periods.push({startTime:'2027-02-04T'+String(h).padStart(2,'0')+':00:00-05:00',temperature:h<12?20:42,shortForecast:h<4?'Chance Snow':'Partly Cloudy',windSpeed:'5 mph'});
 const d=E.summarizeDay(periods,'2027-02-04');
 assert.equal(d.highF,42);assert.equal(d.lowF,20);assert.equal(d.snowHours,4);assert.equal(d.thawHours,12);
 assert.equal(E.summarizeDay(periods,'2027-02-03'),null);
});
test('page has first-party map, provenance, snow selector, required author identity',()=>{
 const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(site,'app.js'),'utf8');
 const api=fs.readFileSync(path.join(__dirname,'../api/shed-antlers.js'),'utf8');
 assert.match(html,/\/winter-eagle-watching\/midwest-vector-map\.svg/);
 assert.match(html,/ground/);
 assert.match(html,/noaa\.gov\/nsa/);
 assert.match(html,/chrisizworski\.com\/#person/);
 assert.match(html,/rel="canonical"/);
 assert.match(app,/aria-pressed/);
 assert.match(api,/X-Robots-Tag/);
 assert.doesNotMatch(html,/predict.*when.*deer.*drop/i);
});
