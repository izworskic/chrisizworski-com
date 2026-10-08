'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../public/assets/flight-tracker.js'),'utf8');
const api=require('../api/flight-assignment.js')._test;
const start=source.indexOf('  function travelerDecisionFacts(');
const end=source.indexOf('\n  function renderTravelerAnswers(',start);
assert.ok(start>=0 && end>start,'traveler facts must remain separately testable');
const facts=vm.runInNewContext(source.slice(start,end)+'\ntravelerDecisionFacts',{
  assignmentArrivalConfirmed:a=>a?.flightStatus?.landed===true || !!a?.schedule?.actualArrivalUTC,
  airportPlace:a=>a?.city || a?.iata || 'Unknown',
  airportCodeAny:a=>a?.iata || a?.code || '',
  sameAirport:(a,b)=>(a?.iata || a?.code)===(b?.iata || b?.code),
  clean:v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''),
  compactRoute:(a,b)=>(a?.iata || a?.code)+' → '+(b?.iata || b?.code),
  formatClock:(iso)=>iso ? new Date(iso).toISOString().slice(11,16)+' UTC' : null,
  formatAltitude:n=>Number.isFinite(n)?n+' ft':null,
  formatAge:n=>n+' seconds ago',
  minutesBetween:(a,b)=>a&&b?Math.round((Date.parse(b)-Date.parse(a))/60000):null,
  departureDelayMinutes:a=>a?.flightStatus?.departureDelayMinutes
});

function make(assignmentOverrides={},extra={}){
  return {
    assignment:{
      flightNumber:'DL242',tailNumber:'N415DX',
      origin:{iata:'BOS',city:'Boston',timezone:'America/New_York',gate:'E4'},
      destination:{iata:'AMS',city:'Amsterdam'},
      schedule:{scheduledDepartureUTC:'2026-10-08T23:05:00Z',estimatedDepartureUTC:'2026-10-08T23:05:00Z'},
      flightStatus:{airborne:false,landed:false,canceled:false,departureDelayMinutes:null},
      ...assignmentOverrides
    },
    live:{status:'not-found',positionFresh:false},
    recentInboundOccurrence:null,
    ...extra
  };
}

test('DL242 known tail but unknown inbound states exactly what is missing',()=>{
  const result=facts(make());
  assert.match(result[0].answer,/N415DX/);
  assert.match(result[0].detail,/not its previous inbound flight/);
  assert.match(result[1].answer,/No verified inbound landing or gate ETA/);
  assert.match(result[2].answer,/RISK UNKNOWN/);
  assert.doesNotMatch(JSON.stringify(result),/already at the gate/i);
});

test('25-minute inbound arrival buffer flags risk without inventing boarding time',()=>{
  const inbound={
    tailNumber:'N415DX',flightNumber:'DL111',
    origin:{iata:'DTW',city:'Detroit'},
    destination:{iata:'BOS',city:'Boston'},
    schedule:{estimatedArrivalUTC:'2026-10-08T22:40:00Z',scheduledArrivalUTC:'2026-10-08T22:30:00Z'},
    flightStatus:{airborne:true,landed:false}
  };
  const result=facts(make({}, {recentInboundOccurrence:inbound}));
  assert.match(result[1].answer,/22:40 UTC/);
  assert.match(result[2].answer,/AT RISK/);
  assert.match(result[2].detail,/25 min/);
  assert.match(result[1].detail,/taxi and gate time are not published/i);
});

test('ground location at BOS confirms airport but never asserts gate occupancy',()=>{
  const result=facts(make({}, {
    live:{positionFresh:true,aircraft:{registration:'N415DX',lat:42.36,lon:-71.01,onGround:true,positionAgeSeconds:12},
      focusAirportRelationship:{state:'at-airport',airport:{iata:'BOS'}}}
  }));
  assert.match(result[0].answer,/ground at Boston/);
  assert.match(result[1].answer,/gate arrival unverified/);
  assert.match(result[1].detail,/not prove arrival at the assigned stand/);
});

test('last inbound landing does not become fabricated gate-arrival time',()=>{
  const result=facts(make({},{
    recentInboundOccurrence:{
      tailNumber:'N415DX',flightNumber:'DL111',origin:{iata:'DTW',city:'Detroit'},
      destination:{iata:'BOS',city:'Boston'},
      schedule:{actualArrivalUTC:'2026-10-08T21:10:00Z'},
      flightStatus:{landed:true,airborne:false}
    }
  }));
  assert.match(result[0].answer,/Last confirmed landed/);
  assert.match(result[1].detail,/runway landing is not a verified arrival at your gate/i);
});

test('published departure delay outranks turnaround-risk heuristic',()=>{
  const inbound={tailNumber:'N415DX',origin:{iata:'DTW'},destination:{iata:'BOS'},
    schedule:{estimatedArrivalUTC:'2026-10-08T22:40:00Z'},flightStatus:{airborne:true,landed:false}};
  const result=facts(make({flightStatus:{airborne:false,landed:false,departureDelayMinutes:10}},
    {recentInboundOccurrence:inbound}));
  assert.match(result[2].answer,/DELAYED 10 MIN/);
  assert.match(result[2].detail,/cause is not verified/);
});

test('completed passenger flight has no predeparture traveler panel',()=>{
  assert.equal(facts(make({flightStatus:{airborne:true,landed:true}})),null);
});

test('live route creates a provisional inbound only for fresh same-tail aircraft',()=>{
  const a=make().assignment;
  const live={positionFresh:true,aircraft:{registration:'N415DX',onGround:false},
    route:{plausible:true,origin:{iata:'DTW'},destination:{iata:'BOS'}}};
  const inferred=api.observedInboundFromLive(a,live);
  assert.equal(inferred.flightNumber,null);
  assert.equal(inferred.flightStatus.airborne,true);
  assert.equal(inferred.evidence.kind,'fresh-same-tail-adsb-route');
  assert.equal(api.observedInboundFromLive(a,{...live,aircraft:{...live.aircraft,registration:'N999ZZ'}}),null);
  assert.equal(api.observedInboundFromLive(a,{...live,positionFresh:false}),null);
  assert.equal(api.observedInboundFromLive(a,{...live,route:{...live.route,destination:{iata:'MIA'}}}),null);
});

test('timeline describes plane phase rather than labeling a future departure YOU ARE HERE',()=>{
  assert.match(source,/AIRCRAFT PHASE/);
  assert.doesNotMatch(source,/YOU ARE HERE/);
});
