const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routePath = path.join(__dirname, '..', 'lib', 'mackinac-island', 'route.js');
const htmlPath = path.join(__dirname, '..', 'public', 'mackinac-island', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'assets', 'mackinac-island.css');
const jsPath = path.join(__dirname, '..', 'public', 'assets', 'mackinac-island.js');
const route = require(routePath);
const t = route._test;
const originApi = require(path.join(__dirname, '..', 'api', 'mackinac-origin.js'));
const originT = originApi._test;

function sum(obj){ return Object.values(obj).reduce((a,b)=>a+Number(b||0),0); }

test('persona weights normalize to 100 and genuinely differ', () => {
  const day=t.mergeWeights(['day-trip']);
  const bike=t.mergeWeights(['biking']);
  const kids=t.mergeWeights(['kids']);
  assert.ok(Math.abs(sum(day)-100)<0.001);
  assert.ok(Math.abs(sum(bike)-100)<0.001);
  assert.ok(Math.abs(sum(kids)-100)<0.001);
  assert.ok(bike.activity>day.activity);
  assert.ok(kids.weather>day.weather);
  assert.ok(kids.marine>day.marine);
});

test('September 19 published schedules include both ports and late Saturday returns', () => {
  const arnold=t.arnoldSchedule('2026-09-19',true);
  const sheplers=t.sheplersSchedule('2026-09-19',true);
  assert.ok(arnold.some(r=>r.origin_port==='Mackinaw City'&&r.direction==='to-island'&&r.departure_time==='9:30 AM'));
  assert.ok(arnold.some(r=>r.origin_port==='Mackinac Island'&&r.destination_port==='Mackinaw City'&&r.departure_time==='8:30 PM'));
  assert.ok(arnold.some(r=>r.origin_port==='St. Ignace'&&r.direction==='to-island'));
  assert.ok(sheplers.some(r=>r.origin_port==='Mackinaw City'&&r.direction==='to-island'&&r.departure_time==='7:30 PM'));
  assert.ok(sheplers.some(r=>r.origin_port==='Mackinac Island'&&r.destination_port==='Mackinaw City'&&r.departure_time==='8:00 PM'));
});

test('solar timing is locally plausible for the equinox window', () => {
  const rise=t.solarMinutes('2026-09-20',45.8497,-84.6189,true);
  const set=t.solarMinutes('2026-09-20',45.8497,-84.6189,false);
  assert.ok(rise>420 && rise<480, `sunrise ${rise}`);
  assert.ok(set>1140 && set<1230, `sunset ${set}`);
});

test('event weekend raises modeled crowd pressure without inventing visitor counts', () => {
  const crowd=t.crowdRead('2026-09-20',{available:true,pop_peak:10,high_f:65},[{impact:'major',title:'Pride Festival'}]);
  assert.ok(crowd.index>=70);
  assert.match(crowd.label,/HEAVY/);
  assert.equal(crowd.modeled,true);
  assert.match(crowd.caveat,/not a live visitor count/i);
});

test('fall operating hours do not recommend the British Landing Nature Center', () => {
  const attractions=t.attractionState('2026-09-20',10*60);
  assert.equal(attractions.find(x=>x.name==='British Landing Nature Center').status,'closed');
  assert.notEqual(attractions.find(x=>x.name==='Fort Mackinac').status,'closed');
});

test('public surface makes the decision first and keeps return vs last ferry distinct', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(html,/Build Your Mackinac Island Trip/);
  assert.match(html,/Best time to arrive/);
  assert.match(html,/Return plan/);
  assert.match(html,/Last published ferry for return day/);
  assert.match(html,/Why this timing\?/);
  assert.match(html,/Fine-tune your Mackinac plan/);
  assert.match(html,/When it feels busiest/);
  assert.match(html,/CC BY-SA 4\.0/);
  assert.match(html,/\/privacy\//);
});

test('mobile-first and accessible controls are present', () => {
  const css=fs.readFileSync(cssPath,'utf8');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/:focus-visible/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/Skip to trip planner/);
});

test('JEV is bounded to a deterministic closed candidate set', () => {
  const route=fs.readFileSync(routePath,'utf8');
  const harness=fs.readFileSync(path.join(__dirname,'..','lib','mackinac-island','harness.js'),'utf8');
  assert.match(route,/Choose exactly one supplied plan id or NONE/);
  assert.match(route,/harness\.decideClosedSet/);
  assert.match(harness,/allowed\.has\(id\)/);
  assert.match(harness,/confidence>=\.52/);
  assert.match(harness,/injectionDependency>=\.45/);
  assert.doesNotMatch(route,/api\.typesafe\.ai/);
  assert.doesNotMatch(route,/TYPESAFE_API_KEY/);
});

