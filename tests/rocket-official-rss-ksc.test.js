'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {validateReconciliation,matchArticle,verifyMissionLinks,missionMarkers}=require('../lib/rocket-official-notices');
const root=path.resolve(__dirname,'..'),get=p=>fs.readFileSync(path.join(root,p),'utf8');
const DAY=Date.parse('2026-11-05T18:00:00Z'),STAMP=new Date(DAY).toISOString();
const ORIGIN='https://www.spaceforce.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1060&max=20';
const PERMALINK='https://www.spaceforce.mil/News/Article-Display/Article/7000000/ussf-259-vandenberg-launch/';
const UUID='0f9d86a2-8132-42c6-b203-91d4116b3d17';
function evidence(){
 const sources=[
  {id:'wallops-range-blog',region:'virginia',sourceUrl:'https://www.nasa.gov/blogs/wallops-range/',status:'retrieved',articlesChecked:0,candidateCount:0},
  {id:'vandenberg-launch-news',region:'california',sourceUrl:'https://www.vandenberg.spaceforce.mil/News/',status:'unavailable',articlesChecked:0,candidateCount:0},
  {id:'spaceforce-news-rss',region:'california',sourceUrl:ORIGIN,status:'retrieved',articlesChecked:1,candidateCount:1}
 ];
 return {version:1,checkedAt:STAMP,manifestCheckedAt:STAMP,
  health:'matched-with-current-ll2',sourceStatus:sources,candidateCount:1,
  unmatched:0,conflicts:0,
  matches:[{launchId:UUID,region:'california',sourceId:'spaceforce-news-rss',
   articleUrl:PERMALINK,noticeTitle:'U.S. Space Force approves USSF-259 mission from Vandenberg',
   officialEventDate:'2026-11-06',publishedDate:'2026-11-05',
   missionMarker:'USSF-259',sourceFingerprint:'f'.repeat(24),
   dateDifferenceDays:0,matchRule:'official-rss-exact-designation-and-local-date',
   accessStatus:'not-evaluated',launchStatus:'not-evaluated'}]};
}
test('Space Force official RSS provenance and event mission is accepted, but only with distinct rule',()=>{
 const q=validateReconciliation(evidence(),DAY);
 assert.equal(q.sourceStatus.length,3);
 assert.equal(q.matches.length,1);
 assert.equal(q.matches[0].sourceId,'spaceforce-news-rss');
 assert.equal(q.matches[0].accessStatus,'not-evaluated');
 assert.equal(matchArticle(PERMALINK,'spaceforce-news-rss'),PERMALINK);
 assert.equal(matchArticle('https://fake.spaceforce.mil/News/Article-Display/Article/7000000/ussf-259/', 'spaceforce-news-rss'),null);
 assert.equal(matchArticle('https://www.spaceforce.mil/News/Article-Display/Article/7000000/ussf-259/?h=1','spaceforce-news-rss'),null);
 assert.equal(matchArticle('https://www.spaceforce.mil/News/Article-Display/Article/7000000/ussf-259/','vandenberg-launch-news'),null);
});
test('generic vehicle, cross-coast, wrong date, and fabricated GO cannot be accepted',()=>{
 const q=validateReconciliation(evidence(),DAY);
 const current={freshness:'recent',launches:[{id:UUID,region:'california',name:'Falcon 9 | USSF-259',
   net:'2026-11-07T00:46:00Z',sourceStale:false}]};
 assert.equal(verifyMissionLinks(q,current).matches.length,1);
 assert.equal(verifyMissionLinks(q,{...current,launches:current.launches.map(x=>({...x,name:'Falcon 9',}))}).matches.length,0);
 assert.equal(verifyMissionLinks(q,{...current,launches:current.launches.map(x=>({...x,region:'florida'}))}).matches.length,0);
 assert.equal(verifyMissionLinks(q,{...current,launches:current.launches.map(x=>({...x,net:'2026-11-16T00:46:00Z'}))}).matches.length,0);
 for(const [prop,value]of [['matchRule','exact-designation-and-local-date'],
   ['accessStatus','open'],['launchStatus','GO'],
   ['articleUrl','https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/7000000/ussf-259/'],
   ['sourceId','vandenberg-launch-news']]){
  const e=evidence();e.matches[0][prop]=value;
  assert.throws(()=>validateReconciliation(e,DAY),/reconciliation-match-invalid/,prop);
 }
});
test('unknown and duplicate official sources fail closed, no inferred mission absence',()=>{
 const q=evidence();q.sourceStatus[2].sourceUrl='https://random.net/RSS/';
 assert.throws(()=>validateReconciliation(q,DAY),/reconciliation-source-invalid/);
 const dup=evidence();dup.sourceStatus[2]={...dup.sourceStatus[1]};
 assert.throws(()=>validateReconciliation(dup,DAY),/reconciliation-source-invalid/);
 const missing=evidence();missing.sourceStatus.splice(2,1);
 assert.throws(()=>validateReconciliation(missing,DAY),/reconciliation-source-inventory-invalid/);
});
test('Florida KSC viewing bridge explicitly checks mission ID, calendar health, source origin and event date',()=>{
 const js=get('public/synced-national-tools/rocket-launch-live/app.js');
 const html=get('public/synced-national-tools/rocket-launch-live/index.html');
 const css=get('public/synced-national-tools/rocket-launch-live/styles.css');
 assert.match(js,/KSC_OFFICIAL_API = '\/api\/space-coast-ksc-watch'/);
 assert.ok(js.includes("KSC_OFFICIAL_API+'?launchId='"));
 assert.match(js,/timeline\.verifiedPageIsRecent===true/);
 assert.match(js,/health\.status==='checked'\|\|health\.status==='partial'/);
 assert.match(js,/evidence\.selectedLaunchId===launch\.id/);
 assert.match(js,/dateGap<=1/);
 assert.match(js,/state\.kscRequest/);
 assert.match(js,/root\.hidden=!florida/);
 assert.match(js,/KSC published a viewing event for this mission/);
 assert.match(js,/A matched KSC event is not admission/);
 assert.match(js,/official-rss-exact-designation-and-local-date/);
 assert.match(html,/id="rl-ksc-official-viewing"/);
 assert.match(html,/20261110-voice-v1/);
 assert.match(css,/\.rl-ksc-match\[hidden\]/);
 new vm.Script(js);
});
test('signed Python workflow retains two independent source families and official RSS safety fixtures',()=>{
 const wf=get('.github/workflows/rocket-official-notices.yml');
 const python=get('scripts/rocket_official_matcher.py');
 assert.match(python,/spaceforce-news-rss/);
 assert.match(python,/ElementTree|xml\.etree/);
 assert.match(python,/rss_article_url/);
 assert.match(python,/official_rss_events/);
 assert.match(wf,/test_rocket_official_rss\.py/);
 assert.match(wf,/getIDToken/);
 assert.match(wf,/20261106-official-rss-ksc-v1/);
 assert.match(wf,/rocket-release-probe\.html/);
 assert.doesNotMatch(python,/supabase|redis|ll\.thespacedevs\.com/);
});
