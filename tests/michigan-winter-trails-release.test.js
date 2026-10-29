import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8'),html=read('public/michigan-winter-trails/index.html'),js=read('public/assets/michigan-winter-trails.js');

test('crawlable statewide winter trail guide with 15 source-backed static trail systems and 50 named loops',()=>{
  assert.match(html,/<h1>/);
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-winter-trails\/"/);
  assert.equal((html.match(/class="wf-story"/g)||[]).length,15);
  assert.equal((html.match(/data-evidence="https:\/\//g)||[]).length,15);
  assert.match(html,/numberOfItems":15/);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/<noscript>/);
  for(const region of ['up','north','south'])assert.ok(html.includes('data-region="'+region+'"'),region);
  for(const tag of ['snowshoe','ski','bike','hike'])assert.ok(html.includes('data-tag="'+tag+'"'),tag);
  for(const bad of ['michigan-winter-wildlife','great-lakes-winter-guide','michigan-winter-night-sky']){
    assert.ok(!html.includes('href="/'+bad+'/"'),'unreleased sibling link '+bad);
  }
});

test('closures, ski-only rules, fat-tire windows and 7 quarantined route blockers are present in static HTML',()=>{
  assert.match(html,/indefinite footbridge closure/i);
  assert.match(html,/Au Sable River Foot Trail/);
  assert.match(html,/Lantern Loop/);
  assert.match(html,/cross-country ski only/i);
  assert.match(html,/December 15 through March 15|Dec 15–Mar 15/);
  assert.match(html,/3\.5-inch/);
  assert.match(html,/Anderson Lake State Forest Campground and pathway access roads are not plowed/i);
  assert.match(html,/footbridge[^<]*closed indefinitely/i);
  assert.match(html,/cross-country ski only/i);
  assert.match(html,/Muncie Lakes[^<]*avoid walking on groomed ski tracks/i);
  assert.match(html,/Pine Bowl[^<]*steep outer descents/i);
  assert.match(html,/Anderson Lake Pathway/);
  assert.match(html,/Snow depth is not plowed parking/);
  assert.doesNotMatch(html,/guaranteed plowed parking|all trails are groomed daily/i);
});

test('photo credits and source rights are explicit with honest seasonal/archival disclosures across all 15 breakout cards',()=>{
  const photos=[...html.matchAll(/<figure class="wf-photo[^]*?<\/figure>/g)];
  const indices=[...html.matchAll(/<div class="wf-story-index"[\s\S]*?<\/div>/g)];
  assert.equal(photos.length,18);
  assert.equal(indices.length,0);
  for(const [photo] of photos){
    assert.match(photo,/Photo: <a/);
    assert.match(photo,/(CC BY|CC0|public[ -]domain)/i);
    assert.match(photo,/figcaption/);
    assert.match(photo,/alt="[^"]+"/);
  }
  assert.match(html,/Joe Passe/);
  assert.match(html,/summer reference, not winter snow/);
  assert.match(html,/Guettarda/);
  assert.match(html,/Frozen cattail channels at Tobico Marsh/);
  assert.match(js,/revealPhotoFallback/);
  assert.match(js,/IMAGE UNAVAILABLE/);
});

test('interactive trail-use decoder, grouped Vasa map marker and 4-way filters are wired',()=>{
  assert.match(html,/id="trl-use-stage"/);
  assert.match(html,/id="trl-access"/);
  assert.match(js,/desc=\{/);
  assert.match(js,/groups=new Map/);
  assert.match(js,/trl-access/);
  assert.ok(existsSync('public/assets/michigan-winter-trails.css'));
  assert.ok(existsSync('public/assets/michigan-winter-trails.js'));
});

test('separate canonical has internal entry points and winter sitemap registration',()=>{
  for(const p of ['public/tools/index.html','public/michigan-destinations/index.html','public/michigan-winter-activities/index.html','public/frozen-michigan/index.html']){
    assert.ok(read(p).includes('href="/michigan-winter-trails/"'),p);
  }
  assert.ok(read('public/sitemap-winter.xml').includes('https://chrisizworski.com/michigan-winter-trails/'));
});

test('all 15 winter trail systems link to view-only Google Maps areas, never unverified parking directions',()=>{
  const blocks=[...html.matchAll(/<article class="wf-story"[\s\S]*?<\/article>/g)];
  assert.equal(blocks.length,15);
  for(const [b] of blocks){
    assert.match(b,/https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[0-9.]+%2C-[0-9.]+/);
    assert.match(b,/View [^<]+ on Google Maps · area only, not verified parking/);
    assert.match(b,/target="_blank" rel="noopener noreferrer"/);
  }
  assert.match(js,/trl-popup-map-link/);
  assert.match(js,/encodeURIComponent\(lat\+','\+lng\)/);
  assert.doesNotMatch(html,/maps\/dir\/|directions\?api=1/);
});

test('Michigan Winter Trails uses locally hosted, version-locked Leaflet rather than remote unpkg',()=>{
  assert.ok(html.includes('src="/assets/leaflet-1.9.4.js"'));
  assert.ok(!html.includes('unpkg.com/leaflet'));
  assert.ok(existsSync('public/assets/leaflet-1.9.4.js'));
  assert.ok(existsSync('public/vendor/leaflet/LICENSE'));
});
