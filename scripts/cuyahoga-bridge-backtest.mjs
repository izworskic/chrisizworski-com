#!/usr/bin/env node
// Historical reference-window backtest only. Not a bridge-crossing forecast model.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const sorted = (a,b)=>a.localeCompare(b);
function requireHistoricalReport(report){
  if(report?.schemaVersion!==1||report.kind!=='NOAA_CHART_REFERENCE_PROXIMITY_INTERVALS'||
     report.futureArrivalPredictionEnabled!==false||report.bridgeCrossingTimestampValidated!==false||
     report.surveyedBridgeAxisValidated!==false||!Array.isArray(report.vessels))
      throw Error('Only historical, unvalidated NOAA chart-proximity reports accepted');
}
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'');
const MAX_BETWEEN_EPISODE_REFERENCE_GAP_MINUTES = 180;
// Time-separated visits must not be collapsed into a single travel-direction label.
// This is deliberately a coarse grouping, not a confirmed distinct vessel transit.
function directionOfOrderedEvents(events){
  if(events.length<2)return 'UNRESOLVED';
  let rise=0,fall=0;
  for(let i=1;i<events.length;i++){
    const delta=events[i].riverMile-events[i-1].riverMile;
    if(delta>.06)rise++;
    else if(delta<-.06)fall++;
  }
  if(rise && !fall)return 'INCREASING_COAST_PILOT_MILES';
  if(fall && !rise)return 'DECREASING_COAST_PILOT_MILES';
  return 'MIXED_OR_UNRESOLVED';
}
export function segmentObservedWindows(events){
  if(!Array.isArray(events))throw Error('Observed reference windows must be an array');
  const ordered=[...events].sort((a,b)=>Date.parse(a.observedNearAt)-Date.parse(b.observedNearAt));
  for(const e of ordered)if(!Number.isFinite(Date.parse(e.observedNearAt))||
    !Number.isFinite(e.riverMile)||!e.id)throw Error('Invalid historical reference-window record');
  const groups=[];
  for(const e of ordered){
    let last=groups[groups.length-1];
    const prior=last?.windows.at(-1);
    if(!last || (Date.parse(e.observedNearAt)-Date.parse(prior.observedNearAt))/60000>MAX_BETWEEN_EPISODE_REFERENCE_GAP_MINUTES){
      last={windows:[]};groups.push(last);
    }
    last.windows.push(e);
  }
  return groups.map((group,i)=>({
    episodeId:'observed-reference-window-group-'+(i+1),
    observedFrom:group.windows[0].observedNearAt,
    observedThrough:group.windows.at(-1).observedNearAt,
    referenceWindows:group.windows.length,
    direction:directionOfOrderedEvents(group.windows),
    windowIds:group.windows.map(e=>e.id),
    claim:'TIME_SEPARATED_GROUP_NOT_CONFIRMED_COMPLETE_TRANSIT'
  }));
}
export function evaluateHistoricalReferenceWindows(cases){
  if(!Array.isArray(cases)||!cases.length||cases.length>100)throw Error('Supply between one and 100 dated reference reports');
  const visits=[],dates=new Set(),uniqueVessels=new Set();
  let source=null;
  for(const c of cases) {
    if(!isDate(c?.date))throw Error('Historical study date must be YYYY-MM-DD');
    requireHistoricalReport(c.report);
    if(source===null)source=c.report.chartSourceUrl;
    if(c.report.chartSourceUrl!==source)throw Error('Mixed chart source versions cannot be compared');
    dates.add(c.date);
    for(const vessel of c.report.vessels) {
      if(!/^\d{9}$/.test(vessel.mmsi)||!Array.isArray(vessel.bridgeReferenceEvents))throw Error('Invalid vessel observations');
      if(visits.some(v=>v.date===c.date&&v.mmsi===vessel.mmsi))throw Error('Duplicate vessel/date; do not inflate sample counts');
      uniqueVessels.add(vessel.mmsi);
      const ref=vessel.bridgeReferenceEvents;
      const accepted=ref.filter(e=>e.bracket&&e.status==='OBSERVED_NEAR_CHART_POINT_WITH_BRACKET'&&e.useForIndividualBridgeCalibration!==false);
      const events=accepted.map(e=>({
        id:e.id,riverMile:e.riverMile,observedNearAt:e.bracket.nearestObservedAt,
        observedTimeBracketStart:e.bracket.observedBracketStart,observedTimeBracketEnd:e.bracket.observedBracketEnd,
        bracketMinutes:e.bracket.bracketDurationMinutes,sourceAgreement:e.crossAgency?.status||'UNVERIFIED'
      })).sort((a,b)=>Date.parse(a.observedNearAt)-Date.parse(b.observedNearAt));
      const observedEpisodes=segmentObservedWindows(events);
      const direction=observedEpisodes.length>1?'MULTIPLE_TIME_SEPARATED_EPISODES':observedEpisodes[0]?.direction||'UNRESOLVED';
      const windows=events.map(e=>({...e,episodeDirection:observedEpisodes.find(group=>group.windowIds.includes(e.id))?.direction||'UNRESOLVED'}));
      visits.push({
        date:c.date,mmsi:vessel.mmsi,observedPositions:vessel.observedPositions,
        direction,observedEpisodes,observedReferenceCount:accepted.length,
        sourceConflicts:ref.filter(e=>e.status==='OFFICIAL_POSITION_CONFLICT').map(e=>e.id),
        insufficientRefs:ref.filter(e=>['NO_NEARBY_AIS_FIX','NEARBY_BUT_GAP_OR_MOVEMENT_INSUFFICIENT','AMBIGUOUS_REPEATED_REFERENCE_APPROACH'].includes(e.status)).length,
        withheldCollocated:ref.filter(e=>e.useForIndividualBridgeCalibration===false).map(e=>e.id),
        observedWindows:windows
      });
    }
  }
  const uniqueDates=[...dates].sort(sorted);
  const byReference=new Map();
  for(const v of visits)for(const event of v.observedWindows) {
    const list=byReference.get(event.id)||[];
    list.push({date:v.date,mmsi:v.mmsi,direction:event.episodeDirection,observedNearAt:event.observedNearAt,bracketMinutes:event.bracketMinutes});
    byReference.set(event.id,list);
  }
  const referenceCoverage=[...byReference.entries()].sort(([a],[b])=>sorted(a,b)).map(([id,rows])=>({
    id,historicalWindows:rows.length,independentDates:new Set(rows.map(x=>x.date)).size,
    distinctVessels:new Set(rows.map(x=>x.mmsi)).size,
    maximumObservedBracketMinutes:Math.max(...rows.map(x=>x.bracketMinutes)),
    byDirection:Object.fromEntries([...new Set(rows.map(x=>x.direction))].sort().map(d=>[d,rows.filter(x=>x.direction===d).length]))
  }));
  const criteria={
    minimumIndependentCalendarDates:10,minimumDifferentVessels:3,
    actualSurveyedBridgeAxesRequired:true,independentBridgeCrossingLabelsRequired:true,
    observedIndependentCalendarDates:uniqueDates.length,observedDifferentVessels:uniqueVessels.size,
    surveyedBridgeAxesAvailable:false,independentBridgeCrossingLabelsAvailable:false,
    timeSeparatedWindowGroupsAreNotConfirmedCompleteTransits:true
  };
  return {
    kind:'HISTORICAL_CHART_REFERENCE_COVERAGE_BACKTEST_NOT_ETA_ACCURACY',
    reportVersion:1,chartSourceUrl:source,dates:uniqueDates,
    visits,referenceCoverage,criteria,
    visitorArrivalPredictionEnabled:false,
    status:'INSUFFICIENT_INDEPENDENT_CROSSING_GROUND_TRUTH',
    note:'This is a coverage/reconstruction audit. No empirical ETA accuracy or bridge-opening timing is measured. An observed reference bracket is not an actual bridge-axis crossing.'
  };
}
async function main(args){
  const inputs=[];let dest=null;
  for(let i=0;i<args.length;i+=2){
    if(!args[i+1])throw Error('Missing argument');
    if(args[i]==='--input')inputs.push(args[i+1]);
    else if(args[i]==='--out'&&!dest)dest=args[i+1];
    else throw Error('Usage: --input YYYY-MM-DD:coast-pilot-report.json [--input ...] --out backtest.json');
  }
  if(!inputs.length||!dest)throw Error('Supply inputs and output');
  const cases=[];
  for(const spec of inputs){
    const m=/^(\d{4}-\d{2}-\d{2}):(.+\.json)$/.exec(spec);
    if(!m)throw Error('Input must use date:path.json');
    cases.push({date:m[1],report:JSON.parse(await readFile(m[2],'utf8'))});
  }
  const analysis=evaluateHistoricalReferenceWindows(cases);
  await writeFile(dest,JSON.stringify(analysis,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({status:analysis.status,days:analysis.dates,visits:analysis.visits.map(v=>({
    date:v.date,mmsi:v.mmsi,direction:v.direction,observedEpisodes:v.observedEpisodes,bracketedReferenceCount:v.observedReferenceCount,
    omittedBecauseOfGaps:v.insufficientRefs,withheldCollocated:v.withheldCollocated
  })),referenceCoverage:analysis.referenceCoverage,visitorArrivalPredictionEnabled:false},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
