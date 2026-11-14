'use strict';

// Official 45th Weather Squadron forecast chronicle. Only a source-linked,
// mission-matched official PDF can contribute a PoV reading. The upstream
// LL2 update merely discovers the URL; the LL2 comment is not evidence.
const { createHash } = require('node:crypto');
const { ToolState, stateReady } = require('./tool-state');
const { buildWeatherStory } = require('./space-coast-weather-story');
const KEY = 'space-coast:official-weather:v1';
const TTL = 120 * 86400;
const FRESH_MS = 90 * 60000;
// FRESH_MS guards what may be SHOWN as a current official forecast. It stays
// strict. HEALTH_OVERDUE_MS only decides when the monitor itself is called
// overdue: GitHub runs the "hourly" schedule every 3 to 11 hours in practice
// (43 runs, Nov 2026: median 6.9h, max 10.8h), so 90 minutes labelled normal
// operation as a failure.
const HEALTH_OVERDUE_MS = 12 * 3600000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OFFICIAL_HOST = '45thweathersquadron.nebula.spaceforce.mil';
const LANDING = 'https://www.patrick.spaceforce.mil/About-Us/Weather/';
const readTime = x => { const t = Date.parse(x || ''); return Number.isFinite(t) ? t : 0; };
const iso = t => new Date(t).toISOString();
const text = (s,n=180) => typeof s === 'string' ? s.trim().slice(0,n) : '';

function validPdfUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === OFFICIAL_HOST &&
      /^\/assets\/LaunchForecasts\/[^?#]{4,240}\.pdf$/i.test(u.pathname) &&
      !u.username && !u.password && !u.port && !u.search && !u.hash ? u.href : null;
  } catch { return null; }
}
function exactMissionMarker(name) {
  const n = String(name || '').toLowerCase().replace(/[–—]/g,'-');
  const rules = [
    [/\bstarlink(?:\s+group)?\s+(\d{1,2}-\d{1,3})\b/, 'starlink'],
    [/\bcrew[-\s]*(\d{1,2})\b/, 'crew'],
    [/\bcrs[-\s]*(\d{2})\b/, 'crs'],
    [/\bbandwagon[-\s]*(\d{1,2})\b/, 'bandwagon'],
    [/\btransporter[-\s]*(\d{1,2})\b/, 'transporter'],
    [/\bnrol[-\s]*(\d{2,3})\b/, 'nrol'],
    [/\bus[sf]{2}[-\s]*(\d{2,3})\b/, 'ussf'],
    [/\bm[-\s]*power[-\s]*([a-z0-9-]{1,4})\b/, 'mpower'],
    [/\bamazon\s+leo\b.{0,35}\b((?:LA|KA|KF)[-\s]*\d{2})\b/, 'amazon-leo']
  ];
  for (const [re, label] of rules) {
    const m = n.match(re);
    if (m) return label + ':' + m[1].replace(/\s+/g,'').toLowerCase();
  }
  return null; // Identity cannot be safely inferred for this mission.
}
function normalizeReport(raw, mission, now = Date.now()) {
  if (!raw || typeof raw !== 'object' || !mission || !UUID.test(raw.missionId) ||
    raw.missionId !== mission.id || !validPdfUrl(raw.sourceUrl)) return null;
  if (raw.sourceSha256 == null || !/^[0-9a-f]{64}$/i.test(raw.sourceSha256)) return null;
  const marker = exactMissionMarker(mission.name);
  if (!marker || marker !== exactMissionMarker(raw.sourceMission)) return null;
  const launched = readTime(mission.net);
  const issued = readTime(raw.issuedAt);
  const validDay = readTime(raw.validDate && raw.validDate + 'T12:00:00Z');
  if (!launched || !issued || !validDay) return null;
  if (Math.abs(launched-validDay)> 2*86400000 ||
      issued>now+2*3600000 || issued<now-10*86400000 ||
      validDay<now-3*86400000 || validDay>now+10*86400000) return null;
  const p = raw.povPercent;
  if (p !== null && (!Number.isInteger(p) || p < 0 || p > 100)) return null;
  const concerns = Array.isArray(raw.primaryConcerns) ?
    [...new Set(raw.primaryConcerns.filter(v=>typeof v==='string')
      .map(v=>text(v,70)).filter(v=>v.length>3))].slice(0,6) : [];
  const risks = {};
  for(const k of ['upperWindShear','boosterRecovery','solarActivity']) {
    if(typeof raw.additionalRisks?.[k]==='string' &&
      /^(low|moderate|high|low-mod|mod-high|unknown)$/i.test(raw.additionalRisks[k].trim()))
      risks[k] = raw.additionalRisks[k].trim();
  }
  return {
    missionId:mission.id,missionName:text(mission.name),marker,
    officialMission:text(raw.sourceMission),sourceUrl:validPdfUrl(raw.sourceUrl),
    sourceSha256:raw.sourceSha256.toLowerCase(),
    discoveredVia:['45ws-public-page','ll2-update-link'].includes(raw.discoveredVia) ? raw.discoveredVia : 'unspecified',
    issuedAt:iso(issued),validDate:raw.validDate,
    nextForecastDate:typeof raw.nextForecastDate==='string' &&
      /^20\d{2}-\d{2}-\d{2}$/.test(raw.nextForecastDate) &&
      readTime(raw.nextForecastDate+'T12:00:00Z')>=readTime(raw.issuedAt) &&
      readTime(raw.nextForecastDate+'T12:00:00Z')<=validDay+3*86400000 ?
      raw.nextForecastDate:null,
    sourceType:'45ws-official-pdf',
    povPercent:p,primaryConcerns:concerns,additionalRisks:risks,
    transcriptionStatus:p === null ? 'official-document-verified-value-not-extracted' :
      'official-document-value-extracted',
    sourceVerifiedAt:iso(now)
  };
}
function floridaCalendarDay(isoString) {
  const t = readTime(isoString);
  if (!t) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date(t));
  const get = key => parts.find(p=>p.type===key)?.value;
  return get('year')+'-'+get('month')+'-'+get('day');
}
function freshForMission(report,mission,now=Date.now()) {
  if(!report||!mission||report.missionId!==mission.id||
    report.marker!==exactMissionMarker(mission.name))return false;
  const t=readTime(mission.net),i=readTime(report.issuedAt);
  const verified=readTime(report.sourceVerifiedAt);
  // A healthy overall monitor does not prove this particular PDF was fetched.
  if(!verified || now-verified>FRESH_MS || verified>now+60000)return false;
  // The launch-day primary PoV is for a specific local calendar day.
  // A 24h slip may have a different official backup-window probability.
  return floridaCalendarDay(mission.net)===report.validDate &&
    t>=now-30*60000 && i<=now+2*3600000 && now-i<=4*86400000;
}
function initially() {
  return {version:1,lastCheckedAt:null,lastChangeAt:null,monitorStatus:'not-initialized',
    inspected:0,verified:0,failed:0,sourceHealth:[],missions:{},history:{},
    nasaReports:{},nasaHistory:{},nasaSourceHealth:[],forecastWindow:null};
}
function event(report,previous,now) {
  let kind,headline,detail;
  if(!previous){kind='first-official-forecast';headline='Official 45th Weather Squadron forecast discovered';
    detail='A mission-matched forecast document was verified. This is not the final launch weather decision.';}
  else if(previous.povPercent!==report.povPercent){
    kind='official-pov-revised';headline='Official weather-rule violation forecast changed';
    detail=previous.povPercent===null ? 'An official violation probability is now extractable.' :
      report.povPercent===null ? 'The new document does not support an extractable probability.' :
        'The published violation probability changed from '+previous.povPercent+'% to '+report.povPercent+'%.';
  } else if(JSON.stringify(previous.primaryConcerns)!==JSON.stringify(report.primaryConcerns)){
    kind='official-concerns-revised';headline='Forecast weather concerns revised';
    detail='The latest official document lists different primary weather concerns.';
  } else {
    kind='official-forecast-update';headline='New official forecast issued';
    detail='The official document was reissued; the extracted violation probability did not change.';
  }
  return {id:createHash('sha256').update(report.missionId+'|'+report.sourceSha256).digest('hex').slice(0,24),
    kind,headline,detail,detectedAt:iso(now),issuedAt:report.issuedAt,
    sourceUrl:report.sourceUrl,povPercent:report.povPercent,priorPovPercent:previous?.povPercent??null,
    primaryConcerns:report.primaryConcerns,additionalRisks:report.additionalRisks,
    sourceType:report.sourceType};
}
const SOURCE_IDS = new Set([
  '45ws-home','45ws-forecast-support','45ws-sitemap','45ws-parent-weather',
  'll2-updates','official-pdf-retrieval','ll2-schedule'
]);
const SOURCE_STATES = new Set([
  'checked','links-found','checked-no-links','unavailable','partial'
]);
function cleanSourceHealth(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set(), out = [];
  for (const record of input.slice(0,9)) {
    if (!SOURCE_IDS.has(record?.id) || !SOURCE_STATES.has(record?.status) ||
      seen.has(record.id)) continue;
    seen.add(record.id);
    out.push({
      id:record.id,
      status:record.status,
      links:Number.isSafeInteger(record.links) && record.links>=0 ?
        Math.min(record.links,1000) : 0
    });
  }
  return out;
}
const NASA_URL = /^https:\/\/www\.nasa\.gov\/blogs\/[a-z0-9_-]+\/20\d{2}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/;
const NASA_CONCERNS = new Set([
  'Cumulus Cloud Rule','Thick Cloud Layers Rule','Flight Through Precipitation',
  'Liftoff Winds','Lightning Rule','Anvil Cloud Rule'
]);
function normalizeNasaReport(raw,mission,now=Date.now()) {
  if(!mission||raw?.missionId!==mission.id||!UUID.test(raw.missionId||'')||
    typeof raw.sourceUrl!=='string'||raw.sourceUrl.length>450||
    !NASA_URL.test(raw.sourceUrl)||!/^([0-9a-f]{64})$/i.test(raw.sourceSha256||'')||
    !Number.isInteger(raw.reportedFavorablePercent)||
    raw.reportedFavorablePercent<0||raw.reportedFavorablePercent>100||
    exactMissionMarker(raw.sourceMission)!==exactMissionMarker(mission.name)||
    !exactMissionMarker(mission.name))return null;
  const publication=readTime(raw.publishedAt),target=readTime(mission.net);
  if(!publication||!target||publication>now+2*3600000||
    publication<now-7*86400000||
    target-publication< -3600000||target-publication>4*86400000||
    typeof raw.reportedTargetDate!=='string'||
    raw.reportedTargetDate!==floridaCalendarDay(mission.net))return null;
  const concerns=Array.isArray(raw.primaryConcerns)?
    [...new Set(raw.primaryConcerns.filter(c=>NASA_CONCERNS.has(c)))].slice(0,6):[];
  return {
    missionId:mission.id,missionMarker:exactMissionMarker(mission.name),
    sourceMission:text(raw.sourceMission,160),sourceType:'nasa-reported-45ws',
    sourceUrl:raw.sourceUrl,sourceSha256:raw.sourceSha256.toLowerCase(),
    publishedAt:iso(publication),reportedTargetDate:raw.reportedTargetDate,
    reportedFavorablePercent:raw.reportedFavorablePercent,primaryConcerns:concerns,
    sourceVerifiedAt:iso(now)
  };
}
function cleanForecastWindow(raw) {
  const states=new Set(['unknown','no-launches-in-21-days','before-forecast-window','active-window']);
  if(!raw||typeof raw!=='object')return null;
  return {
    status:states.has(raw.status)?raw.status:'unknown',
    nearestAt:readTime(raw.nearestAt)?iso(readTime(raw.nearestAt)):null,
    candidates21Days:Number.isInteger(raw.candidates21Days)?
      Math.max(0,Math.min(raw.candidates21Days,12)):0,
    candidates7Days:Number.isInteger(raw.candidates7Days)?
      Math.max(0,Math.min(raw.candidates7Days,12)):0,
  };
}
function cleanNasaHealth(raw) {
  if(!Array.isArray(raw))return [];
  const allowed=new Set(['nasa-commercialcrew','nasa-all-blogs']),out=[],seen=new Set();
  for(const row of raw.slice(0,5)) {
    if(!allowed.has(row?.id)||seen.has(row.id)||
      !['checked','unavailable'].includes(row.status))continue;
    seen.add(row.id);
    const n=x=>Number.isInteger(x)?Math.max(0,Math.min(x,50)):0;
    out.push({id:row.id,status:row.status,entries:n(row.entries),candidates:n(row.candidates)});
  }
  return out;
}
function validNasaCurrent(record,mission,now=Date.now()){
  if(!record||!mission||record.missionId!==mission.id||
     record.missionMarker!==exactMissionMarker(mission.name)||
     record.reportedTargetDate!==floridaCalendarDay(mission.net))return false;
  const checked=readTime(record.sourceVerifiedAt),published=readTime(record.publishedAt);
  const net=readTime(mission.net);
  return !!checked && now-checked>=-60000 && now-checked<=FRESH_MS &&
    !!published && published<=now+2*3600000 &&
    now-published<=7*86400000 && net>=now-30*60000;
}
function ingest(current,payload,missions,now=Date.now()) {
  const state=current?.version===1 && current.missions && current.history ? current : initially();
  if(!payload||!Array.isArray(payload.reports)||payload.reports.length>8 ||
    !['ok','partial','unavailable'].includes(payload.discoveryStatus)) throw new Error('invalid-payload');
  const available=new Map((missions||[]).filter(m=>UUID.test(m.id||'')).map(m=>[m.id,m]));
  state.nasaReports ||= {}; state.nasaHistory ||= {};
  if(payload.nasaReports!=null && (!Array.isArray(payload.nasaReports)||
      payload.nasaReports.length>5))throw new Error('invalid-nasa-observations');
  let accepted=0,changes=0,rejected=0;
  for(const raw of payload.reports){
    const mission=available.get(raw?.missionId);
    const report=normalizeReport(raw,mission,now);
    if(!report){rejected++;continue;}
    const prior=state.missions[report.missionId];
    if(prior && prior.sourceSha256===report.sourceSha256){
      // Re-checking the same official PDF refreshes source evidence without
      // fabricating a new forecast revision event.
      prior.sourceVerifiedAt=iso(now);
      if (['45ws-public-page','ll2-update-link'].includes(report.discoveredVia))
        prior.discoveredVia=report.discoveredVia;
      continue;
    }
    if(prior && readTime(prior.issuedAt)>readTime(report.issuedAt))continue;
    const events=state.history[report.missionId]||[];
    const update=event(report,prior,now);
    if(!events.some(e=>e.id===update.id)){events.unshift(update);changes++;}
    state.history[report.missionId]=events.slice(0,25);
    state.missions[report.missionId]=report;
    accepted++;
  }
  let nasaAccepted=0,nasaChanges=0,nasaRejected=0;
  for(const raw of payload.nasaReports||[]) {
    const report=normalizeNasaReport(raw,available.get(raw?.missionId),now);
    if(!report){nasaRejected++;continue;}
    const previous=state.nasaReports[report.missionId];
    if(previous && previous.sourceSha256===report.sourceSha256 &&
       previous.sourceUrl===report.sourceUrl){
      previous.sourceVerifiedAt=iso(now);
      continue;
    }
    if(previous && readTime(previous.publishedAt)>readTime(report.publishedAt))continue;
    const timeline=state.nasaHistory[report.missionId]||[];
    const eventId=createHash('sha256').update(report.missionId+'|'+
      report.sourceUrl+'|'+report.sourceSha256).digest('hex').slice(0,24);
    if(!timeline.some(e=>e.id===eventId)){
      timeline.unshift({
        id:eventId,publishedAt:report.publishedAt,detectedAt:iso(now),
        sourceUrl:report.sourceUrl,
        reportedFavorablePercent:report.reportedFavorablePercent,
        priorFavorablePercent:previous?.reportedFavorablePercent??null,
        primaryConcerns:report.primaryConcerns,
        type:'nasa-reported-favorable-weather'
      });
      nasaChanges++;
    }
    state.nasaHistory[report.missionId]=timeline.slice(0,16);
    state.nasaReports[report.missionId]=report;
    nasaAccepted++;
  }
  // Expire evidence after the corresponding mission's weather window; do
  // not turn historical NASA percentages into current launch forecasts.
  for(const [id,report] of Object.entries(state.nasaReports)){
    if(now-readTime(report.publishedAt)>10*86400000){
      delete state.nasaReports[id];delete state.nasaHistory[id];
    }
  }
  for(const id of Object.keys(state.nasaReports).slice(30)){
    delete state.nasaReports[id];delete state.nasaHistory[id];
  }
  // Expire old missions and their histories. Retain valid older evidence as
  // dated historical records, never as a fresh current-weather verdict.
  for(const [id,r] of Object.entries(state.missions)){
    if(now-readTime(r.issuedAt)>21*86400000){
      delete state.missions[id]; delete state.history[id];
    }
  }
  const sorted=Object.values(state.missions).sort((a,b)=>readTime(b.issuedAt)-readTime(a.issuedAt));
  for(const r of sorted.slice(35)){delete state.missions[r.missionId];delete state.history[r.missionId];}
  state.lastCheckedAt=iso(now); if(changes)state.lastChangeAt=iso(now);
  state.monitorStatus=payload.discoveryStatus;
  state.sourceHealth=cleanSourceHealth(payload.sourceHealth);
  state.forecastWindow=cleanForecastWindow(payload.forecastWindow);
  state.nasaSourceHealth=cleanNasaHealth(payload.nasaSourceHealth);
  state.inspected=Math.min(8,Math.max(0,Number(payload.inspected)||0));
  state.verified=Math.min(8,Math.max(0,Number(payload.verified)||0));
  state.failed=Math.min(8,Math.max(0,Number(payload.failed)||0))+rejected;
  return {state,accepted,changes,rejected,nasaAccepted,nasaChanges,nasaRejected};
}
function publicHealth(state,now=Date.now()) {
  const t=readTime(state?.lastCheckedAt);
  return {status:!t?'not-initialized':now-t>HEALTH_OVERDUE_MS?'overdue':state.monitorStatus,
    checkedAt:t?iso(t):null,lastChangeAt:state?.lastChangeAt||null,
    inspected:state?.inspected||0,verified:state?.verified||0,failed:state?.failed||0,
    sourceDiscovery:'Official 45WS public-page links and LL2 update links; verified only against official 45WS PDF bytes',
    sourceChecks:Array.isArray(state?.sourceHealth)?state.sourceHealth:[],
    nasaSourceChecks:Array.isArray(state?.nasaSourceHealth)?state.nasaSourceHealth:[],
    forecastWindow:state?.forecastWindow||null,
    monitorCadence:'scheduled hourly on GitHub Actions; runs usually arrive every 3 to 11 hours'};
}
function missionForecast(mission,state,now=Date.now()){
  const health=publicHealth(state,now);
  const current=state?.missions?.[mission?.id];
  const valid=current && ['ok','partial'].includes(health.status) &&
    freshForMission(current,mission,now);
  const nasa=state?.nasaReports?.[mission?.id];
  const nasaValid=['ok','partial'].includes(health.status) &&
    validNasaCurrent(nasa,mission,now);
  const nasaHistory=(state?.nasaHistory?.[mission?.id]||[]).slice(0,12);
  const history=(state?.history?.[mission?.id]||[])
    .filter(e=>validPdfUrl(e.sourceUrl)).slice(0,12);
  const result={status:valid?'mission-matched-current':current?'historical-or-time-mismatch':'not-verified',
    label:valid?(current.povPercent===null?'Official document located; PoV not extracted':'Official weather-rule forecast matched'):
      current?'Official forecast no longer matches the current mission target':'No current official 45th Weather Squadron forecast verified',
    note:'PoV is the chance of violating covered launch weather rules during the forecast window, not the probability the rocket will scrub. Additional risks may be excluded.',
    sourceType:valid?current.sourceType:null,
    discoveredVia:valid?current.discoveredVia||'unspecified':null,
    issuedAt:valid?current.issuedAt:null,validDate:valid?current.validDate:null,
    nextForecastDate:valid?current.nextForecastDate||null:null,
    povPercent:valid?current.povPercent:null,
    primaryConcerns:valid?current.primaryConcerns:[],
    additionalRisks:valid?current.additionalRisks:{},
    officialUrl:valid?current.sourceUrl:null,
    transcriptionStatus:valid?current.transcriptionStatus:null,
    latestChange:valid?history[0]||null:null,
    timeline:valid?history:[],
    agencyWeather:nasaValid?{
      status:'nasa-reported-current',sourceType:nasa.sourceType,
      sourceUrl:nasa.sourceUrl,publishedAt:nasa.publishedAt,
      reportedFavorablePercent:nasa.reportedFavorablePercent,
      primaryConcerns:nasa.primaryConcerns,reportedTargetDate:nasa.reportedTargetDate,
      detectedAt:nasa.sourceVerifiedAt,
      timeline:nasaHistory
    }:{status:'not-verified',reportedFavorablePercent:null,sourceUrl:null,timeline:[]},
    health,officialDecision:'not-verified',officialSourceLanding:LANDING,
    disclaimer:'The 45WS forecast is not a live range GO call. Launch operators retain separate flight commit constraints.'};
  return {...result,weatherStory:buildWeatherStory(mission,result,now)};
}
async function readWeatherState(state=new ToolState()) {
  if(!stateReady())return null;
  try{return await state.get(KEY);}catch{return null;}
}
module.exports={KEY,TTL,FRESH_MS,HEALTH_OVERDUE_MS,LANDING,UUID,validPdfUrl,exactMissionMarker,
  normalizeReport,floridaCalendarDay,freshForMission,initially,event,ingest,
  cleanSourceHealth,cleanNasaHealth,cleanForecastWindow,normalizeNasaReport,
  validNasaCurrent,publicHealth,missionForecast,readWeatherState};
