'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {
 SOURCES,REGIONS,validateSnapshot,validateReconciliation,verifyMissionLinks,
 missionMarkers,matchArticle,withHistory,readSnapshot,saveSnapshot
}=require('../lib/rocket-official-notices');
const {createHandler}=require('../api/rocket-official-notices')._test;
const NOW=Date.parse('2026-11-05T18:00:00Z'),AT=new Date(NOW).toISOString();
const ID='0f9d86a2-8132-42c6-b203-91d4116b3d17';
const CAL='https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/7000000/ussf-259-launch-announced/';
const dir=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(dir,p),'utf8');
function reconciliation(){
 return {version:1,checkedAt:AT,health:'matched-with-current-ll2',manifestCheckedAt:AT,
  sourceStatus:[
   {id:'wallops-range-blog',region:'virginia',sourceUrl:'https://www.nasa.gov/blogs/wallops-range/',status:'retrieved',articlesChecked:1,candidateCount:0},
   {id:'vandenberg-launch-news',region:'california',sourceUrl:'https://www.vandenberg.spaceforce.mil/News/',status:'retrieved',articlesChecked:1,candidateCount:1},
   {id:'spaceforce-news-rss',region:'california',sourceUrl:'https://www.spaceforce.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1060&max=20',status:'retrieved',articlesChecked:0,candidateCount:0}
  ],
  candidateCount:1,unmatched:0,conflicts:0,
  matches:[{launchId:ID,region:'california',sourceId:'vandenberg-launch-news',
   articleUrl:CAL,noticeTitle:'Vandenberg Space Force approves USSF-259 launch',
   officialEventDate:'2026-11-06',publishedDate:null,missionMarker:'USSF-259',
   sourceFingerprint:'a'.repeat(24),dateDifferenceDays:0,
   matchRule:'exact-designation-and-local-date',
   accessStatus:'not-evaluated',launchStatus:'not-evaluated'}]};
}
function fixture(){
 const regions={};for(const region of REGIONS)regions[region]=[];
 for(const [id,[region,sourceUrl,scope]]of Object.entries(SOURCES)){
  regions[region].push({id,region,sourceUrl,scope,status:'retrieved',
   checkedAt:AT,fingerprint:'b'.repeat(24),signals:[],notes:[]});
 }
 return {version:1,checkedAt:AT,sourceCount:11,regions,reconciliation:reconciliation()};
}
function national(name='USSF-259 | Falcon 9',region='california',net='2026-11-06T22:30:00Z'){
 return {freshness:'recent',checkedAt:AT,complete:true,
  launches:[{id:ID,region,name,net,netPrecision:'minute',sourceStale:false}]};
}
function mockRes(){
 return {code:null,value:null,headers:{},setHeader(k,v){this.headers[k]=v;return this;},
  status(n){this.code=n;return this;},json(x){this.value=x;return this;}};
}
test('strict exact mission tokens cover Starlink Groups, USSF, Artemis; reject generic rockets',()=>{
 assert.deepEqual([...missionMarkers('Starlink Group 15-24 | Falcon 9')],['STARLINK-15-24']);
 assert.deepEqual([...missionMarkers('USSF-259 mission')],['USSF-259']);
 assert.ok(missionMarkers('Artemis III').has('ARTEMIS-III'));
 assert.equal(missionMarkers('Falcon 9 Starship Rocket launch').size,0);
 assert.ok(missionMarkers('TOMEX+').has('TOMEX+'));
});
test('article URL may only belong to approved government launch-article path',()=>{
 assert.equal(matchArticle(CAL,'vandenberg-launch-news'),CAL);
 assert.equal(matchArticle('https://www.nasa.gov/blogs/wallops/2026/11/05/haste-12-launch/','wallops-range-blog'),
  'https://www.nasa.gov/blogs/wallops/2026/11/05/haste-12-launch/');
 assert.equal(matchArticle('https://www.nasa.gov/events/','wallops-range-blog'),null);
 assert.equal(matchArticle('https://www.nasa.gov.evil.example/blogs/wallops/2026/11/05/fake/','wallops-range-blog'),null);
 assert.equal(matchArticle(CAL+'?foo=bar','vandenberg-launch-news'),null);
});
test('signed worker payload accepts verified match but rejects malformed or forged detail',()=>{
 const raw=fixture(),parsed=validateSnapshot(raw,NOW);
 assert.equal(parsed.reconciliation.matches.length,1);
 assert.equal(parsed.reconciliation.matches[0].matchRule,'exact-designation-and-local-date');
 for(const [key,value]of [
  ['sourceId','starbase-city'],['articleUrl','https://evil.example/fake'],
  ['missionMarker','Falcon 9'],['matchRule','date-only'],['accessStatus','open'],
  ['officialEventDate','2026-02-31'],['launchId','other']
 ]){
  const q=reconciliation();q.matches[0][key]=value;
  assert.throws(()=>validateReconciliation(q,NOW),/reconciliation-/,'Should reject '+key);
 }
 const duplicate=reconciliation();duplicate.matches.push({...duplicate.matches[0]});
 assert.throws(()=>validateReconciliation(duplicate,NOW),/reconciliation-match-invalid/);
});
test('mission identity, region and local launch date independently checked against current LL2',()=>{
 const rec=validateReconciliation(reconciliation(),NOW);
 assert.equal(verifyMissionLinks(rec,national()).matches.length,1);
 assert.equal(verifyMissionLinks(rec,national('Falcon 9 generic')).matches.length,0);
 assert.equal(verifyMissionLinks(rec,national(undefined,'texas')).matches.length,0);
 assert.equal(verifyMissionLinks(rec,national(undefined,'california','2026-11-19T22:30:00Z')).matches.length,0);
 assert.equal(verifyMissionLinks(rec,{...national(),freshness:'stale'}).matches.length,0);
 assert.equal(verifyMissionLinks(rec,null).health,'schedule-unavailable');
});
test('bounded mission manifest comes from same Postgres national snapshot, not direct provider',async()=>{
 const handler=createHandler({getNational:async()=>national(),clock:()=>NOW,
  ready:()=>true,read:async()=>({ok:true,version:1,health:'unavailable',regions:{}})});
 let res=mockRes();
 await handler({method:'GET',query:{manifest:'1'}},res);
 assert.equal(res.code,200);assert.equal(res.value.health,'recent');
 assert.equal(res.value.source,'shared-postgres-ll2-national-v2');
 assert.equal(res.value.missions.length,1);assert.equal(res.value.missions[0].id,ID);
 assert.equal(res.value.missions[0].name,'USSF-259 | Falcon 9');
 res=mockRes();await handler({method:'GET',query:{manifest:'yes'}},res);
 assert.equal(res.code,400);
});
test('Postgres write strips matches when the shared schedule has moved or gone stale',async()=>{
 let saved;
 const state={get:async()=>null,set:async(k,value)=>{saved=value;return 'OK';}};
 const result=await saveSnapshot(fixture(),{state,now:NOW,
  getNational:async()=>national('Generic rocket')});
 assert.equal(result.sourceCount,11);
 assert.equal(saved.reconciliation.matches.length,0);
 assert.equal(saved.reconciliation.health,'no-verified-match');
 const second=await saveSnapshot(fixture(),{state,now:NOW,getNational:async()=>national()});
 assert.equal(second.sourceCount,11);assert.equal(saved.reconciliation.matches.length,1);
});
test('official note edits get revision events but cannot assert scrub or range GO',()=>{
 const first=validateSnapshot(fixture(),NOW);
 const withFirst=withHistory(first,null,NOW);
 assert.equal(withFirst.reconciliation.history[0].type,'official-link-first-verified');
 const next=fixture();next.reconciliation.matches[0].officialEventDate='2026-11-07';
 const second=withHistory(validateSnapshot(next,NOW),withFirst,NOW+60000);
 assert.equal(second.reconciliation.history[0].type,'official-event-date-revised');
 assert.doesNotMatch(JSON.stringify(second.reconciliation.history),/scrubbed|range go|launch completed/i);
});
test('outdated source or mission snapshot suppresses positive match without inventing a cancellation',async()=>{
 const raw=withHistory(validateSnapshot(fixture(),NOW),null,NOW);
 const state={get:async()=>raw};
 let v=await readSnapshot({state,ready:()=>true,now:NOW+30000});
 assert.equal(v.reconciliation.matches.length,1);
 v=await readSnapshot({state,ready:()=>true,now:NOW+91*60000});
 assert.equal(v.reconciliation.matches.length,0);
 assert.equal(v.reconciliation.health,'unavailable-or-stale');
});
test('visitor panel uses selected UUID and rejects drift in official-vs-calendar dates',()=>{
 const index=read('public/synced-national-tools/rocket-launch-live/index.html');
 const js=read('public/synced-national-tools/rocket-launch-live/app.js');
 const css=read('public/synced-national-tools/rocket-launch-live/styles.css');
 const py=read('scripts/rocket_official_matcher.py');
 const wf=read('.github/workflows/rocket-official-notices.yml');
 assert.match(index,/id="rl-mission-official-match"/);
 assert.match(index,/20261110-voice-v1/);
 assert.match(js,/m=>m\.launchId===launch\.id/);
 assert.match(js,/dateGap>1/);
 assert.doesNotMatch(js,/No mission-specific official article matched/);
 assert.match(js,/announcement is a good sign, but the time and public viewing rules can still change/i);
 assert.match(css,/\.rl-mission-official-match\[data-status="matched"\]/);
 assert.match(py,/def reconcile\(/);
 assert.match(wf,/rocket_official_matcher\.py/);
 assert.match(wf,/mission-manifest/);
 assert.match(wf,/\.source=="shared-postgres-ll2-national-v2"/);
 assert.match(wf,/The deployed mission manifest is not yet available/);
 new vm.Script(js);
});
