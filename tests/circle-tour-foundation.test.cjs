'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('public/lake-superior-circle-tour/index.html');
const live = read('public/assets/lake-superior-circle-tour-live-day.js');
const wrapper = read('public/assets/lake-superior-circle-tour.js');
const core = read('public/assets/lake-superior-circle-tour-core.js');
const sitemap = read('public/sitemap.xml');

function section(source, startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert.ok(start >= 0 && end > start, 'function boundary must be available');
  return source.slice(start, end);
}

test('Ironwood belongs to Michigan in content and quick-reference table, but remains Central Time', () => {
  const mi = html.indexOf('id="seg-mi"');
  const ironwood = html.indexOf('id="stop-5" data-seg="mi"');
  const porkies = html.indexOf('id="stop-6"');
  assert.ok(mi >= 0 && ironwood > mi && ironwood < porkies);
  assert.match(html, /<td class="stop-n">Ironwood & Black River Corridor<\/td><td class="region region-mi">MI<\/td>/);
  assert.match(live, /String\(id\) === '5' \|\| CT_ZONES/);
});

test('published Ironwood to Lake of the Clouds leg has an explicit caveat and unknown legs never get invented', () => {
  const stub = (id) => ({
    querySelector() {
      const item = html.match(new RegExp('<article class="stop-card" id="stop-' + id + '"[\\s\\S]*?<\\/article>'))?.[0];
      const first = item?.match(/<span class="stop-dist">([\s\S]*?)<\/span>/)?.[1] || '';
      return { textContent: first.replace(/<[^>]*>/g, '') };
    }
  });
  const code = section(live, '  function edgeMiles(', '  function visitHours(');
  const order = ['4','5','6','7'];
  const {edgeMiles,totalMiles,driveAllowanceHours} = new Function('card','ROUTE_ORDER', code + '\nreturn {edgeMiles,totalMiles,driveAllowanceHours};')(stub,order);
  assert.equal(edgeMiles('5','6'),43);
  assert.equal(edgeMiles('6','7'),15);
  // One-off route with no published mileage must remain unknown, not quietly become 45.
  const unknownStub = () => ({ querySelector: () => ({textContent:'Distance unavailable'}) });
  const unknown = new Function('card','ROUTE_ORDER',code + '\nreturn {edgeMiles,totalMiles};')(unknownStub,order);
  assert.equal(unknown.edgeMiles('5','6'),null);
  assert.equal(unknown.totalMiles(['5','6']),null);
  assert.equal(Number(driveAllowanceHours(47).toFixed(3)),1.2);
});

test('both international crossings reserve time when waits are unavailable without inventing a live reading', () => {
  const code = section(live, '  function pairCrossing(', '  function buildTodayPlan(');
  const CONDITIONS = {border:{crossings:[{
    id:'sault-ste-marie',
    waits:{
      to_canada:{passenger:{standard:{available:true,wait_minutes:14,display:'14 min'}}},
      to_us:{passenger:{standard:{available:false,wait_minutes:null}}}
    }
  }]}};
  const f = new Function('CONDITIONS',code + '\nreturn {borderAllowancesForSegment,borderMinutesForSegment};')(CONDITIONS);
  assert.equal(f.borderMinutesForSegment(['13','14']),14);
  assert.equal(f.borderMinutesForSegment(['14','13']),45);
  assert.equal(f.borderMinutesForSegment(['20','21']),45);
  assert.equal(f.borderMinutesForSegment(['21','20']),45);
  assert.equal(f.borderMinutesForSegment(['13','14','20','21']),59);
  assert.equal(f.borderMinutesForSegment(['2','3']),0);
  assert.match(live,/NOT an observed border delay/);
});

