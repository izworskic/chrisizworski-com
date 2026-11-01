'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ksc = require('../lib/space-coast-ksc-viewing');
const {
  verifyOfficialListing, meaningfulChanges, runKscWatch, missionTimeline,
  publicWatchHealth, calendarDateCompatible, candidateQueue, LEASE_KEY, KEY
} = require('../lib/space-coast-ksc-watch');
const NOW = Date.parse('2026-11-01T15:00:00Z');
const URL = 'https://www.kennedyspacecenter.com/event/spacex-falcon-9-starlink-10-54/';
const TITLE = 'SpaceX Falcon 9 Starlink 10-54';
const LAUNCH = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Falcon 9 | Starlink Group 10-54',
  net: '2026-11-05T15:00:00Z', netPrecision: 'minute',
  pad: 'Space Launch Complex 40' };
function calendar(events) {
  return '<script>(function(){const eventsDataString = ' +
    JSON.stringify(JSON.stringify(events)) +
    ';window.eventsDataVars=JSON.parse(eventsDataString)})();</script>';
}
function listing(ticket = 'INCLUDED WITH ADMISSION', time = '8:00 AM') {
  return '<!doctype html><html><body>' +
    '<div class="event-header"><h1 class="event-header__title">' + TITLE + '</h1>' +
    '<p>Space Launch Complex 40 - Cape Canaveral Space Force Station</p>' +
    '<p>NET November 5, 2026 10:00am</p></div>' +
    '<div class="event-body"><section class="well-block"><h2>Main Visitor Complex</h2>' +
    '<h6>' + ticket + '</h6><p>Viewing area opens at ' + time + '</p>' +
    '</section></div></body></html>';
}
const record = { event_type_key: 'rocket-launch', title: TITLE,
  url: '/event/spacex-falcon-9-starlink-10-54/',
  dates: ['2026-11-05T10:00:00-05:00'] };
const entry = { marker: 'starlink-10-54', title: TITLE,
  url: URL, dates: ['2026-11-05'] };
const response = text => ({ ok: true, status: 200,
  headers: { get: () => null }, text: async () => text });
function fakeState() {
  const values = new Map();
  const calls = [];
  return {
    values, calls,
    async get(k) { calls.push(['GET',k]); return values.get(k) ?? null; },
    async set(k,v,options={}) {
      calls.push(['SET',k,options]);
      if (options.nx && values.has(k)) return null;
      values.set(k, structuredClone(v)); return 'OK';
    },
    async command(args) {
      calls.push(args);
      if (args[0] === 'RELEASE' && values.get(args[1]) === args[2]) {
        values.delete(args[1]); return 1;
      }
      return 0;
    }
  };
}
function source(fetchState) {
  return async url => {
    fetchState.calls.push(url);
    assert.ok(url.startsWith('https://www.kennedyspacecenter.com/'));
    if (url === ksc.CALENDAR) return response(fetchState.calendar);
    if (url === URL) return response(fetchState.page);
    throw new Error('unexpected official source ' + url);
  };
}
const before=process.env.TOOL_STATE_URL;
process.env.TOOL_STATE_URL = 'https://test.local/private';

test('KSC calendar candidate discovery excludes unrelated events and lookalike origins', () => {
  const records=ksc.calendarLaunchRecords(calendar([
    record, record,
    { ...record, url: 'https://evil.example/event/starlink-10-54/' },
    { ...record, title: 'SpaceX Falcon 9 Starlink 10-55',
      url: '/event/spacex-falcon-9-starlink-10-55/' },
    { ...record, event_type_key: 'astronaut-appearance',
      title: 'Meet Astronaut Brian Duffy', url: '/event/meet-brian-duffy/' }
  ]), NOW);
  assert.equal(records.length, 2);
  assert.equal(records[0].marker, 'starlink-10-54');
  assert.equal(records[0].url, URL);
  assert.equal(records[1].marker, 'starlink-10-55');
  assert.equal(ksc.calendarLaunchRecords(calendar([{ ...record,
    dates: ['2025-11-05T12:00:00-05:00'] }]), NOW).length, 0);
});

test('independent page evidence requires official calendar title, NET date and actual venues', () => {
  const verified=verifyOfficialListing(entry, listing(), NOW);
  assert.equal(verified.marker,'starlink-10-54');
  assert.equal(verified.sourcePad,'40');
  assert.equal(verified.venues[0].ticket,'included-with-admission-listed');
  assert.equal(verified.evidenceLevel,'ksc-official-page-verified');
  assert.equal(verified.independentScheduleAgreement,'not-evaluated');
  assert.equal(verifyOfficialListing({...entry, title:'SpaceX Falcon 9 Starlink 10-55'},listing(),NOW),null);
  assert.equal(verifyOfficialListing({...entry,dates:['2026-12-05']},listing(),NOW),null);
  assert.equal(verifyOfficialListing(entry,'<h1>Starlink 10-54</h1>',NOW),null);
  assert.equal(verifyOfficialListing({...entry,url:'https://evil.example/event/starlink-10-54/'},listing(),NOW),null);
  assert.equal(calendarDateCompatible('2026-11-05',['2026-11-05']),true);
});