test('client degrades explicitly instead of fabricating a ferry plan', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/not guessing at a ferry time/i);
  assert.match(js,/ferry operators below/i);
  assert.match(js,/Last scheduled: unavailable/);
  assert.match(js,/mackinac_persona_selected/);
  assert.match(js,/mackinac_share_plan/);
});

test('default My Trip view does not masquerade as an explicit selected trip date', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/tripDateExplicit:false/);
  assert.match(js,/syncTripDateInputs\(detroitToday\(\),\{explicit:false\}\)/);
  assert.match(js,/state\.tripDate&&state\.tripDateExplicit\)p\.set\('trip_date',state\.tripDate\)/);
  assert.match(js,/trip_date:state\.tripDateExplicit\?state\.tripDate:''/);
});

test('missing Mackinac decision scores are withheld instead of rendered as zero', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/hasScore=dec\.score!==null&&dec\.score!==undefined&&Number\.isFinite\(rawScore\)/);
  assert.match(js,/hasScore\?score:'—'/);
  assert.match(js,/Visit score unavailable/);
  assert.doesNotMatch(js,/score=Math\.round\(dec\.score\|\|0\)/);
});

test('Mackinac decision client asset is cache-busted after score-state fix', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(html,/mackinac-island\\.js\\?v=20260921-trip1/);
});


test('full trip profile converts constraints into persona behavior', () => {
  const p=t.profileFromQuery({
    trip:'day-trip', adults:'2', children:'2', origin_city:'grand-rapids',
    bikes:'rent', pace:'easy', mobility:'standard', dinner:'casual',
    interests:'history,biking,photography', must_do:'fort,m185', return_by:'6:30 PM'
  },['day-trip'],'lower');
  assert.equal(p.adults,2);
  assert.equal(p.children,2);
  assert.equal(p.origin_preset.preferred_port,'Mackinaw City');
  assert.ok(p.personas.includes('kids'));
  assert.ok(p.personas.includes('biking'));
  assert.ok(p.personas.includes('photography'));
  assert.equal(p.desired_return_minutes,18*60+30);
});

test('Marquette profile prefers St. Ignace', () => {
  const p=t.profileFromQuery({origin_city:'marquette'},['day-trip'],'upper');
  assert.equal(t.preferredPort('upper',p),'St. Ignace');
  assert.equal(p.origin_preset.drive_minutes,166);
});

