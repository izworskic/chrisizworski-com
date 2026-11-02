'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  trustedVideoUrl,normalizeMissionMedia,buildMediaDesk,
  operatorDirectory,CAMERA_CATALOG,sanitizeVideo
}=require('../lib/space-coast-media');
const {normalizeLaunch}=require('../lib/space-coast-decision');
const {normalizeSchedule,buildSnapshot}=require('../lib/space-coast-launch-day');
const NOW=Date.parse('2026-11-01T23:00:00Z');
const ID='ef9850ad-1096-425b-9d27-f7bbd186e61a';
const video=(v={})=>({
  priority:10,
  source:'youtube.com',
  publisher:'United Launch Alliance',
  title:'Vulcan mission webcast',
  url:'https://www.youtube.com/watch?v=abcdefghijk',
  type:{name:'Official Webcast'},live:false,
  start_time:null,end_time:null,...v
});
const raw=(v={})=>({
  id:ID,name:'Vulcan VC6L | Amazon Leo',net:'2026-11-03T21:00:00Z',
  status:{name:'To Be Determined'},
  net_precision:{name:'Minute'},
  launch_service_provider:{name:'United Launch Alliance'},
  pad:{id:100,name:'Space Launch Complex 41',latitude:'28.583',
    longitude:'-80.583',location:{id:12,name:'Cape Canaveral SFS'}},
  vid_urls:[video()],webcast_live:false,last_updated:'2026-11-01T22:55:00Z',...v
});
test('safe source URLs are normalized without tracking junk or lookalike domains',()=>{
  assert.deepEqual(trustedVideoUrl('https://youtu.be/abcdefghijk?t=25'),
    {url:'https://www.youtube.com/watch?v=abcdefghijk',platform:'youtube',youtubeId:'abcdefghijk'});
  assert.deepEqual(trustedVideoUrl('https://www.youtube.com/live/abcdefghijk?feature=share'),
    {url:'https://www.youtube.com/watch?v=abcdefghijk',platform:'youtube',youtubeId:'abcdefghijk'});
  assert.equal(trustedVideoUrl('https://www.youtube.com/watch?v=short'),null);
  assert.equal(trustedVideoUrl('https://www.youtube.com.evil.invalid/watch?v=abcdefghijk'),null);
  assert.equal(trustedVideoUrl('http://www.youtube.com/watch?v=abcdefghijk'),null);
  assert.equal(trustedVideoUrl('https://www.youtube.com/watch?v=abcdefghijk&redirect=https://evil.test')?.url,
    'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(trustedVideoUrl('javascript:alert(1)'),null);
  assert.equal(trustedVideoUrl('https://evil.example/live'),null);
  assert.equal(trustedVideoUrl('https://www.youtube.com/@NASASpaceflight/live'),null);
  assert.equal(trustedVideoUrl('https://x.com/i/broadcasts/1AJEmmYdMDnJL')?.platform,'x');
  assert.equal(trustedVideoUrl('https://www.spacex.com/launches/example-mission')?.platform,'operator-page');
});
test('official webcast label remains LL2-provided claim, not independently operator-verified',()=>{
  const result=normalizeMissionMedia(raw(),NOW);
  assert.equal(result.videos.length,1);
  assert.equal(result.videos[0].classification,'ll2-official-listed');
  assert.equal(result.videos[0].independentlyVerifiedOperator,false);
  assert.equal(result.videos[0].sourceReportedLive,false);
  assert.equal(result.videos[0].evidence.includes('same'),false);
  assert.equal(result.observationStatus,'not-independent-stream-health');
});
test('video sort favors mission-linked official listings and never converts ended video to live',()=>{
  const m=normalizeMissionMedia(raw({
    webcast_live:true,
    vid_urls:[
      video({priority:11,publisher:'Third Party',type:{name:'Unofficial Re-stream'},
        url:'https://youtu.be/12345678901',live:true}),
      video({priority:7,url:'https://www.youtube.com/watch?v=abcdefghijk',
        publisher:'NASA',type:{name:'Official Webcast'},live:true}),
      video({priority:8,title:'A past replay',url:'https://youtu.be/ZYXWVutsrqp',
        end_time:'2026-10-27T18:15:00Z',live:true}),
      video({priority:30,url:'https://www.youtube.com@evil.invalid/watch?v=12345678901'})
    ]
  }),NOW);
  assert.equal(m.videos.length,3);
  assert.equal(m.videos[0].classification,'ll2-official-listed');
  assert.equal(m.videos[0].sourceReportedLive,true);
  assert.equal(m.videos[2].sourceReportedEnded,true);
  const desk=buildMediaDesk({id:ID,name:'Mission',provider:'ULA',media:m},
    {checkedAt:new Date(NOW).toISOString(),now:NOW+60000});
  assert.equal(desk.sourceFreshness,'recent');
  assert.equal(desk.webcastFlagReported,true);
  assert.equal(desk.primaryVideo.classification,'ll2-official-listed');
  assert.equal(desk.primaryVideo.independentlyVerifiedOperator,false);
  assert.equal(desk.streamHealthChecked,false);
  assert.equal(desk.cameraHealthChecked,false);
  assert.equal(desk.launchId,ID);
  const outdated=buildMediaDesk({id:ID,name:'Mission',media:m},
    {checkedAt:new Date(NOW-120*60000).toISOString(),now:NOW});
  assert.equal(outdated.sourceFreshness,'overdue');
  assert.equal(outdated.webcastFlagReported,false);
  assert.match(outdated.webcastFlagExplanation,/not prove/i);
});
test('same exact mission LL2 record retains vid_urls through primary API and scheduled Postgres path',()=>{
  const l=raw();
  const n=normalizeLaunch(l);
  assert.equal(n.media.videos.length,1);
  assert.equal(n.media.videos[0].url,'https://www.youtube.com/watch?v=abcdefghijk');
  const list=normalizeSchedule({results:[l]},NOW);
  assert.equal(list.length,1);
  assert.equal(list[0].media.videos.length,1);
  const snap=buildSnapshot(null,{results:[l]},NOW);
  assert.equal(snap.missions.length,1);
  assert.equal(snap.missions[0].media.videos.length,1);
  assert.equal(snap.missions[0].id,ID);
  const direct=buildMediaDesk(n,{checkedAt:new Date(NOW).toISOString(),now:NOW});
  const shared=buildMediaDesk(snap.missions[0],{checkedAt:snap.checkedAt,now:NOW});
  assert.deepEqual(direct.videos,shared.videos);
});
test('unrelated mission and absent video stay absent; camera layer is separate and cautious',()=>{
  const a=buildMediaDesk(normalizeLaunch(raw({vid_urls:[]})),
    {checkedAt:new Date(NOW).toISOString(),now:NOW});
  const b=buildMediaDesk(normalizeLaunch(raw({
    id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    vid_urls:[video({url:'https://www.youtube.com/watch?v=BBBBBBBBBBB'})]
  })),{checkedAt:new Date(NOW).toISOString(),now:NOW});
  assert.equal(a.videos.length,0);
  assert.equal(a.primaryVideo,null);
  assert.equal(b.videos.length,1);
  assert.notEqual(b.launchId,a.launchId);
  assert.equal(a.cameras.length,2);
  assert.ok(a.cameras.every(x=>x.verifiedLiveNow===false));
  assert.ok(a.cameras.every(x=>x.streamAvailability==='not-independently-checked'));
  assert.ok(a.cameras.every(x=>x.scope.toLowerCase().includes('general')));
  assert.ok(a.cameras.every(x=>x.officialSourceUrl.startsWith('https://')));
  assert.deepEqual(CAMERA_CATALOG.map(x=>x.youtubeId),['thfYPsRqxmw','Jm8wRjD3xVA']);
});
test('publisher directory links to supported operators only, without inventing official coverage',()=>{
  assert.match(operatorDirectory('United Launch Alliance').url,/ulalaunch\.com/);
  assert.equal(operatorDirectory('SpaceX').label,'SpaceX launch mission pages');
  assert.equal(operatorDirectory('Blue Origin').url,'https://www.blueorigin.com/missions');
  assert.equal(operatorDirectory('unverified custom startup'),null);
});
test('hostile video metadata never injects raw HTML or is accepted as arbitrary player link',()=>{
  const m=normalizeMissionMedia(raw({
    vid_urls:[
      video({title:'<img src=x onerror=alert(1)>',
        publisher:'<svg><script>alert(2)</script></svg>',
        url:'https://evil.example/broadcast'}),
      video({title:'<script>alert(1)</script>Mission',url:'https://youtu.be/abcdefghijk'})
    ]
  }),NOW);
  assert.equal(m.videos.length,1);
  assert.equal(m.videos[0].title.includes('<script>'),false);
  // textContent is used exclusively by UI, never interpolated HTML.
  assert.ok(m.videos[0].url.startsWith('https://www.youtube.com/watch?v='));
  assert.equal(sanitizeVideo({url:'https://not-youtube.com/watch?v=abcdefghijk'}),null);
});
test('browser media experience is user-initiated and retains active GIS, SEO and launch day release assets',()=>{
  const root=path.join(__dirname,'../public/synced-national-tools/space-coast-launch');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'viewing.css'),'utf8');
  assert.match(html,/id="mission-media"/);
  assert.match(html,/id="mission-media-stage-screen"/);
  assert.match(html,/id="mission-media-mission-list"/);
  assert.match(html,/id="mission-media-camera-list"/);
  assert.match(html,/app\.js\?v=20261101-range1/);
  assert.match(html,/viewing\.css\?v=20261101-range1/);
  assert.match(js,/function renderMissionMedia\(/);
  assert.match(js,/renderMissionMedia\(d\.mediaDesk \|\| null\)/);
  assert.match(js,/mediaDesk=data&&data\.launchId===activeMissionId/);
  assert.match(js,/youtube-nocookie\.com\/embed/);
  assert.match(js,/play\.addEventListener\('click'/);
  assert.doesNotMatch(html,/<iframe/i);
  assert.doesNotMatch(html,/\bautoplay=1\b/i);
  assert.match(css,/\.mission-media-poster/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(html,/id="launch-day-pulse"/);
  assert.match(html,/geo-map\.js\?v=20261101-repair1/);
  assert.doesNotThrow(()=>new Function(js));
});
