'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {REGIONS}=require('../lib/rocket-launch-usa');
const {SOURCES,MAX_BYTES,HISTORICAL_NAVY,beachPolicy,guestPolicy,parkPolicy,fetchOfficial,readOfficial,createHandler}=require('../api/pmrf-official')._test;
const base='public/barking-sands-rocket-launch-viewing/';
const page=read(base+'index.html'),js=read(base+'app.js'),css=read(base+'styles.css');
const atlas=JSON.parse(read(base+'atlas.json'));
const hub=read('public/synced-national-tools/rocket-launch-live/index.html');
const hubjs=read('public/synced-national-tools/rocket-launch-live/app.js');
const guides=read('public/guides/index.html'),sitemap=read('public/sitemap.xml');
const vercel=JSON.parse(read('vercel.json')),region=REGIONS.find(r=>r.id==='hawaii');

test('Hawaiʻi specialist uses one national schedule location with no shadow data feed',()=>{
 assert.ok(region);
 assert.deepEqual(region.ids,[1]);
 assert.equal(region.timezone,'Pacific/Honolulu');
 assert.equal(region.specialist,'/barking-sands-rocket-launch-viewing/');
 assert.deepEqual(region.weatherPoints,[],'Do not invent forecasts for an unverified spectator site');
 assert.match(js,/\/api\/rocket-launch-usa/);
 assert.match(js,/region:'hawaii'/);
 assert.match(js,/data\.selectedLaunch\?\.region==='hawaii'/);
 assert.match(js,/No upcoming Barking Sands launch/);
 assert.doesNotMatch(js,/ll\.thespacedevs\.com|launches\/upcoming|createClient\(|supabase|redis/i);
 assert.match(hubjs,/url\.startsWith\('\/barking-sands-rocket-launch-viewing\/'\)\?'hawaii'/);
 assert.match(hubjs,/Barking Sands access guide/);
});
test('static HTML answers the real access question without JS or linked-map survival',()=>{
 const title=page.match(/<title>([^<]+)<\/title>/)?.[1]||'';
 const desc=page.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 assert.ok(title.length>=42&&title.length<=65);
 assert.ok(desc.length>=110&&desc.length<=158);
 assert.match(page,/No public launch-day spectator location has been independently verified/);
 assert.match(page,/three different forms of access/);
 assert.match(page,/A recreation card is not a launch ticket/);
 assert.match(page,/Polihale State Park is not a verified fallback/);
 assert.match(page,/November 2026 notices list other Kauaʻi state parks/);
 assert.match(page,/does not provide launch-day viewing authorization/);
 assert.match(page,/not a modern navigational chart/);
 assert.ok(page.length>15000);
 assert.match(page,/data-mode="walk"/);
 assert.match(page,/data-mode="guest"/);
 assert.match(page,/data-mode="boat"/);
});
test('authoritative Navy beach and guest card source cannot become operational GO',()=>{
 const beach='<main><h1>CURRENT BEACH ACCESS</h1><p>ALL PUBLIC ACCESSIBLE SHORELINE AREAS ARE OPEN WITH THE EXCEPTION OF AREAS AS INDICATED BY RESTRICTED AREA SIGNAGE.</p></main>';
 assert.equal(beachPolicy(beach).status,'general-policy-retrieved');
 assert.match(beachPolicy(beach).message,/NOT a mission-time opening/);
 assert.equal(beachPolicy('some other beach text').status,'unverified');
 const guest='<section>These cards authorize entry for RECREATIONAL PURPOSES ONLY. A BACKGROUND INVESTIGATION must be completed.</section>';
 assert.equal(guestPolicy(guest).status,'recreation-only-confirmed');
 assert.match(guestPolicy(guest).message,/not launch viewing/);
 assert.equal(guestPolicy('Visit the Navy').status,'unverified');
 assert.match(page,/Navy MWR guest card/);
 assert.match(page,/guest-card privileges/);
});
test('DLNR closure parser is conservative and never fabricates a reopening',()=>{
 const closed='<p>11/2/26</p><h2>KAUAʻI</h2><p>Hā‘ena State Park has REOPENED. ALL OTHER KAUA‘I STATE PARKS REMAIN CLOSED.</p>';
 assert.equal(parkPolicy(closed).status,'published-closure');
 assert.match(parkPolicy(closed).message,/Polihale is not among/);
 assert.equal(parkPolicy('<div>Good morning Kauaʻi</div>').status,'unverified');
 const changed='<p>11/2/26</p><p>POLIHALE STATE PARK HAS REOPENED. ALL OTHER KAUAʻI STATE PARKS REMAIN CLOSED</p>';
 assert.equal(parkPolicy(changed).status,'unverified','A reopening must suppress older blanket closure wording');
 assert.equal(parkPolicy(closed+' '.repeat(12000)+' 11/3/26 POLIHALE STATE PARK HAS REOPENED').status,'unverified','A newer announcement anywhere in archived notices suppresses an older closure claim');
});
test('official source desk uses fixed source hosts, independent failure, and no false live access',async()=>{
 const bodies={
 [SOURCES.beach]:'<h1>CURRENT BEACH ACCESS</h1>ALL PUBLIC ACCESSIBLE SHORELINE AREAS ARE OPEN EXCEPT AREAS AS INDICATED BY RESTRICTED AREA SIGNAGE',
 [SOURCES.guest]:'RECREATIONAL PURPOSES ONLY and BACKGROUND INVESTIGATION',
 [SOURCES.park]:'11/2/26 ALL OTHER KAUAʻI STATE PARKS REMAIN CLOSED'
 };
 const fetcher=async url=>({ok:true,headers:{get:()=>null},text:async()=>bodies[url]});
 const report=await readOfficial({fetcher,now:'2026-11-10T12:00:00Z'});
 assert.equal(report.evidence.beach.status,'general-policy-retrieved');
 assert.equal(report.evidence.guest.status,'recreation-only-confirmed');
 assert.equal(report.evidence.park.status,'published-closure');
 assert.equal(report.rule.activationStatus,'not-checked');
 assert.equal(report.rule.type,'conditional-maritime-safety-zone');
 assert.equal(Object.keys(report.evidence).length,3);
 assert.ok(MAX_BYTES>100000&&MAX_BYTES<1000000);
 await assert.rejects(fetchOfficial('https://evil.example/closure',fetcher),/untrusted-source/);
 const withError=await readOfficial({fetcher:async url=>url===SOURCES.guest?{ok:true,headers:{get:()=>null},text:async()=>bodies[url]}:{ok:false,headers:{get:()=>null}}});
 assert.equal(withError.evidence.beach.status,'archived-policy-not-live');
 assert.equal(withError.evidence.beach.verifiedAt,'2026-11-10');
 assert.equal(withError.evidence.beach.sourceFetchedAt,null);
 assert.match(withError.evidence.beach.message,/Automated current-source retrieval failed/);
 assert.equal(HISTORICAL_NAVY.guest.status,'archived-policy-not-live');
 assert.doesNotMatch(HISTORICAL_NAVY.guest.message,/confirmed open|currently open/i);
 assert.match(js,/Navy website could not be refreshed automatically/);
 assert.equal(withError.evidence.guest.status,'recreation-only-confirmed');
 assert.equal(withError.evidence.park.status,'source-unavailable');
 let status=0,body=null;
 const res={setHeader(){},status(n){status=n;return this;},json(v){body=v;return this;}};
 await createHandler({fetcher,now:'2026-11-10T12:00:00Z'})({method:'GET',query:{url:'https://evil.example'}},res);
 assert.equal(status,200);assert.equal(body.evidence.park.status,'published-closure');
 await createHandler({fetcher})({method:'POST'},res);assert.equal(status,405);
});
test('GIS manifest contains only general place references and correct conditional STARS rule',()=>{
 assert.equal(atlas.schemaVersion,1);
 assert.deepEqual(atlas.points.map(p=>p.id),['pmrf-range','polihale-park']);
 assert.equal(atlas.points[0].kind,'restricted-range');
 assert.equal(atlas.points[1].kind,'state-park-closed');
 for(const p of atlas.points){
  assert.ok(p.lat>21.9&&p.lat<22.2&&p.lon> -160&&p.lon< -159.6);
  assert.match(p.coordinateRole,/not|NOT/);
  assert.match(p.source,/^https:\/\//);assert.match(p.access,/^https:\/\//);
 }
 const z=atlas.maritimeRule;
 assert.equal(z.statute,'33 CFR 165.1406');
 assert.equal(z.datum,'OHD');
 assert.equal(z.polygonLatLon.length,4);
 assert.deepEqual(z.polygonLatLon.map(p=>p[0]),[22.02,22.02,22.105,22.105]);
 assert.ok(Math.abs(z.polygonLatLon[0][1]+159.7883333333)<1e-6);
 assert.ok(Math.abs(z.polygonLatLon[3][1]+159.7466666667)<1e-6);
 assert.match(z.appliesTo,/STARS launch operations/);
 assert.match(page,/not proof of a live closure today/i);
 assert.match(page,/33 CFR 165\.1406/);
 assert.doesNotMatch(page+js,/google\.com\/maps\/dir|maps\/dir\/|launchTrajectory|rangeGateDirections/);
});
test('mobile map is optional, makes no route promise and fails safely',()=>{
 new vm.Script(js,{filename:'pmrf-app.js'});
 assert.match(js,/\/api\/carto-basemap-config/);
 assert.match(js,/tile\.openstreetmap\.org/);
 assert.match(js,/c\.key\.trim\(\)/);
 assert.match(js,/map background isn.t loading/);
 assert.match(js,/official links beside it/);
 assert.match(js,/date-tbd/);
 assert.match(js,/response\.status===404|r\.status===404/);
 assert.match(js,/scheduleFreshness==='stale'/);
 assert.match(js,/data\.maritimeRule\.polygonLatLon/);
 assert.match(js,/state\.ruleShown/);
 assert.match(css,/@media\(max-width:440px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/position:\s*fixed/);
});
test('discoverability, single canonical, hub handoff and transparent modification date',()=>{
 const route='/barking-sands-rocket-launch-viewing/',canonical='https://chrisizworski.com'+route;
 assert.equal((page.match(/rel="canonical"/g)||[]).length,1);
 assert.ok(page.includes('<link rel="canonical" href="'+canonical+'">'));
 assert.match(page,/"dateModified":"2026-11-10"/);
 assert.equal((sitemap.match(/<loc>https:\/\/chrisizworski\.com\/barking-sands-rocket-launch-viewing\/<\/loc>/g)||[]).length,1);
 assert.match(sitemap,/<loc>https:\/\/chrisizworski\.com\/barking-sands-rocket-launch-viewing\/<\/loc>\s*<lastmod>2026-11-10<\/lastmod>/);
 assert.match(hub,/id="rl-nav-pmrf" href="\/barking-sands-rocket-launch-viewing\/"/);
 assert.match(hub,/app\.js\?v=20261110-voice-v1/);
 assert.match(js,/launchId=/);
 assert.match(guides,/data-field-guide="barking-sands-rocket-access"/);
 assert.match(guides,/Beyond the Great Lakes <span>5 Guides/);
 assert.equal((guides.match(/data-field-guide="barking-sands-rocket-access"/g)||[]).length,1);
 assert.deepEqual(vercel.rewrites.filter(x=>x.destination===route+'index.html').map(x=>x.source),[
 '/barking-sands-rocket-launch-viewing','/barking-sands-rocket-launch-viewing/']);
});
