'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../api/flight-assignment.js')._test;

const DATE='2026-10-08';
const DELTA_MARKETING_PAGE=[
  'Delta Air Lines DL5938 Boston (BOS) London (LHR)',
  'Effective 2026-03-29 through 2026-10-23',
  'Codeshare flight, operated by Virgin Atlantic. ([VS 158](https://info.flightmapper.net/flight/Virgin_Atlantic_VS_158))',
  'Delta Air Lines DL5984 Boston (BOS) London (LHR)',
  'Effective from 2026-10-25',
  'Codeshare flight, operated by Virgin Atlantic. ([VS 12](https://info.flightmapper.net/flight/Virgin_Atlantic_VS_12))'
].join('\n');

function statusResponse(status,body) {
  return {ok:status>=200&&status<300,status,text:async()=>body,json:async()=>JSON.parse(body)};
}

function operatorHtml({tail=null,flight='VS158'}={}) {
  const fs=flight.slice(0,2),number=flight.slice(2);
  const entry={
    flightId:1580808,
    flightNote:{canceled:false,hasDepartedRunway:false,landed:false},
    isTracking:false,isLanded:false,
    status:{status:'Scheduled',statusDescription:'Scheduled'},
    departureAirport:{fs:'BOS',iata:'BOS',city:'Boston',date:DATE},
    arrivalAirport:{fs:'LHR',iata:'LHR',city:'London'},
    schedule:{scheduledDepartureUTC:'2026-10-09T01:25:00Z'},
    positional:{flexTrack:{tailNumber:tail}}
  };
  const option={
    url:'/flight-tracker/'+fs+'/'+number+'?year=2026&month=10&date=08&flightId=1580808',
    sortTime:'2026-10-09T01:25:00Z',
    departureAirport:{iata:'BOS',city:'Boston'},
    arrivalAirport:{iata:'LHR',city:'London'}
  };
  const payload={props:{initialState:{flightTracker:{flight:entry,otherDays:[{flights:[option]}]}}}};
  return '<script>__NEXT_DATA__ = '+JSON.stringify(payload)+';__NEXT_LOADED_PAGES__=[];</script>';
}

async function withFetchStub(stub,task) {
  const original=global.fetch;
  global.fetch=stub;
  try {return await task();} finally {global.fetch=original;}
}

function flightStub({operatorAvailable=false,primaryDL='404',other='404'}={}) {
  const visited=[];
  const fetch=async url=>{
    const uri=String(url);
    visited.push(uri);
    if (uri.includes('info.flightmapper.net/flight/Delta_Air_Lines_DL_5938'))
      return statusResponse(200,DELTA_MARKETING_PAGE);
    if (uri.includes('/flight-tracker/DL/5938'))
      return statusResponse(Number(primaryDL),'<html>No matching occurrence</html>');
    if (uri.includes('/flight-tracker/VS/158'))
      return operatorAvailable
        ? statusResponse(200,operatorHtml({tail:null}))
        : statusResponse(404,'<html>No operator assignment</html>');
    if (uri.includes('/data/flights/')) return statusResponse(200,'Markdown Content: no matching flight rows');
    return statusResponse(Number(other),'<html>Unavailable</html>');
  };
  return {fetch,visited};
}

test('Delta codeshare parser finds VS158 on Oct 8 but not the future VS12',()=>{
  assert.deepEqual(api.parseCodeshareOperatingCandidates(DELTA_MARKETING_PAGE,'DL5938',DATE),['VS158']);
  assert.deepEqual(api.parseCodeshareOperatingCandidates(DELTA_MARKETING_PAGE,'DL5938','2026-10-28'),['VS12']);
  assert.deepEqual(api.parseCodeshareOperatingCandidates(DELTA_MARKETING_PAGE,'DL5938','2027-01-28'),['VS12']);
});

test('DL5938 resolves to VS158 from a distinct marketing identity when operator flight is published',async()=>{
  const mock=flightStub({operatorAvailable:true});
  await withFetchStub(mock.fetch,async()=>{
    const result=await api.buildUnifiedFlightState({flight:'DL5938',date:DATE,allowDirectLive:false});
    assert.equal(result.status,'found');
    assert.equal(result.assignment.flightNumber,'DL5938');
    assert.equal(result.assignment.operatingFlightNumber,'VS158');
    assert.equal(result.assignment.codeshare.operatingFlightNumber,'VS158');
    assert.equal(result.assignment.origin.iata,'BOS');
    assert.equal(result.assignment.destination.iata,'LHR');
    assert.equal(result.assignment.tailNumber,null);
    assert.equal(result.live,null);
  });
  assert.ok(mock.visited.some(url=>url.includes('/flight-tracker/VS/158')));
});

test('DL5938 reports a named codeshare coverage gap instead of an assignment outage when VS158 tail is unavailable',async()=>{
  const mock=flightStub();
  await withFetchStub(mock.fetch,async()=>{
    const result=await api.buildUnifiedFlightState({flight:'DL5938',date:DATE,allowDirectLive:false});
    assert.equal(result.status,'assignment-not-covered');
    assert.equal(result.flightNumber,'DL5938');
    assert.equal(result.operatingFlightNumber,'VS158');
    assert.equal(result.codeshare.operatingFlightNumber,'VS158');
    assert.match(result.message,/coverage gap/i);
    assert.doesNotMatch(result.message,/temporarily unavailable|source outage announced/i);
    assert.equal(result.tailNumber,undefined);
  });
});

test('malformed public record and HTTP 404 never become a source outage even if independent history fails',async()=>{
  const fetch=async url=>{
    const uri=String(url);
    if (uri.includes('/flight-tracker/DL/445')) return statusResponse(200,'<html>Missing structured data</html>');
    if (uri.includes('/data/flights/dl445')) throw new Error('independent source refused connection');
    return statusResponse(404,'');
  };
  await withFetchStub(fetch,async()=>{
    const result=await api.lookupAssignment({flight:'DL445',date:DATE,flightId:null});
    assert.equal(result.status,'assignment-not-covered');
  });
});

test('unreachable primary feed with unreachable independent fallback preserves genuine outage classification',async()=>{
  const fetch=async()=>{throw new Error('fetch failed: ECONNRESET')};
  await withFetchStub(fetch,async()=>{
    const result=await api.lookupAssignment({flight:'DL445',date:DATE,flightId:null});
    assert.equal(result.status,'assignment-source-unavailable');
  });
});
