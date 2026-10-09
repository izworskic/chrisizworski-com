const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=require('../api/flight-assignment')._test;
const date=api.normalizeDate('2026-10-08');
function historyRow({day,from='JFK',to='CLE',std='01:00',atd='—',sta='03:07',state='Scheduled',tail='N314PQ'}) {
  const aircraft=tail ? `[${tail}](https://www.flightradar24.com/data/aircraft/${tail.toLowerCase()})` : 'Not available';
  return `| ${aircraft} ${day} Oct 2026 ${state} STD ${std} ATD ${atd} STA ${sta} FROM Origin [(${from})](https://example.test/${from}) TO Destination [(${to})](https://example.test/${to}) | CRJ9 | ${state} |`;
}
const history=[historyRow({day:'09'}),historyRow({day:'08',atd:'01:22',state:'Landed 02:39',tail:'N905XJ'})].join('\n');
function next(flight,options=[]) {return `<script id="__NEXT_DATA__">${JSON.stringify({props:{initialState:{flightTracker:{flight,otherDays:[{flights:options}]}}}})}</script>`;}
function primaryFlight({id=123,day='08',landed=false}) {return {
  flightId:id,departureAirport:{iata:'JFK',date:`2026-10-${day}T21:00:00`,timeZoneRegionName:'America/New_York'},
  arrivalAirport:{iata:'CLE',timeZoneRegionName:'America/New_York'},
  schedule:{scheduledDeparture:`2026-10-${day}T21:00:00`,scheduledDepartureUTC:`2026-10-${Number(day)+1}T01:00:00Z`,scheduledArrivalUTC:`2026-10-${Number(day)+1}T03:07:00Z`},
  isLanded:landed,status:{status:landed?'Landed':'Scheduled',statusDescription:landed?'Landed':'On time'},
  positional:{flexTrack:{tailNumber:'N314PQ'}}
};}
async function withFetch(fn,run) {const old=global.fetch;global.fetch=fn;try{return await run();}finally{global.fetch=old;}}
test('ticket dates use scheduled origin local date on both sides of UTC midnight and DST',()=>{
  for(const [utc,zone,expected] of [
    ['2026-10-08T01:00:00Z','America/New_York','2026-10-07'],
    ['2026-10-09T01:00:00Z','America/New_York','2026-10-08'],
    ['2026-11-02T02:00:00Z','America/New_York','2026-11-01'],
    ['2026-10-08T16:00:00Z','Asia/Tokyo','2026-10-09'],
    ['2026-10-09T07:00:00Z','Pacific/Honolulu','2026-10-08']
  ]) assert.equal(api.departureLocalDate({origin:{timezone:zone},schedule:{scheduledDepartureUTC:utc}}),expected);
  assert.equal(api.departureLocalDate({schedule:{scheduledDepartureUTC:'2026-10-08T01:00:00Z'}}),null);
  assert.equal(api.departureLocalDate({origin:{localDateTime:'2026-10-09T00:30:00'},schedule:{scheduledDeparture:'2026-10-08T21:00:00'}}),'2026-10-08');
});
test('DL4946 cold source failure picks Oct 8 9 PM JFK departure, never previous UTC row',async()=>{
  await withFetch(async url=>{if(String(url).includes('r.jina.ai')) return new Response(history);throw new Error('network unavailable');},async()=>{
    const result=await api.lookupAssignment({flight:'DL4946',date:date.raw});
    assert.equal(result.status,'found');assert.equal(result.tailNumber,'N314PQ');
    assert.equal(result.departureDate,'2026-10-08');assert.equal(result.flightStatus.landed,false);
    assert.equal(result.schedule.scheduledDepartureUTC,'2026-10-09T01:00:00.000Z');
    assert.equal(result.origin.timezone,'America/New_York');assert.equal(result.schedule.scheduledArrivalUTC,'2026-10-09T03:07:00.000Z');
  });
});
test('genuinely landed DL1171 and DL3898 retain actual arrival times on Oct 8',async()=>{
  for(const flight of ['DL1171','DL3898']) await withFetch(async()=>new Response(historyRow({day:'08',from:'DTW',to:'BOS',std:'18:17',atd:'19:12',sta:'20:15',state:'Landed 20:03'})),async()=>{
    const result=await api.lookupIndependentAssignmentFallback({normalized:{display:flight},normalizedDate:date});
    assert.equal(result.flightStatus.landed,true);assert.equal(result.assignmentState,'landed');
    assert.equal(result.departureDate,date.raw);assert.equal(result.schedule.actualArrivalUTC,'2026-10-08T20:03:00.000Z');
  });
});
test('same local date and same route repetitions require an occurrence choice',async()=>{
  const rows=[historyRow({day:'08',std:'23:00',sta:'23:55'}),historyRow({day:'08',std:'16:00',sta:'17:00',state:'Landed 16:55'})].join('\n');
  await withFetch(async()=>new Response(rows),async()=>{
    const choice=await api.lookupIndependentAssignmentFallback({normalized:{display:'DL3898'},normalizedDate:date});
    assert.equal(choice.status,'choose-flight');assert.equal(choice.options.length,2);
    assert.notEqual(choice.options[0].flightId,choice.options[1].flightId);
    const selected=await api.lookupIndependentAssignmentFallback({normalized:{display:'DL3898'},normalizedDate:date,flightId:choice.options[0].flightId});
    assert.equal(selected.schedule.scheduledDepartureUTC,choice.options[0].sortTime);
  });
});
test('no assigned tail still returns a correctly dated scheduled flight',async()=>{
  await withFetch(async()=>new Response(historyRow({day:'09',tail:null})),async()=>{
    const result=await api.lookupIndependentAssignmentFallback({normalized:{display:'DL4946'},normalizedDate:date});
    assert.equal(result.status,'found');assert.equal(result.tailNumber,null);assert.equal(result.assignmentState,'unassigned');
    assert.equal(result.flightStatus.landed,false);
    assert.match(result.flightStatus.description,/assignment not yet published/);
    assert.match(result.fallback.note,/no assigned registration/);
  });
});
test('primary lookup rejects wrong occurrence detail and uses a time-matched fallback',async()=>{
  const option={url:'/flight-tracker/DL/4946?year=2026&month=10&date=08&flightId=123',sortTime:'2026-10-09T01:00:00Z',departureAirport:{iata:'JFK'},arrivalAirport:{iata:'CLE'}};
  await withFetch(async url=>new Response(String(url).includes('r.jina.ai') ? history : String(url).includes('flightId=') ? next(primaryFlight({id:122,day:'07',landed:true})) : next(null,[option])),async()=>{
    const result=await api.lookupAssignment({flight:'DL4946',date:date.raw});
    assert.equal(result.flightId,'123');assert.equal(result.flightStatus.landed,false);assert.equal(result.tailNumber,'N314PQ');
  });
});
test('primary scheduled DL4946 preserves on-time status and its 9 PM local departure',async()=>{
  await withFetch(async()=>new Response(next(primaryFlight({}))),async()=>{
    const result=await api.lookupAssignment({flight:'DL4946',date:date.raw});
    assert.equal(result.departureDate,date.raw);assert.equal(result.flightStatus.description,'On time');
    assert.equal(result.flightStatus.landed,false);assert.equal(result.origin.localDateTime,'2026-10-08T21:00:00');
  });
});
test('a stale explicit occurrence ID cannot silently switch to the only flight',async()=>{
  await withFetch(async()=>new Response(next(primaryFlight({}))),async()=>{
    const result=await api.lookupAssignment({flight:'DL4946',date:date.raw,flightId:'old-flight'});
    assert.notEqual(result.status,'found');
  });
});
test('browser timeline and arrived summary expose date, year and airport timezone',()=>{
  const client=fs.readFileSync(require.resolve('../public/assets/flight-tracker.js'),'utf8');
  assert.match(client,/month:'short',day:'numeric',year:'numeric'/);
  assert.match(client,/return formatFlightDateTime\(iso,timezone\) \|\| 'Time not published'/);
  assert.match(client,/flightDepartureDate\(assignment\)/);
});
test('inbound history anchors the passenger occurrence to its scheduled instant across midnight',()=>{
  const rows=[
    {flightNumber:'DL4946',dateLabel:'09 Oct 2026',origin:'JFK',destination:'CLE',scheduledDepartureUTC:'2026-10-09T01:00:00Z'},
    {flightNumber:'DL4975',dateLabel:'08 Oct 2026',origin:'CLE',destination:'JFK',scheduledDepartureUTC:'2026-10-08T21:00:00Z',landed:true},
    {flightNumber:'DL4946',dateLabel:'08 Oct 2026',origin:'JFK',destination:'CLE',scheduledDepartureUTC:'2026-10-08T01:00:00Z',landed:true},
    {flightNumber:'DL4975',dateLabel:'07 Oct 2026',origin:'CLE',destination:'JFK',scheduledDepartureUTC:'2026-10-07T21:00:00Z',landed:true}
  ];
  const inbound=api.independentInboundFromTailRows(rows,{dateLabel:'08 Oct 2026',passengerFlight:'DL4946',origin:'JFK',destination:'CLE',scheduledDepartureUTC:'2026-10-09T01:00:00Z'});
  assert.equal(inbound.scheduledDepartureUTC,'2026-10-08T21:00:00Z');
});
test('conflicting local and UTC schedule fields cannot establish a dated occurrence',()=>{
  assert.equal(api.departureLocalDate({origin:{iata:'JFK'},schedule:{scheduledDeparture:'2026-10-08T21:00:00',scheduledDepartureUTC:'2026-10-08T01:00:00Z'}}),null);
});

