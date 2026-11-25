'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const UI=require('../public/assets/river-watch-vessel-ui.js');
const Icons=require('../public/assets/seaway-vessel-icons.js');
const calumet=require('../public/assets/calumet-watch-core.js');
const cuyahoga=require('../public/assets/cuyahoga-watch-core.js');
const cHTML=fs.readFileSync('public/calumet-freighter-watch/index.html','utf8');
const yHTML=fs.readFileSync('public/cuyahoga-freighter-watch/index.html','utf8');
const cApp=fs.readFileSync('public/assets/calumet-watch-app.js','utf8');
const yApp=fs.readFileSync('public/assets/cuyahoga-watch-app.js','utf8');
const style=fs.readFileSync('public/assets/river-watch-vessel-ui.css','utf8');
const now=Date.parse('2026-11-22T19:00:00Z');
const v=(mmsi,shipType,seen='2026-11-22T18:58:00Z')=>({
 mmsi,name:'TEST '+mmsi,shipType,seen,lat:41.722,lon:-87.544,source:'test fixture',
 lengthMeters:shipType===70?215:shipType===31?31:90,speedKnots:3.5,course:90
});
const data=vessels=>({ok:true,checkedAt:'2026-11-22T18:59:00Z',vessels});

test('reuses all nine authoritative Seaway/Soo AIS silhouettes, not generic letters and circles',()=>{
 assert.deepEqual(UI.KINDS.map(t=>t.kind),
  ['cargo','tanker','passenger','tug','pleasure','sail','fishing','service','unknown']);
 for(const [code,kind] of [[70,'cargo'],[81,'tanker'],[61,'passenger'],[31,'tug'],[57,'tug'],
    [37,'pleasure'],[36,'sail'],[30,'fishing'],[33,'service'],[51,'service'],
    [null,'unknown'],[92,'unknown'],['70','unknown']]){
  const ship=v('366100001',code);
  assert.equal(UI.kindOf(ship),kind);
  assert.equal(UI.kindOf(ship),Icons.classify(ship));
  assert.match(UI.glyphSvg(kind),/<svg viewBox="0 0 72 36"/);
  assert.match(UI.glyphSvg(kind),/ship-hull/);
 }
 assert.equal(new Set(UI.KINDS.map(k=>UI.glyphSvg(k.kind))).size,9);
});

test('hull shape never flips with course; only a separate arrow represents usable travel course',()=>{
 for(const [course,expected] of [[0,'0.0'],[90,'90.0'],[180,'180.0'],[359.9,'359.9']]){
  const ship={...v('366100001',70),course};
  const icon=UI.marker(ship,{zoom:13});
  assert.equal(icon.kind,'cargo');
  assert.match(icon.html,/<svg viewBox="0 0 72 36"/);
  assert.match(icon.className,/river-watch-marker.*type-cargo.*with-course/);
  assert.ok(icon.html.includes('--river-course:'+expected+'deg'));
  assert.ok(!icon.html.includes('rotate('),'side-on hull must not rotate or turn upside down');
 }
 for(const ship of [{...v('366100001',70),speedKnots:0,course:180},
   {...v('366100001',70),speedKnots:null,course:90},
   {...v('366100001',70),course:null},{...v('366100001',70),course:360}]){
   const icon=UI.marker(ship);
   assert.match(icon.className,/without-course/);
   assert.ok(!icon.html.includes('river-ship-course'));
   assert.match(icon.html,/ship-hull/,'unknown direction still has visible ship silhouette');
 }
 assert.deepEqual([UI.marker(v('366100001',70)).size[0],
    UI.marker(v('366100001',31)).size[0]],[63,38]);
 assert.match(style,/\.river-watch-marker\.is-stopped/);
 assert.match(style,/\.river-ship-course/);
});

