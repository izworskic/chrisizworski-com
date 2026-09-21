import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const t=require('../lib/mackinac-island/route.js')._test;

function ctxFor(date,profile,origin='lower'){
  return {
    date,personas:profile.personas,origin,profile,hourly:[],marine:{score:90},
    attractions:t.attractionState(date,8*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),
    sameDay:false,nowMinutes:6*60
  };
}
function plans(date,profile,origin='lower'){
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  return t.planCandidates(records,ctxFor(date,profile,origin));
}
const bayBase={
  origin_name:'Bay City, Michigan, US',
  origin_drive_minutes:'125',
  origin_preferred_port:'Mackinaw City',
  origin_mackinaw_minutes:'125',
  origin_st_ignace_minutes:'162'
};
const marquetteBase={
  origin_name:'Marquette, Michigan, US',
  origin_drive_minutes:'166',
  origin_preferred_port:'St. Ignace',
  origin_mackinaw_minutes:'205',
  origin_st_ignace_minutes:'166'
};

const early=t.profileFromQuery({...bayBase,trip_date:'2026-09-20',depart_at:'06:00'},['day-trip'],'lower');
const late=t.profileFromQuery({...bayBase,trip_date:'2026-09-20',depart_at:'09:00'},['day-trip'],'lower');
const earlyPlans=plans('2026-09-20',early,'lower');
const latePlans=plans('2026-09-20',late,'lower');

const bay=t.profileFromQuery({...bayBase,trip_date:'2026-09-20',depart_at:'06:00'},['day-trip'],'lower');
const marquette=t.profileFromQuery({...marquetteBase,trip_date:'2026-09-20',depart_at:'06:00'},['day-trip'],'upper');
const bayPlans=plans('2026-09-20',bay,'lower');
const marquettePlans=plans('2026-09-20',marquette,'upper');

const oct25=t.arnoldSchedule('2026-10-25',true).filter(x=>x.direction==='to-island'&&x.origin_port==='Mackinaw City');
const oct26=t.arnoldSchedule('2026-10-26',true).filter(x=>x.direction==='to-island'&&x.origin_port==='Mackinaw City');

const html=fs.readFileSync('public/mackinac-island/index.html','utf8');
const js=fs.readFileSync('public/assets/mackinac-island.js','utf8');
const route=fs.readFileSync('lib/mackinac-island/route.js','utf8');

const checks={
  trip_date_is_real:
    early.trip_date==='2026-09-20' &&
    t.parseDateField('2026-09-20')==='2026-09-20' &&
    t.parseDateField('2026-02-31')===null &&
    oct25.length!==oct26.length,
  departure_time_changes_reachability:
    earlyPlans.length>0 && latePlans.length>0 &&
    Math.min(...latePlans.map(x=>x.outbound.departure_minutes)) >
      Math.min(...earlyPlans.map(x=>x.outbound.departure_minutes)),
  origin_changes_port_economics:
    bayPlans.length>0 && marquettePlans.length>0 &&
    bayPlans[0].outbound.origin_port==='Mackinaw City' &&
    marquettePlans[0].outbound.origin_port==='St. Ignace',
  journey_cost_is_scored:
    earlyPlans.every(x=>Number.isFinite(x.mainland_drive_minutes)&&Number.isFinite(x.pre_ferry_idle_minutes)&&Number.isFinite(x.door_to_island_minutes)) &&
    /preFerryIdle \* \.18/.test(route),
  journey_is_visible:
    /id="profileTripDate"/.test(html) &&
    /id="tripDate"/.test(html) &&
    /trip_date/.test(js) &&
    /pre_ferry_idle_minutes/.test(js) &&
    /Your mainland start|mainland_drive_minutes|door-to-island/i.test(html+js+route)
};

const weights={
  trip_date_is_real:.25,
  departure_time_changes_reachability:.25,
  origin_changes_port_economics:.25,
  journey_cost_is_scored:.15,
  journey_is_visible:.10
};
const hard=['trip_date_is_real','departure_time_changes_reachability','origin_changes_port_economics'];
const valueScore=Object.entries(checks).reduce((n,[k,v])=>n+(v?weights[k]:0),0);
const loss=1-valueScore;
const hardFailures=hard.filter(k=>!checks[k]);

console.log('\nMACKINAC INPUT-CAUSALITY BENCHMARK\n');
console.log(JSON.stringify({
  checks,weights,hardFailures,loss,valueScore,
  evidence:{
    early_top:earlyPlans[0]?{port:earlyPlans[0].outbound.origin_port,ferry:earlyPlans[0].outbound.departure_time,wait:earlyPlans[0].pre_ferry_idle_minutes,door_to_island:earlyPlans[0].door_to_island_minutes}:null,
    late_top:latePlans[0]?{port:latePlans[0].outbound.origin_port,ferry:latePlans[0].outbound.departure_time,wait:latePlans[0].pre_ferry_idle_minutes,door_to_island:latePlans[0].door_to_island_minutes}:null,
    bay_top:bayPlans[0]?.outbound.origin_port||null,
    marquette_top:marquettePlans[0]?.outbound.origin_port||null,
    oct25_departures:oct25.length,
    oct26_departures:oct26.length
  }
},null,2));

if(process.argv.includes('--check')){
  const failures=[];
  if(hardFailures.length) failures.push(`hard failures: ${hardFailures.join(', ')}`);
  if(valueScore<.99) failures.push(`value ${valueScore.toFixed(3)} below 0.99`);
  if(failures.length){console.error('FAIL:',failures.join('; '));process.exit(1);}
  console.log('PASS: Mackinac date, origin and leave-time inputs materially drive the trip.');
}
