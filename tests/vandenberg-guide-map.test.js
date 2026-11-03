'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const file=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');
const html=file('public/vandenberg-rocket-launch-viewing/index.html');
const js=file('public/vandenberg-rocket-launch-viewing/map.js');
const css=file('public/vandenberg-rocket-launch-viewing/styles.css');
const ga=file('public/vandenberg-rocket-launch-viewing/guide.js');
const {SITES,CLOSED}=require('../lib/vandenberg-viewing');
const {Script}=require('node:vm');
new Script(js,{filename:'vandenberg-map.js'});

function tags(){
  return [...html.matchAll(/<article class="vg-place-card"([^>]+)>/g)].map(m=>m[1]);
}
function attr(raw,key){
  return raw.match(new RegExp('\\b'+key+'="([^"]*)"'))?.[1];
}
test('all six pin identities, OSM feature records and coordinates match the live planner source of truth',()=>{
  const cardTags=tags();
  assert.equal(cardTags.length,6);
  assert.equal(SITES.length,6);
  const categories={coast:0,campus:0,parks:0};
  for(const site of SITES){
    const card=cardTags.find(tag=>attr(tag,'data-vg-site')===site.id);
    assert.ok(card,'Missing mapped card '+site.id);
    assert.equal(Number(attr(card,'data-vg-lat')),site.lat,site.id+' latitude drift');
    assert.equal(Number(attr(card,'data-vg-lon')),site.lon,site.id+' longitude drift');
    assert.equal(attr(card,'data-vg-osm'),site.osm,site.id+' OSM feature drift');
    const category=attr(card,'data-vg-category');
    assert.ok(Object.hasOwn(categories,category));
    categories[category]++;
  }
  assert.deepEqual(categories,{coast:2,campus:1,parks:3});
  for(const site of CLOSED)
    assert.ok(!cardTags.some(tag=>tag.includes(site)),'Closed lookout must never be mapped as an open candidate');
  assert.equal(new Set(cardTags.map(x=>attr(x,'data-vg-site'))).size,6);
});
test('the map appears immediately after the short answer rather than under editorial content',()=>{
  const quick=html.indexOf('class="vg-quick"');
  const atlas=html.indexOf('id="viewing-map"');
  const decisions=html.indexOf('id="choose"');
  const places=html.indexOf('id="where-to-watch"');
  assert.ok(quick>0&&quick<atlas&&atlas<decisions&&decisions<places);
  assert.match(html,/id="vg-map-canvas" class="vg-map-canvas" role="region" tabindex="0"/);
  assert.match(html,/id="vg-map-location-nav" aria-label="Select a viewing location"/);
  assert.match(html,/id="vg-map-selected" aria-live="polite"/);
  assert.match(html,/id="vg-map-source-actions"/);
  for(const category of ['all','coast','parks','campus'])
    assert.ok(html.includes('data-vg-filter="'+category+'"'));
  assert.match(html,/Pins mark mapped <strong>feature centers, not verified entrances or parking spots<\/strong>/);
  assert.match(html,/The pad and bearing depend on the actual mission/);
  assert.match(html,/Closed roadside lookouts are deliberately excluded/);
  assert.match(html,/Map not loading\?/);
});
test('the field guide and map pins navigate in both directions and have a plain-HTML fallback',()=>{
  const links=[...html.matchAll(/data-vg-open-map="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(links.sort(),SITES.map(s=>s.id).sort());
  for(const anchor of ['coast','surf-beach','hancock','city-parks','riverbend','ryon'])
    assert.ok(html.includes('href="#'+anchor+'"'));
  assert.match(html,/href="#viewing-map">See all six on the map/);
  assert.match(html,/href="#viewing-map">Explore the viewing map/);
  assert.ok(html.includes('/national-tools/rocket-launch-live/?region=california#rl-vandenberg'));
  const body=html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
  assert.equal((body.match(/class="vg-place-card"/g)||[]).length,6);
});
test('map includes interactive categories, synchronized markers, safe source links and robust map fallback',()=>{
  assert.match(js,/L\.map\(canvas/);
  assert.match(js,/L\.marker\(\[s\.lat,s\.lon\]/);
  assert.match(js,/map\.fitBounds/);
  assert.match(js,/panTo/);
  assert.match(js,/bindPopup/);
  assert.match(js,/setIcon/);
  assert.match(js,/map\.removeLayer\(pin\)/);
  assert.match(js,/tile\.openstreetmap\.org/);
  assert.match(js,/basemaps\.cartocdn\.com/);
  assert.match(js,/\/api\/carto-basemap-config/);
  assert.match(js,/map\.hasLayer\(osm\)/);
  assert.match(js,/dataset\.mapState='osm-fallback'/);
  assert.match(js,/Map tiles could not start/);
  assert.match(js,/The viewing map is being checked against its source records/);
  assert.match(js,/renderSelection\(\)/);
  assert.match(js,/aria-pressed/);
  assert.match(js,/scrollWheelZoom:false/);
});
test('static guide map never invents a launch-pad point, rocket view forecast, current legal opening, or road route',()=>{
  assert.doesNotMatch(js,/api\/rocket-launch-usa|images-api\.nasa\.gov|api\.weather\.gov|ll\.thespacedevs\.com/);
  assert.doesNotMatch(js,/geolocation|getCurrentPosition|watchPosition|localStorage|sessionStorage/);
  assert.doesNotMatch(js,/routePlanner|estimatedDrive|chanceToSee|canSeeRocket|rocketTrajectory/);
  assert.doesNotMatch(html,/data-vg-site="harris|data-vg-site="hawk|data-vg-site="marshallia/);
  assert.match(html,/not a live access or rocket-visibility forecast/);
  assert.match(html,/the selected launch pad/i);
  assert.doesNotMatch(js,/setView\(\[34\.63,-120\.61\]/);
});
test('map-enhanced page is responsive, accessible and privacy-respecting',()=>{
  const scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(scripts.indexOf('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')>=0);
  assert.ok(scripts.indexOf('/vandenberg-rocket-launch-viewing/map.js?v=20261103-map-v1')>
    scripts.indexOf('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'));
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:410px\)/);
  assert.match(css,/\.vg-map-canvas\{height:590px/);
  assert.doesNotMatch(css,/\.vg-map-section[^\n]*position:fixed/);
  assert.match(js,/vandenberg_guide_map_select/);
  assert.match(js,/vandenberg_guide_map_filter/);
  assert.match(js,/safeLink\(s\.source/);
  assert.match(js,/safeLink\(s\.osm/);
  assert.match(ga,/'map','map-panel'/);
  assert.doesNotMatch(ga,/getCurrentPosition|latitude|longitude|localStorage|sessionStorage/);
});
