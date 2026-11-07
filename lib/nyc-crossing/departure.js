'use strict';
// Lightweight, fail-closed reader of the versioned *offline Python* artifact.
// No request-time Python, credentials, additional traffic providers or Redis.
const published = require('./departure-intelligence.json');
const { NYCDOT_LINKS } = require('./traffic');

const EXPECTED_LINKS = Object.freeze(Object.fromEntries(
  Object.entries(NYCDOT_LINKS).map(([linkId, value]) => [value.crossingId, {linkId, scope:value.scope}])
));
const HOUR_MS = 3600000;
const MAX_MODEL_AGE_MS = 72 * HOUR_MS;
const MAX_SOURCE_AGE_DAYS = 3;

function nyHour(date) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday:'short', hour:'2-digit', hourCycle:'h23',
  }).formatToParts(date).map(p => [p.type,p.value]));
  return {day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(fields.weekday),
          hour: Number(fields.hour)};
}
function failure(crossingId, reason, code='UNAVAILABLE', model=published) {
  return {state:code, crossingId, reason, windows:[],
    source: {url:model?.source?.url || 'https://data.cityofnewyork.us/Transportation/DOT-Traffic-Speeds/i4gi-tjb9',
      latestObservationDate:model?.source?.latestObservationDate || null},
    disclaimer:'No forecast, full-trip time or fastest-crossing claim is available.'};
}
function numeric(n){return typeof n==='number' && Number.isFinite(n);}
function compareDepartures(crossingId, now=new Date(), model=published) {
  const expected=EXPECTED_LINKS[crossingId];
  if(!expected)return failure(crossingId,'No audited historical NYC DOT segment for this crossing.', 'NOT_COVERED',model);
  if(!model || model.schemaVersion!=='nyc-departure-evidence-v1' ||
     !['AVAILABLE','PARTIAL'].includes(model.state)) {
    return failure(crossingId,'Validated historical timing data not yet available.', 'UNAVAILABLE', model);
  }
  const nowMs=now.getTime(), issued=Date.parse(model.generatedAt || '');
  if(!Number.isFinite(nowMs)||!Number.isFinite(issued)||issued>nowMs+300000||
     nowMs-issued>MAX_MODEL_AGE_MS) {
    return failure(crossingId,'Historical model update is stale; no timing advice displayed.', 'STALE',model);
  }
  const observed=model.source?.latestObservationDate;
  const latest=typeof observed==='string' && /^\d{4}-\d{2}-\d{2}$/.test(observed)
    ? Date.parse(observed+'T23:59:59Z') : NaN;
  if(!Number.isFinite(latest)||latest>nowMs+86400000 ||
     nowMs-latest>MAX_SOURCE_AGE_DAYS*86400000) {
    return failure(crossingId,'Official archive is older than three days.', 'STALE',model);
  }
  const record=model.crossings?.[crossingId];
  if(!record || record.linkId!==expected.linkId || record.scope!==expected.scope){
    return failure(crossingId,'No validated model for this exact measurement segment.', 'UNAVAILABLE',model);
  }
  const h=record.holdout || {};
  if(!(numeric(h.gainFraction)&&h.gainFraction>=0.05 &&
       numeric(h.intervalCoverage)&&h.intervalCoverage>=0.55 &&
       numeric(h.observedHourRows)&&h.observedHourRows>=100)) {
    return failure(crossingId,'Historical model failed independent backtesting.', 'UNAVAILABLE',model);
  }
  const windows = [];
  for (let increment=0;increment<=2;increment++){
    const when=new Date(nowMs+increment*HOUR_MS);
    const clock=nyHour(when);
    const type=(clock.day===0||clock.day===6)?'weekend':'weekday';
    const slot=record.slots?.[type+':'+clock.hour];
    if(!slot||!numeric(slot.typicalMinutes)||!numeric(slot.lowerMinutes)||
       !numeric(slot.upperMinutes)||slot.typicalMinutes<=0 ||
       slot.lowerMinutes<=0 ||slot.lowerMinutes>slot.typicalMinutes||
       slot.typicalMinutes>slot.upperMinutes ||slot.trainingDays<8 ||
       slot.holdoutDays<3) {
      return failure(crossingId,'Insufficient verified samples for all three departure windows.', 'PARTIAL',model);
    }
    windows.push({inMinutes:increment*60,clockLabel:clock.hour.toString().padStart(2,'0')+':00',
      typicalMinutes:slot.typicalMinutes,lowerMinutes:slot.lowerMinutes,
      upperMinutes:slot.upperMinutes,trainingDays:slot.trainingDays});
  }
  const best=windows.reduce((a,b)=>b.typicalMinutes<a.typicalMinutes?b:a);
  const worst=Math.max(...windows.map(w=>w.typicalMinutes));
  const meaningful=worst-best.typicalMinutes>=2 && (worst-best.typicalMinutes)/worst>=0.15;
  return {state:'AVAILABLE',crossingId,linkId:record.linkId,scope:record.scope,
    direction:record.direction, windows, historicallyLighterInMinutes:meaningful?best.inMinutes:null,
    summary:meaningful
      ? 'One window was historically lighter on this same segment; it is not a forecast or route recommendation.'
      : 'No meaningful historical difference across the three hourly windows.',
    holdout:{maeMinutes:h.maeMinutes,naiveMaeMinutes:h.naiveMaeMinutes,
             intervalCoverage:h.intervalCoverage,observedHourRows:h.observedHourRows},
    source:{url:model.source.url,latestObservationDate:observed},
    disclaimer:'Historical NYC DOT segment means, not a live forecast or door-to-door comparison. Incidents, holidays and closures can change conditions.'};
}
module.exports={compareDepartures,nyHour};
