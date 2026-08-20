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

section('Colored river click surface',20,[
  t('River geometry has a dedicated popup renderer',/function riverPopupHtml\(id,name,latlng\)/.test(core)),
  t('Every NHD path click opens the river popup',/path\.on\('click',event=>openRiverPopup\(id,f\.properties\.name,event\.latlng\)\)/.test(core)),
  t('Old name-plus-USGS-NHD tap tooltip is gone',!/bindTooltip\(`\$\{f\.properties\.name\} · USGS NHD`\)/.test(core)),
  t('Fine-pointer hover may still show only the river name',/matchMedia\?\.\('\(hover:hover\) and \(pointer:fine\)'\)/.test(core)&&/path\.bindTooltip\(`\$\{f\.properties\.name\}`/.test(core)),
  t('River popup identifies mainstem / tributary / companion role',/function waterwayKind/.test(core)&&/Mainstem/.test(core)&&/Tributary/.test(core)&&/Companion river/.test(core)),
  t('River popup shows nearest mapped access',/Nearest mapped access/.test(core)&&/nearestRiverAccess/.test(core)),
  t('River popup shows nearest active same-waterway gauge',/Nearest active gauge/.test(core)&&/nearestRiverGauge/.test(core)),
  t('River popup carries exact clicked coordinates and limits',/Clicked river point/.test(core)&&/not necessarily public access/.test(core))
]);
section('Access-point popup depth',15,[
  t('Access marker binds a real popup',/bindPopup\(\(\)=>accessPopupHtml\(p\)/.test(core)),
  t('Popup carries stable place identity',/data-manistee-popup/.test(core)),
  t('Popup shows access type, waterway and reach',/typeLabel\(p\.type\).*waterwayName\(p\.waterway\)/s.test(core)&&/reachName\(p\.reach\)/.test(core)),
  t('Popup includes source-backed place note',/mrp-note/.test(core)&&/esc\(p\.note\)/.test(core)),
  t('Activities render directly in popup',/p\.activities\.map/.test(core)&&/mrp-chip/.test(core))
]);
section('Live river context',20,[
  t('Core conditions request is shared and cached',/conditionsPromise/.test(core)&&/function getConditionsPayload/.test(core)),
  t('Access popup enriches from conditions API cache',/getConditions\(\)/.test(depth)&&/popupLiveHtml/.test(depth)),
  t('River popup shows flow',/<span>Flow<\/span>/.test(core)),
  t('River popup shows water and stage',/Water \/ stage/.test(core)),
  t('River popup shows freshness',/<span>Freshness<\/span>/.test(core)),
  t('Access popup uses same-waterway gauge',/g\.waterway===p\.waterway/.test(depth)),
  t('Optional turbidity and oxygen remain conditional in access context',/g\?\.turbidity_fnu!=null\|\|g\?\.dissolved_oxygen_mgl!=null/.test(depth))
]);
section('Seasonal comparison',10,[
  t('Percent of seasonal median is visible on river popup',/percent_of_median/.test(core)&&/% of seasonal median/.test(core)),
  t('Seasonal median cfs is visible',/seasonal_stats/.test(core)&&/median .*cfs/.test(core)),
  t('Seasonal context stays descriptive',!/prime fishing|fishing well|blown out|stay home/i.test(source))
]);
section('Weather + alerts',10,[
  t('Selected access calls exact-point weather endpoint',/manistee-river-weather\?lat=\$\{p\.lat\}&lon=\$\{p\.lon\}/.test(depth)),
  t('Current air forecast appears',/<span>Now<\/span>/.test(depth)),
  t('Wind and precipitation appear',/Wind \/ precipitation/.test(depth)&&/precipitation_context/.test(depth)),
  t('NWS alert state appears',/NWS alerts/.test(depth)),
  t('Weather is explicitly not river safety',/(?:not|neither).*wading, paddling, boating or fishing.*safety verdict/is.test(depth))
]);
section('Trust + provenance',10,[
  t('Access location confidence appears',/Location confidence/.test(core)),
  t('River geometry links its USGS NHD source',/USGS NHD source/.test(core)&&/DATA\.sources\.hydrography\.url/.test(core)),
  t('River popup distinguishes gauge location from clicked point',/Gauge readings describe the gauge location, not this exact point/.test(core)),
  t('Gauge popup labels provisional USGS data',/provisional USGS data/.test(core)),
  t('No unsafe access inference is made from a river point',/A river point is not necessarily public access/.test(core))
]);
section('Immediate actions',5,[
  t('River point can be opened in maps',/Map this river point/.test(core)&&/google\.com\/maps\/search/.test(core)),
  t('Nearest mapped access gets directions',/Directions to nearest mapped access/.test(core)&&/google\.com\/maps\/dir/.test(core)),
  t('River popup links gauge, DNR map and hydrography source',/Open USGS gauge/.test(core)&&/DNR fishing map/.test(core)&&/USGS NHD source/.test(core))
]);
section('Gauge popup depth',5,[
  t('Gauge markers use rich popup renderer',/gaugePopupHtml\(meta,g\)/.test(core)),
  t('Gauge popup includes seasonal median',/Seasonal median/.test(core)),
  t('Gauge popup includes water and stage',/<span>Water<\/span>/.test(core)&&/Gage height/.test(core))
]);
section('Resilience + mobile popup UX',5,[
  t('Access static content exists before live enrichment',/accessPopupHtml/.test(core)&&/mrp-loading/.test(source)),
  t('River popup has useful static access/source context before readings arrive',/riverPopupHtml/.test(core)&&/Nearest mapped access/.test(core)&&/USGS NHD source/.test(core)),
  t('River popup refreshes after shared conditions arrive',/getConditionsPayload\(\)\.then/.test(core)&&/popup\.setContent\(riverPopupHtml/.test(core)),
  t('Popup width is bounded for desktop and mobile',/maxWidth:360/.test(core)&&/max-width:calc\(100vw - 34px\)/.test(depth))
]);

const score=sections.reduce((sum,s)=>sum+s.score,0);
const fatals=sections.flatMap(s=>s.tests.map(x=>({...x,section:s.name}))).filter(x=>x.fatal&&!x.ok);
console.log('Manistee map-popup benchmark');
console.log('Au Sable rich-popup reference target: 100/100');
console.log('Previous colored-river click surface: 5/100 (river name + USGS NHD only)');
console.log(`Manistee candidate popup surface: ${score}/100`);
for(const s of sections)console.log(`${String(s.score).padStart(2)}/${s.points}  ${s.name}`);
if(fatals.length){console.error('\nPopup contract failures:');for(const f of fatals)console.error(`- ${f.section}: ${f.label}`);}
if(process.argv.includes('--check')&&(score<95||fatals.length))process.exit(1);
