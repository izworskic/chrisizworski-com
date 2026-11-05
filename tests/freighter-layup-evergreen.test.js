'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const m=require('../lib/freighter-layup-season');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public/assets/freighter-layup.js'),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-layup-registry.json'),'utf8'));
const ledger=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-layup-live-season.json'),'utf8'));

test('November 1 rollover in Detroit works for 2027, 2028, 2029 and 2034',()=>{
 for(const [before,after,past,next] of [
  ['2027-11-01T03:59:59Z','2027-11-01T04:00:00Z','2026-27','2027-28'],
  ['2028-11-01T03:59:59Z','2028-11-01T04:00:00Z','2027-28','2028-29'],
  ['2029-11-01T03:59:59Z','2029-11-01T04:00:00Z','2028-29','2029-30'],
  ['2034-11-01T03:59:59Z','2034-11-01T04:00:00Z','2033-34','2034-35'],
 ]){
  assert.equal(m.seasonForDate(before),past);
  assert.equal(m.seasonForDate(after),next);
 }
});
test('even an empty shipping winter remains in the archive at annual rollover',()=>{
 let live=m.freshSeason('2026-27');
 live=m.rollover(live,'2027-28');
 assert.equal(live.season,'2027-28');
 assert.deepEqual(live.events,[]);
 assert.deepEqual(live.previousSeasons,[{season:'2026-27',events:[]}]);
 assert.deepEqual(m.rollover(live,'2027-28'),live);
 const next=m.rollover(live,'2028-29');
 assert.deepEqual(next.previousSeasons.map(x=>x.season),['2026-27','2027-28']);
 assert.ok(next.previousSeasons.every(x=>x.events.length===0));
});
test('missed publishing cycles preserve source data and do not invent gap-year layups',()=>{
 let initial=m.freshSeason('2026-27');
 const source={vessel:{key:'sample',name:'Sample'},kind:'arrival',harborId:'superior',
  date:'2027-01-18',confidence:'reported',summary:'Winter report',
  source:{url:'https://example.org/arrivals',title:'Report',publisher:'Harbor News',class:'journalistic_report'}};
 initial=m.addEvidence(initial,source,'2027-01-19T10:00:00Z').ledger;
 const jumped=m.rollover(initial,'2029-30');
 assert.deepEqual(jumped.previousSeasons.map(x=>x.season),['2026-27','2027-28','2028-29']);
 assert.equal(jumped.previousSeasons[0].events.length,1);
 assert.equal(jumped.previousSeasons[1].events.length,0);
 assert.equal(jumped.events.length,0);
 assert.throws(()=>m.rollover(initial,'2025-26'),/backward/);
 assert.throws(()=>m.rollover(initial,'2041-42'),/More than 12/);
 assert.throws(()=>m.rollover(initial,'2027-99'),/Invalid target/);
});
test('browser no longer hardcodes current, archive or map reference to specific years',()=>{
 assert.match(app,/winterForDate/);
 assert.match(app,/ensureCurrentSeason/);
 assert.match(app,/latestArchive/);
 assert.doesNotMatch(app,/season:'2026-27'/);
 assert.doesNotMatch(app,/\$\('season'\)\.value='2025-26'/);
 assert.doesNotMatch(app,/id==='2025-26'/);
 assert.match(app,/provisional:true/);
});
test('published ledger and registry agree on active year without copying historical vessels',()=>{
 assert.equal(ledger.season,m.seasonForDate(new Date()),'released source ledger must match the current Detroit winter');
 const year=registry.seasons.find(s=>s.id===ledger.season);
 assert.ok(year);
 assert.equal(year.records.length,0);
 assert.equal(year.state,'upcoming_unconfirmed');
});