test('fallback departure clocks handle midnight delays and early departures without changing the ticket date',()=>{
  const delayed=api.parseFr24HistoryRows(historyRow({day:'08',std:'23:30',atd:'00:20',sta:'01:00',state:'Estimated departure 00:20'}))[0];
  assert.equal(delayed.actualDepartureUTC,'2026-10-09T00:20:00.000Z');
  assert.equal(delayed.estimatedDepartureUTC,'2026-10-09T00:20:00.000Z');
  const early=api.parseFr24HistoryRows(historyRow({day:'08',std:'16:00',atd:'15:55',state:'Estimated departure 15:55'}))[0];
  assert.equal(early.actualDepartureUTC,'2026-10-08T15:55:00.000Z');
  assert.equal(early.estimatedDepartureUTC,'2026-10-08T15:55:00.000Z');
});

test('UTC history clocks support noon, midnight and both clock formats',()=>{
  for (const [clock,expected] of [['12:00 AM','00:00'],['12:00 PM','12:00'],['11:43 AM','11:43'],['9:00 pm','21:00'],['21:00','21:00']])
    assert.equal(api.fr24HistoryUtc('08 Oct 2026',clock),`2026-10-08T${expected}:00.000Z`);
  for (const clock of ['00:00 AM','13:00 PM','24:00','12:60 PM']) assert.equal(api.fr24HistoryUtc('08 Oct 2026',clock),null);
});
test('AM/PM fallback rows retain the late-evening local ticket date',async()=>{
  const rows=historyRow({day:'09',std:'1:00 AM',sta:'3:07 AM'})+'\n'+historyRow({day:'08',std:'1:00 AM',atd:'1:22 AM',sta:'3:07 AM',state:'Landed 2:39 AM'});
  await withFetch(async()=>new Response(rows),async()=>{
    const result=await api.lookupIndependentAssignmentFallback({normalized:{display:'DL4946'},normalizedDate:date});
    assert.equal(result.status,'found');assert.equal(result.departureDate,date.raw);assert.equal(result.flightStatus.landed,false);
    assert.equal(result.schedule.scheduledDepartureUTC,'2026-10-09T01:00:00.000Z');
  });
});
