'use strict';
const fs=require('node:fs'),path=require('node:path');
const test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('public/lake-superior-circle-tour/index.html');
const source=JSON.parse(read('data/circle-tour-trip-intelligence.json'));
const adapter=require('../public/assets/circle-tour-rust-itinerary.js');
test('road evidence is editorially scoped; four partial legs cannot be promoted to complete road miles',()=>{
 const gaps=source.sourceGaps;
 assert.equal(gaps.length,4);
 assert.deepEqual(gaps.map(g=>g.from+'-'+g.to),['7-8','12-31','31-13','20-21']);
 for(const gap of gaps){
   assert.equal(gap.status,'partial');
   assert.match(gap.editorialNote,/not |without|but |must not|no |cannot/i);
   assert.ok(gap.references.some(r=>r.url.startsWith('https://')));
   const section=html.match(new RegExp('id="stop-'+gap.to+'"[^>]*>[\\s\\S]*?</article>'))?.[0]||'';
   assert.match(section,/class="stop-dist" data-edge-verified="false"/);
 }
 assert.equal(source.dayNotes['4'].overnight,'L\'Anse / Baraga, Michigan');
});
test('Rust-backed JavaScript day-budget oracle distinguishes room, tight, over and unsupported',()=>{
 assert.equal(adapter.fitDay({miles:87,minutes:540,visit:90,border:0,basis:1}),1);
 assert.equal(adapter.fitDay({miles:192,minutes:540,visit:90,border:45,basis:1}),2);
 assert.equal(adapter.fitDay({miles:303,minutes:540,visit:90,border:0,basis:1}),3);
 assert.equal(adapter.fitDay({miles:303,minutes:660,visit:90,border:0,basis:1}),2);
 assert.equal(adapter.fitDay({miles:87,minutes:540,visit:90,border:0,basis:0}),4);
 assert.equal(adapter.fitDay({miles:NaN,minutes:540,visit:90,border:0,basis:1}),0);
 assert.equal(adapter.fitDay({miles:87,minutes:540,visit:90,border:200,basis:1}),0);
});
test('Python-generated day data reconciles original source and does not claim routed mileage',()=>{
 const result=JSON.parse(read('public/assets/circle-tour-trip-intelligence.json'));
 assert.equal(result.stopCount,31);
 assert.equal(result.unresolvedCorridors.length,4);
 for(const [duration,total] of [[7,1359],[10,1358],[15,1358]]){
   const plan=result.itineraries[String(duration)];
   assert.equal(plan.days.length,duration);
   assert.equal(plan.totalPublishedMiles,total);
   assert.equal(plan.days.reduce((v,d)=>v+d.miles,0),total);
   assert.match(plan.basis,/not-routed/);
   assert.equal(plan.days[0].stops[0],'1');
   assert.equal(plan.days.at(-1).stops.at(-1),'30');
   for(const day of plan.days){
     assert.equal(day.drivePlanningMinutes,Math.round(day.miles/47*1.2*60));
     assert.equal(day.visitPlanningMinutes,90);
   }
 }
 assert.equal(result.itineraries['10'].days[8].miles,303);
 assert.equal(result.itineraries['10'].days[7].borderReserveMinutes,45);
 assert.equal(result.itineraries['10'].days[9].borderReserveMinutes,45);
});
test('SEO 10-day guide is substantive static HTML, canonical and internally discoverable',()=>{
 const guide=read('public/lake-superior-circle-tour/10-day/index.html');
 assert.match(guide,/rel="canonical" href="https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/10-day\//);
 assert.match(guide,/<title>Lake Superior Circle Tour 10-Day Itinerary:/);
 assert.equal((guide.match(/<article class="day" id="day-/g)||[]).length,10);
 assert.match(guide,/Wawa-to-Thunder Bay|Wawa-to-Thunder|Wawa.*Thunder Bay/i);
 assert.match(guide,/four road legs|Four road legs/i);
 assert.match(guide,/data-preset="10"/);
 assert.match(guide,/BreadcrumbList/);
 assert.doesNotMatch(guide,/Product|aggregateRating|offers/);
 assert.match(html,/href="\/lake-superior-circle-tour\/10-day\/"/);
 assert.match(read('public/assets/lake-superior-circle-tour.js'),/circle-tour-feasibility-ui/);
 assert.match(read('public/sitemap.xml'),/https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/10-day\//);
 assert.doesNotMatch(read('public/assets/circle-tour-feasibility-ui.js'),/adsbygoogle|pagead2\.googlesyndication/);
});