test('limited mobility itinerary substitutes carriage orientation for aggressive route', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({mobility:'limited',pace:'easy',interests:'history,horses',must_do:'fort'},['first-visit','day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,8*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plan=t.planCandidates(records,ctx)[0];
  const itinerary=t.itineraryFor(plan,ctx);
  const labels=itinerary.map(x=>x.label).join('|');
  assert.match(labels,/Horse-drawn taxi \/ carriage/);
  assert.doesNotMatch(labels,/Ride M-185/);
  assert.doesNotMatch(labels,/Arch Rock/);
});

test('event start removes arrivals without a practical margin', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({event_start:'1:00 PM',interests:'events'},['event','day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,8*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plans=t.planCandidates(records,ctx);
  assert.ok(plans.length>0);
  assert.ok(plans.every(x=>x.outbound.arrival_minutes<=12*60+15));
});


test('itinerary exposes movement context for actionable trip stops', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({origin_city:'grand-rapids',bikes:'rent',pace:'balanced',interests:'biking,history',must_do:'m185,fort'},['first-visit','day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,8*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plan=t.planCandidates(records,ctx)[0];
  const itinerary=t.itineraryFor(plan,ctx);
  assert.ok(itinerary.length>5);
  assert.ok(itinerary.filter(x=>x.stop_id).every(x=>typeof x.movement==='string' && x.movement.length>4));
  assert.match(itinerary.find(x=>x.stop_id==='m185').movement,/8\.2 mi/);
  assert.match(itinerary.find(x=>x.stop_id==='fort').movement,/0\.4 mi/);
});

test('client renders route-aware map and itinerary labels', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/x\.title\|\|x\.label/);
  assert.match(js,/recommended_stop_ids/);
  assert.match(js,/Your itinerary · orientation only, not turn-by-turn routing/);
  assert.match(js,/routeIds\.includes\('m185'\)/);
  assert.match(js,/state\.mapWasOpened/);
});


test('explicit full-builder trip mode overrides conflicting quick persona', () => {
  const day=t.profileFromQuery({trip:'day-trip'},['overnight','photography'],'lower');
  assert.equal(day.trip,'day-trip');
  assert.ok(day.personas.includes('day-trip'));
  assert.ok(!day.personas.includes('overnight'));
});

test('derived form constraints are preserved without persona truncation', () => {
  const p=t.profileFromQuery({
    trip:'day-trip',children:'2',bikes:'rent',
    interests:'fall-color,photography',must_do:'m185,sunset'
  },['day-trip','first-visit','fall-color'],'lower');
  for (const name of ['kids','biking','photography','fall-color']) assert.ok(p.personas.includes(name), name);
});

test('same-day origin drive time can make an early ferry infeasible', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({origin_city:'grand-rapids'},['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,7*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:true,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plans=t.planCandidates(records,ctx);
  assert.ok(plans.length>0);
  const preferred=plans.filter(x=>x.outbound.origin_port===profile.origin_preset.preferred_port);
  assert.ok(preferred.length>0);
  assert.ok(preferred.every(x=>x.outbound.departure_minutes>=7*60+profile.origin_preset.drive_minutes+15+x.outbound.checkin_buffer_minutes));
  if(plans[0].outbound.origin_port===profile.origin_preset.preferred_port){
    assert.ok(plans[0].outbound.departure_minutes>=7*60+profile.origin_preset.drive_minutes+15+plans[0].outbound.checkin_buffer_minutes);
  }
});

test('fixed event time is protected from flexible bike activity overlap', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({
    event_start:'1:00 PM',bikes:'rent',interests:'events,biking',must_do:'m185'
  },['event','day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,10*60+30),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:true,nowMinutes:10*60+30
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plan=t.planCandidates(records,ctx)[0];
  const itinerary=t.itineraryFor(plan,ctx);
  const event=itinerary.find(x=>x.label==='Event block');
  assert.ok(event);
  assert.ok(event.minute<=12*60+25);
  const preEvent=itinerary.filter(x=>x.minute<event.minute && /Ride M-185|Pick up rental bikes/.test(x.label));
  assert.equal(preEvent.length,0);
});

test('carriage must-do produces a carriage block for standard mobility', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({must_do:'carriage',pace:'balanced'},['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,8*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plan=t.planCandidates(records,ctx)[0];
  const labels=t.itineraryFor(plan,ctx).map(x=>x.label).join('|');
  assert.match(labels,/Horse-drawn carriage \/ taxi orientation/);
});

test('sit-down dinner constrains the selected return ferry', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({dinner:'sit-down'},['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,8*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plan=t.planCandidates(records,ctx)[0];
  assert.ok(plan?.return);
  assert.ok(plan.return.departure_minutes>=19*60+10);
  assert.match(t.itineraryFor(plan,ctx).map(x=>x.label).join('|'),/Sit-down dinner/);
});

test('browser renders planning references in the trust layer', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/planning_references/);
  assert.match(js,/planning estimate · not live traffic/);
  assert.match(js,/Accessibility planning source/);
});


test('explicit trip form overrides stale quick-mode persona', () => {
  const p=t.profileFromQuery({trip:'day-trip'},['overnight','photography'],'lower');
  assert.equal(p.trip,'day-trip');
  assert.ok(p.personas.includes('day-trip'));
  assert.ok(!p.personas.includes('overnight'));
});

test('derived form personas are not truncated by quick-mode count', () => {
  const p=t.profileFromQuery({
    trip:'day-trip',children:'2',bikes:'rent',
    interests:'fall-color,photography,events',
    must_do:'m185,sunset',event_start:'3:00 PM'
  },['day-trip','first-visit','fall-color'],'lower');
  for(const persona of ['day-trip','first-visit','fall-color','kids','biking','photography','event']) assert.ok(p.personas.includes(persona), persona);
});

test('standard-mobility carriage must-do produces a carriage block', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({mobility:'standard',pace:'balanced',must_do:'carriage',dinner:'none'},['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,8*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plan=t.planCandidates(records,ctx)[0];
  const labels=t.itineraryFor(plan,ctx).map(x=>x.label).join('|');
  assert.match(labels,/Horse-drawn carriage \/ taxi orientation/);
});

test('origin drive time rejects ferries whose required leave-home time is already past', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({origin_city:'grand-rapids',dinner:'none'},['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,7*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:true,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plans=t.planCandidates(records,ctx);
  assert.ok(plans.length>0);
  const selected=plans[0];
  const leave=selected.outbound.departure_minutes-selected.outbound.checkin_buffer_minutes-profile.origin_preset.drive_minutes-15;
  assert.ok(leave>=ctx.nowMinutes, `leave ${leave} now ${ctx.nowMinutes}`);
});

test('day-trip dinner preference constrains return ferry and appears in itinerary', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({pace:'easy',dinner:'sit-down',interests:'food'},['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,8*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plan=t.planCandidates(records,ctx)[0];
  assert.ok(plan?.return);
  assert.ok(plan.return.departure_minutes>=19*60+10);
  assert.match(t.itineraryFor(plan,ctx).map(x=>x.label).join('|'),/Sit-down dinner/);
});

test('client exposes planning references and keeps trip controls synchronized', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/planning_references/);
  assert.match(js,/planning estimate · not live traffic/);
  assert.match(js,/tripMode/);
  assert.match(js,/state\.personas\.delete\(trip==='overnight'\?'day-trip':'overnight'\)/);
});


test('Mackinac hero trip strip fails closed when the live bundle fails', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/setText\('heroTripContext','Live trip details unavailable'\)/);
  assert.match(js,/setText\('heroFerry','Unavailable'\)/);
  assert.match(js,/setText\('heroIsland','Unavailable'\)/);
  assert.match(js,/setText\('heroReturn','Unavailable'\)/);
});


test('shared trip intake accepts a real free-form starting city', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(html,/class="profile-logistics"/);
  assert.match(html,/id="profileOriginInput"/);
  assert.match(html,/placeholder="Bay City, MI"/);
  assert.match(html,/id="originCityInput"/);
  assert.doesNotMatch(html,/id="heroOriginCity"/);
  assert.doesNotMatch(html,/id="originCity"/);
  assert.match(js,/const ORIGIN_API='\/api\/mackinac-origin'/);
  assert.match(js,/async function resolveOrigin/);
  assert.match(js,/mackinac_start_city_selected/);
});

test('tourism event reference is not treated as a live degraded dependency', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  const routeSource=fs.readFileSync(routePath,'utf8');
  assert.match(js,/OPTIONAL_FAILURES=new Set\(\['fall_color','attractions'\]\)/);
  assert.doesNotMatch(js,/Degraded inputs:/);
  assert.doesNotMatch(routeSource,/fetchSource\(SOURCE_URLS\.tourism/);
  assert.doesNotMatch(routeSource,/tourism:tourismR/);
  assert.match(routeSource,/status_label:"published 2026 reference"/);
});


test('dynamic routed origin overrides the old preset-only city model', () => {
  const p=t.profileFromQuery({
    origin_name:'Bay City, Michigan, US',
    origin_drive_minutes:'125',
    origin_preferred_port:'Mackinaw City',
    origin_mackinaw_minutes:'125',
    origin_st_ignace_minutes:'162'
  },['day-trip'],'lower');
  assert.equal(p.origin_name,'Bay City, Michigan, US');
  assert.equal(p.origin_preset.preferred_port,'Mackinaw City');
  assert.equal(p.origin_preset.drive_minutes,125);
  assert.deepEqual(p.origin_routes,{'Mackinaw City':125,'St. Ignace':162});
  assert.equal(t.driveMinutesForPort(p,'Mackinaw City'),125);
  assert.equal(t.driveMinutesForPort(p,'St. Ignace'),162);
  assert.ok(t.accessScore('Mackinaw City','lower',p)>t.accessScore('St. Ignace','lower',p));
  assert.match(p.origin_preset.confidence,/OpenStreetMap\/OSRM/);
});

test('starting-city resolver bounds text and compares both ferry ports', () => {
  assert.equal(originT.cleanQuery('  Bay   City, MI  '),'Bay City, MI');
  assert.equal(originT.cleanQuery('x'.repeat(150)).length,100);
  assert.deepEqual(originT.PORTS.map(x=>x.name),['Mackinaw City','St. Ignace']);
});


test('routed starting city constrains every ferry candidate by that port drive time', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({
    origin_name:'Bay City, Michigan, US',
    origin_drive_minutes:'125',
    origin_preferred_port:'Mackinaw City',
    origin_mackinaw_minutes:'125',
    origin_st_ignace_minutes:'162'
  },['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,7*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:true,nowMinutes:7*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plans=t.planCandidates(records,ctx);
  assert.ok(plans.length>0);
  for(const plan of plans){
    const drive=t.driveMinutesForPort(profile,plan.outbound.origin_port);
    assert.ok(Number.isFinite(drive), plan.outbound.origin_port);
    assert.equal(plan.mainland_drive_minutes,drive);
    assert.ok(
      plan.outbound.departure_minutes>=ctx.nowMinutes+drive+15+plan.outbound.checkin_buffer_minutes,
      `${plan.outbound.origin_port} ${plan.outbound.departure_time} must include ${drive} minutes of mainland driving`
    );
  }
  const stIgnace=plans.find(x=>x.outbound.origin_port==='St. Ignace');
  assert.ok(stIgnace);
  const driveItem=t.itineraryFor(stIgnace,ctx).find(x=>x.stop_id==='mainland-drive');
  assert.ok(driveItem);
  assert.match(driveItem.detail,/to St\. Ignace/);
  assert.equal(driveItem.minute,stIgnace.outbound.departure_minutes-stIgnace.outbound.checkin_buffer_minutes-162-15);
});

test('browser sends both routed port times to the Mackinac decision API', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/origin_mackinaw_minutes/);
  assert.match(js,/origin_st_ignace_minutes/);
  assert.match(js,/Add the trip date and leave-home time so the planner can choose the actual reachable ferry/);
});


