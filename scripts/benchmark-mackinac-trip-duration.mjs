import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const route=require('../lib/mackinac-island/route.js');
const t=route._test;

const html=fs.readFileSync('public/mackinac-island/index.html','utf8');
const js=fs.readFileSync('public/assets/mackinac-island.js','utf8');
const routeText=fs.readFileSync('lib/mackinac-island/route.js','utf8');

function hourly(date,{temp=66,wind=8,pop=10}={}){
  const rows=[];
  for(let h=6;h<=22;h++) rows.push({
    start:`${date}T${String(h).padStart(2,'0')}:00:00-04:00`,
    end:`${date}T${String((h+1)%24).padStart(2,'0')}:00:00-04:00`,
    temperature_f:temp,wind_mph:wind,precipitation_probability:pop,
    humidity:62,short_forecast:pop>=60?'Rain likely':'Partly sunny',is_daytime:h<20
  });
  return rows;
}
function check(name,ok,why,hard=true){return {name,ok:Boolean(ok),why,hard};}
function setup({date='2026-09-20',origin='lower',personas=['day-trip'],query={},nowMinutes=6*60}){
  const profile=t.profileFromQuery(query,personas,origin);
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const ctx={
    date,personas:profile.personas,origin,profile,hourly:hourly(date),
    marine:{score:90},attractions:t.attractionState(date,nowMinutes),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),
    sameDay:true,nowMinutes
  };
  const plans=t.planCandidates(records,ctx);
  const plan=plans[0]||null;
  const returnDate=t.addLocalDays(date,profile.nights||0);
  const returnPlan=plan?t.returnPlanForStay(profile,returnDate,plan.outbound.origin_port,true,true):null;
  const tripDays=plan?t.tripDaysFor(profile,ctx,plan,returnPlan):[];
  return {date,profile,ctx,plan,returnDate,returnPlan,tripDays};
}

const scenarios=[
  {
    id:'D1',name:'Day trip keeps a same-day return',
    input:{query:{trip:'day-trip',origin_city:'grand-rapids',depart_at:'06:30'}},
    checks:r=>[
      check('zero nights',r.profile.nights===0,'Day trip is not an overnight stay.'),
      check('same-day return candidate',Boolean(r.plan?.return),'Day trip needs a feasible same-day return ferry.'),
      check('return date equals arrival date',r.returnDate===r.date,'Day trip returns on the arrival date.')
    ]
  },
  {
    id:'D2',name:'Day trip deadline is respected',
    input:{query:{trip:'day-trip',origin_city:'traverse-city',depart_at:'07:00',return_by:'5:30 PM'}},
    checks:r=>[
      check('deadline obeyed',!r.plan?.return||r.plan.return.departure_minutes<=17*60+30,'A day-trip return deadline is a hard constraint.'),
      check('not overnight',r.profile.trip==='day-trip','Return deadline belongs to the same day.')
    ]
  },
  {
    id:'O1',name:'One-night stay has no same-day ferry pressure',
    input:{personas:['overnight'],query:{trip:'overnight',nights:'1',origin_city:'grand-rapids',depart_at:'06:30'}},
    checks:r=>[
      check('one night',r.profile.nights===1,'Explicit stay length is retained.'),
      check('outbound has no same-day return',r.plan?.return==null,'Arrival-day candidate cannot manufacture a same-day return.'),
      check('return date next day',r.returnDate==='2026-09-21','One night means next-day return.'),
      check('flexible return has no exact ferry',r.returnPlan?.mode==='flexible'&&r.returnPlan?.recommended==null,'Tickets are flexible; no exact return is invented without a user constraint.'),
      check('two calendar days',r.tripDays.length===2,'One night spans arrival day plus return day.')
    ]
  },
  {
    id:'O2',name:'Two-night stay is a first-class multi-day trip',
    input:{personas:['overnight','photography'],query:{trip:'overnight',nights:'2',origin_city:'detroit',depart_at:'06:00',must_do:'sunset'}},
    checks:r=>[
      check('two nights',r.profile.nights===2,'Stay length must not collapse to generic overnight.'),
      check('correct return date',r.returnDate==='2026-09-22','Return date is arrival plus two nights.'),
      check('three trip days',r.tripDays.length===3,'Arrival, full day, return day are distinct.'),
      check('middle full day exists',r.tripDays.some(d=>d.role==='full-day'),'A two-night stay needs a full island day.')
    ]
  },
  {
    id:'O3',name:'Three-night family stay does not inherit day-trip return logic',
    input:{personas:['overnight','kids'],query:{trip:'overnight',nights:'3',origin_city:'lansing',depart_at:'07:00',children:'2'}},
    checks:r=>[
      check('return three days later',r.returnDate==='2026-09-23','Three nights requires a separate return date.'),
      check('no exact return by default',r.returnPlan?.recommended==null,'Do not fabricate precision for a flexible ticket.'),
      check('four calendar-day outline',r.tripDays.length===4,'Three nights spans four calendar days.')
    ]
  },
  {
    id:'O4',name:'Multi-day explicit return deadline selects a return-day ferry',
    input:{personas:['overnight'],query:{trip:'overnight',nights:'2',origin_city:'grand-rapids',depart_at:'06:30',return_by:'3:00 PM'}},
    checks:r=>[
      check('deadline mode',r.returnPlan?.mode==='deadline','Explicit deadline changes return mode.'),
      check('exact return only because requested',Boolean(r.returnPlan?.recommended),'A constrained return should produce a concrete ferry.'),
      check('deadline respected',!r.returnPlan?.recommended||r.returnPlan.recommended.departure_minutes<=15*60,'Selected return must not exceed the user deadline.')
    ]
  },
  {
    id:'O5',name:'Return schedule uses the actual return date across a schedule boundary',
    input:{date:'2026-10-24',personas:['overnight'],query:{trip:'overnight',nights:'2',origin_city:'grand-rapids',depart_at:'06:00'}},
    checks:r=>[
      check('boundary return date',r.returnDate==='2026-10-26','Two nights crosses into the Oct 26 schedule band.'),
      check('options stamped return date',(r.returnPlan?.options||[]).every(x=>x.valid_date==='2026-10-26'),'Return options must come from the return-date timetable, not arrival-day records.')
    ]
  },
  {
    id:'O6',name:'Unsupported return date fails closed',
    input:{date:'2026-10-30',personas:['overnight'],query:{trip:'overnight',nights:'2',origin_city:'grand-rapids',depart_at:'06:00'}},
    checks:r=>[
      check('return date outside normalized summer schedule',r.returnDate==='2026-11-01','Scenario intentionally crosses the summer timetable boundary.'),
      check('unavailable rather than invented',r.returnPlan?.mode==='unavailable'&&r.returnPlan?.recommended==null,'No normalized schedule means no fabricated return.')
    ]
  },
  {
    id:'O7',name:'Return preserves the parked mainland port',
    input:{origin:'upper',personas:['overnight'],query:{trip:'overnight',nights:'2',origin_city:'marquette',depart_at:'06:30',return_by:'5:00 PM'}},
    checks:r=>[
      check('St Ignace outbound',r.plan?.outbound.origin_port==='St. Ignace','Upper Peninsula origin should favor St. Ignace.'),
      check('same port on return',(r.returnPlan?.options||[]).every(x=>x.destination_port==='St. Ignace'),'Visitor should return to the port where the car is parked.')
    ]
  }
];

