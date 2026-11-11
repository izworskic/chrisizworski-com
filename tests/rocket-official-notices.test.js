'use strict';
const t=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {REGIONS,SOURCES,validateSnapshot,withHistory,freshness,readSnapshot,signalUrl}=require('../lib/rocket-official-notices');
const {authorize,createHandler,AUDIENCE,WORKFLOW}=require('../api/rocket-official-notices')._test;
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const index=read('public/synced-national-tools/rocket-launch-live/index.html');
const js=read('public/synced-national-tools/rocket-launch-live/app.js');
const css=read('public/synced-national-tools/rocket-launch-live/styles.css');
const workflow=read('.github/workflows/rocket-official-notices.yml');
const py=read('scripts/rocket_official_notices.py');
const NOW=Date.parse('2026-11-05T12:00:00Z'),at=new Date(NOW).toISOString();
function fixture(){
 const regions={};for(const r of REGIONS)regions[r]=[];
 for(const [id,[region,url,scope]]of Object.entries(SOURCES)){
  regions[region].push({id,region,sourceUrl:url,scope,status:'retrieved',checkedAt:at,
   fingerprint:'a'.repeat(24),signals:[],notes:[]});
 }
 const texas=regions.texas[0];
 texas.signals=[{kind:'access-status',title:'Boca Chica Beach is open',
  detail:'Published city website condition at scan time, not mission-time permission.',
  sourceUrl:texas.sourceUrl,publishedDate:null,relevance:'current-published-status',scope:'Boca Chica Beach'}];
 return {version:1,checkedAt:at,sourceCount:11,regions,availableSources:11,partial:false};
}
t('six-region source registry maps exactly eleven official authorities to fixed URLs',()=>{
 a.deepEqual(REGIONS,['california','florida','texas','virginia','alaska','hawaii']);
 a.equal(Object.keys(SOURCES).length,11);
 const snap=validateSnapshot(fixture(),NOW);
 a.equal(snap.sourceCount,11);a.equal(snap.regions.california.length,2);
 a.equal(snap.regions.florida.length,2);a.equal(snap.regions.texas.length,1);
 a.equal(snap.regions.virginia.length,3);a.equal(snap.regions.alaska.length,2);
 a.equal(snap.regions.hawaii.length,1);
 a.equal(snap.regions.texas[0].signals[0].kind,'access-status');
});
t('NASA Wallops Range article is an attributed dated link, not an active range GO',()=>{
 const source=SOURCES['wallops-range-blog'][1];
 const good=fixture();
 good.regions.virginia.find(r=>r.id==='wallops-range-blog').signals.push({
  kind:'official-article',title:'NASA Wallops to support October Sounding Rocket Launch',
  detail:'A dated NASA Wallops Range article, not an independently verified launch or opening.',
  sourceUrl:'https://www.nasa.gov/blogs/wallops/2026/09/30/nasa-wallops-to-support-october-sounding-rocket-launch/',
  publishedDate:'2026-09-30',relevance:'unmatched-official-article',
  scope:'historical-or-current-article'
 });
 a.equal(validateSnapshot(good,NOW).regions.virginia.length,3);
 const evil=fixture();
 evil.regions.virginia.find(r=>r.id==='wallops-range-blog').signals=[{...good.regions.virginia.find(r=>r.id==='wallops-range-blog').signals[0],sourceUrl:'https://www.nasa.gov.evil.example/blogs/wallops-range/2026/09/30/rocket/'}];
 a.throws(()=>validateSnapshot(evil,NOW),/signal-untrusted/);
 a.equal(signalUrl('https://www.nasa.gov/blogs/wallops-other/2026/09/30/rocket/',source),null);
});
t('scope and source provenance are not spoofable by arbitrary Python payload',()=>{
 const o=fixture();o.regions.texas[0].sourceUrl='https://private.example/';a.throws(()=>validateSnapshot(o,NOW),/source-provenance/);
 const bad=fixture();bad.regions.texas[0].signals[0].sourceUrl='https://www.starbase.texas.gov.evil.example/open';
 a.throws(()=>validateSnapshot(bad,NOW),/signal-untrusted/);
 const fake=fixture();fake.regions.texas[0].signals[0].kind='launch-approved';
 a.throws(()=>validateSnapshot(fake,NOW),/signal-untrusted/);
 a.equal(signalUrl('https://evil.example/xxx',SOURCES['starbase-city'][1]),null);
 const extra=fixture();extra.regions.hawaii.push({...extra.regions.hawaii[0]});
 a.throws(()=>validateSnapshot(extra,NOW),/source-inventory|source-count|duplicate/);
});
t('unavailable source may never carry a beach-open signal or fingerprint',()=>{
 const raw=fixture(),src=raw.regions.texas[0];
 src.status='unavailable';a.throws(()=>validateSnapshot(raw,NOW),/outage-has-claims/);
 src.signals=[];src.fingerprint=null;
 const result=validateSnapshot(raw,NOW);
 a.equal(result.availableSources,10);
 a.equal(result.regions.texas[0].status,'unavailable');
 a.equal(result.regions.texas[0].signals.length,0);
});
t('dated snapshots reject future, stale and wrong region/source count',()=>{
 const q=fixture();
 a.throws(()=>validateSnapshot(q,NOW+31*60000),/collection-date/);
 a.throws(()=>validateSnapshot(q,NOW-31*60000),/collection-date/);
 q.regions.extra=[];a.throws(()=>validateSnapshot(q,NOW),/region-set-invalid/);
 const x=fixture();x.regions.texas[0].region='hawaii';
 a.throws(()=>validateSnapshot(x,NOW),/source-provenance/);
});
t('evidence change detection excludes initial ingestion and outage artifacts',()=>{
 const first=withHistory(validateSnapshot(fixture(),NOW),null,NOW);
 a.equal(first.regions.texas[0].changedSinceLastCheck,false);
 const second=fixture();second.regions.texas[0].fingerprint='b'.repeat(24);
 const result=withHistory(validateSnapshot(second,NOW),first,NOW+60000);
 a.equal(result.regions.texas[0].changedSinceLastCheck,true);
 a.match(result.regions.texas[0].lastEvidenceChangeAt,/2026-11-05/);
 // If a source fails, no wording change is claimed.
 const lost=fixture();lost.regions.texas[0].status='unavailable';
 lost.regions.texas[0].signals=[];lost.regions.texas[0].fingerprint=null;
 const x=withHistory(validateSnapshot(lost,NOW),result,NOW+120000);
 a.equal(x.regions.texas[0].changedSinceLastCheck,false);
});
t('stale official access statuses are removed rather than called open now',async()=>{
 const snapshot=withHistory(validateSnapshot(fixture(),NOW),null,NOW);
 let result=await readSnapshot({ready:()=>true,state:{get:async()=>snapshot},now:NOW+60000});
 a.equal(result.health,'recent');
 a.equal(result.regions.texas[0].signals.length,1);
 result=await readSnapshot({ready:()=>true,state:{get:async()=>snapshot},now:NOW+91*60000});
 a.equal(result.health,'late');
 a.equal(result.regions.texas[0].signals.length,0);
 a.equal(result.regions.texas[0].sourceUrl,SOURCES['starbase-city'][1]);
 result=await readSnapshot({ready:()=>false,now:NOW});
 a.equal(result.health,'unavailable');
 a.deepEqual(result.regions,{});
 a.equal(freshness(snapshot,NOW+25*3600000),'stale');
});
t('only signed repository workflow identity may POST; GET remains public',async()=>{
 let captured=null;
 a.equal(AUDIENCE,'https://chrisizworski.com/api/rocket-official-notices');
 a.match(WORKFLOW,/rocket-official-notices\.yml@refs\/heads\/main$/);
 a.equal(await authorize('Bearer xyz',async()=>true),false);
 const ok=await authorize('Bearer 12345678901',async(token,opt)=>{
  captured={token,opt};return true;
 });
 a.equal(ok,true);
 a.equal(captured.opt.identity.audience,AUDIENCE);
 a.equal(captured.opt.identity.workflowRef,WORKFLOW);
 const responses=[];
 const res=()=>({setHeader(){},status(code){this.code=code;return this;},json(payload){responses.push({code:this.code,payload});return this;}});
 let wrote=false;
 const handler=createHandler({authorized:async()=>true,ready:()=>true,clock:()=>NOW,
  save:async()=>{wrote=true;return {sourceCount:11,availableSources:11,checkedAt:at,changedSources:[]};},
  read:async()=>({ok:true,version:1,health:'recent',checkedAt:at,regions:{texas:[]}})});
 await handler({method:'POST',headers:{'content-length':'256'},body:fixture()},res());
 a.equal(wrote,true);a.equal(responses.at(-1).code,200);
 await handler({method:'GET',query:{region:'texas'}},res());
 a.equal(responses.at(-1).payload.version,1);
 await handler({method:'GET',query:{region:'invalid'}},res());
 a.equal(responses.at(-1).code,400);
 const unauthorized=createHandler({authorized:async()=>false,clock:()=>NOW});
 await unauthorized({method:'POST',headers:{authorization:'Bearer 12345678901'},body:fixture()},res());
 a.equal(responses.at(-1).code,401);
});
t('Python batch uses only stdlib, bounded HTTPS official source registry, no LL2',()=>{
 a.match(py,/ThreadPoolExecutor\(max_workers=5\)/);
 a.match(py,/LIMIT = 800_000/);
 a.match(py,/--test/);
 a.match(py,/--collect/);
 a.match(py,/urllib\.request/);
 a.match(py,/def classify\(/);
 a.match(py,/source-observation/);
 a.doesNotMatch(py,/supabase|redis|ll\.thespacedevs\.com/);
 a.match(workflow,/python3 scripts\/rocket_official_notices\.py --test/);
 a.match(workflow,/cron: '19,49 \* \* \* \*'/);
 a.match(workflow,/getIDToken\('https:\/\/chrisizworski\.com\/api\/rocket-official-notices'\)/);
 a.match(workflow,/--data-binary/);
 a.doesNotMatch(workflow,/secrets\.[A-Z_]+_KEY/);
});
t('national desk is indexable and independent of mission schedule availability',()=>{
 a.match(index,/id="official-notice-desk"/);
 a.match(index,/id="rl-evidence-sources"/);
 a.match(index,/app\.js\?v=20261110-voice-v1/);
 a.match(index,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/rocket-launch-live\/">/);
 a.match(js,/OFFICIAL_EVIDENCE_API = '\/api\/rocket-official-notices'/);
 a.match(js,/renderOfficialEvidence\(data\)/);
 a.match(js,/void loadOfficialEvidence\(\)/);
 a.match(index,/Official launch and access updates/);
 a.match(index,/id="rl-mission-official-match"[^>]+hidden/);
 a.match(css,/\.rl-evidence-notice/);
 a.match(js,/Get Vandenberg launch alerts/);
 a.doesNotMatch(js,/Python source scan:|Source unreachable|renderOfficialEventCoverage/);
 a.doesNotMatch(index,/Python evidence|SOURCE COVERAGE FOR YOUR COAST/);
 a.match(py,/USDODSFVANDENBERGPA\/subscriber\/new/);
 a.equal(SOURCES['vandenberg-alerts'][1],
   'https://public.govdelivery.com/accounts/USDODSFVANDENBERGPA/subscriber/new');
 a.doesNotMatch(py,/USDODSFVANDENBERG\/signup\/41755/);
 a.match(css,/@media\(max-width:460px\)/);
 a.doesNotMatch(js,/officialEvidence.*missionMatched|officialEvidence.*goForLaunch/i);
 new vm.Script(js);
});


t('Starbase future transport windows are source-bound, dated and never launch permission',()=>{
 const road={kind:'scheduled-road-activity',
  title:'Nov 6, 11:59 PM to Nov 7, 4:00 AM Central',
  detail:'City-listed transport movement: Production to Masseys. Not a launch closure; recheck Highway 4.',
  sourceUrl:SOURCES['starbase-city'][1],publishedDate:null,
  relevance:'dated-road-advisory',scope:'Starbase road movement window',
  windowStart:'2026-11-07T05:59:00Z',windowEnd:'2026-11-07T10:00:00Z'};
 const request=fixture();
 request.regions.texas[0].signals.push(road);
 const valid=validateSnapshot(request,NOW).regions.texas[0].signals[1];
 a.equal(valid.kind,'scheduled-road-activity');
 a.equal(valid.windowStart,new Date(road.windowStart).toISOString());
 a.equal(valid.windowEnd,new Date(road.windowEnd).toISOString());
 a.equal(valid.relevance,'dated-road-advisory');
 for(const [field,value] of [
  ['windowStart','2026-11-01T05:59:00Z'],
  ['windowEnd','2026-11-07T05:00:00Z'],
  ['windowEnd','2026-11-09T10:00:00Z'],
  ['windowStart','2026-11-30T05:59:00Z'],
  ['relevance','current-published-status'],
  ['kind','access-status'],
  ['sourceUrl','https://malicious.example/road']
 ]){
  const bad=fixture();
  bad.regions.texas[0].signals.push({...road,[field]:value});
  a.throws(()=>validateSnapshot(bad,NOW),/signal-untrusted/,field);
 }
 const spoof=fixture();
 spoof.regions.florida[0].signals.push({...road,sourceUrl:SOURCES['canaveral-nps'][1]});
 a.throws(()=>validateSnapshot(spoof,NOW),/signal-untrusted/);
 a.match(js,/scheduled-road-activity/);
 a.match(js,/Heads up: a city-listed vehicle movement overlaps/);
 a.match(js,/data\.scheduleFreshness==='recent'/);
 a.match(js,/\['minute','second'\]\.includes\(launch\?\.netPrecision\)/);
 a.match(js,/not itself a road closure/);
 new vm.Script(js);
});


t('dated Starbase transport windows require official city origin and bounded UTC dates',()=>{
 const x=fixture(),road=x.regions.texas[0];
 const window={kind:'scheduled-road-activity',title:'Nov 6, 2026 11:59 PM to Nov 7, 2026 4 AM Central',
  detail:'City-listed transport movement. This is not a road closure or future launch-day access permission.',
  sourceUrl:road.sourceUrl,publishedDate:null,relevance:'dated-road-advisory',
  scope:'Starbase road movement window',
  windowStart:new Date(NOW+3600000).toISOString().replace('.000Z','Z'),
  windowEnd:new Date(NOW+4*3600000).toISOString().replace('.000Z','Z')};
 road.signals=[window];
 let valid=validateSnapshot(x,NOW);
 a.equal(valid.regions.texas[0].signals[0].windowStart,window.windowStart.replace('Z','.000Z'));
 a.equal(valid.regions.texas[0].signals[0].relevance,'dated-road-advisory');
 const cases=[
  {windowStart:undefined},{windowEnd:undefined},
  {windowEnd:new Date(NOW+40*3600000).toISOString().replace('.000Z','Z')},
  {windowStart:new Date(NOW-40*3600000).toISOString().replace('.000Z','Z')},
  {windowStart:new Date(NOW+20*86400000).toISOString().replace('.000Z','Z')},
  {sourceUrl:'https://evil.example/road'},
  {relevance:'current-published-status'}
 ];
 for(const patch of cases){
  const altered=fixture();altered.regions.texas[0].signals=[{...window,...patch}];
  a.throws(()=>validateSnapshot(altered,NOW),/signal-untrusted/);
 }
 const wrongCoast=fixture();wrongCoast.regions.california[0].signals=[window];
 a.throws(()=>validateSnapshot(wrongCoast,NOW),/signal-untrusted/);
 const mixed=fixture();mixed.regions.texas[0].signals=[
  {...fixture().regions.texas[0].signals[0],windowStart:window.windowStart}];
 a.throws(()=>validateSnapshot(mixed,NOW),/signal-untrusted/);
});
t('stale snapshots suppress dated Starbase transport windows alongside beach-open conditions',async()=>{
 const raw=fixture(),src=raw.regions.texas[0];
 src.signals.push({kind:'scheduled-road-activity',
  title:'Nov 6, 2026 11:59 PM to Nov 7, 2026 4 AM Central',
  detail:'City-listed vehicle movement is not a launch-specific road closure.',
  sourceUrl:src.sourceUrl,publishedDate:null,relevance:'dated-road-advisory',
  scope:'Starbase road movement window',
  windowStart:new Date(NOW+20*3600000).toISOString().replace('.000Z','Z'),
  windowEnd:new Date(NOW+24*3600000).toISOString().replace('.000Z','Z')});
 const stored=validateSnapshot(raw,NOW);
 const current=await readSnapshot({ready:()=>true,state:{get:async()=>stored},now:NOW+60000});
 a.equal(current.regions.texas[0].signals.length,2);
 const overdue=await readSnapshot({ready:()=>true,state:{get:async()=>stored},now:NOW+91*60000});
 a.equal(overdue.regions.texas[0].signals.length,0);
});
t('visitor display never treats city transport timing as a closure or launch authorization',()=>{
 a.match(py,/def starbase_road_windows\(/);
 a.match(py,/ROAD_MOVEMENT/);
 a.match(py,/PREVIOUS ORDERS/);
 a.match(js,/notice\.kind==='scheduled-road-activity'/);
 a.match(js,/data\.scheduleFreshness==='recent'/);
 a.match(js,/target>=from&&target<=through/);
 a.match(js,/not itself a road closure/);
 a.match(index,/20261110-voice-v1/);
 a.match(workflow,/starbase-road-v1/);
 new vm.Script(js);
});
