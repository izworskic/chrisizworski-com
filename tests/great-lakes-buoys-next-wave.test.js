const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/great-lakes-buoys/index.html'),'utf8');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/great-lakes-buoys-next-wave-2026-09-20.json'),'utf8'));

test('Great Lakes buoy next-wave treatment clears the 100-point value gate',()=>{
  let score=0;
  const add=(points,ok,msg)=>{assert.ok(ok,msg);score+=points};

  add(30,
    html.includes('id="stationSearch"') &&
    html.includes('data-buoy-jump="45005"') &&
    html.includes('data-buoy-jump="45029"') &&
    html.includes('Find a Great Lakes buoy by station number'),
    'station-number task utility missing');

  add(25,
    html.includes('Sensor availability matters:') &&
    html.includes('leaves missing fields blank instead of estimating them') &&
    html.includes('official NDBC station page') &&
    html.includes('ndbc.noaa.gov'),
    'source/sensor truth boundary missing');

  add(20,
    html.includes('href="/michigan-boat-launches/"') &&
    html.includes('href="/great-lakes-beaches/"'),
    'decision-network handoffs missing');

  add(15,
    html.includes('<title>Great Lakes Buoys Live: Waves &amp; Water Temp | Chris Izworski</title>') &&
    html.includes('<meta name="description" content="Check live NOAA Great Lakes buoy conditions on an interactive map: wave height, wind, water temperature, pressure, and filters for boating and fishing.">') &&
    html.includes('<h1 class="page-title">Great Lakes Buoys Live: Waves, Wind &amp; Water Temperature</h1>') &&
    html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-buoys/">'),
    'protected search surface changed');

  add(10,
    cfg.treatment.noNewIndexableStationPages===true &&
    cfg.treatment.adDensityChange===false &&
    !html.includes('data-ad-slot="1011148508"'),
    'AdSense/publisher-value guardrail weakened');

  assert.equal(score,100);
  assert.ok(score>=cfg.valueFunction.releaseThreshold);
});

test('buoy benchmark records the new Search Console breakout without pretending queries are page-joined',()=>{
  assert.equal(cfg.evidence.current.impressions,388);
  assert.equal(cfg.evidence.current.clicks,7);
  assert.equal(cfg.evidence.current.averagePosition,8.83);
  assert.ok(cfg.evidence.queryAttributionCaution);
  assert.equal(cfg.measurement.windowDays,28);
  assert.equal(cfg.measurement.positionGuardrail,10.5);
});

test('station search filters by id, name and lake and curated station buttons reuse the existing detail UI',()=>{
  assert.match(html,/const query = \(document\.getElementById\('stationSearch'\)/);
  assert.match(html,/String\(s\.id \|\| ''\).*String\(s\.name \|\| ''\).*String\(s\.lake \|\| ''\)/s);
  assert.match(html,/allStations\.find\(s => s\.id === id\)/);
  assert.match(html,/if \(station\) openDetail\(station\)/);
});
