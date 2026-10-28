import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const file=(p)=>readFileSync(path.join(root,p),'utf8');
const html=file('public/apostle-islands/index.html');
const js=file('public/assets/apostle-islands.js');
const css=file('public/assets/apostle-islands.css');
const tools=file('public/tools/index.html');
const circle=file('public/lake-superior-circle-tour/index.html');
const registry=JSON.parse(file('benchmarks/tool-network-registry.json'));
const sitemap=file('public/sitemap.xml');
const canonical='https://chrisizworski.com/apostle-islands/';
test('one useful static-first destination answer and nine distinct crawlable experiences',()=>{
assert.match(html,/<h1>Apostle Islands/);
assert.match(html,/First visit\?/);
const ids=[...html.matchAll(/<article class="stop" id="stop-([^"]+)" data-modes="([^"]+)" data-times="([^"]+)"/g)];
assert.equal(ids.length,9);
assert.equal(new Set(ids.map(x=>x[1])).size,9);
for(const [,id,mode,time] of ids){assert.ok(mode.length>0 && time.length>0, id);}
assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/apostle-islands\/"/);
assert.match(html,/<title>[^<]{10,60}<\/title>/);
assert.ok(html.indexOf('id="choices"') < html.indexOf('id="explore"'));
});
test('all decision paths have official sources and distinct island access rules',()=>{
for (const term of ['Meyers Beach','Madeline Island','Raspberry Island','Sand Island','Stockton Island','Devils Island','Sea Caves Watch','NWS marine forecasts','Little Sand Bay construction','NPS campsites']) assert.ok(html.includes(term),term);
for (const domain of ['www.nps.gov','wavesatseacaves.cee.wisc.edu','marine.weather.gov','madferry.com','www.usgs.gov','dnr.wisconsin.gov']) assert.ok(html.includes(domain),domain);
assert.match(html,/Madeline is outside the National Lakeshore/);
assert.match(html,/Devils Island marina is closed/);
assert.match(html,/No online reading is launch clearance/);
assert.doesNotMatch(html,/safe to launch today|safe ice crossing|currently available tickets/i);
});
test('independently licensed photos and no-JS map directions are preserved',()=>{
assert.equal((html.match(/<figure class="photo"/g)||[]).length,4);
assert.ok(html.includes('creativecommons.org/licenses/by/4.0'));
assert.ok(html.includes('creativecommons.org/publicdomain/zero/1.0'));
assert.equal((html.match(/class="photo"/g)||[]).length,4);
assert.match(html,/map-direct/);
assert.ok(html.includes('https://www.google.com/maps/search/'));
assert.ok(js.includes('/api/carto-basemap-config'));
assert.ok(js.includes('tile.openstreetmap.org'));
assert.ok(js.includes('new ResizeObserver'));
assert.ok(css.includes('max-width:700px'));
assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(!js.includes('localStorage')&&!js.includes('geolocation'));
});
test('Circle Tour, directory, sitemap and authority graph agree on canonical',()=>{
assert.match(circle,/href="\/apostle-islands\/"/);
assert.match(tools,/data-tool-id="apostle-islands"/);
assert.ok(tools.includes('href="/apostle-islands/"'));
assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'));
const node=registry.tools.find(x=>x.id==='apostle-islands');
assert.equal(node?.canonical,canonical);
assert.ok(registry.relationships.some(x=>x.from==='circle-tour'&&x.to==='apostle-islands'));
assert.ok(registry.relationships.some(x=>x.from==='apostle-islands'&&x.to==='circle-tour'));
const schema=JSON.parse(tools.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const list=schema['@graph'].find(x=>x['@type']==='ItemList');
const cardCount=[...tools.matchAll(/<div class="tool-card"[^>]*>[\s\S]*?<div class="tool-title"><a href="([^"]+)"/g)].length;
assert.equal(list.numberOfItems,cardCount);
assert.equal(list.itemListElement.length,cardCount);
const item=list.itemListElement.find(x=>x.item?.url===canonical);
assert.equal(item?.item?.['@id'],canonical+'#webpage');
});

test('eight distinct NPS island dossiers are fully crawlable and consistent with source inventory',()=>{
const inv=JSON.parse(file('public/apostle-islands/island-access.json'));
assert.equal(inv.islands.length,8);
assert.equal(new Set(inv.islands.map(i=>i.id)).size,8);
assert.equal(inv.islands.flatMap(i=>i.trails).length,17);
const cards=[...html.matchAll(/<article class="island-card" id="island-([^"]+)" data-island-id="([^"]+)"/g)];
assert.equal(cards.length,8);
assert.deepEqual(cards.map(m=>m[1]),inv.islands.map(i=>i.id));
assert.ok(html.indexOf('id="island-planner"') < html.indexOf('id="explore"'));
assert.equal((html.match(/class="island-trails"/g)||[]).length,8);
assert.ok(html.includes('2026 VERIFIED SOURCES'));
for(const i of inv.islands){
assert.ok(i.sourceTrail.includes('nps.gov'));
assert.ok(i.sourceCamp.includes('nps.gov'));
assert.ok(i.sourceTransport.startsWith('https://'));
assert.ok(i.trails.length>0&&i.trails.every(t=>t[1]>0));
assert.ok(html.includes('id="island-'+i.id+'"'));
}
});
test('closed docks and absence of scheduled transport cannot turn into open island access',()=>{
const inv=JSON.parse(file('public/apostle-islands/island-access.json'));
const devils=inv.islands.find(x=>x.id==='devils');
assert.equal(devils.landable,false);
assert.equal(devils.day,false);
assert.equal(devils.overnight,false);
assert.match(devils.warning,/closed/i);
assert.match(html,/class="island-status island-closed">DOCK CLOSED/);
const raspberry=inv.islands.find(x=>x.id==='raspberry');
assert.equal(raspberry.overnight,false);
assert.match(raspberry.camp,/excluded from primitive camping/);
const oak=inv.islands.find(x=>x.id==='oak');
assert.equal(oak.day,false);
assert.equal(oak.service,'seasonal');
for(const key of ['rocky','sand','basswood']){
const island=inv.islands.find(x=>x.id===key);
assert.equal(island.service,'arrange',key+' must not invent scheduled service');
}
assert.match(html,/Names are not navigation waypoints|Island names are not navigation waypoints/);
assert.ok(js.includes('compareBoxes.filter'));
assert.ok(js.includes('compareOutput.replaceChildren'));
assert.ok(!js.includes('innerHTML='));
});

test('trip-readiness source content is available without client-side execution',()=>{
 const ids=['trip-readiness','trip-island','trip-type','trip-transport','trip-date','trip-people','trip-nights','trip-r-status','trip-r-steps','trip-copy'];
 for(const id of ids)assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('/assets/apostle-trip-readiness.js'));
 assert.ok(html.includes('print the permit within seven days'));
 assert.ok(html.includes('within 30 days'));
 assert.ok(html.includes('Group camping for 8–21'));
 assert.ok(html.includes('No campsite permit includes island transportation'));
 assert.ok(html.includes('No campsite permit includes island transportation'));
 assert.ok(html.indexOf('id="trip-readiness"')>html.indexOf('id="island-planner"'));
});
test('trip-readiness logic never fabricates island travel or booking outcomes',()=>{
 const engine=file('public/assets/apostle-trip-readiness.js');
 for(const guard of [
  "key==='devils'","key==='raspberry'","transport==='none'",
  "group&&!groupIslands.has(key)","shuttleOvernight.has(key)",
  "dayDifference(day,today())","interval>30",
  "2026 season has ended","No verified scheduled service",
  "email confirmation is not"
 ]) assert.ok(engine.includes(guard),guard);
 assert.ok(engine.includes("new Set(['stockton','oak','sand','rocky','basswood'])"));
 assert.ok(engine.includes("new Set(['stockton','oak'])"));
 assert.doesNotMatch(engine,/innerHTML\s*=/);
 assert.doesNotMatch(engine,/localStorage|sessionStorage|redis|geolocation/i);
 assert.ok(engine.includes('No ticket, landing, campsite or safe passage has been confirmed.'));
});