test('Mackinac personalized planner requires date city and leave-home time', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(html,/id="heroTripDate"/);
  assert.match(html,/id="tripDate"/);
  assert.match(html,/id="heroDepartTime"/);
  assert.match(html,/id="departTime"/);
  assert.match(html,/Start with your travel day/);
  assert.match(html,/Enter date, city \+ time above/);
  assert.match(js,/p\.set\('trip_date',state\.tripDate\)/);
  assert.match(js,/p\.set\('depart_at',state\.departTime\)/);
  assert.match(js,/Choose your trip date first/);
  assert.match(js,/Date and starting city are set\. Add the time you’d like to leave home/);
});

test('24-hour leave-home input becomes a deterministic departure minute', () => {
  assert.equal(t.parseTimeField('07:15'),7*60+15);
  assert.equal(t.parseTimeField('13:40'),13*60+40);
  assert.equal(t.parseTimeField('25:00'),null);
  const p=t.profileFromQuery({depart_at:'07:15'},['day-trip'],'lower');
  assert.equal(p.departure_minutes,7*60+15);
});

test('entered leave-home time controls reachable ferry candidates and itinerary start', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({
    origin_name:'Bay City, Michigan, US',
    origin_drive_minutes:'125',
    origin_preferred_port:'Mackinaw City',
    origin_mackinaw_minutes:'125',
    origin_st_ignace_minutes:'162',
    depart_at:'07:30'
  },['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,7*60+30),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:true,nowMinutes:6*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plans=t.planCandidates(records,ctx);
  assert.ok(plans.length>0);
  for(const plan of plans){
    const drive=t.driveMinutesForPort(profile,plan.outbound.origin_port);
    assert.ok(plan.outbound.departure_minutes>=profile.departure_minutes+drive+15+plan.outbound.checkin_buffer_minutes);
  }
  const chosen=plans[0];
  const itinerary=t.itineraryFor(chosen,ctx);
  const leave=itinerary.find(x=>x.stop_id==='mainland-drive');
  assert.ok(leave);
  assert.equal(leave.minute,7*60+30);
  assert.match(leave.detail,/Uses your entered 7:30 AM leave-home time/);
});

test('client replaces stale starting-city prompt after city resolution', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.doesNotMatch(js,/d\.leave_home\?\.time\|\|'Add a starting city'/);
  assert.match(js,/state\.tripDate&&state\.originResolved&&state\.departTime\?'No reachable ferry':'Enter date, city \+ time above'/);
  assert.match(js,/\$\{dateLabel\(j\.trip_date\|\|state\.tripDate\)\} · \$\{j\.origin_label/);
});


test('multi-day planner exposes nights and flexible return semantics', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const route=fs.readFileSync(routePath,'utf8');
  assert.match(html,/id="nightCount"/);
  assert.match(html,/Back on mainland by \(optional\)/);
  assert.doesNotMatch(html,/Recommended ferry home/);
  assert.match(js,/returnPlanText/);
  assert.match(js,/trip_days/);
  assert.match(route,/returnPlanForStay/);
  assert.match(route,/Published 2026 ferry tickets are not day or time specific/);
});


