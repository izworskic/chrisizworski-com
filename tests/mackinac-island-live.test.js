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
  assert.match(html,/Mackinac Island Today/);
  assert.match(html,/Best island arrival/);
  assert.match(html,/Return plan/);
  assert.match(html,/Last published ferry for return day/);
  assert.match(html,/Why this plan\?/);
  assert.match(html,/Build my Mackinac trip/);
  assert.match(html,/Modeled, not counted/);
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
  assert.match(html,/Skip to live decision/);
});

test('JEV is bounded to a deterministic closed candidate set', () => {
  const route=fs.readFileSync(routePath,'utf8');
  assert.match(route,/Choose exactly one supplied plan id or NONE/);
  assert.match(route,/top\.some\(c=>c\.id===id\)/);
  assert.match(route,/conf < \.52/);
  assert.match(route,/injection_dependency/);
  assert.doesNotMatch(route,/api\.typesafe\.ai/);
  assert.doesNotMatch(route,/TYPESAFE_API_KEY/);
});

test('client degrades explicitly instead of fabricating a ferry plan', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/No recommendation is being invented/);
  assert.match(js,/official ferry operator links/i);
  assert.match(js,/Last scheduled: unavailable/);
  assert.match(js,/mackinac_persona_selected/);
  assert.match(js,/mackinac_share_plan/);
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
  assert.match(js,/setText\('heroTripContext','Live planning unavailable'\)/);
  assert.match(js,/setText\('heroFerry','Unavailable'\)/);
  assert.match(js,/setText\('heroIsland','Unavailable'\)/);
  assert.match(js,/setText\('heroReturn','Unavailable'\)/);
});


test('trip-at-a-glance accepts a real free-form starting city', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(html,/id="heroOriginForm"/);
  assert.match(html,/id="heroOriginInput"/);
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
  assert.match(html,/Plan the actual trip/);
  assert.match(html,/Add date \+ city \+ time/);
  assert.match(js,/p\.set\('trip_date',state\.tripDate\)/);
  assert.match(js,/p\.set\('depart_at',state\.departTime\)/);
  assert.match(js,/Choose the trip date first/);
  assert.match(js,/Date and starting city are set\. Add the time you plan to leave home/);
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
  assert.match(js,/state\.tripDate&&state\.originResolved&&state\.departTime\?'No reachable ferry':'Add date \+ city \+ time'/);
  assert.match(js,/\$\{dateLabel\(j\.trip_date\|\|state\.tripDate\)\} · \$\{j\.origin_label/);
});


test('multi-day planner exposes nights and flexible return semantics', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  const js=fs.readFileSync(jsPath,'utf8');
  const route=fs.readFileSync(routePath,'utf8');
  assert.match(html,/id="nightCount"/);
  assert.match(html,/Need to leave island by \(optional\)/);
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
  assert.match(html,/mackinac-island\.js\?v=20260920-live5/);
  assert.match(html,/mackinac-island\.css\?v=20260920-live5/);
  assert.doesNotMatch(js,/Add a starting city/);
  assert.doesNotMatch(html,/Add a starting city/);
});
