import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const route=require('../lib/mackinac-island/route.js');
const t=route._test;

const html=fs.readFileSync('public/mackinac-island/index.html','utf8');
const css=fs.readFileSync('public/assets/mackinac-island.css','utf8');
const js=fs.readFileSync('public/assets/mackinac-island.js','utf8');
const routeText=fs.readFileSync('lib/mackinac-island/route.js','utf8');

function hourly(date,{temp=66,wind=8,pop=10}={}){
  const rows=[];
  for(let h=7;h<=22;h++) rows.push({
    start:`${date}T${String(h).padStart(2,'0')}:00:00-04:00`,
    end:`${date}T${String((h+1)%24).padStart(2,'0')}:00:00-04:00`,
    temperature_f:temp+(h>=12&&h<=16?3:0),
    wind_mph:wind+(h>=14?2:0),
    precipitation_probability:pop,
    humidity:62,short_forecast:pop>=60?'Rain likely':'Partly sunny',is_daytime:h<20
  });
  return rows;
}
function labels(it){return it.map(x=>x.label);}
function includesLabel(it,re){return labels(it).some(x=>re.test(x));}
function setup(p){
  const origin=p.origin||'lower';
  const base=p.personas||['day-trip'];
  const profile=t.profileFromQuery(p.query||{},base,origin);
  const personas=profile.personas;
  const date=p.date||'2026-09-20';
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const attrs=t.attractionState(date,p.nowMinutes??8*60);
  const sunrise=t.solarMinutes(date,45.8497,-84.6189,true);
  const sunset=t.solarMinutes(date,45.8497,-84.6189,false);
  const ctx={
    date,personas,origin,profile,
    hourly:hourly(date,p.weather),
    marine:{score:p.marineScore??90},
    attractions:attrs,events:p.events||[],
    sunrise,sunset,sameDay:p.sameDay??true,nowMinutes:p.nowMinutes??7*60
  };
  const plans=t.planCandidates(records,ctx);
  const plan=plans[0]||null;
  const itinerary=t.itineraryFor(plan,ctx);
  return {profile,ctx,plan,itinerary};
}
function check(name,ok,why){return {name,ok:Boolean(ok),why};}