test('clockwise itinerary is renumbered, reoriented, and does not reuse counterclockwise prose', () => {
  const code = section(core,'  function displayedItinerary(', '  function googleMapsUrl(');
  const itinerary = () => [
    {day:1,stops:['1','2'],miles:10,summary:'Day 1 Duluth to Superior'},
    {day:2,stops:['2','3'],miles:20,summary:'Day 2 Superior to Bayfield'}
  ];
  const get = new Function('itinerary','shortStopName','activePreset','activeDirection',
    code + '\nreturn displayedItinerary;')(itinerary,id=>String(id),'10','counterclockwise');
  const clockwise = get('10','clockwise');
  assert.deepEqual(clockwise.map(x=>x.stops),[['3','2'],['2','1']]);
  assert.deepEqual(clockwise.map(x=>x.day),[1,2]);
  assert.match(clockwise[0].summary,/Clockwise: 3 → 2/);
  assert.doesNotMatch(clockwise[0].summary,/Day 2 Superior to Bayfield/);
});

test('historical 2026 notices do not promote themselves into 2027 live access', () => {
  const code = section(wrapper,'  function sourceSeasonIsCurrent(', '  function patchAgawaTrain(');
  const simulate = year => new Function('Date',code+'\nreturn sourceSeasonIsCurrent();')(
    function FakeDate(){return {getFullYear:()=>year};});
  assert.equal(simulate(2026),true);
  assert.equal(simulate(2027),false);
  assert.match(live,/accessNotice\?\.dataset\.currentSeason === 'true'/);
  assert.match(live,/verifiedThisSeason/);
});

test('canonical and sitemap remain synchronized after substantive editorial corrections', () => {
  assert.match(html, /"dateModified":"2026-11-14"/);
  assert.match(sitemap, /<loc>https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/<\/loc>\s*<lastmod>2026-11-14<\/lastmod>/);
  assert.equal((html.match(/class="stop-card"/g)||[]).length,31);
});

test('every published itinerary reconciles its day estimates, including clockwise and long-drive disclosure', () => {
  const code = section(core, '  function publishedRouteMiles(', '  function renderRoutePreview(');
  const sum = new Function(code + '\nreturn publishedRouteMiles;')();
  const published = days => {
    const start = html.indexOf('id="itin-' + days + '"');
    assert.ok(start >= 0, 'published itinerary ' + days + ' exists');
    const end = days === 7 ? html.indexOf('id="itin-10"',start)
      : days === 10 ? html.indexOf('id="itin-15"',start) : html.length;
    const block = html.slice(start,end);
    return [...block.matchAll(/<div class="itin-day" data-day="([0-9]+)" data-stops="([0-9,]+)" data-miles="([0-9]+)"/g)]
      .map(([,day,stops,miles]) => ({day:Number(day),stops:stops.split(','),miles:Number(miles)}));
  };
  for (const [days,expected] of [[7,1359],[10,1358],[15,1358]]) {
    const route = published(days);
    assert.equal(route.length,days,'all published days found');
    assert.deepEqual(route.map(x=>x.day),Array.from({length:days},(_,i)=>i+1));
    assert.equal(sum(route),expected,'actual sum, not one hardcoded 1,358-mile label');
    const reversed=route.slice().reverse().map(x=>({...x,stops:x.stops.slice().reverse()}));
    assert.equal(sum(reversed),expected,'reverse day order preserves mileage and continuity');
    const broken=route.map(x=>({...x,stops:[...x.stops]}));
    broken[1].stops[0]='31';
    assert.equal(sum(broken),null,'unconnected days cannot masquerade as a measured loop');
    const absent=route.map(x=>({...x}));
    absent[1].miles=null;
    assert.equal(sum(absent),null,'missing miles must not become a stay day');
  }
  assert.equal(sum([]),null);
  assert.equal(sum([{stops:['1','30'],miles:0}]),null,'a travel day cannot have zero miles');
  assert.match(core,/Official route reference/);
  assert.ok(core.includes('superiorcountry.ca/touring/drive-and-rv-tours/lake-superior-circle-tour/'));
  assert.ok(core.includes('Long driving day. Choose one main outing'));
  assert.match(core,/mileage unverified/);
});
