'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ksc = require('../lib/space-coast-ksc-viewing');
const NOW = Date.parse('2026-10-31T15:00:00Z');

function launch(overrides = {}) {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Falcon 9 Block 5 | Starlink Group 10-54',
    rocket: 'Falcon 9 Block 5', provider: 'SpaceX',
    net: '2026-11-05T15:00:00Z', netPrecision: 'minute',
    pad: 'Space Launch Complex 40', ...overrides
  };
}
function section(name, details) {
  return '<section id="test-location" class="element well-block"><div class="well"><h2>' +
    name + '</h2>' + details + '</div></section>';
}
function page(title, date = 'November 5, 2026', pad = 'Space Launch Complex 40', sections) {
  const view = sections || section('Main Visitor Complex',
    '<h6>INCLUDED WITH ADMISSION</h6><ul><li>Viewing area opens at 8:00 AM</li></ul>');
  return '<!doctype html><html><head><title>' + title + '</title></head><body>' +
    '<div class="event-header"><h1 class="event-header__title">' + title + '</h1>' +
    '<p>' + pad + ' - Cape Canaveral Space Force Station</p><p>NET ' + date +
    ' 10:00am</p></div><div class="event-body">' + view + '</div></body></html>';
}
function response(body, status = 200) {
  return { ok: status < 400, status, headers: { get: () => null }, text: async () => body };
}
test('specific mission identities prevent generic or neighboring Starlink matches', () => {
  assert.ok(ksc.candidateSlugs(launch()).includes('spacex-falcon-9-starlink-10-54'));
  assert.equal(ksc.candidateSlugs(launch({name:'Falcon 9 | Starlink'})).length,0);
  assert.equal(ksc.missionMatch(launch(),'SpaceX Falcon 9 Starlink 10-55'),false);
  assert.equal(ksc.missionMatch(launch(),'SpaceX Falcon 9 Starlink 10-54'),true);
  assert.equal(ksc.missionMatch(launch({name:'Vulcan VC6L | Amazon Leo (LV-01)'}),'Vulcan Amazon Leo LV-01'),true);
  assert.equal(ksc.missionMatch(launch({name:'Falcon 9 | Cygnus CRS-2 NG-25'}),'SpaceX Falcon 9 Cygnus NG-25'),true);
});
test('only exact official KSC English event URLs may be published', () => {
  const good = 'https://www.kennedyspacecenter.com/event/spacex-falcon-9-starlink-10-54/';
  assert.equal(ksc.validatedEventUrl(good),good);
  for (const bad of [
    'https://www.kennedyspacecenter.com.evil.test/event/spacex-falcon-9-starlink-10-54/',
    'http://www.kennedyspacecenter.com/event/spacex-falcon-9-starlink-10-54/',
    'https://www.kennedyspacecenter.com/wp-json/',
    'https://www.kennedyspacecenter.com/es/event/spacex-falcon-9-starlink-10-54/',
    'https://www.kennedyspacecenter.com/event/starlink-10-54/?redirect=https://evil.test'
  ]) assert.equal(ksc.validatedEventUrl(bad),null);
});
test('mission page requires exact identity, compatible pad, close date, and viewing sections',()=>{
  const u='https://www.kennedyspacecenter.com/event/spacex-falcon-9-starlink-10-54/';
  const good=ksc.parseEventPage(page('SpaceX Falcon 9 Starlink 10-54'),launch(),u,NOW);
  assert.equal(good.state,'matched');
  assert.equal(good.sourceUrl,u);
  assert.equal(good.venues[0].id,'visitor');
  assert.equal(good.venues[0].ticket,'included-with-admission-listed');
  assert.equal(good.venues[0].openingAt,'8:00 AM ET');
  assert.equal(ksc.parseEventPage(page('SpaceX Falcon 9 Starlink 10-55'),launch(),u,NOW).state,'unverified');
  assert.equal(ksc.parseEventPage(page('SpaceX Falcon 9 Starlink 10-54','June 12, 2026'),launch(),u,NOW).reason,'event-date-unconfirmed-or-stale');
  assert.equal(ksc.parseEventPage(page('SpaceX Falcon 9 Starlink 10-54','November 5, 2026','Launch Complex 39A'),launch(),u,NOW).reason,'pad-conflict');
  assert.equal(ksc.parseEventPage('<h1>Starlink 10-54</h1>',launch(),u,NOW).state,'unverified');
});
test('conditional opening, check-in and mission venue close times are separate',()=>{
  const conditional=ksc.parseVenue(section('The Gantry at LC-39',
    '<h6>INCLUDED WITH ADMISSION</h6><ul><li>Opens if the launch is pushed to 10:00 AM or later</li></ul>'));
  assert.equal(conditional.ticket,'included-with-admission-listed');
  assert.equal(conditional.status,'conditional');
  assert.equal(conditional.opensIfDelayedUntil,'10:00 AM ET');
  const packageVenue=ksc.parseVenue(section('Feel the Heat Launch Viewing Package',
    '<h6>$250</h6><p>Feel the Heat package for Apollo/Saturn V Center</p><ul>' +
    '<li>Check-in for Feel the Heat begins at 9:45 PM</li>' +
    '<li>Buses will begin boarding at 10:00 PM</li></ul>'));
  assert.equal(packageVenue.ticket,'package-listed');
  assert.equal(packageVenue.checkInAt,'9:45 PM ET');
  assert.equal(packageVenue.busBoardingAt,'10:00 PM ET');
  const sold=ksc.parseVenue(section('The Gantry at LC-39 Launch Transportation Ticket',
    '<h6>SOLD OUT</h6><p>Launch Transportation Ticket required in addition to admission.</p>'));
  assert.equal(sold.ticket,'sold-out-on-page');
  assert.equal(sold.status,'sold-out-on-source');
  const cutoff=ksc.parseVenue(section('Main Visitor Complex',
    '<h6>Included with admission</h6><ul><li>Viewing area opens at 4:00 PM and closes after launch, or at 7:00 PM if the launch has not yet occurred.</li></ul>'));
  assert.equal(cutoff.openingAt,'4:00 PM ET');
  assert.equal(cutoff.closesAt,'7:00 PM ET');
});
test('Gantry cannot be recommended for LC-39A/B despite a matched event section',()=>{
  const u='https://www.kennedyspacecenter.com/event/spacex-falcon-9-starlink-10-54/';
  const event=page('SpaceX Falcon 9 Starlink 10-54','November 5, 2026','Launch Complex 39A',
    section('The Gantry at LC-39','<h6>INCLUDED WITH ADMISSION</h6>'));
  const result=ksc.parseEventPage(event,launch({pad:'Launch Complex 39A'}),u,NOW);
  assert.equal(result.state,'matched');
  assert.equal(result.venues[0].status,'safety-exclusion');
});
test('sitemap discovery only yields official URLs with the exact mission ID',async()=>{
  const good='https://www.kennedyspacecenter.com/event/spacex-falcon-9-starlink-10-54/';
  let calls=0;
  const found=await ksc.sitemapCandidates(launch(),async url=>{
    calls++;
    assert.equal(url,'https://www.kennedyspacecenter.com/sitemap.xml');
    return response('<urlset><url><loc>'+good+'</loc></url>'+
      '<url><loc>https://www.kennedyspacecenter.com/event/spacex-falcon-9-starlink-10-55/</loc></url>'+
      '<url><loc>https://evil.test/event/spacex-falcon-9-starlink-10-54/</loc></url></urlset>');
  });
  assert.deepEqual(found,[good]);
  assert.equal(calls,1);
});
test('server verifies the event page before emitting any official event link',async()=>{
  const requested=[];
  const f=async url=>{
    requested.push(url);
    if(url.endsWith('/sitemap.xml'))return response('<urlset/>');
    if(url.endsWith('/spacex-falcon-9-starlink-10-54/'))
      return response(page('SpaceX Falcon 9 Starlink 10-54'));
    return response('Not found',404);
  };
  const result=await ksc.inspectKscLaunch(launch(),f,NOW);
  assert.equal(result.state,'matched');
  assert.equal(result.sourceUrl,'https://www.kennedyspacecenter.com/event/spacex-falcon-9-starlink-10-54/');
  assert.equal(result.venues[0].ticket,'included-with-admission-listed');
  assert.ok(requested.length<=6);
});
test('missing or unpublished event cannot imply no viewing, sold out, or available tickets',async()=>{
  const f=async url=>url.endsWith('/sitemap.xml')?response('<urlset/>'):response('Not found',404);
  const unknown=await ksc.inspectKscLaunch(launch(),f,NOW);
  assert.equal(unknown.state,'unverified');
  assert.equal(unknown.venues.length,0);
  assert.equal(unknown.sourceUrl,null);
  assert.match(unknown.note,/does not mean/i);
  const generic=await ksc.inspectKscLaunch(launch({name:'Vulcan | Undisclosed'}),f,NOW);
  assert.equal(generic.checked,0);
  assert.equal(generic.state,'unverified');
});