test('source desk presents dated NPS and operator provenance without fake live assurances',()=>{
 assert.equal((html.match(/class="ap-source-item"/g)||[]).length,6);
 assert.ok(html.includes('id="source-desk"'));
 assert.ok(html.includes('data-evidence-reviewed="2026-10-27"'));
 assert.ok(html.includes('data-kind="archived"'));
 assert.ok(html.includes('2027 service has not been verified'));
 assert.ok(html.includes('2026-11-03'));
 assert.ok(html.includes('2027-04-01'));
 assert.match(html,/not a live feed of dock openings/i);
 assert.ok(html.includes('No online reading is launch clearance'));
 const readiness=file('public/assets/apostle-trip-readiness.js');
 assert.match(readiness,/function refreshSourceDesk\(/);
 assert.match(readiness,/Archive only · next season unverified/);
 assert.match(readiness,/Review overdue since/);
 assert.ok(readiness.includes('No ticket, landing, campsite or safe passage has been confirmed.'));
 assert.ok(file('.github/workflows/apostle-islands-source-watch.yml').includes("cron: '18 13 * * 2'"));
 assert.ok(file('.github/workflows/apostle-islands-source-watch.yml').includes('issues: write'));
 assert.ok(file('.github/workflows/apostle-islands-source-watch.yml').includes('issues.create'));
 assert.ok(!file('.github/workflows/apostle-islands-source-watch.yml').includes('git push'));
});

test('NPS public dock-to-trail field desk is crawlable, source-tied and includes closed landing',()=>{
 const evidence=JSON.parse(file('public/apostle-islands/landing-evidence.json'));
 assert.equal(evidence.sites.length,11);
 assert.equal(evidence.sites.filter(x=>x.status==='listed').length,10);
 assert.equal(evidence.sites.filter(x=>x.status==='closed').length,1);
 assert.equal(new Set(evidence.sites.map(x=>x.id)).size,11);
 assert.equal(new Set(evidence.sites.map(x=>x.island)).size,8);
 assert.equal((html.match(/class="dock-record(?: dock-record-closed)?"/g)||[]).length,11);
 assert.equal((html.match(/data-dock-island="/g)||[]).length,8);
 assert.ok(html.includes('id="landing-field-desk"'));
 assert.ok(html.includes('id="dock-island-choice"'));
 assert.ok(html.includes('id="trip-selected-dock"'));
 assert.equal((html.match(/class="dock-chip dock-chip-closed"/g)||[]).length,1);
 assert.ok(html.indexOf('id="landing-field-desk"')<html.indexOf('id="source-desk"'));
 assert.match(html,/not present water levels or guaranteed vessel clearance/);
 assert.ok(html.includes('https://www.google.com/maps/search/'));
 assert.match(html,/Sand Island campsite coordinates are being corrected by NPS/);
 for(const site of evidence.sites){
  assert.ok(html.includes('id="dock-'+site.id+'"'),site.id);
  assert.ok(site.trail&&site.camp&&site.verify);
  assert.ok(site.status==='closed'||/^[2-7]–[2-7] ft$/.test(site.npsDepth),site.id);
 }
 assert.equal(evidence.sites.find(x=>x.id==='devils-south').npsDepth,null);
 assert.equal(evidence.noCoordinates,true);
 for(const k of ['sourceDock','sourceTrails','sourceCamp','sourceClosure','sourceConditions'])assert.ok(evidence[k].startsWith('https://www.nps.gov/'),k);
});
test('landing filter and trip brief never treat a dock as current availability',()=>{
 const ui=file('public/assets/apostle-landing-desk.js');
 const ready=file('public/assets/apostle-trip-readiness.js');
 assert.ok(html.includes('src="/assets/apostle-landing-desk.js"'));
 for(const text of ['showIsland','card.dataset.dockState','dispatchEvent(new Event','No specific island dock selected','does not reserve a berth'])assert.ok(ui.includes(text),text);
 assert.ok(ready.includes("'Proposed dock: '"));
 assert.ok(ui.includes("card.hidden=!visible"));
 assert.ok(!ui.includes('localStorage')&&!ui.includes('innerHTML='));
 assert.ok(!ui.includes('fetch(')&&!ui.includes('geolocation'));
});