test('trip date is validated and preserved as a real planning input', () => {
  assert.equal(t.parseDateField('2026-09-20'),'2026-09-20');
  assert.equal(t.parseDateField('2026-02-31'),null);
  assert.equal(t.parseDateField('09/20/2026'),null);
  const p=t.profileFromQuery({trip_date:'2026-10-26',depart_at:'07:00'},['day-trip'],'lower');
  assert.equal(p.trip_date,'2026-10-26');
  assert.equal(p.departure_minutes,7*60);
});

test('journey candidates carry route wait and door-to-island cost', () => {
  const date='2026-09-20';
  const profile=t.profileFromQuery({
    trip_date:date,
    origin_name:'Bay City, Michigan, US',
    origin_drive_minutes:'125',
    origin_preferred_port:'Mackinaw City',
    origin_mackinaw_minutes:'125',
    origin_st_ignace_minutes:'162',
    depart_at:'06:00'
  },['day-trip'],'lower');
  const ctx={
    date,personas:profile.personas,origin:'lower',profile,hourly:[],
    marine:{score:90},attractions:t.attractionState(date,6*60),events:[],
    sunrise:t.solarMinutes(date,45.8497,-84.6189,true),
    sunset:t.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:6*60
  };
  const records=[...t.arnoldSchedule(date,true),...t.sheplersSchedule(date,true)];
  const plan=t.planCandidates(records,ctx)[0];
  assert.ok(plan);
  assert.ok(Number.isFinite(plan.mainland_drive_minutes));
  assert.ok(Number.isFinite(plan.pre_ferry_idle_minutes));
  assert.ok(Number.isFinite(plan.door_to_island_minutes));
  assert.equal(plan.trip_start_minutes,6*60);
});


