'use strict';
const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const base='public/lake-superior-circle-tour/10-day/index.html';
const kernel=require('../public/assets/circle-tour-rust-itinerary.js');
const planner=require('../public/assets/circle-tour-traveler-engine.js');
const read=path=>fs.readFileSync(path,'utf8');
function source(){
 const page=read(base);
 const match=page.match(/<script id="ct-traveler-presets" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(match,'Python-rendered visitor route data must be crawlable static HTML');
 return JSON.parse(match[1]);
}
test('Python reconciles all three published routes without inventing extra legs',()=>{
 const run=spawnSync('python3',['scripts/build-circle-tour-trip-intelligence.py','--check'],{encoding:'utf8',timeout:20000});
 assert.equal(run.status,0,run.stderr+run.stdout);
 const src=source();
 const ledger=JSON.parse(read('data/circle-tour-road-evidence.json'));
 const route=[ledger.edges[0].from,...ledger.edges.map(x=>x.to)];
 assert.equal(route.length,31);assert.equal(new Set(route).size,31);
 assert.equal(src.start,'Duluth, Minnesota');
 assert.equal(src.direction,'counterclockwise');
 for(const [n,total] of [[7,1359],[10,1358],[15,1358]]){
  const d=src.options[String(n)].days;
  assert.equal(d.length,n);
  assert.equal(d.reduce((v,x)=>v+x.miles,0),total);
  assert.equal(d[0].stops[0],'1');
  assert.equal(d.at(-1).stops.at(-1),'30');
  assert.equal(d.at(-1).complete,false,'Pigeon River park approach must remain incomplete');
  for(let i=0;i<d.length;i++){
   const x=d[i];
   assert.equal(x.day,i+1);
   assert.ok(x.overnightArea.length>=7,'A reviewed overnight area should be displayed');
   assert.match(x.basis,/not-a-routed-ETA/);
   assert.equal(x.driveAllowanceHours,Math.round(x.miles/47*1.2*100)/100);
   assert.ok(x.miles<=600&&x.miles>=0);
   if(i>0)assert.equal(d[i-1].stops.at(-1),x.stops[0],'Disconnected daily journey');
   for(let j=1;j<x.stops.length;j++)
    assert.equal(route.indexOf(x.stops[j]),route.indexOf(x.stops[j-1])+1,
      'Invented road connection on '+n+' day '+x.day);
   if(x.miles===0)assert.equal(x.stops.length,1,'Stay day must be a real source stop');
   assert.ok(x.highlights.every(stop=>x.stops.includes(stop)));
   if(x.stops.length>1)assert.ok(!x.highlights.includes(x.stops[0]),
     'Previous day departure was recommended twice');
  }
 }
});
test('10 days with a five-hour driving cap flags exact overloaded days and proposes existing 15-day route',()=>{
 const m=planner.compare(source(),{days:10,maxDrive:5,month:8,
  interests:['hiking','waterfalls'],pictured:true},kernel);
 assert.equal(m.chosen.over,2);
 assert.deepEqual(m.chosen.days.filter(x=>x.exceeds).map(x=>x.day),[7,9]);
 assert.equal(m.chosen.days[6].driveHours,5.5);
 assert.equal(m.chosen.days[8].driveHours,7.7);
 assert.equal(m.chosen.days[9].code,4,'Border-to-park day must be withheld');
 assert.equal(m.chosen.uncertain,1);
 assert.equal(m.alternative,15);
 assert.equal(m.options['15'].over,0,'Longer published option helps, but is not a guarantee');
 assert.equal(m.options['15'].uncertain,1,'Longer route does not fill missing border approach');
 assert.ok(m.chosen.days[5].suggestions.some(x=>x.id==='11'&&x.toolUrl==='https://picturedrocks.chrisizworski.com/'),
   'Pictured Rocks must-see is actually connected to the Pictured Rocks day');
 assert.ok(!m.chosen.days[6].suggestions.some(x=>x.id==='11'),
   'Pictured Rocks must-see should not appear on two consecutive days');
 assert.ok(m.chosen.days[9].suggestions.some(x=>x.id==='28'&&x.toolUrl==='/gooseberry-falls/'),
   'Requested waterfall interest should find actual North Shore tool');
});
test('shorter-than-supported driving cap reports failure, never fabricates a new overnight route',()=>{
 const m=planner.compare(source(),{days:15,maxDrive:4,month:8,interests:['hiking'],pictured:true},kernel);
 assert.equal(m.alternative,null);
 assert.equal(m.chosen.over,2);
 assert.deepEqual(m.chosen.days.filter(x=>x.exceeds).map(x=>x.day),[14,15]);
 assert.equal(m.chosen.days[14].code,4);
 assert.equal(m.options['15'].days[13].overnightArea,'Thunder Bay, Ontario');
});
test('calendar changes gate only season-sensitive stops, never invent closures or crossing access',()=>{
 const summer=planner.compare(source(),{days:10,maxDrive:6,month:8,interests:['shipwatch']},kernel);
 const winter=planner.compare(source(),{days:10,maxDrive:6,month:1,interests:['shipwatch']},kernel);
 assert.equal(summer.chosen.seasonal,0);
 assert.ok(winter.chosen.seasonal>0);
 assert.ok(winter.chosen.days.some(x=>x.seasonalHold&&x.code===5));
 assert.equal(winter.chosen.days.at(-1).code,4,
   'Unknown park approach retains precedence over winter suitability');
 assert.ok(summer.chosen.days.some(x=>x.suggestions.some(z=>z.toolUrl==='/soo-locks/')));
});
test('all specialist recommendations come from reviewed source stops, self-hosted photo credits and internal tools',()=>{
 const src=source(),catalog=JSON.parse(read('data/circle-tour-traveler-stops.json'));
 const visual=JSON.parse(read('data/circle-tour-visual-story.json'));
 assert.equal(Object.keys(src.specialists).length,16);
 const photos=new Set([visual.hero.src,...Object.values(visual.days).map(x=>x.photo.src)]);
 for(const [stop,activity] of Object.entries(src.specialists)){
  assert.deepEqual(activity.interests,catalog.stops[stop].interests);
  assert.equal(activity.toolUrl,catalog.stops[stop].toolUrl);
  assert.ok(activity.toolUrl.startsWith('/')||activity.toolUrl==='https://picturedrocks.chrisizworski.com/');
  if(activity.photo){
   assert.ok(photos.has(activity.photo.src),'Specialist photo is not the source-approved local image');
   assert.ok(activity.photo.file.startsWith('https://commons.wikimedia.org/'));
   assert.ok(fs.statSync('public'+activity.photo.src).size>5000);
  }
 }
 const page=read(base);
 assert.match(page,/id="ct-personalize"/);
 assert.match(page,/id="ct-prefer-drive"/);
 assert.match(page,/id="ct-prefer-pictured"/);
 assert.match(page,/ct-traveler-presets/);
 assert.match(page,/circle-tour-traveler-engine\.js/);
 assert.match(page,/circle-tour-traveler-ui\.js/);
 assert.match(page,/id="ct-prefer-copy"/);
 assert.match(page,/id="ct-prefer-print"/);
 assert.ok(page.indexOf('id="plan-your-trip"')<page.indexOf('id="ten-days"'));
 assert.doesNotMatch(read('public/assets/circle-tour-traveler-ui.js'),/adsbygoogle|googlesyndication/);
});
test('adversarial preference parameters never select unsupported routes, months, or tool interests',()=>{
 const x=planner.settings({days:31,maxDrive:0,month:99,interests:['nonsense','hiking','shipwatch'],pictured:false});
 assert.equal(x.days,10);assert.equal(x.maxDrive,5);assert.equal(x.month,8);
 assert.deepEqual(x.interests,['hiking','shipwatch']);
 assert.equal(x.pictured,false);
 assert.throws(()=>planner.compare({version:1,start:'unknown',options:{}},x,kernel),/Unverified/);
});