test('vessel counts only include distinct, locally admitted fresh reported MMSIs',()=>{
 const rows=[v('366100001',70),v('366100002',80),v('366100003',31),
    v('366100004',60),v('366100005',37),v('366100006',36),v('366100007',30),
    v('366100008',33),v('366100009',null),v('366100001',70),
    v('366100010',70,'2026-11-22T18:00:00Z')];
 const report=calumet.classifyLive(data(rows),now);
 const summary=UI.summarize(report,now);
 assert.equal(summary.available,true);
 assert.equal(summary.total,9);
 assert.equal(summary.groups.length,9);
 assert.equal(summary.groups.reduce((n,g)=>n+g.count,0),9);
 assert.equal(summary.groups.find(g=>g.kind==='unknown').count,1);
 assert.equal(summary.groups.find(g=>g.kind==='cargo').count,1);
 assert.deepEqual(report.vessels.filter(x=>UI.match(x,'tug')).map(x=>x.mmsi),['366100003']);
 assert.equal(report.vessels.filter(x=>UI.match(x,'all')).length,9);
});

test('unknown, stale and empty local AIS sources do not imply there are no ships',()=>{
 const bad=UI.summarize(null,now);
 assert.equal(bad.available,false);
 assert.equal(UI.summarize(calumet.classifyLive(null,now),now).available,false);
 const stale=calumet.classifyLive({ok:true,checkedAt:'2026-11-22T18:00:00Z',vessels:[v('366100001',70)]},now);
 assert.equal(UI.summarize(stale,now).available,false);
 const empty=UI.summarize(calumet.classifyLive(data([]),now),now);
 assert.equal(empty.available,true);assert.equal(empty.total,0);
 assert.match(empty.reason,/receiver coverage may be incomplete/);
 const formerlyFresh=calumet.classifyLive(data([v('366100001',70)]),now);
 assert.equal(UI.summarize(formerlyFresh,now+31*60*1000).available,false);
});

test('Calumet and Cuyahoga use the same Soo SVG factory with counted source context',()=>{
 for(const [html,app,id] of [[cHTML,cApp,'calumet-type-counts'],[yHTML,yApp,'cuyahoga-type-counts']]){
  const iconsAt=html.indexOf('/assets/seaway-vessel-icons.js');
  const uiAt=html.indexOf('/assets/river-watch-vessel-ui.js');
  const appAt=html.indexOf('/assets/'+(id.startsWith('calumet')?'calumet-watch-app.js':'cuyahoga-watch-app.js'));
  assert.ok(iconsAt>0&&uiAt>iconsAt&&appAt>uiAt);
  assert.match(html,/\/assets\/river-watch-vessel-ui\.css/);
  assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(app,/Icons\.icon\(v,/);
  assert.match(app,/soo-ais-symbol/);
  assert.match(html,/\/assets\/soo-vessel-icons\.css/);
  assert.doesNotMatch(app,/river-ship-course/);
  assert.match(app,/shipUI\?\.renderTypeFilters\(/);
  assert.match(app,/shipUI\.match\(/);
  assert.match(app,/river-vessel-list-glyph/);
  assert.match(app,/map\.on\('zoomend'/);
  assert.match(html,/name="robots" content="noindex,follow"/);
  assert.match(html,/#person/);
  assert.doesNotMatch(app,/redis|ais\.openwaters\.io|marine.?traffic\.com/i);
  assert.doesNotMatch(app,/ETA\s*=|minutes until|predict(?:ed)? arrival/i);
 }
 assert.match(cApp,/fetch\('\/api\/freighter-ais'/);
 assert.match(yApp,/fetch\('\/api\/freighter-ais\?region=cuyahoga'/);
 assert.match(yApp,/cuyahoga-regional-openwaters/);
 assert.match(yHTML,/\/assets\/cuyahoga-bend-demo\.js/);
 assert.match(yHTML,/\/assets\/cuyahoga-bridge-to-shore\.js/);
 assert.match(cHTML,/id="bridge-angle"/);
});

test('Cuyahoga and Calumet observational source gates are unchanged',()=>{
 const c=calumet.classifyLive(data([v('366100001',70)]),now);
 const yV={...v('366100001',70),lat:41.492,lon:-81.699};
 const y=cuyahoga.classifyLive(data([yV]),now);
 assert.equal(c.state,'REPORTS_AVAILABLE');
 assert.equal(y.state,'REPORTS_AVAILABLE');
 assert.equal(UI.summarize(y,now).groups.find(x=>x.kind==='cargo').count,1);
 assert.equal(cuyahoga.recent(yV,now),true);
});
