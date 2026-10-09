'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname,'..');
const client = fs.readFileSync(path.join(root,'public','assets','flight-tracker.js'),'utf8');
const html = fs.readFileSync(path.join(root,'public','flight-tracker','index.html'),'utf8');

function clientFunction(name,nextName) {
  const starts = [client.indexOf('  function ' + name + '('),client.indexOf('  async function ' + name + '(')].filter(i => i >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const ends = [client.indexOf('\n  function ' + nextName + '(',start),client.indexOf('\n  async function ' + nextName + '(',start)].filter(i => i > start);
  const end = ends.length ? Math.min(...ends) : -1;
  assert.ok(start >= 0 && end > start, name + ' must be defined with the expected boundary');
  return client.slice(start,end).trim();
}

function statusFunctions() {
  const js = [
    clientFunction('assignmentArrivalConfirmed','assignmentSourceText'),
    clientFunction('delayWhyText','inboundLandingClock'),
    clientFunction('delayLabel','clearAnswerMeta'),
    '({ delayLabel, delayWhyText })'
  ].join('\n');
  return vm.runInNewContext(js,{
    departureDelayMinutes:a => a?.flightStatus?.departureDelayMinutes ?? null,
    unresolvedStatusIsStale:() => false,
    statusCheckedClock:() => null,
    inboundArrivalDelayMinutes:() => 20,
    scheduledTurnMinutes:() => 40,
    airportPlace:() => 'Amsterdam',
    completedArrivalClock:() => '3:20 PM'
  });
}

test('landed flight ignores contradictory ON TIME label and inbound departure delay', () => {
  const {delayLabel,delayWhyText} = statusFunctions();
  const arrived = {
    flightStatus:{landed:true,canceled:false,departureDelayMinutes:82,label:'ON TIME',description:'ON TIME'},
    schedule:{actualArrivalUTC:'2026-10-08T13:20:00Z'}
  };
  assert.equal(delayLabel(arrived),'Arrived');
  assert.equal(delayWhyText(arrived,{flightNumber:'DL235'}),'');
});

test('actual arrival timestamp also suppresses misleading delay explanation', () => {
  const {delayLabel,delayWhyText} = statusFunctions();
  const arrived = {
    flightStatus:{landed:false,departureDelayMinutes:82,label:'ON TIME'},
    schedule:{actualArrivalUTC:'2026-10-08T13:20:00Z'}
  };
  assert.equal(delayLabel(arrived),'Arrived');
  assert.equal(delayWhyText(arrived,{flightNumber:'DL235'}),'');
});

test('canceled passenger flight has no inbound delay explanation', () => {
  const {delayLabel,delayWhyText} = statusFunctions();
  const canceled = {flightStatus:{canceled:true,landed:false,departureDelayMinutes:82},schedule:{}};
  assert.equal(delayLabel(canceled),'Canceled');
  assert.equal(delayWhyText(canceled,{flightNumber:'DL235'}),'');
});

test('active delayed flight retains departure delay and inbound explanation', () => {
  const {delayLabel,delayWhyText} = statusFunctions();
  const active = {flightStatus:{landed:false,departureDelayMinutes:82,label:'Delayed'},schedule:{}};
  assert.equal(delayLabel(active),'Delayed 82 min');
  assert.match(delayWhyText(active,{flightNumber:'DL235',origin:{},flightStatus:{landed:true}}),/20 min late/);
});

test('completed leg outranks previous aircraft turn and strips timeline departure delay', () => {
  assert.match(client,/if \(!arrived && renderArrivedForTurn\(assignment\)\) return;/);
  assert.match(client,/const passengerFlightArrived = assignmentArrivalConfirmed\(assignment\);/);
  assert.match(client,/!passengerFlightArrived && delayLabel\(assignment\)/);
  assert.match(client,/const arrived = canonicalArrivalAssignment\(assignmentData\);[\s\S]*?if \(arrived\) \{[\s\S]*?renderAssignedNoPosition\(/s);
});

test('fresh-fix next-step notice is complete and never CSS-clamped', () => {
  assert.match(client,/What happens next: we will show a map position only when a fresh fix arrives\. An old ground report does not override the confirmed airborne status\./);
  assert.match(html,/\.answer-next\{[^}]*max-height:none;overflow:visible;white-space:normal;overflow-wrap:break-word;text-overflow:clip/);
  assert.match(html,/flight-tracker\.js\?v=20261008o/);
});


function arrivedFlightFixture() {
  return {
    flightNumber:'DL1171',
    flightId:'dl1171-20261008',
    tailNumber:'N121DZ',
    departureDate:'2026-10-08',
    origin:{iata:'DTW',city:'Detroit',timezone:'America/Detroit'},
    destination:{iata:'BOS',city:'Boston',timezone:'America/New_York',terminal:'A',gate:'A17'},
    equipment:{name:'Airbus A321'},
    flightStatus:{landed:true,airborne:true,canceled:false,departureDelayMinutes:26,label:'Delayed'},
    schedule:{actualArrivalUTC:'2026-10-08T20:08:00Z'},
    recentInboundOccurrence:{
      flightNumber:'DL235',tailNumber:'N121DZ',
      destination:{iata:'DTW',city:'Detroit'},
      flightStatus:{landed:true}
    }
  };
}

function arrivedRendererHarness(confirmed) {
  const el = () => ({textContent:'',hidden:false,dataset:{},replaceChildren:() => {}});
  const elements = Object.fromEntries([
    'answerCard','answerKicker','answerHeadline','answerSummary','answerNext','travelerAnswers',
    'answerDelay','answerSource','flightLabel','routeLabel','routeCodes',
    'detailLabel','freshness'
  ].map(name => [name,el()]));
  const output = {pills:[],mapClears:0};
  const sandbox = {
    ...elements,
    assignmentData:confirmed,
    confirmedArrivalSnapshot:confirmed,
    clean:value => String(value || '').toUpperCase(),
    airportPlace:airport => airport?.city || airport?.iata || 'unknown destination',
    airportCodeAny:airport => airport?.iata,
    assignmentRoute:() => 'DTW → BOS',
    delayLabel:() => 'Arrived',
    codesharePill:() => null,
    completedArrivalClock:() => '4:08 PM EDT',
    assignmentSourceText:() => 'Flight status source',
    renderAnswerJourney:() => {},
    clearAnswerMeta:() => { output.pills=[]; },
    addAnswerPill:value => output.pills.push(value),
    clearLiveMap:() => { output.mapClears++; },
    setMessage:() => {},
    landedPreviousAtOrigin:() => { throw Error('Never resolve an inbound gate-turn for an arrived passenger flight'); },
    queueMicrotask:() => {},
    staleFixAgeText:() => null
  };
  const functions = [
    clientFunction('scheduledTimeLabel','minutesBetween'),
    clientFunction('assignmentArrivalConfirmed','canonicalArrivalAssignment'),
    clientFunction('canonicalArrivalAssignment','assignmentSourceText'),
    clientFunction('setAnswer','hideAnswer'),
    clientFunction('renderArrivedForTurn','renderAssignmentBase'),
    clientFunction('renderAssignmentBase','liveLegText'),
    clientFunction('renderInboundAnswer','renderAssignedNoPosition'),
    clientFunction('renderAssignedNoPosition','renderRouteChoices'),
    clientFunction('renderLastKnownPosition','recoverNoPositionState'),
    clientFunction('recoverNoPositionState','aircraftIdentity'),
    clientFunction('renderUnifiedFlightState','loadAssignment')
  ];
  const harness = vm.runInNewContext(functions.join('\n') + '\n({canonicalArrivalAssignment,renderArrivedForTurn,renderAssignmentBase,renderInboundAnswer,renderAssignedNoPosition,renderLastKnownPosition,recoverNoPositionState,renderUnifiedFlightState,setAnswer})',sandbox);
  return {harness,elements,output,sandbox};
}

function assertOnlyArrivedMessaging(ui) {
  const text = [
    ui.elements.answerKicker.textContent,
    ui.elements.answerHeadline.textContent,
    ui.elements.answerSummary.textContent,
    ui.elements.answerNext.textContent,
    ui.elements.answerDelay.textContent,
    ui.elements.routeLabel.textContent,
    ...ui.output.pills
  ].join(' ');
  assert.match(text,/DL1171 has arrived in Boston/);
  assert.match(text,/Arrived Oct 8, 2026, 4:08 PM EDT/);
  assert.match(text,/gate A17/);
  assert.doesNotMatch(text,/Why is my flight delayed|delayed 26 min|at the gate|parked at Detroit|pushback|before departure|assigned to your next flight/i);
  assert.equal(ui.elements.answerDelay.hidden,true);
  assert.equal(ui.elements.routeLabel.textContent,'Last confirmed at Boston (BOS)');
  assert.ok(ui.output.mapClears >= 1);
}

test('DL1171 completed Boston leg overrides misleading same-tail gate-turn on all entry points', async () => {
  const arrived=arrivedFlightFixture();
  const ui=arrivedRendererHarness(arrived);
  const {harness}=ui;
  assert.equal(harness.renderArrivedForTurn(arrived),true);
  assertOnlyArrivedMessaging(ui);
  harness.renderAssignmentBase(arrived);
  assertOnlyArrivedMessaging(ui);
  harness.renderInboundAnswer(arrived,{aircraft:{onGround:true}});
  assertOnlyArrivedMessaging(ui);
  assert.equal(harness.renderLastKnownPosition(arrived,{data:{aircraft:{lat:42,lon:-83}}}),true);
  assertOnlyArrivedMessaging(ui);
  assert.equal(await harness.recoverNoPositionState(arrived,'N121DZ',{status:'not-found'}),true);
  assertOnlyArrivedMessaging(ui);
  harness.renderUnifiedFlightState({assignment:arrived,renderedState:'parked-origin-confirmed'});
  assertOnlyArrivedMessaging(ui);
});

test('stale refresh and stale answer text cannot reverse a confirmed DL1171 arrival', () => {
  const arrived=arrivedFlightFixture();
  const stale={...arrived,flightStatus:{landed:false,airborne:false,departureDelayMinutes:26},schedule:{actualArrivalUTC:null}};
  const ui=arrivedRendererHarness(arrived);
  ui.sandbox.assignmentData=stale;
  ui.harness.renderArrivedForTurn(stale);
  assertOnlyArrivedMessaging(ui);
  ui.harness.setAnswer({
    kicker:'THIS IS THE PLANE FOR YOUR FLIGHT',
    headline:'N121DZ is at the gate — live tracking starts at pushback.',
    summary:'The aircraft is parked at Detroit.',
    delayWhy:'Your flight is delayed 26 min.',
    next:'Live tracking starts at pushback.'
  });
  assertOnlyArrivedMessaging(ui);
});

test('arrival is scoped to the selected flight occurrence and reset before a different search', () => {
  const src = client;
  assert.match(src,/confirmedArrivalSnapshot = null;\s*currentUnifiedPayload = null;/);
  assert.match(src,/clean\(assignment.flightNumber\) !== clean\(arrived.flightNumber\)/);
  assert.match(src,/String\(assignment.flightId\) !== String\(arrived.flightId\)/);
  assert.match(src,/function renderArrivedForTurn\(assignment\) \{\s*const arrived = canonicalArrivalAssignment\(assignment\)/);
  assert.match(src,/const arrived = canonicalArrivalAssignment\(assignmentData\);\s*if \(arrived && kicker !== 'YOUR FLIGHT HAS ARRIVED'\)/);
});

test('arrival snapshots compare scheduled instants across equivalent ISO formats',()=>{
  const confirmed=arrivedFlightFixture();
  confirmed.schedule.scheduledDepartureUTC='2026-10-08T18:17:00.000Z';
  const {harness}=arrivedRendererHarness(confirmed);
  const refreshed={...confirmed,flightStatus:{landed:false,airborne:false},schedule:{scheduledDepartureUTC:'2026-10-08T18:17:00Z'}};
  assert.equal(harness.canonicalArrivalAssignment(refreshed),confirmed);
  refreshed.schedule.scheduledDepartureUTC='2026-10-08T18:18:00Z';
  assert.equal(harness.canonicalArrivalAssignment(refreshed),null);
});


test('map import or unavailable graphics cannot disable flight status lookup', async () => {
  const start = client.indexOf('  let maplibregl;');
  const end = client.indexOf('  let planeMarker',start);
  const init = client.slice(start,end).replace(/await import\('[^']+'\)/,'await loadLibrary()');
  for (const failure of ['cdn','graphics','constructor']) {
    const mapElement = {textContent:''};
    const submit = {disabled:false};
    const library = {Map:class { constructor() { throw new Error('graphics initialization failed'); } }};
    const result = await vm.runInNewContext('(async () => {' + init + '; return map; })()',{
      loadLibrary:async () => { if (failure === 'cdn') throw new Error('CDN unavailable'); return library; },
      document:{
        getElementById:() => mapElement,
        createElement:() => ({getContext:() => failure === 'graphics' ? null : {getExtension:() => null}})
      },
      submit,console:{warn:() => {}}
    });
    assert.equal(result,null);
    assert.equal(submit.disabled,false);
    assert.match(mapElement.textContent,/Flight status is still available/);
  }
});

test('lookup reset and fresh position status work when the map is unavailable', () => {
  const el = () => ({textContent:'',hidden:false,dataset:{},style:{},classList:{remove:() => {}}});
  const elements = Object.fromEntries(['glance','glanceNote','progressBar','progressFill','routeCodes','mapShell',
    'flightLabel','routeLabel','detailLabel','freshness','submit'].map(name => [name,el()]));
  let snapshot = null;
  const sandbox = {
    ...elements,map:null,planeMarker:null,originMarker:null,destinationMarker:null,routeKey:'old',
    activeFlight:'DL4946',activeLiveKey:null,lastLiveFlight:null,lastLiveSuccessAt:0,lastReportedAgeSeconds:null,
    clean:x => x,clearMarker:() => null,setMessage:() => {},renderProgress:() => {},
    aircraftIdentity:() => 'CRJ9',formatAltitude:() => '30,000 ft',formatSpeed:() => '400 kt',
    formatAge:() => 'Just reported',displayedPositionAge:() => 0,
    saveLastKnownSnapshot:data => { snapshot=data; },
    maplibregl:{Marker:class { constructor() { throw new Error('Must not draw a marker without a map'); } }}
  };
  const js = [clientFunction('clearLiveMap','resetMapForLookup'),clientFunction('resetMapForLookup','resetMapForFailure'),
    clientFunction('renderLive','renderUnavailable'),'({resetMapForLookup,renderLive})'].join('\n');
  const ui = vm.runInNewContext(js,sandbox);
  ui.resetMapForLookup('DL4946');
  assert.equal(elements.routeLabel.textContent,'Checking current flight…');
  const fresh = {flightNumber:'DL4946',positionFresh:true,aircraft:{callsign:'EDV4946',positionAgeSeconds:0}};
  ui.renderLive(fresh);
  assert.equal(elements.flightLabel.textContent,'DL4946');
  assert.equal(elements.freshness.textContent,'Just reported');
  assert.equal(elements.submit.disabled,false);
  assert.equal(snapshot,fresh);
});