test('Mackinac page cache-busts planner asset and removes stale starting-city copy', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(html,/mackinac-island\\.js\\?v=20260921-trip1/);
  assert.match(html,/mackinac-island\\.css\\?v=20260921-trip1/);
  assert.doesNotMatch(js,/Add a starting city/);
  assert.doesNotMatch(html,/Add a starting city/);
});


test('Mackinac shared-trip route inputs are explicit and cache-safe', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const config=JSON.parse(fs.readFileSync(path.join(__dirname,'..','vercel.json'),'utf8'));
  assert.match(html,/data-mackinac-build="20260920-live19"/);
  assert.match(html,/<span>Starting city<\/span><input id="heroOriginInput"/);
  assert.match(html,/mackinac-island\\.js\\?v=20260921-trip1/);
  assert.doesNotMatch(html,/Add a starting city/i);
  assert.doesNotMatch(js,/Add a starting city/i);
  assert.match(html,/Enter date, city \+ time above/);
  for (const source of ['/mackinac-island','/mackinac-island/:path*','/assets/mackinac-island.:ext(css|js)']) {
    const rule=config.headers.find(x=>x.source===source);
    assert.ok(rule, source);
    assert.ok(rule.headers.some(h=>h.key==='Cache-Control' && /no-store/.test(h.value)), source);
  }
});