const results=scenarios.map(s=>{
  const r=setup(s.input);
  const checks=s.checks(r);
  return {
    id:s.id,name:s.name,
    checks,
    failed:checks.filter(x=>!x.ok).map(x=>x.name),
    profile:{trip:r.profile.trip,nights:r.profile.nights,return_by:r.profile.desired_return_minutes},
    outbound:r.plan?.outbound?.departure_time||null,
    outbound_port:r.plan?.outbound?.origin_port||null,
    return_date:r.returnDate,
    return_mode:r.returnPlan?.mode||null,
    return_time:r.returnPlan?.recommended?.departure_time||null,
    trip_days:r.tripDays.length
  };
});

const hardFailures=results.flatMap(r=>r.checks.filter(c=>c.hard&&!c.ok).map(c=>({scenario:r.id,check:c.name})));
const totalChecks=results.reduce((n,r)=>n+r.checks.length,0);
const passedChecks=results.reduce((n,r)=>n+r.checks.filter(c=>c.ok).length,0);

const dimensions={
  feasibility: results.filter(r=>!r.failed.some(x=>/deadline|same-day|parked|schedule/i.test(x))).length/results.length,
  temporal_coherence: results.filter(r=>!r.failed.some(x=>/date|night|calendar|full day/i.test(x))).length/results.length,
  return_truthfulness: results.filter(r=>!r.failed.some(x=>/exact|invented|flexible|return/i.test(x))).length/results.length,
  constraint_respect: results.filter(r=>!r.failed.some(x=>/deadline|port/i.test(x))).length/results.length,
  multi_day_value: results.filter(r=>!r.failed.some(x=>/trip days|calendar|full day/i.test(x))).length/results.length,
  source_truth: /tickets are not day or time specific|tickets.*valid for any/i.test(routeText+' '+html+' '+js)?1:0,
  ui_clarity: /nights/i.test(html)&&/return/i.test(html)&&!/Recommended ferry home/.test(html)?1:0
};

const weights={feasibility:.28,temporal_coherence:.18,return_truthfulness:.18,constraint_respect:.14,multi_day_value:.10,source_truth:.07,ui_clarity:.05};
const valueScore=Object.entries(dimensions).reduce((n,[k,v])=>n+weights[k]*v,0);
const loss=1-(passedChecks/Math.max(1,totalChecks));

console.log('\nMACKINAC TRIP-DURATION BENCHMARK\n');
console.table(results.map(r=>({id:r.id,scenario:r.name,out:r.outbound,port:r.outbound_port,return_date:r.return_date,return_mode:r.return_mode,return_time:r.return_time,days:r.trip_days,failed:r.failed.join(', ')||'PASS'})));
console.log(JSON.stringify({hardFailures,totalChecks,passedChecks,loss,dimensions,weights,valueScore},null,2));

if(process.argv.includes('--check')){
  const failures=[];
  if(hardFailures.length) failures.push(`${hardFailures.length} hard trip-contract failures`);
  if(loss>.03) failures.push(`loss ${loss.toFixed(3)} exceeds 0.03`);
  if(valueScore<.95) failures.push(`value ${valueScore.toFixed(3)} below 0.95`);
  if(failures.length){console.error('\nFAIL:',failures.join('; '));process.exit(1);}
  console.log('\nPASS: day-trip, overnight, and multi-day trip contracts meet the release gate.');
}
