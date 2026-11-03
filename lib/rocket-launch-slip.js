'use strict';

// Four delayed-launch scenarios evaluated from the same NWS hourly/grid responses.
// No extra weather fetches, no unverified visibility probabilities, no launch GO.
// Weather is sampled at the existing regional reference points, not on a rocket trajectory.
const { skyCoverAt, surfaceSkyAssessment } = require('./space-coast-visibility');
const OFFSETS_HOURS=Object.freeze([0,1,3,6]);
const HORIZON_MS=7*86400000;

function unknownComparison(reason) {
  return { state:'unknown',winner:null,label:'Comparison not established',
    detail:reason||'The available weather evidence cannot support a regional comparison.' };
}
function slipWindows(samples,launch,now,compare,weatherGrade) {
  const target=Date.parse(launch?.net||'');
  if (!launch||!['minute','second'].includes(launch.netPrecision)||
      !Number.isFinite(target)||target<now-15*60000||target>now+HORIZON_MS ||
      !Array.isArray(samples)||samples.length!==2) {
    return {status:'unavailable',scenarios:[],
      reason:'A minute-level launch target inside the seven-day NWS forecast window and two regional forecast samples are required.'};
  }
  const sourceOverdue=launch.sourceStale===true;
  const scenarios=OFFSETS_HOURS.map(offsetHours=>{
    const t=target+offsetHours*3600000;
    const inHorizon=t>=now-15*60000&&t<=now+HORIZON_MS;
    const places=samples.map(sample=>{
      const period=inHorizon?(sample._hourly?.properties?.periods||[]).find(p=>
        t>=Date.parse(p.startTime||'')&&t<Date.parse(p.endTime||'')):null;
      const cloud=inHorizon?skyCoverAt(sample._grid,new Date(t).toISOString(),now):
        {percent:null,status:'outside-horizon',updatedAt:null};
      const assessment=surfaceSkyAssessment(period||null,cloud,weatherGrade);
      return {
        id:sample.id,name:sample.name,
        status:period?'forecast-hour':'hourly-unavailable',
        cloudCoverPercent:cloud.status==='ok'?cloud.percent:null,
        cloudStatus:cloud.status,
        assessment:{level:assessment.level,label:assessment.label},
        shortForecast:period?.shortForecast||null,
        forecastUpdatedAt:cloud.updatedAt||null
      };
    });
    // A stale *launch target* is not a current basis for recommending a location.
    const comparison=sourceOverdue?
      unknownComparison('The launch schedule observation is overdue. Do not act on an outdated mission target.'):
      compare(places);
    return {offsetHours,targetAt:new Date(t).toISOString(),
      status:!inHorizon?'outside-horizon':
        places.every(x=>x.cloudStatus==='ok'&&x.status==='forecast-hour')?'assessed':'partial',
      places,comparison};
  });
  const assessed=scenarios.filter(s=>s.status==='assessed').length;
  const winners=new Set(scenarios.map(s=>s.comparison?.winner).filter(Boolean));
  const changed=assessed>=2&&winners.size>=2;
  return {
    status:sourceOverdue?'schedule-overdue':assessed?'available':'limited',
    source:'NWS gridded sky cover and hourly forecasts, existing regional reference points',
    sourceOverdue, offsetsHours:OFFSETS_HOURS.slice(),
    scenarios,
    outlook:sourceOverdue?'Schedule check overdue; future-hour comparisons are withheld.':
      changed?'The relatively less cloudy regional reference point changes across the modeled delays.':
      assessed<2?'Not enough complete future-hour observations to compare launch delays.':
      'Cloud comparisons are similar or point to the same area across available delay windows.',
    note:'These are hypothetical +1, +3 and +6 hour delays, not predicted launch holds, rocket visibility or official flight-weather clearance.'
  };
}
module.exports={OFFSETS_HOURS,HORIZON_MS,slipWindows};
