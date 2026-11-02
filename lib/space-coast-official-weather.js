'use strict';

// Official 45th Weather Squadron forecast chronicle. Only a source-linked,
// mission-matched official PDF can contribute a PoV reading. The upstream
// LL2 update merely discovers the URL; the LL2 comment is not evidence.
const { createHash } = require('node:crypto');
const { ToolState, stateReady } = require('./tool-state');
const KEY = 'space-coast:official-weather:v1';
const TTL = 120 * 86400;
const FRESH_MS = 90 * 60000;
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
    issuedAt:iso(issued),validDate:raw.validDate,sourceType:'45ws-official-pdf',
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
    inspected:0,verified:0,failed:0,sourceHealth:[],missions:{},history:{}};
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
  '45ws-forecast-support','45ws-sitemap','45ws-parent-weather',
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
function ingest(current,payload,missions,now=Date.now()) {
  const state=current?.version===1 && current.missions && current.history ? current : initially();
  if(!payload||!Array.isArray(payload.reports)||payload.reports.length>8 ||
    !['ok','partial','unavailable'].includes(payload.discoveryStatus)) throw new Error('invalid-payload');
  const available=new Map((missions||[]).filter(m=>UUID.test(m.id||'')).map(m=>[m.id,m]));
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
  state.inspected=Math.min(8,Math.max(0,Number(payload.inspected)||0));
  state.verified=Math.min(8,Math.max(0,Number(payload.verified)||0));
  state.failed=Math.min(8,Math.max(0,Number(payload.failed)||0))+rejected;
  return {state,accepted,changes,rejected};
}
function publicHealth(state,now=Date.now()) {
  const t=readTime(state?.lastCheckedAt);
  return {status:!t?'not-initialized':now-t>FRESH_MS?'overdue':state.monitorStatus,
    checkedAt:t?iso(t):null,lastChangeAt:state?.lastChangeAt||null,
    inspected:state?.inspected||0,verified:state?.verified||0,failed:state?.failed||0,
    sourceDiscovery:'Official 45WS public-page links and LL2 update links; verified only against official 45WS PDF bytes',
    sourceChecks:Array.isArray(state?.sourceHealth)?state.sourceHealth:[],
    monitorCadence:'hourly GitHub Actions, scheduling is not guaranteed'};
}
function missionForecast(mission,state,now=Date.now()){
  const health=publicHealth(state,now);
  const current=state?.missions?.[mission?.id];
  const valid=current && ['ok','partial'].includes(health.status) &&
    freshForMission(current,mission,now);
  const history=(state?.history?.[mission?.id]||[])
    .filter(e=>validPdfUrl(e.sourceUrl)).slice(0,12);
  return {status:valid?'mission-matched-current':current?'historical-or-time-mismatch':'not-verified',
    label:valid?(current.povPercent===null?'Official document located; PoV not extracted':'Official weather-rule forecast matched'):
      current?'Official forecast no longer matches the current mission target':'No current official 45th Weather Squadron forecast verified',
    note:'PoV is the chance of violating covered launch weather rules during the forecast window, not the probability the rocket will scrub. Additional risks may be excluded.',
    sourceType:valid?current.sourceType:null,
    discoveredVia:valid?current.discoveredVia||'unspecified':null,
    issuedAt:valid?current.issuedAt:null,validDate:valid?current.validDate:null,
    povPercent:valid?current.povPercent:null,
    primaryConcerns:valid?current.primaryConcerns:[],
    additionalRisks:valid?current.additionalRisks:{},
    officialUrl:valid?current.sourceUrl:null,
    transcriptionStatus:valid?current.transcriptionStatus:null,
    latestChange:valid?history[0]||null:null,
    timeline:valid?history:[],
    health,officialDecision:'not-verified',officialSourceLanding:LANDING,
    disclaimer:'The 45WS forecast is not a live range GO call. Launch operators retain separate flight commit constraints.'};
}
async function readWeatherState(state=new ToolState()) {
  if(!stateReady())return null;
  try{return await state.get(KEY);}catch{return null;}
}
module.exports={KEY,TTL,FRESH_MS,LANDING,UUID,validPdfUrl,exactMissionMarker,
  normalizeReport,floridaCalendarDay,freshForMission,initially,event,ingest,
  cleanSourceHealth,publicHealth,missionForecast,readWeatherState};