test('verified page changes produce mission-specific, cautious statements', () => {
  const before=verifyOfficialListing(entry,listing(),NOW);
  const after=verifyOfficialListing(entry,listing('SOLD OUT','9:00 AM'),NOW + 900000);
  const changes=meaningfulChanges(before,after);
  assert.ok(changes.some(c=>c.type==='ticket-information-changed' && /sold out/i.test(c.detail)));
  assert.ok(changes.some(c=>c.type==='viewing-instructions-revised' && /9:00 AM/.test(c.detail)));
  assert.ok(!changes.some(c=>/cancelled|tickets available/i.test(c.detail)));
});

test('unattended watcher checks only KSC, stores first detection and changes without duplicates',async()=>{
  const store=fakeState();
  const feed={ calendar:calendar([record]),page:listing(),calls:[] };
  const first=await runKscWatch({state:store,fetcher:source(feed),now:()=>NOW});
  assert.equal(first.ok,true);
  assert.equal(first.records,1);
  assert.equal(first.verified,1);
  assert.equal(first.changes,1);
  assert.ok(feed.calls.every(u=>u.startsWith('https://www.kennedyspacecenter.com/')));
  let saved=await store.get(KEY);
  assert.equal(saved.history['starlink-10-54'].length,1);
  assert.equal(saved.history['starlink-10-54'][0].detectedAt,new Date(NOW).toISOString());
  assert.equal(saved.history['starlink-10-54'][0].type,'official-announcement-found');
  assert.equal(store.values.has(LEASE_KEY),false);

  const second=await runKscWatch({state:store,fetcher:source(feed),now:()=>NOW+900000});
  assert.equal(second.changes,0);
  feed.page=listing('SOLD OUT','9:00 AM');
  const third=await runKscWatch({state:store,fetcher:source(feed),now:()=>NOW+1800000});
  assert.equal(third.changes,2);
  saved=await store.get(KEY);
  assert.equal(saved.history['starlink-10-54'].length,3);
  assert.ok(saved.history['starlink-10-54'].some(e=>e.type==='ticket-information-changed'));
  assert.ok(saved.history['starlink-10-54'].some(e=>e.type==='viewing-instructions-revised'));

  const timeline=missionTimeline(LAUNCH,saved,NOW+1800000);
  assert.equal(timeline.events.length,3);
  assert.equal(timeline.officialSourceUrl,URL);
  assert.equal(timeline.verifiedPageIsRecent,true);
  assert.equal(missionTimeline({...LAUNCH,name:'Falcon 9 | Starlink 10-55'},saved,NOW+1800000),null);
  assert.equal(missionTimeline({...LAUNCH,pad:'Launch Complex 39A'},saved,NOW+1800000),null);
  assert.equal(publicWatchHealth(saved,NOW+1800000).status,'checked');
  assert.equal(publicWatchHealth(saved,NOW+100*60000).status,'overdue');
});

test('calendar failures preserve verified history and do not invent cancellations', async()=>{
  const store=fakeState();
  const feed={calendar:calendar([record]),page:listing(),calls:[]};
  await runKscWatch({state:store,fetcher:source(feed),now:()=>NOW});
  const previous=await store.get(KEY);
  await assert.rejects(runKscWatch({
    state:store,fetcher:async ()=>{throw new Error('KSC down')},
    now:()=>NOW+900000
  }),/KSC down/);
  assert.deepEqual((await store.get(KEY)).history,previous.history);
  assert.equal(store.values.has(LEASE_KEY),false);

  feed.calendar=calendar([]); // Calendar omission alone cannot be called a cancellation.
  await runKscWatch({state:store,fetcher:source(feed),now:()=>NOW+1800000});
  assert.equal((await store.get(KEY)).history['starlink-10-54'].length,1);
});

test('unattended production invocation works when no injected clock is supplied', async()=>{
  const store=fakeState();
  const feed={calendar:calendar([]),page:listing(),calls:[]};
  // This matches the actual scheduled endpoint; tests with an explicitly
  // injected now() would not catch a timestamp-vs-function default bug.
  const result=await runKscWatch({state:store,fetcher:source(feed)});
  assert.equal(result.ok,true);
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
  assert.equal(result.inspected,0);
  assert.equal(store.values.has(LEASE_KEY),false);
});

test('Postgres lease prevents overlapping writes',async()=>{
  const store=fakeState();
  store.values.set(LEASE_KEY,'other-worker');
  const result=await runKscWatch({state:store,fetcher:async ()=>{throw new Error('should not fetch')},now:()=>NOW});
  assert.equal(result.skipped,'another-monitor-run-active');
  assert.equal(store.values.get(LEASE_KEY),'other-worker');
});

test('bounded scheduler rotates previously observed pages and does not fetch arbitrary domains',()=>{
  const initial={};
  for(let i=0;i<8;i++) {
    const k='starlink-10-'+(54+i);
    initial[k]={ marker:k, calendarTitle:'Falcon 9 Starlink 10-'+(54+i),
      sourceUrl:'https://www.kennedyspacecenter.com/event/falcon-9-starlink-10-'+(54+i)+'/',
      eventDate:'2026-11-05',verifiedAt:new Date(NOW+i*1000).toISOString() };
  }
  const selected=candidateQueue([],initial,NOW);
  assert.equal(selected.length,4);
  assert.equal(selected[0].marker,'starlink-10-54');
});

test.after(()=>{if(before===undefined)delete process.env.TOOL_STATE_URL;else process.env.TOOL_STATE_URL=before;});
