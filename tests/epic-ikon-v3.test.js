'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../public/assets/epic-ikon-2026-27.js');
const V=require('../public/assets/epic-ikon-v3.js');
const PAGE=fs.readFileSync(path.resolve(__dirname,'../public/epic-ikon-pass/index.html'),'utf8');

test('Vail restricted holiday always remains BLOCKED',()=>{
 const input={pass:'epicLocal',resort:'vail',date:'2026-12-31',usedDays:'0'};
 const r=E.evaluate(input);
 assert.equal(r.status,'NO');assert.equal(r.reason,'blackout');
 assert.equal(V.commitment(r).code,'BLOCKED');
 const next=E.nextDate(input,30);
 assert.ok(next);assert.ok(next.date>'2026-12-31');
 assert.notEqual(next.status,'NO');
});
test('Unrestricted Epic does not assert lift availability',()=>{
 const r=E.evaluate({pass:'epic',resort:'vail',date:'2026-12-31'});
 assert.equal(r.status,'YES');
 assert.equal(V.commitment(r).code,'RULES_ALLOW_PLAN');
 assert.match(V.commitment(r).next,/verify/i);
});
test('Aspen/Snowmass pool and resort special-case regressions',()=>{
 assert.equal(E.evaluate({pass:'ikonBase',resort:'aspen-mountain',date:'2027-01-12'}).status,'NO');
 assert.equal(E.evaluate({pass:'ikonBase',resort:'snowmass',date:'2027-01-12'}).status,'CHECK');
 assert.equal(E.evaluate({pass:'ikon',resort:'snowmass',date:'2027-01-12',usedDays:'7'}).status,'NO');
});
test('Reservation remains a primary gate and day-pass details are never assumed',()=>{
 assert.equal(E.evaluate({pass:'ikon',resort:'jackson-hole',date:'2027-01-12',usedDays:'0',reservationMade:'no'}).status,'ACTION');
 assert.equal(V.commitment(E.evaluate({pass:'ikon',resort:'jackson-hole',date:'2027-01-12',usedDays:'0'})).code,'NEEDS_ACTION');
 assert.equal(E.evaluate({pass:'epicDay',resort:'vail',date:'2026-12-31'}).status,'UNKNOWN');
});
test('Media are correctly attributed winter/arrival references with commercial-compatible Creative Commons URLs',()=>{
 assert.equal(V.MEDIA.length,3);
 assert.equal(new Set(V.MEDIA.map(x=>x.id)).size,3);
 assert.equal(V.MEDIA.filter(x=>x.season==='WINTER').length,2);
 assert.equal(V.MEDIA.filter(x=>x.season==='SUMMER').length,1);
 for(const item of V.MEDIA){
   assert.match(item.sourcePage,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
   assert.match(item.licenseUrl,/^https:\/\/creativecommons\.org\/licenses\/by/);
   assert.equal(item.rights,'CC');assert.match(item.src,/^https:\/\/(?:thumb|upload)\.wikimedia\.org\/wikipedia\/commons\//);
   assert.ok(item.captureDate&&item.photographer&&item.exactSubject&&item.alt&&item.why);
 }
});
test('Mapped points are specific verified features, not invented lift entrances',()=>{
 assert.equal(V.PLACES.length,5);
 assert.deepEqual(V.PLACES.map(x=>x.id),['den','ege','vail-parking','lionshead-center','golden-peak']);
 for(const p of V.PLACES){
   assert.ok(Number.isFinite(p.lat)&&Number.isFinite(p.lon));
   assert.ok(p.lat>39&&p.lat<41&&p.lon< -104&&p.lon> -108);
   assert.ok(p.sourceUrl&&p.note);
 }
 assert.ok(!V.PLACES.some(x=>/gondola/i.test(x.name)));
});
test('Arrival advice never turns a group preference into made-up times, routes, lifts or booking inventory',()=>{
 for(const ability of ['novice','intermediate','advanced','mixed']){
   for(const arrival of ['town','transit','drive','uncertain']){
     const p=V.chosenArrival({ability,arrival});
     assert.ok(p.title&&p.text&&p.source.startsWith('https://www.vail.com/'));
     assert.doesNotMatch(p.text,/guaranteed|available hotel|minutes to lift|safe to drive/i);
   }
 }
});
test('V3 page preserves canonical SEO ownership, pass engine and deliberately loads map only when requested',()=>{
 assert.match(PAGE,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/epic-ikon-pass\/">/);
 assert.match(PAGE,/https:\/\/chrisizworski\.com\/#person/);
 assert.match(PAGE,/Built by Chris Izworski/);
 assert.match(PAGE,/pass_decoder_check/);
 assert.match(PAGE,/epic-ikon-2026-27\.js/);
 assert.match(PAGE,/epic-ikon-v3\.js/);
 assert.match(PAGE,/data-v3-map="region"/);
 assert.match(PAGE,/data-v3-map="arrival"/);
 assert.match(PAGE,/data-v3-map="terrain"/);
 assert.match(PAGE,/Source-linked trip brief|source-linked trip brief/i);
 assert.doesNotMatch(PAGE,/<script[^>]+(?:redis|anthropic)/i);
});


test('15 direct season-policy scenarios never turn absent proof into an entitled day',()=>{
 const cases=[
  ['Epic Local blocked at Vail New Year', {pass:'epicLocal',resort:'vail',date:'2026-12-31'},'NO'],
  ['Epic Vail published rules yes', {pass:'epic',resort:'vail',date:'2026-12-31'},'YES'],
  ['Epic Local post-peak with pool available', {pass:'epicLocal',resort:'vail',date:'2027-01-04',usedDays:0},'YES'],
  ['Epic Local pool unknown', {pass:'epicLocal',resort:'vail',date:'2027-01-04'},'CHECK'],
  ['Epic Local pool exhausted', {pass:'epicLocal',resort:'vail',date:'2027-01-04',usedDays:10},'NO'],
  ['Ikon Base Aspen excluded', {pass:'ikonBase',resort:'aspen-mountain',date:'2027-01-12'},'NO'],
  ['Ikon Base Snowmass day bank unknown', {pass:'ikonBase',resort:'snowmass',date:'2027-01-12'},'CHECK'],
  ['Ikon Full shared pool exhausted', {pass:'ikon',resort:'snowmass',date:'2027-01-12',usedDays:7},'NO'],
  ['Ikon Full shared pool has days', {pass:'ikon',resort:'snowmass',date:'2027-01-12',usedDays:2},'YES'],
  ['Jackson reservation no', {pass:'ikon',resort:'jackson-hole',date:'2027-01-12',usedDays:0,reservationMade:'no'},'ACTION'],
  ['Jackson reservation reported yes', {pass:'ikon',resort:'jackson-hole',date:'2027-01-12',usedDays:0,reservationMade:'yes'},'YES'],
  ['Epic Day missing product choice', {pass:'epicDay',resort:'vail',date:'2026-12-31'},'UNKNOWN'],
  ['Epic Day without holiday option', {pass:'epicDay',resort:'vail',date:'2026-12-31',epicDayTotal:2,epicPeak:'no',usedDays:0},'NO'],
  ['Epic Day purchased peak option', {pass:'epicDay',resort:'vail',date:'2026-12-31',epicDayTotal:2,epicPeak:'yes',usedDays:0},'YES'],
  ['Invalid impossible date', {pass:'epicLocal',resort:'vail',date:'2027-02-30'},'UNKNOWN'],
 ];
 for(const [label,input,expected]of cases){
    const verdict=E.evaluate(input);
    assert.equal(verdict.status,expected,label);
    const commit=V.commitment(verdict);
    if(expected==='NO')assert.equal(commit.code,'BLOCKED',label);
    if(expected==='YES')assert.equal(commit.code,'RULES_ALLOW_PLAN',label);
    if(expected==='CHECK'||expected==='ACTION')assert.equal(commit.code,'NEEDS_ACTION',label);
    if(expected==='UNKNOWN')assert.equal(commit.code,'NOT_YET_VERIFIABLE',label);
 }
});
test('All proposed Vail media use visible historical provenance and no 2026 winter claim',()=>{
 for(const item of V.MEDIA) assert.ok(Number(item.captureDate.slice(0,4))<=2012);
 assert.ok(V.MEDIA.every(x=>x.exactSubject.toLowerCase().includes('vail')||x.exactSubject.includes('Lionshead')));
 assert.match(PAGE,/Historical|historical/);
});


test('A multi-date holiday visit cannot be represented as all-days covered',()=>{
 const input={pass:'epicLocal',resort:'vail',date:'2026-12-29',usedDays:'0'};
 const trip=V.projectTripDates(E,input,'2027-01-02');
 assert.equal(trip.valid,true);
 assert.equal(trip.rows.length,5);
 assert.deepEqual(trip.rows.map(day=>day.verdict.status),['NO','NO','NO','YES','YES']);
 assert.equal(trip.rows.filter(day=>day.verdict.status==='NO').length,3);
});
test('Shared resort allowance projects each planned day without resetting the bank',()=>{
 const input={pass:'epicLocal',resort:'vail',date:'2026-12-31',usedDays:'9'};
 const trip=V.projectTripDates(E,input,'2027-01-02');
 assert.equal(trip.valid,true);
 assert.deepEqual(trip.rows.map(day=>day.verdict.status),['NO','YES','NO']);
});
test('Invalid date ranges cannot become an eligible trip',()=>{
 const input={pass:'epic',resort:'vail',date:'2027-01-02'};
 assert.equal(V.projectTripDates(E,input,'2026-12-31').valid,false);
 assert.equal(V.projectTripDates(E,input,'2027-02-01').valid,false);
 assert.equal(V.projectTripDates(E,{...input,date:'2027-02-30'},'2027-03-02').valid,false);
});
test('Whole-trip status visible at source and separate from individual policy evaluation',()=>{
 assert.match(PAGE,/projectTripDates\(E,args/);
 assert.match(PAGE,/blocked\.length\?"Trip contains blocked ski dates"/);
 assert.match(PAGE,/id="v3-end-date"/);
 assert.match(PAGE,/id="v3-day-by-day"/);
 assert.match(PAGE,/id="v3-static-map"/);
});
