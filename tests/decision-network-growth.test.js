const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=rel=>readFileSync(path.join(root,rel),'utf8');

test('decision network is crawlable on safe hubs without altering protected destinations',()=>{
  const tools=read('public/tools/index.html');
  const gl=read('public/great-lakes/index.html');
  assert.ok((tools.match(/data-decision-network=/g)||[]).length>=17);
  assert.ok((gl.match(/data-decision-network=/g)||[]).length>=10);
  for(const html of [tools,gl]){
    assert.match(html,/assets\/decision-network\.css/);
    assert.match(html,/assets\/decision-network\.js/);
  }
  const js=read('public/assets/decision-network.js');
  assert.match(js,/Decision Network Handoff/);
  assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|geolocation|getCurrentPosition/);
  assert.doesNotMatch(js,/destination.*href|href.*destination/);
});

test('boat launch finder is source-first, destination-first, and keeps the DNR record as map truth',()=>{
  const html=read('public/michigan-boat-launches/index.html');
  const js=read('public/assets/boat-launch-finder.js');
  const api=read('api/boat-launches.js');
  const geocode=read('api/boat-launch-geocode.js');
  const code=js+'\n'+api+'\n'+geocode;
  assert.match(html,/<title>Michigan Boat Launch Finder \| Chris Izworski<\/title>/);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-boat-launches/">'));
  assert.match(html,/<h1>Find a boat launch near where you want to go<\/h1>/);
  assert.match(html,/assets\/boat-launch-finder\.js/);
  assert.doesNotMatch(html,/id="locdata"|Bay City State Park Launch|"numberOfItems": 42/);
  assert.match(api,/PRDBASPublicView\/FeatureServer\/0/);
  assert.match(api,/launch_status='Open'/);
  assert.match(api,/greatlakesaccess LIKE 'Yes%'/);
  assert.doesNotMatch(api,/facilityid IS NOT NULL/);
  assert.match(api,/globalid/);
  assert.match(api,/OBJECTID/);
  assert.match(api,/referenceonly/);
  assert.match(api,/fallback_used: false/);
  assert.match(js,/SOURCE_API='\/api\/boat-launches'/);
  assert.match(js,/GEOCODE_API='\/api\/boat-launch-geocode'/);
  assert.match(js,/function distanceMiles/);
  assert.match(js,/function chooseNearby/);
  assert.match(js,/google\.com\/maps\/dir/);
  assert.match(js,/No legacy or guessed launch pins are being shown/);
  assert.doesNotMatch(code,/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity|hay\.includes\(q\)/);
  assert.doesNotMatch(code,/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage|document\.cookie/);
  const children=readdirSync(path.join(root,'public/michigan-boat-launches'),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
  assert.deepEqual(children,['lake-michigan','saginaw-bay']);
});

test('shipwreck explorer preserves the database and keeps map precision honest',()=>{
  const html=read('public/great-lakes-shipwrecks/index.html');
  const js=read('public/assets/shipwreck-explorer.js');
  assert.match(html,/<title>Great Lakes Shipwrecks Map &amp; Explorer \| Chris Izworski<\/title>/);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-shipwrecks/">'));
  assert.match(html,/<h1>Great Lakes Shipwrecks Map &amp; Explorer<\/h1>/);
  assert.match(html,/assets\/shipwreck-explorer\.js/);
  assert.ok((html.match(/<tr><td><strong>/g)||[]).length>=60);
  assert.match(js,/Great Storm of 1913/);
  assert.match(js,/Highest loss of life/);
  assert.match(js,/named-place (?:story )?anchors/i);
  assert.match(js,/not navigation coordinates, dive coordinates/i);
  assert.doesNotMatch(js,/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage|document\.cookie/);
  assert.match(html,/Daniel J\. Morrell<\/strong><\/td><td>Huron<\/td>/);
  assert.match(html,/Daniel J\. Morrell[\s\S]{0,500}Off Harbor Beach, MI/);
  assert.match(html,/Edmund Fitzgerald[\s\S]{0,500}Restricted \/ licensed/);
  assert.match(html,/Hamilton &(?:amp;)? Scourge[\s\S]{0,500}Restricted \/ licensed/);
  assert.doesNotMatch(html,/maritime graves \(Edmund Fitzgerald, Hamilton & Scourge\) prohibit diving by law/i);
  assert.doesNotMatch(html,/designated a maritime burial ground, diving is prohibited/i);
});

test('growth benchmark is evidence-backed and part of the full merge gate',()=>{
  const score=JSON.parse(read('benchmarks/decision-network-growth.json'));
  assert.equal(score.maxScore,100);
  assert.equal(score.target.minimumEffectiveScore,95);
  assert.equal(score.target.maximumLoss,5);
  assert.equal(score.observedBaseline.boatLaunches.impressions,346);
  assert.equal(score.observedBaseline.shipwrecks.impressions,1206);
  const pkg=JSON.parse(read('package.json'));
  assert.match(pkg.scripts['verify:all'],/benchmark:decision-network/);
  assert.match(pkg.scripts['verify:all'],/benchmark:boat-launches-v3/);
  assert.equal(pkg.scripts['benchmark:decision-network'],'node scripts/benchmark-decision-network-growth.mjs --check');
});
