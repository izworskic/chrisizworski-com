'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {REGIONS}=require('../lib/rocket-launch-usa');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const base='public/kodiak-rocket-launch-viewing/';
const index=read(base+'index.html'),app=read(base+'app.js'),styles=read(base+'styles.css');
const atlas=JSON.parse(read(base+'places.json'));
const hub=read('public/synced-national-tools/rocket-launch-live/index.html');
const nationalApp=read('public/synced-national-tools/rocket-launch-live/app.js');
const guides=read('public/guides/index.html');
const sitemap=read('public/sitemap.xml');
const vercel=JSON.parse(read('vercel.json'));
const region=REGIONS.find(r=>r.id==='alaska');

test('Kodiak specialty reuses national location 25 and single shared mission collector',()=>{
 assert.ok(region);
 assert.deepEqual(region.ids,[25]);
 assert.equal(region.timezone,'America/Anchorage');
 assert.equal(region.specialist,'/kodiak-rocket-launch-viewing/');
 assert.deepEqual(region.weatherPoints,[],'Do not create spectator forecast where there is no verified public viewing venue');
 assert.equal(region.sites.length,1);
 assert.equal(region.sites[0].kind,'range-restricted');
 assert.equal(region.sites[0].noDirections,true);
 assert.match(app,/\/api\/rocket-launch-usa/);
 assert.match(app,/region:'alaska'/);
 assert.doesNotMatch(app,/ll\.thespacedevs\.com|launches\/upcoming|\/api\/space-coast-launch/);
 assert.match(nationalApp,/url\.startsWith\('\/kodiak-rocket-launch-viewing\/'\)\?'alaska'/);
 assert.match(nationalApp,/Kodiak launch access guide/);
});
test('public park geography is NOT launch viewing permission or a navigable range entrance',()=>{
 assert.equal(atlas.schemaVersion,1);
 assert.equal(atlas.places.length,2);
 assert.deepEqual(atlas.places.map(p=>p.id),['pasagshak','range']);
 const park=atlas.places[0],range=atlas.places[1];
 assert.deepEqual([park.lat,park.lon],[57.47917,-152.44972]);
 assert.match(park.coordinateRole,/cabin coordinate/);
 assert.match(park.coordinateRole,/not the campground entrance/);
 assert.equal(park.kind,'public-park-reference');
 assert.equal(range.kind,'restricted-range');
 assert.match(range.coordinateRole,/not a surveyed pad/);
 assert.ok(range.lat>57.3&&range.lat<57.55&&range.lon< -152.2&&range.lon> -152.6);
 for(const place of atlas.places){
  assert.match(place.access,/^https:\/\//);
  assert.match(place.source,/^https:\/\//);
  assert.ok(place.coordinateRole.length>55);
 }
 assert.match(index,/We have not verified a public viewing site for any specific launch/);
 assert.match(index,/published cabin-area reference/);
 assert.match(index,/No driving directions are provided/);
 assert.doesNotMatch(index+app,/maps\/dir\/|google\.com\/maps\/dir|Driving time to range/);
});
test('schedule preserves date precision, partial and stale states, and stale ID fallback',()=>{
 assert.match(app,/m\.netPrecision/);
 assert.match(app,/exact launch time to come/);
 assert.match(app,/launch is not approved by this listing/);
 assert.match(app,/scheduleFreshness==='stale'/);
 assert.match(app,/region\?\.feedState==='unavailable'/);
 assert.match(app,/response\.status===404&&id&&!expired/);
 assert.match(app,/Unannounced|unannounced|short-notice/i);
 assert.match(app,/No upcoming Kodiak flight/);
 assert.match(index,/THE SELECTED FLIGHT \/ NOT A VIEWING PASS/i);
 assert.match(app,/data\.selectedLaunch\?\.region==='alaska'/);
});
test('map fails soft with CARTO key, OSM fallback, accessible cards and source provenance',()=>{
 assert.match(app,/fetch\('\/api\/carto-basemap-config'/);
 assert.match(app,/c\.key\?\.trim\(\)/);
 assert.match(app,/tile\.openstreetmap\.org/);
 assert.match(app,/map background isn.t loading/);
 assert.match(app,/official park and spaceport links beside it/);
 assert.match(app,/data\.schemaVersion!==1/);
 assert.match(app,/data\.places\.length!==2/);
 assert.match(index,/data-map-place="pasagshak"/);
 assert.match(index,/data-map-place="range"/);
 assert.match(index,/id="map-status" role="status"/);
 assert.match(index,/role="img" aria-label="Map of the Pasagshak/);
 assert.ok(styles.includes('@media(max-width:400px)'));
 assert.ok(styles.includes('prefers-reduced-motion:reduce'));
 new vm.Script(app,{filename:'kodiak-app.js'});
});
test('source-backed road and range warnings are static even when API is down',()=>{
 const sources=[
 'https://akaerospace.com/beyond-launch',
 'https://aws.state.ak.us/OnlinePublicNotices/Notices/View.aspx?id=221720',
 'https://dnr.alaska.gov/parks/aspunits/kodiak/pasagsrs.htm',
 'https://511.alaska.gov/List/Alerts',
 'https://comfishak.com/sponsor/alaska-aerospace-2/'
 ];
 for(const source of sources)assert.ok(index.includes(source),source);
 assert.match(index,/1-833-PSCA-321/);
 assert.match(index,/We cannot confirm a road is open from this website/);
 assert.match(index,/A park on the map is not permission to watch a rocket from the range/);
 assert.match(index,/government rocket launched without advance public announcement/);
 assert.match(index,/This page does not monitor a gate or report the road open in real time/);
 assert.doesNotMatch(app,/closureStatus\s*=\s*['"]open|roadState\s*=\s*['"]open/);
});
test('SEO and discovery point to one current canonical with bidirectional same-ID handoff',()=>{
 const url='https://chrisizworski.com/kodiak-rocket-launch-viewing/';
 assert.equal((sitemap.match(/<loc>https:\/\/chrisizworski\.com\/kodiak-rocket-launch-viewing\/<\/loc>/g)||[]).length,1);
 assert.match(sitemap,/<loc>https:\/\/chrisizworski\.com\/kodiak-rocket-launch-viewing\/<\/loc>\s*<lastmod>2026-11-10<\/lastmod>/);
 assert.ok(index.includes('<link rel="canonical" href="'+url+'">'));
 assert.match(index,/"dateModified":"2026-11-10"/);
 assert.match(index,/\/national-tools\/rocket-launch-live\/\?region=alaska/);
 assert.match(app,/launchId=/);
 assert.match(hub,/id="rl-nav-kodiak" href="\/kodiak-rocket-launch-viewing\/"/);
 assert.match(hub,/app\.js\?v=20261113-rust-national-v1/);
 assert.match(guides,/data-field-guide="kodiak-rocket-access"/);
 assert.match(guides,/Beyond the Great Lakes <span>5 Guides/);
 assert.ok((guides.match(/data-field-guide="kodiak-rocket-access"/g)||[]).length===1);
 const routes=vercel.rewrites.filter(x=>x.destination==='/kodiak-rocket-launch-viewing/index.html');
 assert.deepEqual(routes.map(x=>x.source),['/kodiak-rocket-launch-viewing','/kodiak-rocket-launch-viewing/']);
 assert.ok(vercel.rewrites.indexOf(routes[0])<vercel.rewrites.findIndex(x=>x.source==='/national-tools/:path*'));
});
