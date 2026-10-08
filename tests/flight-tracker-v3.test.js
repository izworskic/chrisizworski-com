'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname,'..');
const v3 = require('../lib/flight-v3.js')._test;
const client = fs.readFileSync(path.join(root,'public','assets','flight-tracker.js'),'utf8');
const html = fs.readFileSync(path.join(root,'public','flight-tracker','index.html'),'utf8');
const shareHtml = fs.readFileSync(path.join(root,'public','flight-tracker','share','index.html'),'utf8');
const sw = fs.readFileSync(path.join(root,'public','flight-tracker-sw.js'),'utf8');
const apiSource = fs.readFileSync(path.join(root,'lib','flight-v3.js'),'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));

function assignment(overrides={}) {
  return {
    flightNumber:'DL107',
    tailNumber:'N861NW',
    origin:{iata:'FRA',city:'Frankfurt',country:'DE',timezone:'Europe/Berlin',terminal:'3',gate:'J14'},
    destination:{iata:'JFK',city:'New York',country:'US',timezone:'America/New_York',terminal:'4',gate:'B20'},
    schedule:{
      scheduledDepartureUTC:'2026-10-08T09:50:00Z',
      estimatedDepartureUTC:'2026-10-08T09:44:00Z',
      actualDepartureUTC:null,
      scheduledArrivalUTC:'2026-10-08T18:44:00Z',
      estimatedArrivalUTC:'2026-10-08T18:59:00Z',
      actualArrivalUTC:null
    },
    flightStatus:{
      canceled:false,airborne:false,landed:false,
      departureDelayMinutes:0,arrivalDelayMinutes:15,description:'Delayed by 15m'
    },
    ...overrides
  };
}

function state(overrides={}) {
  const base={
    generatedAt:'2026-10-08T08:30:00Z',
    assignment:assignment(),
    renderedState:'parked-origin-confirmed',
    recentInboundOccurrence:{
      flightId:'inbound-1',flightNumber:'DL86',tailNumber:'N861NW',
      origin:{iata:'DTW',city:'Detroit',country:'US'},
      destination:{iata:'FRA',city:'Frankfurt',country:'DE',timezone:'Europe/Berlin'},
      schedule:{
        scheduledArrivalUTC:'2026-10-08T07:50:00Z',
        estimatedArrivalUTC:'2026-10-08T08:10:00Z',
        actualArrivalUTC:null
      },
      flightStatus:{airborne:true,landed:false,arrivalDelayMinutes:20}
    },
    live:{positionFresh:false,aircraft:{onGround:false,speedKnots:null}}
  };
  return {...base,...overrides};
}

test('watch window polls only from four hours before departure and stops on arrival', () => {
  const scheduled=state();
  assert.equal(v3.watchWindow(scheduled,Date.parse('2026-10-08T05:00:00Z')).active,false);
  assert.equal(v3.watchWindow(scheduled,Date.parse('2026-10-08T06:00:00Z')).active,true);

  const arrived=state({assignment:assignment({
    flightStatus:{canceled:false,airborne:true,landed:true,departureDelayMinutes:0,arrivalDelayMinutes:0},
    schedule:{
      scheduledDepartureUTC:'2026-10-08T09:50:00Z',
      actualDepartureUTC:'2026-10-08T09:44:00Z',
      scheduledArrivalUTC:'2026-10-08T18:44:00Z',
      actualArrivalUTC:'2026-10-08T18:40:00Z'
    }
  })});
  const result=v3.watchWindow(arrived,Date.parse('2026-10-08T18:45:00Z'));
  assert.equal(result.active,false);
  assert.equal(result.reason,'arrived');
  assert.equal(result.nextPollMs,null);
});

test('watch creation baseline does not fabricate an immediate transition', () => {
  const current=state();
  const snapshot=v3.snapshotState(current);
  const result=v3.transitionAlerts({lastSnapshot:snapshot,lastNotifiedDelay:snapshot.delayMinutes},current,Date.parse('2026-10-08T08:30:00Z'));
  assert.deepEqual(result.alerts,[]);
});

test('watch alerts only when the confirmed inbound flight transitions from airborne to landed', () => {
  const previous=state();
  const watch={lastSnapshot:v3.snapshotState(previous),lastNotifiedDelay:15};
  const landedInbound={
    ...previous.recentInboundOccurrence,
    schedule:{...previous.recentInboundOccurrence.schedule,actualArrivalUTC:'2026-10-08T08:35:00Z'},
    flightStatus:{airborne:true,landed:true,arrivalDelayMinutes:45}
  };
  const current=state({recentInboundOccurrence:landedInbound});
  const result=v3.transitionAlerts(watch,current,Date.parse('2026-10-08T08:36:00Z'));
  assert.ok(result.alerts.some(a=>a.kind==='inbound-landed'));
  assert.match(result.alerts.find(a=>a.kind==='inbound-landed').text,/Your plane just landed in Frankfurt/);

  const noPriorAirborne={lastSnapshot:{...watch.lastSnapshot,inboundAirborne:false,inboundLanded:false},lastNotifiedDelay:15};
  assert.equal(v3.transitionAlerts(noPriorAirborne,current).alerts.some(a=>a.kind==='inbound-landed'),false);
});

test('pushback requires a fresh on-ground movement transition and cannot come from missing data', () => {
  const before=state({live:{positionFresh:true,aircraft:{onGround:true,speedKnots:0}}});
  const watch={lastSnapshot:v3.snapshotState(before),lastNotifiedDelay:15};
  const moving=state({live:{positionFresh:true,aircraft:{onGround:true,speedKnots:11}}});
  assert.ok(v3.transitionAlerts(watch,moving).alerts.some(a=>a.kind==='pushback'));

  const stale=state({live:{positionFresh:false,aircraft:{onGround:true,speedKnots:20}}});
  assert.equal(v3.transitionAlerts(watch,stale).alerts.some(a=>a.kind==='pushback'),false);
});

test('gate alerts require known-to-known changes and delay alerts require another 15 minutes', () => {
  const prior=state();
  const watch={lastSnapshot:v3.snapshotState(prior),lastNotifiedDelay:15};
  const changed=state({assignment:assignment({
    origin:{iata:'FRA',city:'Frankfurt',country:'DE',timezone:'Europe/Berlin',terminal:'3',gate:'J16'},
    destination:{iata:'JFK',city:'New York',country:'US',timezone:'America/New_York',terminal:'4',gate:'B22'},
    flightStatus:{canceled:false,airborne:false,landed:false,departureDelayMinutes:31,arrivalDelayMinutes:31,description:'Delayed by 31m'}
  })});
  const result=v3.transitionAlerts(watch,changed);
  assert.ok(result.alerts.some(a=>a.kind==='origin-gate'));
  assert.ok(result.alerts.some(a=>a.kind==='destination-gate'));
  assert.ok(result.alerts.some(a=>a.kind==='delay'));

  const onlyTen=state({assignment:assignment({
    flightStatus:{canceled:false,airborne:false,landed:false,departureDelayMinutes:25,arrivalDelayMinutes:25,description:'Delayed by 25m'}
  })});
  assert.equal(v3.transitionAlerts(watch,onlyTen).alerts.some(a=>a.kind==='delay'),false);

  const unknownPrior={...watch,lastSnapshot:{...watch.lastSnapshot,originGate:null,destinationGate:null}};
  assert.equal(v3.transitionAlerts(unknownPrior,changed).alerts.some(a=>a.kind==='origin-gate'),false);
});

test('cancellation and diversion are one-way state transitions, not poll chatter', () => {
  const prior=state();
  const watch={lastSnapshot:v3.snapshotState(prior),lastNotifiedDelay:15};
  const canceled=state({assignment:assignment({
    flightStatus:{canceled:true,airborne:false,landed:false,departureDelayMinutes:15,arrivalDelayMinutes:15}
  })});
  assert.equal(v3.transitionAlerts(watch,canceled).alerts.filter(a=>a.kind==='canceled').length,1);

  const diverted=state({assignment:assignment({note:'Flight diverted to BOS'})});
  assert.equal(v3.transitionAlerts(watch,diverted).alerts.filter(a=>a.kind==='diverted').length,1);

  const already={lastSnapshot:{...watch.lastSnapshot,canceled:true,diverted:true},lastNotifiedDelay:15};
  assert.equal(v3.transitionAlerts(already,canceled).alerts.some(a=>a.kind==='canceled'),false);
});

test('watch implementation caps alerts at eight and groups work on a five-minute queue', () => {
  assert.match(apiSource,/const MAX_ALERTS = 8/);
  assert.match(apiSource,/const WATCH_STEP_MS = 5 \* 60 \* 1000/);
  assert.match(apiSource,/const groups = new Map\(\)/);
  assert.match(apiSource,/if \(\(watch\.alertCount \|\| 0\) \+ sent >= MAX_ALERTS\) break/);
  assert.match(apiSource,/if \(!state\) \{[\s\S]*ZADD[\s\S]*continue/s);
});

test('Web Push uses stable VAPID keys and protocol-shaped aes128gcm without a new dependency', () => {
  const keys1=v3.deriveVapidKeys({FLIGHT_WATCH_VAPID_SECRET:'unit-test-secret'});
  const keys2=v3.deriveVapidKeys({FLIGHT_WATCH_VAPID_SECRET:'unit-test-secret'});
  assert.ok(keys1);
  assert.equal(keys1.publicKey.length,65);
  assert.equal(keys1.publicKeyString,keys2.publicKeyString);

  const clientKeys=crypto.createECDH('prime256v1');
  clientKeys.generateKeys();
  const subscription={
    endpoint:'https://push.example.test/send/abc',
    keys:{
      p256dh:v3.b64url(clientKeys.getPublicKey()),
      auth:v3.b64url(crypto.randomBytes(16))
    }
  };
  assert.equal(v3.validateSubscription(subscription),true);
  const encrypted=v3.encryptPushPayload(subscription,Buffer.from('test'));
  assert.ok(encrypted.length > 100);
  assert.equal(encrypted.readUInt32BE(16),4096);
  assert.equal(encrypted.readUInt8(20),65);
  assert.equal(v3.vapidJwt(subscription.endpoint,keys1,1_700_000_000).split('.').length,3);
});

test('connection checker uses requested verdict thresholds and exposes its math', () => {
  const primary=state({assignment:assignment({
    origin:{iata:'DTW',city:'Detroit',country:'US',timezone:'America/Detroit',terminal:'A',gate:'A40'},
    destination:{iata:'MSP',city:'Minneapolis',country:'US',timezone:'America/Chicago',terminal:'1',gate:'G10'},
    schedule:{scheduledArrivalUTC:'2026-10-08T15:00:00Z',estimatedArrivalUTC:'2026-10-08T15:00:00Z'}
  })});
  const onward=state({assignment:assignment({
    flightNumber:'DL200',
    origin:{iata:'MSP',city:'Minneapolis',country:'US',timezone:'America/Chicago',terminal:'1',gate:'G20'},
    destination:{iata:'SEA',city:'Seattle',country:'US',timezone:'America/Los_Angeles',terminal:'A',gate:'A5'},
    schedule:{scheduledDepartureUTC:'2026-10-08T17:00:00Z',estimatedDepartureUTC:'2026-10-08T17:00:00Z'}
  })});
  let result=v3.connectionAnalysis(primary,onward,{});
  assert.equal(result.deplaneMinutes,15);
  assert.equal(result.transfer.minutes,15);
  assert.equal(result.slackMinutes,90);
  assert.equal(result.verdict,'comfortable');
  assert.ok(result.arrivalClock);
  assert.ok(result.departureClock);

  onward.assignment.schedule.estimatedDepartureUTC='2026-10-08T16:05:00Z';
  result=v3.connectionAnalysis(primary,onward,{});
  assert.equal(result.slackMinutes,35);
  assert.equal(result.verdict,'tight');

  onward.assignment.schedule.estimatedDepartureUTC='2026-10-08T15:55:00Z';
  result=v3.connectionAnalysis(primary,onward,{});
  assert.equal(result.slackMinutes,25);
  assert.equal(result.verdict,'unlikely');
});

test('connection checker refuses to invent terminal transfer time when terminal data is missing', () => {
  const primary=state({assignment:assignment({
    destination:{iata:'JFK',city:'New York',country:'US',timezone:'America/New_York',terminal:null,gate:null},
    schedule:{estimatedArrivalUTC:'2026-10-08T15:00:00Z'}
  })});
  const onward=state({assignment:assignment({
    flightNumber:'AA10',
    origin:{iata:'JFK',city:'New York',country:'US',timezone:'America/New_York',terminal:'8',gate:null},
    destination:{iata:'LHR',city:'London',country:'GB',timezone:'Europe/London',terminal:'3',gate:null},
    schedule:{estimatedDepartureUTC:'2026-10-08T17:00:00Z'}
  })});
  const result=v3.connectionAnalysis(primary,onward,{});
  assert.equal(result.ok,true);
  assert.equal(result.verdict,null);
  assert.equal(result.label,'Can’t score yet');
  assert.equal(result.transfer.kind,'unknown');
  assert.ok(result.unknowns.includes('arrival terminal'));
});

test('configured published MCT overrides assumptions and retains provenance', () => {
  const primary=state({assignment:assignment({
    origin:{iata:'DTW',country:'US'},
    destination:{iata:'MSP',country:'US',timezone:'America/Chicago',terminal:'1',gate:'G10'},
    schedule:{estimatedArrivalUTC:'2026-10-08T15:00:00Z'}
  })});
  const onward=state({assignment:assignment({
    flightNumber:'DL200',
    origin:{iata:'MSP',country:'US',timezone:'America/Chicago',terminal:'2',gate:'H1'},
    destination:{iata:'SEA',country:'US'},
    schedule:{estimatedDepartureUTC:'2026-10-08T17:00:00Z'}
  })});
  const env={FLIGHT_PUBLISHED_MCT_JSON:JSON.stringify({
    MSP:{DD:{minutes:35,label:'Published airport/airline MCT',sourceUrl:'https://example.test/mct'}}
  })};
  const result=v3.connectionAnalysis(primary,onward,env);
  assert.equal(result.transfer.kind,'published');
  assert.equal(result.transfer.minutes,35);
  assert.equal(result.transfer.sourceUrl,'https://example.test/mct');
});

test('pickup share state contains traveler fields and excludes tail and methodology', () => {
  const share=v3.simpleShareState(state({assignment:assignment({
    flightStatus:{canceled:false,airborne:true,landed:false,departureDelayMinutes:20,arrivalDelayMinutes:20,description:'Delayed by 20m'}
  })}));
  const serialized=JSON.stringify(share);
  assert.equal(share.flightNumber,'DL107');
  assert.match(share.statusText,/In flight/);
  assert.match(share.whereText,/landing around/);
  assert.doesNotMatch(serialized,/N861NW|tail|ADS-B|ADSB|methodology/i);
  assert.doesNotMatch(shareHtml,/N861NW|tail number|ADS-B|ADSB|methodology/i);
  assert.match(shareHtml,/noindex,nofollow,noarchive/);
});

test('main page exposes V3 actions and a chronological trip timeline', () => {
  assert.match(html,/id="watch-flight"/);
  assert.match(html,/id="share-flight"/);
  assert.match(html,/id="add-connection"/);
  assert.match(html,/id="trip-timeline"/);
  assert.match(html,/id="reliability-panel"/);
  assert.match(html,/flight-tracker\.js\?v=20261008c/);
  assert.match(client,/function renderTripTimeline\(payload\)/);
  assert.match(client,/Inbound aircraft/);
  assert.match(client,/Aircraft on ground \/ turn/);
  assert.match(client,/label:'Boarding'/);
  assert.match(client,/label:'Departure'/);
  assert.match(client,/label:'Arrival'/);
  assert.match(client,/YOU ARE HERE/);
  assert.match(client,/answerJourney\.hidden = true/);
  assert.match(client,/currentUnifiedPayload = payload/);
  assert.match(client,/queueMicrotask/);
});

test('boarding row never invents a boarding time', () => {
  assert.match(client,/time:'Not published',[\s\S]*label:'Boarding'/);
  assert.match(client,/boarding time is not/);
});

test('browser push registration is user initiated and V3 companions cannot replace the primary state fetch', () => {
  assert.match(client,/Notification\.requestPermission\(\)/);
  assert.match(client,/navigator\.serviceWorker\.register\('\/flight-tracker-sw\.js'/);
  assert.match(client,/pushManager\.subscribe/);
  assert.match(client,/watchButton\.addEventListener\('click'/);
  assert.match(client,/fetch\('\/api\/flight-assignment\?' \+ params\.toString\(\)/);
  assert.match(client,/renderUnifiedFlightState\(data\)/);
  const companionStart=client.indexOf('function renderV3Companions(payload)');
  const companionEnd=client.indexOf('\n  }',companionStart);
  assert.ok(companionStart >= 0 && companionEnd > companionStart);
  assert.doesNotMatch(client.slice(companionStart,companionEnd),/setAnswer\(/);
});

test('service worker displays push messages and opens only the flight tracker scope', () => {
  assert.match(sw,/addEventListener\('push'/);
  assert.match(sw,/showNotification/);
  assert.match(sw,/addEventListener\('notificationclick'/);
  assert.match(sw,/\/flight-tracker\//);
});

test('reliability remains hidden until enough final history exists and uses 30 days', () => {
  assert.match(apiSource,/const start = Date\.now\(\) - 30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(apiSource,/if \(records\.length < 5\) return \{ok:true,available:false/);
  assert.match(apiSource,/arrivalDelayMinutes <= 15/);
  assert.match(apiSource,/cancellationRatePct/);
  assert.match(client,/if \(!data\?\.available\) \{\s*reliabilityPanel\.hidden = true/s);
  assert.match(client,/observed flights in the trailing 30 days/);
});

test('Vercel schedules one five-minute watch cron and routes share tokens', () => {
  const cron=vercel.crons.find(item=>item.path==='/api/flight-assignment?flightV3=1&action=cron');
  assert.deepEqual(cron,{path:'/api/flight-assignment?flightV3=1&action=cron',schedule:'*/5 * * * *'});
  assert.equal(vercel.functions['api/flight-assignment.js'].maxDuration,60);
  assert.equal(vercel.functions['api/flight-v3.js'],undefined);
  assert.ok(vercel.rewrites.some(r=>r.source==='/flight-tracker/share/:token' && /token=:token/.test(r.destination)));
  const swHeaders=vercel.headers.find(h=>h.source==='/flight-tracker-sw.js');
  assert.ok(swHeaders);
  assert.ok(swHeaders.headers.some(h=>h.key==='Cache-Control' && /no-store/.test(h.value)));
});

test('share tokens use cryptographic randomness and expire six hours after arrival', () => {
  assert.match(apiSource,/randomToken\(24\)/);
  assert.match(apiSource,/const SHARE_AFTER_ARRIVAL_MS = 6 \* 60 \* 60 \* 1000/);
  assert.match(apiSource,/Date\.now\(\) > expiresAtMs/);
});

test('V3 preserves the deterministic V2 state as the only aircraft truth source', () => {
  assert.match(apiSource,/unified:'1'/);
  assert.match(apiSource,/https:\/\/chrisizworski\.com\/api\/flight-assignment/);
  assert.match(client,/const state = payload\?\.renderedState/);
  assert.match(client,/data\.status !== 'found' \|\| !data\.assignment/);
});