const personas=[
  {
    id:'A',name:'Grand Rapids first-time couple',question:'When should we leave and which ferry?',
    personas:['first-visit','day-trip'],query:{origin_city:'grand-rapids',adults:'2',pace:'balanced',interests:'history,scenery,food',must_do:'fort,downtown'},
    checks:r=>[
      check('uses Mackinaw City',r.plan?.outbound.origin_port==='Mackinaw City','Lower Peninsula approach should not add a bridge crossing'),
      check('gives leave-home time',includesLabel(r.itinerary,/Leave Grand Rapids/),'Trip must start before the dock'),
      check('includes Fort Mackinac',includesLabel(r.itinerary,/Fort Mackinac/),'First trip should protect the classic history stop')
    ]
  },
  {
    id:'B',name:'Family with children 5 and 9',question:'Is today good and what can we realistically do?',
    personas:['kids','day-trip'],query:{origin_city:'lansing',adults:'2',children:'2',pace:'easy',dinner:'none',interests:'scenery,food'},
    checks:r=>[
      check('family flex block',includesLabel(r.itinerary,/Easy flex block/),'Children need slack'),
      check('real meal break',includesLabel(r.itinerary,/Lunch \/ real break/),'Meal time cannot be optimized away'),
      check('family day not excessive',!r.plan||r.plan.usable_island_minutes<=480,'Long child day should be penalized')
    ]
  },
  {
    id:'C',name:'Experienced cyclist bringing a bike',question:'When should I ride M-185?',
    personas:['biking','day-trip'],query:{origin_city:'traverse-city',adults:'1',bikes:'bring',pace:'active',interests:'biking,scenery',must_do:'m185'},
    checks:r=>[
      check('M-185 is planned',includesLabel(r.itinerary,/Ride M-185/),'Bike persona requires an actual ride block'),
      check('no rental pickup',!includesLabel(r.itinerary,/Pick up rental bikes/),'Bringing a bike should not invent rental friction'),
      check('activity weighting elevated',t.mergeWeights(r.profile.personas).activity>=18,'Cycling must change scoring')
    ]
  },
  {
    id:'D',name:'Overnight photographer',question:'Where and when is the best light?',
    personas:['overnight','photography'],query:{trip:'overnight',adults:'1',pace:'balanced',dinner:'none',interests:'photography,scenery',must_do:'sunset'},
    checks:r=>[
      check('no same-day return ferry',r.plan?.return==null,'Overnight removes last-ferry pressure'),
      check('golden light block',includesLabel(r.itinerary,/Golden-hour/),'Photography needs solar timing'),
      check('overnight reset',includesLabel(r.itinerary,/Overnight reset/),'Plan should continue beyond the day-trip frame')
    ]
  },
  {
    id:'E',name:'October 10 shoulder-season couple',question:'Is enough of the island still open?',
    date:'2026-10-10',personas:['first-visit','day-trip'],query:{adults:'2',pace:'balanced',interests:'history,scenery',must_do:'fort'},
    checks:r=>[
      check('Fort is still usable',r.ctx.attractions.some(x=>x.name==='Fort Mackinac'&&x.status!=='closed'),'Shoulder-season plan must respect actual seasonal hours'),
      check('closed nature center not recommended',!includesLabel(r.itinerary,/British Landing Nature Center/),'Closed attractions cannot enter the plan'),
      check('still produces feasible visit',Boolean(r.plan),'Reduced schedule should still be solved when feasible')
    ]
  },
  {
    id:'F',name:'Marquette visitor',question:'St. Ignace or Mackinaw City?',
    origin:'upper',personas:['day-trip'],query:{origin_city:'marquette',adults:'2',pace:'balanced'},
    checks:r=>[
      check('chooses St. Ignace',r.plan?.outbound.origin_port==='St. Ignace','Avoid unnecessary Mackinac Bridge crossing'),
      check('gives Marquette leave time',includesLabel(r.itinerary,/Leave Marquette/),'Port choice should connect to mainland logistics'),
      check('profile knows preferred port',r.profile.origin_preset?.preferred_port==='St. Ignace','Origin must influence access score')
    ]
  },
  {
    id:'G',name:'Major-event visitor',question:'Which ferry gets me there safely before the event?',
    personas:['event','day-trip'],query:{adults:'2',origin_city:'grand-rapids',event_start:'1:00 PM',interests:'events',pace:'balanced'},
    checks:r=>[
      check('arrival margin before event',r.plan?.outbound.arrival_minutes<=12*60+15,'Need at least 45 minutes before 1 PM event'),
      check('event block exists',includesLabel(r.itinerary,/Event block/),'Itinerary must protect the actual event'),
      check('event persona active',r.profile.personas.includes('event'),'Event must change weighting')
    ]
  },
  {
    id:'H',name:'Last-minute 1 PM visitor',question:'Is today still worth it?',
    nowMinutes:13*60,personas:['day-trip'],query:{adults:'2',pace:'balanced',dinner:'none'},
    checks:r=>[
      check('does not recommend past ferry',!r.plan||r.plan.outbound.departure_minutes>=13*60+r.plan.outbound.checkin_buffer_minutes,'Past boats are impossible'),
      check('shrinks to feasible late-day plan',Boolean(r.plan),'A 1 PM decision should still solve the remaining day when possible'),
      check('keeps return buffer',!r.plan?.return||r.plan.return.departure_minutes>r.plan.outbound.arrival_minutes+240,'Late trip still needs useful island time')
    ]
  },
  {
    id:'I',name:'Limited-mobility first-time visitor',question:'How do I see Mackinac without a punishing walking day?',
    personas:['first-visit','day-trip'],query:{adults:'2',mobility:'limited',pace:'easy',interests:'history,horses,scenery',must_do:'fort,carriage'},
    checks:r=>[
      check('starts with carriage/taxi orientation',includesLabel(r.itinerary,/Horse-drawn taxi \/ carriage/),'Mobility constraint must alter movement'),
      check('does not prescribe M-185 ride',!includesLabel(r.itinerary,/Ride M-185/),'Do not force a bike day'),
      check('does not prescribe Arch Rock climb',!includesLabel(r.itinerary,/Arch Rock/),'Avoid aggressive climb by default')
    ]
  },
  {
    id:'J',name:'Multigenerational family',question:'Can grandparents and kids have one sane day?',
    personas:['first-visit','kids','day-trip'],query:{adults:'4',children:'2',mobility:'limited',pace:'easy',origin_city:'detroit',dinner:'casual',interests:'history,horses,food'},
    checks:r=>[
      check('mobility transport',includesLabel(r.itinerary,/Horse-drawn taxi \/ carriage/),'Grandparents need low-friction movement'),
      check('family flex block',includesLabel(r.itinerary,/Easy flex block/),'Kids and seniors need slack'),
      check('leave-home logistics',includesLabel(r.itinerary,/Leave Detroit/),'Mainland start belongs in perfect-trip plan')
    ]
  },
  {
    id:'K',name:'Rainy-day family',question:'What is the least miserable version of today?',
    personas:['kids','day-trip'],weather:{temp:58,wind:18,pop:80},query:{adults:'2',children:'2',pace:'easy',dinner:'none',interests:'history,food'},
    checks:r=>[
      check('weather penalty is visible',Number(r.plan?.components.weather||0)<65,'Heavy rain should materially reduce score'),
      check('does not force bike loop',!includesLabel(r.itinerary,/Ride M-185/),'No bike plan on rainy family profile'),
      check('keeps flex block',includesLabel(r.itinerary,/Easy flex block/),'Rain needs fallback slack')
    ]
  },
  {
    id:'L',name:'History-first easy-paced couple',question:'Can we center the day on the fort without rushing?',
    personas:['day-trip'],query:{adults:'2',pace:'easy',interests:'history,food',must_do:'fort',dinner:'casual'},
    checks:r=>[
      check('Fort is explicit',includesLabel(r.itinerary,/Fort Mackinac/),'Must-do history needs a reserved block'),
      check('meal is explicit',includesLabel(r.itinerary,/Lunch \/ real break/),'Easy pace preserves meal time'),
      check('flex is explicit',includesLabel(r.itinerary,/Easy flex block/),'Easy pace should not be dense')
    ]
  },
  {
    id:'M',name:'Active scenery day trip',question:'How much of the island can I actually cover?',
    personas:['biking','day-trip'],query:{adults:'2',bikes:'rent',pace:'active',interests:'biking,scenery',must_do:'m185,arch-rock',dinner:'none'},
    checks:r=>[
      check('rental friction included',includesLabel(r.itinerary,/Pick up rental bikes/),'Rental bikes take real time'),
      check('M-185 included',includesLabel(r.itinerary,/Ride M-185/),'Primary activity'),
      check('Arch Rock included',includesLabel(r.itinerary,/Arch Rock/),'Active scenic plan should add bluff stop when feasible')
    ]
  },
  {
    id:'N',name:'Romantic overnight couple',question:'Can we have dinner and sunset without ferry anxiety?',
    personas:['overnight','photography'],query:{trip:'overnight',adults:'2',pace:'easy',dinner:'sit-down',interests:'food,photography,scenery',must_do:'sunset'},
    checks:r=>[
      check('overnight removes return',r.plan?.return==null,'No manufactured same-day pressure'),
      check('golden hour included',includesLabel(r.itinerary,/Golden-hour/),'Sunset is a must-do'),
      check('sit-down dinner reserved',includesLabel(r.itinerary,/Sit-down dinner/),'Dinner preference needs real time')
    ]
  },
  {
    id:'O',name:'Fall-color photographer on a bike',question:'When do I ride and when do I shoot?',
    date:'2026-10-03',personas:['fall-color','photography','biking','day-trip'],query:{adults:'1',bikes:'bring',pace:'active',interests:'fall-color,photography,biking,scenery',must_do:'m185,sunset',dinner:'none'},
    checks:r=>[
      check('ride block included',includesLabel(r.itinerary,/Ride M-185/),'Bike timing must be concrete'),
      check('golden-hour block included',includesLabel(r.itinerary,/Golden-hour/),'Photo timing must be concrete'),
      check('persona blend retained',r.profile.personas.includes('fall-color')&&r.profile.personas.includes('photography')&&r.profile.personas.includes('biking'),'Combination must alter the model, not copy text')
    ]
  }
];

