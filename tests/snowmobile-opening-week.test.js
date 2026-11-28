import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {clubEvidence,evaluate}=require('../public/assets/snowmobile-comparison.js');
const now=Date.parse('2026-12-03T15:00:00Z'),key='eastern-up';
const record={name:'Example club',state:'RECENT',reportedAt:'2026-12-03',lastGroomedAt:'2026-12-02',groomingFreshness:'RECENT',condition:'Good'};
const bundle=(reports=[record],time=now)=>({region:key,checkedAt:new Date(time).toISOString(),reports});
test('dated recent club posting and grooming remain local, not route evidence',()=>{
 const c=clubEvidence(bundle(),key,now);
 assert.equal(c.recent,1);assert.equal(c.groomed,1);assert.equal(c.reports[0].condition,'Good');
 const unknown={key,route:{score:null,band:'UNKNOWN',legalVerification:'CURRENT_LAYER_CHECKED'},clubEvidence:c};
 assert.equal(evaluate(unknown,{active:true,fresh:true,closuresVerified:true},{driveMinutes:40}).tripCandidate,false);
});
test('pre-season, stale, future, invalid and conflicting dates never establish current grooming',()=>{
 const nov=Date.parse('2026-11-24T15:00:00Z');
 const c=clubEvidence(bundle([{...record,reportedAt:'2026-11-24',lastGroomedAt:'2026-11-24'}],nov),key,nov);
 assert.equal(c.recent,1);assert.equal(c.groomed,0);assert.equal(c.reports[0].condition,null);
 for(const overrides of [{reportedAt:'2026-11-25'},{reportedAt:'2026-12-04'},{reportedAt:'2026-02-30'},{state:'DATE_CONFLICT'},{dateConflict:true},{state:'UNAVAILABLE'},{reportedAt:null}]){
  const r=clubEvidence(bundle([{...record,...overrides}]),key,now);
  assert.equal(r.recent,0);assert.equal(r.groomed,0);assert.equal(r.reports[0].condition,null);
 }
 const futureGroom=clubEvidence(bundle([{...record,lastGroomedAt:'2026-12-04'}]),key,now);
 assert.equal(futureGroom.groomed,0);
});
test('receipt expires, cannot borrow checked time or another region, and rechecks Michigan calendar age',()=>{
 assert.equal(clubEvidence(bundle([record],now-30*60000-1),key,now),null);
 assert.equal(clubEvidence(bundle([record],now+1),key,now),null);
 assert.equal(clubEvidence(bundle(),'west-michigan',now),null);
 assert.equal(clubEvidence(bundle([]),key,now),null);
 const localMidnight=Date.parse('2026-12-05T05:01:00Z');
 const receipt=clubEvidence(bundle([{...record,reportedAt:'2026-12-01'}],localMidnight),key,localMidnight);
 assert.equal(receipt.recent,0);
});
test('partial club checks do not imply absence of grooming',()=>{
 const c=clubEvidence(bundle([record,{...record,state:'UNAVAILABLE'},{...record,state:'DATE_CONFLICT'}]),key,now);
 assert.equal(c.monitored,3);assert.equal(c.available,2);assert.equal(c.recent,1);assert.equal(c.groomed,1);assert.equal(c.conflicts,1);
});
test('statewide client uses existing endpoint with bounded concurrency and retains original links and ranking',()=>{
 const html=readFileSync(new URL('../public/snowmobile/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../public/assets/snowmobile-index.js',import.meta.url),'utf8');
 assert.match(html,/id="club-coverage" role="status"/);
 assert.match(html,/id="club-refresh"/);
 assert.ok(html.includes('/assets/snowmobile-comparison.js?v=20261127-freshness'));
 assert.ok(html.includes('/assets/snowmobile-index.js?v=20261127-freshness'));
 assert.ok(js.includes('/api/snowmobile-local-reports?region='));
 assert.ok(js.includes('Math.min(3,regions.length)'));
 assert.ok(js.includes('comparison.compare(BUNDLE.regions'));
 assert.ok(js.includes('NWS hub outlook (next six forecast periods)'));
});
