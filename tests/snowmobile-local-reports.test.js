import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const desk=require('../lib/snowmobile/local-reports.cjs');
const api=require('../api/snowmobile-local-reports.js');
const nov=new Date('2026-11-13T21:00:00.000Z');
const dec=new Date('2026-12-15T20:00:00.000Z');
const html=(condition,reportDate,groomed)=>`<html><nav>Groomer Reports</nav><section><h1>Example Snowmobile Trail Report</h1><ul><li>Trail Condition: ${condition}</li><li>Last Groomed: ${groomed}</li><li>Reported On: ${reportDate} @ 8:04am</li></ul><h2>Groomer Report</h2><p>Older posts: GREAT conditions in January 2024, not live.</p></section></html>`;
const stale=html('Excellent','March 12th, 2026','January 01st, 1970');
const current=html('Good','December 15th, 2026','December 14th, 2026');

test('nineteen verified sources resolve to six geographically scoped operator rosters',()=>{
 const keys=['eastern-up','keweenaw-copper-country','central-western-up','northeast-sunrise','northwest-michigan','west-michigan'];
 assert.deepEqual(Object.keys(desk.CLUBS),keys);
 const urls=new Set();
 for(const key of keys){
  const records=desk.roster(key);
  assert.equal(records.length,key==='keweenaw-copper-country'?4:3,key);
  for(const r of records){
    assert.ok(r.name.length>3&&r.scope.length>4,key);
    assert.ok(/^https:\/\/misorva\.org\/trail-reports\/[a-z0-9-]+\/$/.test(r.url)||r.url==='https://www.keweenawsnowmobileclub.com/trail-conditions/',key+': '+r.url);
    assert.equal(urls.has(r.url),false,'duplicate regional source '+r.url);
    urls.add(r.url);
  }
 }
 assert.equal(urls.size,19);
 assert.equal(desk.roster('grayling-gaylord'),null,'existing legacy corridor preserved');
 assert.equal(desk.roster('../eastern-up'),null);
});
test('structured MISORVA published date is different from source fetch/check date',()=>{
 const p=desk.extractHtml(stale);
 assert.deepEqual(p,{condition:'Excellent',reportedAt:'2026-03-12',lastGroomedAt:null});
 assert.equal(desk.freshState(p.reportedAt,nov),'STALE');
 assert.equal(desk.dayAge(p.reportedAt,nov)>200,true);
 assert.equal(desk.localDay(nov),'2026-11-13');
 assert.equal(desk.parseDate('January 01st, 1970'),null,'1970 groom date is placeholder');
 assert.equal(desk.parseDate('February 30th, 2026'),null);
 assert.equal(desk.parseDate('March 15th, 2026'),'2026-03-15');
 assert.equal(desk.extractHtml('<html>Unstructured but excellent groomer report</html>'),null);
});
test('stale excellent cannot be used as a current surface observation or grooming record',()=>{
 const r=desk.buildReport(desk.roster('eastern-up')[0],desk.extractHtml(stale),nov);
 assert.equal(r.state,'STALE');
 assert.equal(r.reportedAt,'2026-03-12');
 assert.equal(r.condition,null);
 assert.equal(r.lastGroomedAt,null);
 assert.equal(r.groomingFreshness,'NOT_CURRENT');
 assert.equal(r.scope,'LOCAL_ONLY');
 assert.match(r.advisory,/does not override DNR closure/);
 assert.ok(!('rideScore'in r)&&!('open'in r)&&!('recommended'in r));
});
test('pre-season recent structured report cannot become riding advice',()=>{
 const p=desk.extractHtml(html('Excellent','November 13th, 2026','November 13th, 2026'));
 const r=desk.buildReport(desk.roster('west-michigan')[0],p,nov);
 assert.equal(r.state,'RECENT');
 assert.equal(r.reportedAt,'2026-11-13');
 assert.equal(r.condition,null,'do not suggest excellent riding before Dec 1');
 assert.equal(r.groomingFreshness,'NOT_CURRENT');
});
test('in-season dated club condition is scoped to one club, without changing DNR routing',()=>{
 const p=desk.extractHtml(current);
 const r=desk.buildReport(desk.roster('west-michigan')[0],p,dec);
 assert.equal(r.state,'RECENT');
 assert.equal(r.condition,'Good');
 assert.equal(r.groomingFreshness,'RECENT');
 assert.equal(r.lastGroomedAt,'2026-12-14');
 assert.equal(r.scope,'LOCAL_ONLY');
 assert.ok(!('closureState'in r)&&!('routeState'in r));
});
test('reject future report and grooming dates and unsupported condition labels',()=>{
 const p=desk.extractHtml(html('Superb','December 15th, 2026','December 15th, 2026'));
 assert.equal(p.condition,null);
 const r=desk.buildReport(desk.roster('west-michigan')[0],p,nov);
 assert.equal(r.state,'UNDATED');
 assert.equal(r.reportedAt,null);assert.equal(r.condition,null);assert.equal(r.lastGroomedAt,null);
 assert.equal(desk.parseDate('April 31st, 2026'),null);
});
test('independent per-club source failure never creates optimistic conditions',async()=>{
 const records=desk.roster('northeast-sunrise');
 const fake=async url=>url===records[1].url?Promise.reject(Error('source down')):{ok:true,text:async()=>stale};
 const result=await desk.checkRegion('northeast-sunrise',nov,fake);
 assert.equal(result.reports.length,3);
 assert.equal(result.reports[1].state,'UNAVAILABLE');
 assert.equal(result.reports[1].condition,null);
 assert.equal(result.reports[0].state,'STALE');
 assert.equal(result.totals.available,2);
 assert.equal(result.totals.recent,0);
 assert.equal(result.checkedAt,nov.toISOString());
 assert.ok(result.sourceDirectory.includes('misorva.org'));
});
test('report parser only accepts structured header, not words in archived narrative',()=>{
 const s=html('See Report Below','March 12th, 2026','January 01st, 1970').replace('Groomer Report</h2>','Groomer Report</h2><p>Excellent in March');
 const r=desk.extractHtml(s);
 assert.equal(r.condition,null);
 assert.equal(r.reportedAt,'2026-03-12');
});
test('an old dated groomer narrative vetoes a newer structured wrapper timestamp',()=>{
 const source=desk.roster('eastern-up')[0];
 const conflicting='<html><h1>Sault Snowmobile Association Trail Report</h1><ul><li>Trail Condition: Good</li><li>Last Groomed: November 12th, 2026</li><li>Reported On: November 13th, 2026 @ 2:04pm</li></ul><h2>Groomer Report</h2><p>1/13/25 – all trails are now opened and groomed. This 2025 text is NOT a report for 2026.</p></html>';
 const parsed=desk.extractHtml(conflicting);
 assert.equal(parsed.reportedAt,'2026-11-13');
 assert.equal(parsed.narrativeAt,'2025-01-13');
 const report=desk.buildReport(source,parsed,nov);
 assert.equal(report.state,'DATE_CONFLICT');
 assert.equal(report.dateConflict,true);
 assert.equal(report.condition,null,'old narrative cannot become an in-season GOOD result');
 assert.equal(report.groomingFreshness,'NOT_CURRENT','conflicting club timestamp must veto current grooming');
 assert.equal(report.reportedAt,'2026-11-13','retain auditable source header');
 assert.equal(report.narrativeAt,'2025-01-13','retain contradictory narrative date');
 const result=desk.extractHtml(conflicting.replace('1/13/25','11/12/26'));
 assert.equal(result.narrativeAt,'2026-11-12');
 assert.equal(desk.buildReport(source,result,nov).state,'RECENT','near-date narrative must not be vetoed');
});
test('official Keweenaw club season-ending page is dated local context, never legal open status',()=>{
 const source=desk.roster('keweenaw-copper-country')[0];
 assert.equal(source.url,'https://www.keweenawsnowmobileclub.com/trail-conditions/');
 assert.equal(source.kind,'direct-club');
 const html='<html><nav>Trail Conditions</nav><h2>Trail Conditions</h2><p>4/1/26</p><p>The season has ended. All trails north of Calumet are closed until spring breakup.</p></html>';
 const parsed=desk.extractKeweenawHtml(html);
 assert.deepEqual(parsed,{condition:null,reportedAt:'2026-04-01',lastGroomedAt:null});
 const report=desk.buildReport(source,parsed,nov);
 assert.equal(report.state,'STALE');
 assert.equal(report.condition,null);
 assert.equal(report.groomingFreshness,'NOT_CURRENT');
 assert.ok(!('legalOpen'in report)&&!('rideScore'in report));
 assert.equal(desk.extractKeweenawHtml('<html><p>Trail Conditions: summer says all open</p></html>'),null);
 assert.equal(desk.parseNumericDate('2/30/26'),null);
 assert.equal(desk.parseNumericDate('1/13/25'),'2025-01-13');
});
test('source reconciliation produces a distinct date-conflict count and does not treat it as recent',async()=>{
 const records=desk.roster('eastern-up');
 const conflicting=html('Good','November 13th, 2026','November 13th, 2026').replace('Older posts: GREAT conditions in January 2024','1/13/25 – all trails are now open');
 const fake=async()=>({ok:true,text:async()=>conflicting});
 const result=await desk.checkRegion('eastern-up',nov,fake);
 assert.equal(result.totals.monitored,3);
 assert.equal(result.totals.conflicts,3);
 assert.equal(result.totals.recent,0);
 assert.equal(result.totals.stale,3);
 for(const r of result.reports)assert.equal(r.state,'DATE_CONFLICT');
});