const results=personas.map(p=>{
  const r=setup(p);
  const checks=p.checks(r);
  const failed=checks.filter(x=>!x.ok);
  const signature=[r.plan?.outbound.origin_port||'none',r.plan?.outbound.departure_time||'none',...labels(r.itinerary)].join('|');
  return {id:p.id,persona:p.name,question:p.question,score:r.plan?.score??null,port:r.plan?.outbound.origin_port||null,ferry:r.plan?.outbound.departure_time||null,return:r.plan?.return?.departure_time||null,checks,failed:failed.map(x=>x.name),signature};
});

const totalChecks=results.reduce((n,r)=>n+r.checks.length,0);
const failedChecks=results.reduce((n,r)=>n+r.failed.length,0);
const noPlan=results.filter(r=>r.score==null).length;
const signatures=new Set(results.map(r=>r.signature)).size;
const staticFactors={
  mobile_friction:/@media\(max-width:390px\)/.test(css)&&/\.builder-grid\{grid-template-columns:1fr\}/.test(css)?0:1,
  stale_or_unverified_data:/published-unverified-this-request/.test(routeText)&&/planning estimate only; not live traffic/i.test(routeText)&&/Live sources and freshness/.test(html)?0:1,
  unnecessary_clicks:/id="tripBuilder"/.test(html)&&/Build this trip/.test(html)&&/Best island arrival/.test(html)?0:1,
  page_load_cost:/defer/.test(html)&&/IntersectionObserver/.test(js)&&/loadLeaflet/.test(js)?0:1,
  inaccessible_information:/<label>/.test(html)&&/<fieldset/.test(html)&&/aria-live="polite"/.test(html)&&/:focus-visible/.test(css)?0:1,
  visual_clutter:/planner-decision-grid/.test(css)&&/choice-fieldset/.test(css)?0:1
};
const factors={
  decision_confusion:noPlan/personas.length,
  recommendation_unreliability:failedChecks/Math.max(1,totalChecks),
  stale_or_unverified_data:staticFactors.stale_or_unverified_data,
  mobile_friction:staticFactors.mobile_friction,
  generic_travel_content:1-(signatures/personas.length),
  unnecessary_clicks:staticFactors.unnecessary_clicks,
  page_load_cost:staticFactors.page_load_cost,
  inaccessible_information:staticFactors.inaccessible_information,
  visual_clutter:staticFactors.visual_clutter
};
const weights={decision_confusion:25,recommendation_unreliability:20,stale_or_unverified_data:15,mobile_friction:10,generic_travel_content:10,unnecessary_clicks:8,page_load_cost:5,inaccessible_information:4,visual_clutter:3};
const totalLoss=Object.entries(factors).reduce((n,[k,v])=>n+weights[k]*v,0)/100;
const values={
  decision_speed:noPlan===0?1:1-noPlan/personas.length,
  decision_confidence:1-factors.recommendation_unreliability,
  personalization:signatures/personas.length,
  live_relevance:staticFactors.stale_or_unverified_data===0?1:.5,
  source_trust:staticFactors.stale_or_unverified_data===0?1:.5,
  actionability:results.filter(r=>r.port&&r.ferry).length/personas.length,
  return_visit_value:/fall color|events|crowd/i.test(html+routeText)?1:0
};
const valueProduct=Object.values(values).reduce((a,b)=>a*b,1);

