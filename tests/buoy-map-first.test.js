const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/great-lakes-buoys/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/great-lakes-buoys/map-first.css'),'utf8');
const mapJs=fs.readFileSync(path.join(root,'public/great-lakes-buoys/map-first.js'),'utf8');

test('Map is the first main visitor experience after the title, with activity choice and no first-person sales narrative',()=>{
  const title=html.indexOf('class="page-title"');
  const activity=html.indexOf('id="activityPills"');
  const map=html.indexOf('id="station-map"');
  const quick=html.indexOf('id="great-lakes-buoy-answer"');
  const bridge=html.indexOf('id="observationBridge"');
  assert.ok(title>=0&&activity>title&&map>activity&&quick>map&&bridge>quick);
  assert.ok(html.includes('id="waterDesk"'));
  assert.ok(html.includes('id="mapStationPicker"'));
  assert.ok(html.includes('id="mapDossier"'));
  assert.ok(html.includes('id="mapStationCompare"'));
  assert.ok(html.includes('id="mapStationHistory"'));
  assert.doesNotMatch(html,/I built this because/);
  assert.doesNotMatch(html,/I am <a href="\/about\/">Chris Izworski/);
  assert.ok(html.includes('Maintained by <a href="/about/">Chris Izworski</a>'));
  assert.ok(html.includes('href="/great-lakes-buoys/map-first.css?v=1"'));
  assert.ok(html.includes('src="/great-lakes-buoys/map-first.js?v=1"'));
  assert.ok(html.includes('id="buoyMap"'));
  assert.ok(html.includes('class="map-no-script"'));
  assert.ok(html.includes('id="stationList"'));
  assert.ok(html.includes('id="obStationA"')&&html.includes('id="obStationB"'));
  assert.ok(html.includes('https://www.weather.gov/marine/'));
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-buoys/">'));
  assert.ok(html.includes('https://chrisizworski.com/#person'));
});

test('Station map fires selected-station events; one map-focused panel opens the existing source/history/compare',()=>{
  assert.match(html,/marker\.on\('click',\s*\(\)\s*=>\s*window\.dispatchEvent\(new CustomEvent\('buoy-map-station-selected'/);
  assert.match(html,/window\.highlightBuoyOnMap\s*=\s*highlightMapStation/);
  assert.match(html,/window\.dispatchEvent\(new CustomEvent\('buoy-activity-changed'/);
  assert.match(mapJs,/window\.addEventListener\('buoy-map-station-selected'/);
  assert.match(mapJs,/window\.addEventListener\('buoy-stations-ready'/);
  assert.match(mapJs,/window\.buoyObservationBridge\?\.selectStation/);
  assert.match(mapJs,/window\.openDetail/);
  assert.match(mapJs,/state\.stationId/);
  assert.match(mapJs,/state\.activity/);
  assert.match(mapJs,/Saved snapshot only/);
  assert.ok(css.includes('max-width:620px'));
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes(':focus-visible'));
});

test('Activity screening requires actual recent values for every relevant sensor, never a missing-data pass',()=>{
  const start=html.indexOf('const ACTIVITIES = {');
  const end=html.indexOf('// === Render map ===',start);
  assert.ok(start>0&&end>start);
  const fakeWindow={};
  const code=html.slice(start,end)+'\nreturn {activityEvidence,stationColor};';
  const logic=new Function('window',code)(fakeWindow);
  const recent=new Date(Date.now()-20*60*1000).toISOString();
  const old=new Date(Date.now()-4*60*60*1000).toISOString();
  const base={id:'45029',obs_time:recent,wind_spd_kt:9,wave_ht_ft:1.2,water_t_f:65};
  assert.equal(logic.activityEvidence(base,'kayaking'),'within');
  assert.equal(logic.activityEvidence({...base,wave_ht_ft:null},'kayaking'),'unknown');
  assert.equal(logic.activityEvidence({...base,wind_spd_kt:null},'fishing'),'unknown');
  assert.equal(logic.activityEvidence({...base,water_t_f:null},'swimming'),'unknown');
  assert.equal(logic.activityEvidence({...base,obs_time:old},'kayaking'),'unknown');
  assert.equal(logic.activityEvidence({...base,wind_spd_kt:22},'kayaking'),'outside');
  assert.equal(logic.activityEvidence({...base,wind_spd_kt:0},'fishing'),'within');
  assert.equal(logic.stationColor({...base,water_t_f:null},'kayaking'),'#586773');
  assert.notEqual(logic.stationColor(base,'kayaking'),logic.stationColor({...base,wind_spd_kt:22},'kayaking'));
});

test('Map-first design keeps the original reports, feed, ad and SEO contracts',()=>{
  assert.ok(html.includes("fetch('/api/buoys')"));
  assert.ok(html.includes('id="snapshotData"'));
  assert.ok(html.includes('id="modalOverlay"'));
  assert.ok(html.includes('id="lakePills"'));
  assert.ok(html.includes('id="geoBtn"'));
  assert.ok(html.includes('id="activityPills"'));
  assert.ok(html.includes('latest available NOAA/NDBC readings'));
  assert.ok(html.includes('Source observations are typically 5 to 30 minutes old'));
  assert.ok(html.includes('id="smartCta"'));
  assert.match(html,/basemaps\.cartocdn\.com/);
  assert.match(html,/OpenStreetMap &copy; CARTO/);
  assert.ok(html.includes('href="/great-lakes-buoys/observation-bridge.css?v=1"'));
  assert.ok(html.includes('src="/great-lakes-buoys/observation-bridge.js?v=1"'));
  assert.doesNotMatch(mapJs,/\bfetch\s*\(/);
});
