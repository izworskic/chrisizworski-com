'use strict';

// Mission video metadata travels exclusively with its LL2 launch record.
// Generic cameras are always separately identified as not mission-specific.
const LL2='https://ll.thespacedevs.com/';
const SOURCE_CHECK_FRESH_MS=30*60000;
const MAX_VIDEOS=5;
const MAX_RAW_VIDEOS=18;
const YT_ID=/^[a-zA-Z0-9_-]{11}$/;
const PROVIDER_DIRECTORY={
  spacex:{label:'SpaceX launch mission pages',url:'https://www.spacex.com/launches'},
  ula:{label:'United Launch Alliance missions',url:'https://www.ulalaunch.com/missions'},
  blue:{label:'Blue Origin mission updates',url:'https://www.blueorigin.com/missions'},
  nasa:{label:'NASA Live coverage',url:'https://www.nasa.gov/live/'}
};
const CAMERA_CATALOG=[
  {
    id:'spaceflight-now-launch-pad-live',
    title:'Launch Pad Live',
    publisher:'Spaceflight Now',
    region:'Cape Canaveral & Kennedy Space Center',
    siteUrl:'https://spaceflightnow.com/live/',
    youtubeId:'thfYPsRqxmw',
    scope:'General Space Coast camera · not matched to the selected rocket',
    officialSourceUrl:'https://spaceflightnow.com/live/',
    verifiedAsSourceOn:'2026-11-01',
    streamAvailability:'not-independently-checked',
    verifiedLiveNow:false,
    role:'independent-pad-camera',
    caveat:'Spaceflight Now describes a 24/7 pad feed. Camera coverage, view and live playback can change; verify in the player.'
  },
  {
    id:'nasaspaceflight-space-coast-live',
    title:'Space Coast Live',
    publisher:'NASASpaceflight',
    region:'Kennedy Space Center & Port Canaveral',
    siteUrl:'https://www.youtube.com/watch?v=Jm8wRjD3xVA',
    youtubeId:'Jm8wRjD3xVA',
    scope:'General multi-camera Florida coverage · includes LC-39A or Port Canaveral at times',
    officialSourceUrl:'https://github.com/NASASpaceFlight',
    verifiedAsSourceOn:'2026-11-01',
    streamAvailability:'not-independently-checked',
    verifiedLiveNow:false,
    role:'independent-pad-camera',
    caveat:'An independent NASASpaceflight camera, not NASA or a specific mission webcast. The feed may switch vantage points.'
  }
];
const clean=(value,max=160)=>typeof value==='string'?
  value.replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const iso=(value)=>{
  const t=Date.parse(value||'');
  return Number.isFinite(t)?new Date(t).toISOString():null;
};
function trustedVideoUrl(raw){
  if(typeof raw!=='string'||raw.length>850)return null;
  let u;
  try{u=new URL(raw)}catch{return null}
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  const h=u.hostname.toLowerCase();
  let videoId=null,link=null,platform=null;
  if(['www.youtube.com','youtube.com','m.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(h)){
    videoId=u.pathname==='/watch'?u.searchParams.get('v'):
      /^\/(?:live|embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/.exec(u.pathname)?.[1];
    if(!YT_ID.test(videoId||''))return null;
    link='https://www.youtube.com/watch?v='+videoId;
    platform='youtube';
  }else if(h==='youtu.be'||h==='www.youtu.be'){
    videoId=u.pathname.replace(/^\/|\/$/g,'');
    if(!YT_ID.test(videoId))return null;
    link='https://www.youtube.com/watch?v='+videoId;
    platform='youtube';
  }else if(['x.com','www.x.com','twitter.com','www.twitter.com'].includes(h)){
    if(!/^\/(?:i\/broadcasts\/[A-Za-z0-9]+|[A-Za-z0-9_]{1,20}\/status\/\d{5,25})(?:\/)?$/.test(u.pathname))return null;
    link='https://x.com'+u.pathname;
    platform='x';
  }else if(h==='www.spacex.com'||h==='spacex.com'){
    if(!/^\/(?:launches|mission)(?:\/[a-z0-9-]+)?\/?$/.test(u.pathname))return null;
    link='https://www.spacex.com'+u.pathname;platform='operator-page';
  }else if(h==='www.blueorigin.com'||h==='blueorigin.com'){
    if(!/^\/(?:missions|news)(?:\/[a-z0-9-]+)?\/?$/.test(u.pathname))return null;
    link='https://www.blueorigin.com'+u.pathname;platform='operator-page';
  }else if(h==='www.ulalaunch.com'||h==='ulalaunch.com'){
    if(!/^\/(?:missions|mission)(?:\/[A-Za-z0-9-]+)?\/?$/.test(u.pathname))return null;
    link='https://www.ulalaunch.com'+u.pathname;platform='operator-page';
  }else if(h==='www.nasa.gov'||h==='nasa.gov'||h==='plus.nasa.gov'){
    if(!/^\/(?:live|missions|mission|event|events|scheduled-events|watch-nasa-programming)(?:\/[A-Za-z0-9/-]+)?\/?$/.test(u.pathname))return null;
    link='https://'+h+u.pathname;platform='nasa';
  }else return null;
  return {url:link,platform,youtubeId:videoId||null};
}
function classifyWebcast(item){
  const type=clean(item?.type?.name,70);
  const official=/^official webcast$/i.test(type);
  const replay=/replay|highlights|trailer|clip/i.test(type);
  const reStream=/re-stream|restream/i.test(type);
  return {sourceLabel:official?'LL2 lists as official webcast':
    reStream?'LL2 lists as unofficial restream':
    replay?'LL2 video/replay record':'LL2 mission video link',
    type:type||'Unspecified',classification:official?'ll2-official-listed':
      reStream?'ll2-restream':replay?'ll2-replay':'ll2-unclassified',
    independentlyVerifiedOperator:false};
}
function sanitizeVideo(item,now=Date.now()){
  const safe=trustedVideoUrl(item?.url);
  if(!safe)return null;
  const c=classifyWebcast(item);
  const lastStart=iso(item?.start_time),lastEnd=iso(item?.end_time);
  const ended=!!lastEnd&&Date.parse(lastEnd)<=now;
  const reportedLive=typeof item?.live==='boolean'?item.live:null;
  return {
    url:safe.url,platform:safe.platform,youtubeId:safe.youtubeId,
    title:clean(item?.title,140)||'Launch video',
    publisher:clean(item?.publisher,80)||'Publisher not identified',
    ...c,
    priority:Number.isInteger(item?.priority)?Math.max(0,Math.min(30,item.priority)):0,
    sourceReportedLive:reportedLive,recordedStartAt:lastStart,recordedEndAt:lastEnd,
    sourceReportedEnded:ended,
    statusNote:ended?'LL2 records this stream as ended; this link may be a replay.':
      reportedLive===true?'LL2 reports this video as live in its last observation; not independently checked.':
      'A listed video link is not proof that a live broadcast has started.',
    evidence:'Attached to this exact Launch Library mission, not inferred from a channel search.'
  };
}
function normalizeMissionMedia(raw,now=Date.now()){
  const list=Array.isArray(raw?.vid_urls)?raw.vid_urls.slice(0,MAX_RAW_VIDEOS):[];
  const byUrl=new Map();
  for(const original of list){
    const cleanVideo=sanitizeVideo(original,now);
    if(!cleanVideo)continue;
    const prior=byUrl.get(cleanVideo.url);
    if(!prior||prior.priority<cleanVideo.priority)byUrl.set(cleanVideo.url,cleanVideo);
  }
  const ranked=[...byUrl.values()].sort((a,b)=>
    (a.sourceReportedEnded?1:0)-(b.sourceReportedEnded?1:0)||
    Number(b.classification==='ll2-official-listed')-Number(a.classification==='ll2-official-listed')||
    b.priority-a.priority
  ).slice(0,MAX_VIDEOS);
  return {
    source:'Launch Library 2',sourceUrl:LL2,
    launchRecordWebcastLive:typeof raw?.webcast_live==='boolean'?raw.webcast_live:null,
    observationStatus:'not-independent-stream-health',
    videos:ranked,
    note:'These video records belong to this LL2 mission ID; their live flags describe the upstream report, not independently verified playback.'
  };
}
function operatorDirectory(provider){
  const p=clean(provider,130).toLowerCase();
  if(/space exploration technologies|^spacex$/.test(p))return PROVIDER_DIRECTORY.spacex;
  if(/united launch alliance|^ula$/.test(p))return PROVIDER_DIRECTORY.ula;
  if(/blue origin/.test(p))return PROVIDER_DIRECTORY.blue;
  if(/^nasa$|national aeronautics and space administration/.test(p))return PROVIDER_DIRECTORY.nasa;
  return null;
}
function buildMediaDesk(launch,{checkedAt,now=Date.now()}={}){
  const checked=iso(checkedAt);
  const age=checked?now-Date.parse(checked):Infinity;
  const recent=age>=-60000&&age<=SOURCE_CHECK_FRESH_MS;
  const media=launch?.media;
  const videos=Array.isArray(media?.videos)?
    media.videos.filter(x=>trustedVideoUrl(x?.url)).slice(0,MAX_VIDEOS):[];
  const primary=videos.find(x=>!x.sourceReportedEnded&&x.classification==='ll2-official-listed')||
    videos.find(x=>!x.sourceReportedEnded)||videos[0]||null;
  const ranked=primary?[primary,...videos.filter(x=>x.url!==primary.url)]:[];
  return {
    launchId:typeof launch?.id==='string'?launch.id:null,
    missionName:clean(launch?.name,180),
    pad:clean(launch?.pad,130),
    source:'Launch Library 2',
    checkedAt:checked,
    sourceFreshness:recent?'recent':'overdue',
    webcastFlagReported:recent&&media?.launchRecordWebcastLive===true,
    webcastFlagExplanation:recent&&media?.launchRecordWebcastLive===true?
      'LL2 flags a webcast on this launch record; individual stream playback is not independently checked.':
      'No recently confirmed LL2 webcast-live flag; this does not prove broadcasts are off.',
    missionVideoCount:ranked.length,
    primaryVideo:primary,
    videos:ranked,
    cameras:CAMERA_CATALOG.map(x=>({...x})),
    operator:operatorDirectory(launch?.provider),
    cameraHealthChecked:false,
    streamHealthChecked:false,
    evidenceSummary:'Mission media is matched by the same LL2 mission ID. Persistent cameras cover broad geographic areas, not a verified selected launch pad.',
    safety:'Never label a generic 24/7 camera as this mission webcast or infer rocket liftoff, a live gate status, or live stream health from third-party metadata.'
  };
}
module.exports={LL2,CAMERA_CATALOG,PROVIDER_DIRECTORY,SOURCE_CHECK_FRESH_MS,
  trustedVideoUrl,classifyWebcast,sanitizeVideo,normalizeMissionMedia,
  operatorDirectory,buildMediaDesk};