test('responsive visitor-first Mackinac surface survives phone tablet and landscape layouts', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const css=fs.readFileSync(cssPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(html,/Make it your Mackinac/);
  assert.match(html,/Which ferry gets you onto the Island best\?/);
  assert.match(html,/What it should feel like while you’re here/);
  assert.match(html,/Build my Island plan/);
  assert.match(css,/container:decision \/ inline-size/);
  assert.match(css,/@container decision \(max-width:760px\)/);
  assert.match(css,/@media\(orientation:landscape\) and \(max-height:650px\)/);
  assert.match(css,/\.origin-city-control\{grid-column:1\/-1;grid-row:2\}/);
  assert.match(css,/\.builder-grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
  assert.doesNotMatch(js,/JEV-ranked feasible plan|deterministic ranking/);
});


test('Mackinac live cameras use one switchable viewer and JEV stays closed-set', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const css=fs.readFileSync(cssPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const route=fs.readFileSync(routePath,'utf8');
  assert.match(html,/id="webcamViewer"/);
  assert.match(html,/id="webcamPicker"/);
  assert.match(html,/Choose a camera/);
  assert.match(html,/Five views play directly here\. Horn’s and Town Crier open their official live-camera pages/);
  assert.match(css,/\.webcam-viewer\{display:grid/);
  assert.match(css,/\.webcam-choice\.active/);
  assert.match(js,/webcamSelectedId/);
  assert.match(js,/renderWebcamViewer/);
  assert.match(js,/Watch Town Crier live ↗/);
  assert.doesNotMatch(js,/Open provider ↗/);
  assert.doesNotMatch(js,/Hide live view/);
  assert.doesNotMatch(js,/data-webcam-embed/);
  assert.doesNotMatch(js,/cannot be shown cleanly inside the page/);
  assert.match(route,/WEBCAM_CATALOG/);
  assert.match(route,/Choose exactly one supplied camera id or NONE/);
  assert.match(route,/Do not claim to see or analyze the live webcam image or video/);
  assert.match(route,/player\.castr\.com\/live_4fb405e028e311ef91eb49267aef0a7e/);
  assert.match(route,/island\.networkingdesign\.com:8183\/hls\/live\.stream\.m3u8/);
  assert.doesNotMatch(route,/island\.networkingdesign\.com:8184\/hls\/live\.stream\.m3u8/);
  assert.match(route,/youtube-nocookie\.com\/embed\/GHAC6-T14TU/);
  assert.match(route,/Prefer a camera that plays directly in the page/);
  assert.match(route,/uid=2e25804bc117f7aa96781ae3e4593a00/);
  assert.match(route,/uid=bf59fb1cfad0aee22ea7d00974c48669/);
  assert.doesNotMatch(html,/<iframe[^>]+mackinacisland\.org/i);
});

test('Mackinac webcam registry covers the tourism-bureau viewpoints and ranks trip context', () => {
  assert.equal(t.WEBCAM_CATALOG.length,7);
  const ids=new Set(t.WEBCAM_CATALOG.map(x=>x.id));
  for(const id of ['chippewa-main-street','horns-main-street','island-house-harbor','town-crier-market','mission-point-lawn','windermere-point','sheplers-bridge']) assert.ok(ids.has(id),id);
  const ctx={personas:['day-trip'],origin:'lower',profile:{interests:[],must_do:[],origin_preset:{preferred_port:'Mackinaw City'}},crowd:{index:78},marine:{score:70},weather:{available:true}};
  const ranked=t.webcamCandidates(ctx,{outbound:{origin_port:'Mackinaw City',arrival_minutes:12*60}});
  assert.equal(ranked.length,7);
  assert.ok(ranked[0].fit_score>=ranked[1].fit_score);
  assert.ok(ranked.find(x=>x.id==='sheplers-bridge').fit_score>50);
  assert.ok(ranked.find(x=>x.id==='horns-main-street').fit_score>50);
});


test('JEV webcam fit favors cameras that play in-page', () => {
  const ctx={personas:['day-trip'],origin:'lower',profile:{interests:[],must_do:[],origin_preset:{preferred_port:'Mackinaw City'}},crowd:{index:45},marine:{score:85},weather:{available:true}};
  const ranked=t.webcamCandidates(ctx,{outbound:{origin_port:'Mackinaw City',arrival_minutes:10*60}});
  const town=ranked.find(x=>x.id==='town-crier-market');
  const clean=ranked.filter(x=>x.embed_url);
  assert.equal(town.playable_in_page,false);
  assert.ok(clean.every(x=>x.playable_in_page===true));
  assert.ok(ranked[0].playable_in_page, 'default recommendation should be watchable in-page');
});


test('Chippewa uses raw HLS without Restreamer shell',()=>{const js=fs.readFileSync(jsPath,'utf8');const route=fs.readFileSync(routePath,'utf8');assert.match(js,/loadHlsJs/);assert.match(js,/mountHlsVideo/);assert.match(js,/hls\.js@1/);assert.match(route,/8183\/hls\/live\.stream\.m3u8/);assert.doesNotMatch(route,/8184\/hls\/live\.stream\.m3u8/);assert.doesNotMatch(route,/embed_url:"https:\/\/island\.networkingdesign\.com:818[34]\/?"/);});


test('Horns uses official-page fallback instead of brittle raw stream',()=>{const js=fs.readFileSync(jsPath,'utf8');const route=fs.readFileSync(routePath,'utf8');assert.match(route,/id:"horns-main-street"[\s\S]{0,450}external_only:true/);assert.doesNotMatch(route,/8184\/hls\/live\.stream\.m3u8/);assert.match(js,/Watch Horn’s live ↗/);assert.match(js,/Open official live camera ↗/);});

test('HLS runtime failures fall back to official camera page',()=>{const js=fs.readFileSync(jsPath,'utf8');assert.match(js,/video\.addEventListener\('error',showFallback/);assert.match(js,/Hls\.Events\.ERROR/);assert.match(js,/data\?\.fatal/);assert.match(js,/The live stream is unavailable here right now\./);});


test('regional intake replaces the busy persona wall with profile-driven navigation',()=>{
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const css=fs.readFileSync(cssPath,'utf8');
  assert.match(html,/id="trip-intake"/);
  assert.match(html,/Tell us the trip you’re actually picturing/);
  assert.match(html,/id="tripProfileCard"/);
  assert.match(html,/id="tripTabs"/);
  assert.match(html,/id="stay-guide"/);
  assert.match(html,/id="eat-guide"/);
  assert.match(html,/id="straits-guide"/);
  assert.match(js,/PROFILE_API='\/api\/mackinac-profile'/);
  assert.match(js,/mackinac-trip-profile-v1/);
  assert.match(js,/renderTripTabs/);
  assert.match(js,/applyProfileToPlanner/);
  assert.match(js,/mackinac_profile_classified/);
  assert.match(css,/\.intake-card/);
  assert.match(css,/\.trip-tabs-wrap/);
});

test('intake answers are causal inputs to the deterministic planner and bounded JEV ranker',()=>{
  const js=fs.readFileSync(jsPath,'utf8');
  const route=fs.readFileSync(routePath,'utf8');
  assert.match(js,/intake_trip_duration/);
  assert.match(js,/intake_trip_vision/);
  assert.match(route,/hasIntake/);
  assert.match(route,/visitor_archetype/);
  assert.match(route,/preference_vector/);
  assert.match(route,/visitor_intelligence:visitorIntelligence/);
  assert.match(route,/resolve tradeoffs among feasible plans/);
});


test('place intelligence is source-backed and never presented as live availability',()=>{
  const route=fs.readFileSync(routePath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(route,/require\("\.\/catalog"\)/);
  assert.match(route,/place_intelligence:placeIntelligence/);
  assert.match(js,/renderPlaceCards/);
  assert.match(js,/Room availability and live rates are not assumed/);
  assert.match(js,/current hours, waits and reservations still need checking/);
  assert.match(html,/id="straitsGuideCards"/);
  assert.match(html,/20260920-live19/);
});


test('spatial trip shape is closed-set, mapped and visible to the planner',()=>{
  const route=fs.readFileSync(routePath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(route,/require\("\.\/spatial"\)/);
  assert.match(route,/chooseSpatialWithJev/);
  assert.match(route,/harness\.decideClosedSet/);
  assert.match(route,/spatial_plan:spatialPlan/);
  assert.match(route,/recommendedMapIds/);
  assert.match(js,/renderTripShape/);
  assert.match(html,/id="tripShapePanel"/);
  assert.match(html,/20260920-live19/);
});


test('shareable Mackinac state restores inputs but never freezes live outputs',()=>{
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(html,/mackinac-trip-state\.js\?v=20260920-live19/);
  assert.match(html,/id="shareStateStatus"/);
  assert.match(js,/PLAN_STORAGE_KEY='mackinac-trip-plan-v1'/);
  assert.match(js,/sharedPlanFromHash/);
  assert.match(js,/futureSavedPlan/);
  assert.match(js,/Shared trip restored · live details refreshed/);
  assert.match(js,/Open the link to rebuild it with current ferry and weather data/);
  assert.match(js,/resolveOrigin\(originText,\{reload:false,source:shared\?'shared-plan':'saved-plan'\}\)/);
});


test('overnight trips use a bounded multi-day composer instead of summary-only repeated days',()=>{
  const route=fs.readFileSync(routePath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(route,/require\("\.\/multiday"\)/);
  assert.match(route,/chooseMultiDayWithJev/);
  assert.match(route,/harness\.decideClosedSet/);
  assert.match(route,/multi_day_plan:multiDayPlan/);
  assert.match(route,/trip_days:multiDayPlan\?\.days\|\|tripDays/);
  assert.match(js,/trip-day-stops/);
  assert.match(js,/if\(d\.multi_day_plan\)\{host\.hidden=true;return;\}/);
  assert.match(html,/20260920-live19/);
});


test('bounded trip tuning is causal, persistent and shareable',()=>{
  const route=fs.readFileSync(routePath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(route,/require\("\.\/tuning"\)/);
  assert.match(route,/tuning\.applyProfile/);
  assert.match(route,/tuning\.applyVisitor/);
  assert.match(js,/state\.tunings/);
  assert.match(js,/p\.set\('tune'/);
  assert.match(js,/mackinac_plan_tuned/);
  assert.match(html,/id="tripTuning"/);
  assert.match(html,/data-tune="less-walking"/);
  assert.match(html,/data-tune="less-downtown"/);
  assert.match(html,/20260920-live19/);
});


test('Mackinac search-intent entries preseed only known answers and keep the remaining intake',()=>{
  const js=fs.readFileSync(jsPath,'utf8');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(js,/function intentSeed\(\)/);
  assert.match(js,/'day-trip':\{trip_duration:'day'\}/);
  assert.match(js,/'with-kids':\{trip_vision:\['kids'\]\}/);
  assert.match(js,/'two-day':\{trip_duration:'one-night'\}/);
  assert.match(js,/firstMissingBaseQuestion/);
  assert.match(js,/state\.intakeStep=missing;state\.adaptiveAsked=false/);
  assert.match(js,/const seed=shared\|\|intent\|\|saved/);
  assert.match(html,/\/mackinac-island\/day-trip\//);
  assert.match(html,/\/mackinac-island\/ferry-planner\//);
});


test('Mackinac intent funnel tracks landing entry classification and plan generation',()=>{
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/mackinac_intent_entry/);
  assert.match(js,/source:'search-intent-page'/);
  assert.match(js,/mackinac_profile_classified[\s\S]{0,260}intent:/);
  assert.match(js,/mackinac_plan_generated[\s\S]{0,220}intent:/);
});
