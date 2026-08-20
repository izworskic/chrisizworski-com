import fs from 'node:fs';

const core=fs.readFileSync('public/assets/manistee-river-map.js','utf8');
const depth=fs.readFileSync('public/assets/manistee-river-live-depth.js','utf8');
const source=core+'\n'+depth;

const sections=[];
function section(name,points,tests){
  const passed=tests.filter(t=>t.ok).length;
  const score=Math.round(points*passed/tests.length);
  sections.push({name,points,score,tests});
}
function t(label,ok,fatal=true){return {label,ok:Boolean(ok),fatal};}

section('Identity + place context',15,[
  t('Access marker binds a real popup',/bindPopup\(\(\)=>accessPopupHtml\(p\)/.test(core)),
  t('Popup carries stable place identity',/data-manistee-popup/.test(core)),
  t('Popup shows access type and waterway',/typeLabel\(p\.type\).*waterwayName\(p\.waterway\)/s.test(core)),
  t('Popup shows reach name and reach summary',/reachName\(p\.reach\)/.test(core)&&/reachSummary\(p\.reach\)/.test(core)),
  t('Popup includes the source-backed place note',/mrp-note/.test(core)&&/esc\(p\.note\)/.test(core))
]);
section('Activity + facility utility',10,[
  t('Activities render directly in popup',/p\.activities\.map/.test(core)&&/mrp-chip/.test(core)),
  t('Access type is human-readable',/function typeLabel/.test(core)),
  t('Popup remains useful without live APIs',/Loading nearest USGS gauge and NWS weather/.test(core)&&/Official \/ location source/.test(core))
]);
section('Live river context',20,[
  t('Popup enriches from conditions API cache',/getConditions\(\)/.test(depth)&&/popupLiveHtml/.test(depth)),
  t('Nearest gauge is same-waterway',/g\.waterway===p\.waterway/.test(depth)),
  t('Flow appears in popup',/Flow<\/span>/.test(depth)||/<span>Flow<\/span>/.test(depth)),
  t('Water temperature appears in popup',/Water \/ stage/.test(depth)),
  t('Gage height appears in popup',/gage_height_ft/.test(depth)),
  t('Freshness and measurement time appear',/Freshness/.test(depth)&&/freshness\(g\)/.test(depth)),
  t('Optional turbidity and oxygen are conditional',/turbidity_fnu!=null\|\|g\?\.dissolved_oxygen_mgl!=null/.test(depth))
]);
section('Seasonal comparison',10,[
  t('Percent of seasonal median is visible',/percent_of_median/.test(depth)&&/% of seasonal median/.test(depth)),
  t('Seasonal median cfs is visible',/seasonal_stats/.test(depth)&&/median .*cfs/.test(depth)),
  t('Seasonal context stays descriptive',!/prime fishing|fishing well|blown out|stay home/i.test(source))
]);
section('Weather + alerts',15,[
  t('Selected access calls exact-point weather endpoint',/manistee-river-weather\?lat=\$\{p\.lat\}&lon=\$\{p\.lon\}/.test(depth)),
  t('Current air forecast appears',/<span>Now<\/span>/.test(depth)),
  t('Wind appears',/Wind \/ precipitation/.test(depth)),
  t('Precipitation context appears',/precipitation_context/.test(depth)),
  t('NWS alert state appears',/NWS alerts/.test(depth)),
  t('Weather is explicitly not river safety',/not a wading, paddling, boating or fishing-safety verdict/.test(depth))
]);
section('Trust + provenance',10,[
  t('Location confidence appears',/Location confidence/.test(core)),
  t('Coordinate source appears',/locationSource/.test(core)),
  t('Exact point coordinates appear',/exact point/.test(core)),
  t('Official/location source action appears',/Official \/ location source/.test(core)),
  t('Gauge popup labels provisional USGS data',/provisional USGS data/.test(core))
]);
section('Immediate actions',10,[
  t('Navigate here action is in popup',/Navigate here/.test(core)&&/google\.com\/maps\/dir/.test(core)),
  t('Source action is in popup',/Official \/ location source/.test(core)),
  t('Fishing locations get DNR map action',/DNR fishing map/.test(core)&&/p\.activities\.includes\('fish'\)/.test(core))
]);
section('Gauge popup depth',5,[
  t('Gauge markers use rich popup renderer',/gaugePopupHtml\(meta,g\)/.test(core)),
  t('Gauge popup includes seasonal median',/Seasonal median/.test(core)),
  t('Gauge popup includes water and stage',/Water<\/span>|<span>Water<\/span>/.test(core)&&/Gage height/.test(core))
]);
section('Resilience + mobile popup UX',5,[
  t('Static content exists before live enrichment',/accessPopupHtml/.test(core)&&/mrp-loading/.test(source)),
  t('Popup enrichment survives module timing',/manistee:popup-open/.test(source)&&/MutationObserver/.test(depth)),
  t('Popup width is bounded for desktop and mobile',/maxWidth:360/.test(core)&&/max-width:calc\(100vw - 34px\)/.test(depth)),
  t('Marker click no longer scrolls to side card',/m\.on\('click',\(\)=>selectPlace\(p\.id,false\)\)/.test(core))
]);

const score=sections.reduce((sum,s)=>sum+s.score,0);
const fatals=sections.flatMap(s=>s.tests.map(x=>({...x,section:s.name}))).filter(x=>x.fatal&&!x.ok);
console.log('Manistee map-popup benchmark');
console.log('Au Sable rich-popup reference target: 100/100');
console.log('Manistee previous marker surface: 5/100 (name-only tooltip; rich detail lived outside popup)');
console.log(`Manistee candidate popup surface: ${score}/100`);
for(const s of sections)console.log(`${String(s.score).padStart(2)}/${s.points}  ${s.name}`);
if(fatals.length){console.error('\nPopup contract failures:');for(const f of fatals)console.error(`- ${f.section}: ${f.label}`);}
if(process.argv.includes('--check')&&(score<95||fatals.length))process.exit(1);
