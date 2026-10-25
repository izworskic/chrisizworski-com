'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const S=require('../public/winter-hike-snowshoe-lab/satellite.js');
const Parking=require('../lib/winter-hike-parking.cjs');
const base=path.resolve(__dirname,'../public/winter-hike-snowshoe-lab');
const now=Date.parse('2026-10-25T13:00:00Z');
const read=p=>readFileSync(path.join(base,p),'utf8');
test('MODIS historical scenes point only to documented NASA GIBS Web Mercator WMTS tiles',()=>{
 const snow=S.scene('snowCover','2025-02-15',now);
 const rgb=S.scene('trueColor','2024-01-15',now);
 assert.deepEqual([snow.maxzoom,snow.tileSize,rgb.maxzoom,rgb.tileSize],[8,256,9,256]);
 assert.equal(snow.tile,'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDSI_Snow_Cover/default/2025-02-15/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png');
 assert.equal(rgb.tile,'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-01-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg');
 for(const x of [snow,rgb]){
  assert.equal(x.parkingVerified,false);
  assert.equal(x.routeAccessVerified,false);
  assert.equal(x.snowMeasurement,false);
  assert.match(x.interpretation,/cannot|Neither product/);
  assert.match(x.provenance,/NASA/);
 }
});
test('historical picker blocks tomorrow, today, impossible days, pre-MODIS and injected layers',()=>{
 for(const day of ['2026-10-25','2026-10-26','2027-01-01','2000-02-29',
  '2025-02-29','2024-13-01','2024-02-30','2025/01/01','2025-01-15?query=evil',null]){
  assert.equal(S.validHistoricalDay(day,now),false,String(day));
  assert.equal(S.tileTemplate('snowCover',day,now),null,String(day));
 }
 assert.equal(S.validHistoricalDay('2000-03-01',now),true);
 assert.equal(S.validHistoricalDay('2024-02-29',now),true);
 assert.equal(S.tileTemplate('some_other_layer','2025-01-15',now),null);
 assert.equal(S.scene('something-else','2024-01-15',now),null);
 assert.equal(S.latestHistoricalDay(now),'2026-10-24');
});
test('past winter presets are bounded, sorted and use real dates only',()=>{
 const preset=S.historicalPresets(now);
 assert.equal(preset.length,8);
 assert.deepEqual(preset.slice(0,4),['2026-02-15','2026-01-15','2025-02-15','2025-01-15']);
 assert.ok(preset.every(d=>S.validHistoricalDay(d,now)));
 assert.equal(S.moveDay('2024-02-28',1,now),'2024-02-29');
 assert.equal(S.moveDay('2024-02-29',1,now),'2024-03-01');
 assert.equal(S.moveDay('2026-10-24',1,now),null);
 assert.equal(S.moveDay('2000-03-01',-1,now),null);
 assert.equal(S.moveDay('2025-01-15',99,now),null);
});
test('no invented historical snow coverage, winter parking probability or live clearance',()=>{
 const code=read('satellite.js');
 assert.ok(code.includes('parkingVerified:false'));
 assert.ok(!/Math\.random|fetch\(|XMLHttpRequest|localStorage/.test(code));
 assert.ok(!('plowedProbability' in S.scene('snowCover','2026-01-15',now)));
 for(const r of Parking.registry.checkpoints){
  const s=Parking.assess(r.routeIds[0],{tripDay:'2027-01-15',now:Date.parse('2027-01-15T14:00:00Z')});
  assert.equal(s.navigationReady,false);
  assert.equal(s.parking,'unknown');
 }
});
test('all historical satellite UI assets remain noindex, optional and accessible',()=>{
 const html=read('index.html'),js=read('app.js'),ui=read('satellite-ui.js');
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 for(const key of ['sat-show','sat-mode','sat-date','sat-preset','sat-prev','sat-next','sat-opacity','sat-focus','sat-status'])
  assert.ok(html.includes('id="'+key+'"'),'missing control '+key);
 assert.ok(html.includes('satellite.js?v=1')&&html.includes('satellite-ui.js?v=1'));
 assert.match(js,/WinterHikeSatelliteUI\?\.attach\(map\)/);
 assert.match(js,/WinterHikeSatelliteUI\?\.selected\(route\)/);
 assert.match(js,/WinterHikeSatelliteUI\?\.init\(\)/);
 assert.ok(!js.includes('winterAccessPanel++'),'historical satellite integration must not regress card syntax');
 assert.ok(!js.includes('Call land manager:'));
 assert.match(ui,/source:id/);
 assert.match(ui,/parking/);
 assert.match(html,/aria-live="polite"/);
});
test('all browser JavaScript parses in Node check mode, including map viewer and existing route chart',()=>{
 for(const name of ['satellite.js','satellite-ui.js','app.js','visuals.js']){
  const result=spawnSync(process.execPath,['--check',path.join(base,name)],{encoding:'utf8',timeout:8000});
  assert.equal(result.status,0,name+': '+result.stderr);
 }
});