function res(){return {status(v){this.code=v;return this;},setHeader(k,v){(this.headers||={})[k]=v;},json(v){this.payload=v;return this;}}}
test('the report API requires a known region and never alters main DNR route payload',async()=>{
 const original=globalThis.fetch;
 api._test.clearCache();
 try{
  const invalid=res();await api({method:'GET',query:{region:'../../admin'}},invalid);assert.equal(invalid.code,400);
  const post=res();await api({method:'POST',query:{region:'west-michigan'}},post);assert.equal(post.code,405);
  globalThis.fetch=async()=>({ok:true,text:async()=>stale});
  const reply=res();await api({method:'GET',query:{region:'west-michigan'}},reply);
  assert.equal(reply.code,200);assert.equal(reply.payload.totals.monitored,3);
  assert.equal(reply.payload.totals.recent,0);
  for(const r of reply.payload.reports){assert.equal(r.condition,null);assert.equal(r.scope,'LOCAL_ONLY');}
  assert.equal(reply.headers['X-Robots-Tag'],'noindex, nofollow');
 }finally{globalThis.fetch=original;api._test.clearCache();}
});
test('all six generated region pages have a local desk and the original corridor stays unchanged',()=>{
 const generator=readFileSync(new URL('../scripts/generate-snowmobile-region-pages.mjs',import.meta.url),'utf8');
 const core=readFileSync(new URL('../public/assets/snowmobile-region.js',import.meta.url),'utf8');
 for(const region of Object.keys(desk.CLUBS)){
  const html=readFileSync(new URL('../public/snowmobile/regions/'+region+'.html',import.meta.url),'utf8');
  for(const marker of ['id="localClubDesk"','id="localClubReports"','/assets/snowmobile-local-reports.js','/assets/snowmobile-region.js','id="parkingPlanner"','id="routePlanner"','google-adsense-account']){
   assert.ok(html.includes(marker),region+' missing '+marker);
  }
  assert.match(html,/rel="canonical"/);
  assert.ok(html.includes('condition report does not override DNR closures'));
 }
 const corridor=readFileSync(new URL('../public/snowmobile/regions/grayling-gaylord.html',import.meta.url),'utf8');
 assert.ok(!corridor.includes('id="localClubDesk"'));
 assert.ok(!corridor.includes('/assets/snowmobile-local-reports.js'));
 assert.ok(generator.includes('localDeskBlock'));
 assert.ok(!core.includes('localClubDesk'),'legacy rendering and routing untouched');
});
