// Multi-region waterfall day planner: source-safe selection, date guard and persistent trip cautions.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const {PRESETS,RESTRICTED,datePolicy,assess}=require('../public/assets/up-waterfalls-regional-clusters.js');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/up-waterfalls.json'),'utf8')).waterfalls;
const source=new Map(data.map(x=>[x.id,x]));
const page=fs.readFileSync(path.join(root,'public/upper-peninsula-waterfalls/index.html'),'utf8');
const sheet=fs.readFileSync(path.join(root,'public/assets/up-waterfalls-day-sheet.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/up-waterfalls.css'),'utf8');
const ids=Object.values(PRESETS).flat();
const cards=new Map([...new Set(ids)].map(id=>[id,{dataset:{status:source.get(id).status,arrivalVerified:'verified'},querySelector:sel=>sel==='.save'?{click(){}}:null}]));
test('all stops already have vetted visitor-guide records and no closure is in presets',()=>{
 assert.deepEqual(PRESETS['keweenaw-parks'],['eagle-river-falls','haven-falls']);
 assert.deepEqual(PRESETS['keweenaw-gorge'],['eagle-river-falls','haven-falls','manganese-falls']);
 assert.deepEqual(PRESETS['black-river-one'],['great-conglomerate-falls']);
 assert.deepEqual(PRESETS['black-river-corridor'],['great-conglomerate-falls','potawatomi-falls','gorge-falls','rainbow-falls']);
 for(const id of new Set(ids)){
  const r=source.get(id);assert.ok(r,id);assert.equal(r.publication,'verified-access-guide',id);
  assert.equal(r.verification.parking.verified,true,id);assert.equal(r.verification.trail.verified,true,id);
  assert.ok(r.source.startsWith('https://'),id);
  assert.notEqual(r.status,'closed',id);assert.notEqual(r.status,'research',id);
 }
 assert.ok(source.get('sandstone-falls').status==='closed');
 assert.ok(!ids.includes('sandstone-falls'));
 assert.deepEqual([...RESTRICTED].sort(),['gorge-falls','potawatomi-falls','rainbow-falls'].sort());
});
test('extended gorge and construction day never presented as confirmed open, winter fails closed',()=>{
 for(const date of ['2026-12-01','2027-01-01','2027-02-28','2027-03-31']){
  assert.equal(datePolicy(date).snow,true,date);
  assert.equal(assess('keweenaw-gorge',cards,[],date).ok,false,date);
  assert.equal(assess('black-river-corridor',cards,[],date).ok,false,date);
  assert.equal(assess('keweenaw-parks',cards,[],date).ok,true,'conditional park day, not a guarantee');
  assert.equal(assess('black-river-one',cards,[],date).ok,true,'candidate fall retains caution');
 }
 assert.equal(assess('keweenaw-gorge',cards,[],'').ok,false);
 assert.equal(assess('black-river-corridor',cards,[],'').ok,false);
 for(const d of ['2027-02-30','2027-13-01','banana'])assert.equal(datePolicy(d).valid,false,d);
 assert.equal(datePolicy('2027-05-20').snow,false);
});
test('six-stop selection gate is atomic, restricted stops require research preset',()=>{
 assert.deepEqual(assess('black-river-corridor',cards,['great-conglomerate-falls'],'2027-05-20').missing,
   ['potawatomi-falls','gorge-falls','rainbow-falls']);
 assert.equal(assess('black-river-corridor',cards,['a','b','c'],'2027-05-20').ok,false);
 assert.equal(assess('black-river-corridor',cards,[],'2027-05-20').researchOnly,true);
 assert.equal(assess('keweenaw-gorge',cards,[],'2027-06-01').ok,true);
 assert.equal(assess('not-real',cards,[],'2027-06-01').ok,false);
 const broken=new Map(cards);
 broken.set('potawatomi-falls',{dataset:{status:'closed',arrivalVerified:'verified'},querySelector:()=>({})});
 assert.equal(assess('black-river-corridor',broken,[],'2027-06-01').ok,false);
 const lost=new Map(cards);
 lost.set('haven-falls',{dataset:{status:'verify',arrivalVerified:'pending'},querySelector:()=>({})});
 assert.equal(assess('keweenaw-parks',lost,[],'2027-06-01').ok,false);
});
test('existing hub remains canonical; both regional clusters and official sources present',()=>{
 assert.equal((page.match(/id="regional-waterfall-clusters"/g)||[]).length,1);
 for(const id of ['keweenaw-waterfall-day','black-river-waterfall-day'])assert.ok(page.includes('id="'+id+'"'));
 for(const preset of Object.keys(PRESETS))assert.ok(page.includes('data-regional-preset="'+preset+'"'),preset);
 for(const id of new Set(ids))assert.ok(page.includes('href="/upper-peninsula-waterfalls/'+id+'/"'),id);
 assert.ok(page.includes('Sandstone Falls — CLOSED'));
 assert.ok(page.includes('https://www.fs.usda.gov/r09/ottawa/alerts/black-river-waterfall-platforms-and-trails-undergoing-major-repairs'));
 assert.ok(page.includes('https://www.visitkeweenaw.com/listing/manganese-falls/607/'));
 assert.ok(page.indexOf('/assets/up-waterfalls-regional-clusters.js')>page.indexOf('/assets/up-waterfalls-day-sheet.js'));
 assert.match(page,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/upper-peninsula-waterfalls\/"/);
 const region=page.split('<section class="regional-waterfall-clusters"')[1].split('<section class="nearby-lab"')[0];
 assert.doesNotMatch(region,/maps\/dir\/|data-parking-lat|data-parking-lng/);
 assert.match(css,/\.regional-waterfall-clusters/);
 assert.match(sheet,/regionalNotesFor/);
 assert.match(sheet,/Sandstone Falls is closed/);
 assert.match(sheet,/Manganese Falls: no independently certified visitor parking coordinate/);
});