console.log('\nMACKINAC ISLAND — 15 PERSONA RELEASE BENCHMARK\n');
console.table(results.map(r=>({id:r.id,persona:r.persona,score:r.score,port:r.port,ferry:r.ferry,return:r.return,failed:r.failed.join(', ')||'PASS'})));
console.log(JSON.stringify({personaPasses:results.filter(r=>!r.failed.length).length,totalPersonas:personas.length,totalChecks,failedChecks,distinctPlanSignatures:signatures,factors,totalLoss,values,valueProduct},null,2));

if(process.argv.includes('--check')){
  const failures=[];
  if(results.some(r=>r.failed.length)) failures.push('one or more persona expectations failed');
  if(noPlan) failures.push('one or more benchmark personas had no feasible plan');
  if(signatures<15) failures.push(`only ${signatures}/15 materially distinct plan signatures`);
  if(totalLoss>.05) failures.push(`loss ${totalLoss.toFixed(3)} exceeds 0.05 gate`);
  if(valueProduct<.90) failures.push(`value product ${valueProduct.toFixed(3)} below 0.90 gate`);
  if(failures.length){console.error('\nFAIL:',failures.join('; '));process.exit(1);}
  console.log('\nPASS: all 15 personas meet the end-to-end trip benchmark.');
}
