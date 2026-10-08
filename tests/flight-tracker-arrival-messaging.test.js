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
  const start = client.indexOf('  function ' + name + '(');
  const end = client.indexOf('\n  function ' + nextName + '(',start);
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
  assert.match(client,/if \(!assignmentArrivalConfirmed\(assignment\) && renderArrivedForTurn\(assignment\)\) return;/);
  assert.match(client,/const passengerFlightArrived = assignmentArrivalConfirmed\(assignment\);/);
  assert.match(client,/!passengerFlightArrived && delayLabel\(assignment\)/);
  assert.match(client,/if \(assignmentArrivalConfirmed\(assignmentData\)\) \{\s*renderAssignedNoPosition\(/s);
});

test('fresh-fix next-step notice is complete and never CSS-clamped', () => {
  assert.match(client,/What happens next: we will show a map position only when a fresh fix arrives\. An old ground report does not override the confirmed airborne status\./);
  assert.match(html,/\.answer-next\{[^}]*max-height:none;overflow:visible;white-space:normal;overflow-wrap:break-word;text-overflow:clip/);
  assert.match(html,/flight-tracker\.js\?v=20261008h/);
});
