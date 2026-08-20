import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('public/manistee-river-map/index.html','utf8');
const js=fs.readFileSync('public/assets/manistee-river-map.js','utf8');
const dataJs=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const api=fs.readFileSync('api/manistee-river-conditions.js','utf8');
const hydro=fs.readFileSync('api/manistee-river-hydrography.js','utf8');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(dataJs,ctx);const data=ctx.window.MANISTEE_FIELD_DATA;
const checks=[];
function section(name,tests){const passed=tests.filter(t=>t.ok).length;const score=Math.round(10*passed/tests.length);checks.push({name,score,tests});}
function ok(label,value,fatal=false){return {label,ok:Boolean(value),fatal};}

const places=data.places||[];
section('Provenance integrity',[
  ok('15+ mapped places',places.length>=15,true),
  ok('Every place has HTTPS source',places.every(p=>/^https:\/\//.test(p.source?.url||'')),true),
  ok('Every point declares coordinate source',places.every(p=>p.locationSource),true),
  ok('Every point declares confidence',places.every(p=>p.confidence),true)
]);
section('Hydrography truth',[
  ok('Uses USGS National Map',/hydro\.nationalmap\.gov/.test(hydro),true),
  ok('Queries GeoJSON',/f','geojson'|f=geojson/.test(hydro)),
  ok('Bounded to Manistee region',/-86\.35,44\.02,-84\.68,44\.95/.test(hydro)),
  ok('No hand-drawn river geometry object',!/riverGeometry\s*:/.test(dataJs),true)
]);
section('Tributary semantics',[
  ok('Pine is tributary',data.waterways.find(w=>w.id==='pine')?.kind==='tributary',true),
  ok('Bear Creek is tributary',data.waterways.find(w=>w.id==='bear-creek')?.kind==='tributary',true),
  ok('Little Manistee is companion',data.waterways.find(w=>w.id==='little-manistee')?.kind==='companion',true),
  ok('Companion distinction visible',/not mislabeled as a direct Manistee River tributary/i.test(html))
]);
section('Live conditions',[
  ok('Five active gauges requested',/04123500.*04124000.*04124200.*04125550.*04125460/s.test(api),true),
  ok('Temperature included',/00010/.test(api)),ok('Discharge included',/00060/.test(api)),ok('Staleness calculated',/age_minutes/.test(api),true)
]);
section('Planner integrity',[
  ok('Graph is built from hydrography',/buildGraph\(features\)/.test(js),true),
  ok('Graph routing is used',/routeGraph\(state\.graphByWaterway/.test(js),true),
  ok('Cross-waterway trips rejected',/refuses cross-waterway routing/i.test(js),true),
  ok('No trustworthy route means no mileage',/No trustworthy NHD route could be built/.test(js),true)
]);
section('Regulation honesty',[
  ok('Current DNR rules linked',/michigan\.gov\/dnr\/things-to-do\/fishing\/fishing-regulations/.test(html),true),
  ok('2026 season date visible',/March 31, 2027/.test(html)),
  ok('No reach-specific legal claim in data',!/artificial flies only|minimum size|daily possession limit/i.test(dataJs),true),
  ok('Explicit verify-current language',/verify the current Michigan DNR regulation map/i.test(html))
]);
section('Mobile usefulness',[
  ok('Responsive breakpoint',/@media\(max-width:900px\)/.test(html)),ok('Mobile map viewport',/height:58vh/.test(html)),
  ok('Nearest access control',/Nearest access/.test(html)),ok('Selected detail scroll handling',/scrollIntoView/.test(js))
]);
section('Search & discovery',[
  ok('Exact SEO title',/Manistee River Map & Trip Planner \| Access, Flows, Fishing/.test(html),true),
  ok('Canonical',/https:\/\/chrisizworski\.com\/manistee-river-map\//.test(html),true),
  ok('WebApplication schema',/"WebApplication"/.test(html)),ok('Dataset schema',/"Dataset"/.test(html)),ok('FAQ schema',/"FAQPage"/.test(html))
]);
section('Field usefulness',[
  ok('Access search',/place-search/.test(html)),ok('Activity filters',/activity-chip/.test(html)),ok('Directions action',/Directions/.test(html)),
  ok('CSV export',/exportCsv/.test(js)),ok('Print guide',/print-guide/.test(html))
]);
section('Graceful degradation',[
  ok('Hydro outage leaves guide usable',/access points and guide still work/.test(js),true),
  ok('USGS outage leaves static tool usable',/Static access, hydrography and source links remain usable/.test(js),true),
  ok('Missing values remain null',/discharge_cfs:null/.test(api),true),
  ok('No boating safety verdict',!/safe to paddle|safe to boat|safe to fish/i.test(js+api),true)
]);

const score=checks.reduce((sum,c)=>sum+c.score,0);
const fatals=checks.flatMap(c=>c.tests.map(t=>({...t,section:c.name}))).filter(t=>t.fatal&&!t.ok);
console.log(`Manistee Field Map benchmark: ${score}/100`);
for(const c of checks)console.log(`${String(c.score).padStart(2)}/10  ${c.name}`);
if(fatals.length){console.error('\nFatal losses:');for(const f of fatals)console.error(`- ${f.section}: ${f.label}`);}
const check=process.argv.includes('--check');
if(check&&(score<95||fatals.length))process.exit(1);
