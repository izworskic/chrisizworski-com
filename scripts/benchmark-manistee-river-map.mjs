import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('public/manistee-river-map/index.html','utf8');
const js=fs.readFileSync('public/assets/manistee-river-map.js','utf8');
const dataJs=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const personaJs=fs.readFileSync('public/assets/manistee-river-personas.js','utf8');
const api=fs.readFileSync('api/manistee-river-conditions.js','utf8');
const hydro=fs.readFileSync('api/manistee-river-hydrography.js','utf8');

const dataCtx={window:{},document:{head:{appendChild(){}} ,createElement(){return {dataset:{}}}}};
vm.createContext(dataCtx);vm.runInContext(dataJs,dataCtx);const data=dataCtx.window.MANISTEE_FIELD_DATA;
const personaCtx={window:{MANISTEE_FIELD_DATA:data},document:{readyState:'loading',addEventListener(){}},location:{href:'https://example.test/manistee-river-map/'},history:{replaceState(){}},URL,navigator:{}};
vm.createContext(personaCtx);vm.runInContext(personaJs,personaCtx);const personas=personaCtx.window.MANISTEE_PERSONAS||{};

const checks=[];
function section(name,tests){const passed=tests.filter(t=>t.ok).length;const score=Math.round(10*passed/tests.length);checks.push({name,score,tests});}
function ok(label,value,fatal=false){return {label,ok:Boolean(value),fatal};}
const places=data.places||[],gauges=data.gauges||[],placeIds=new Set(places.map(p=>p.id)),gaugeNames=new Set(gauges.map(g=>g.name));
const personaList=Object.entries(personas);
const personaPlaceRefs=personaList.flatMap(([,p])=>p.placeIds||[]);
const personaLinks=personaList.flatMap(([,p])=>p.links||[]).concat(personaList.flatMap(([,p])=>[p.primary,p.secondary].filter(a=>a?.kind==='link')));

section('Source & map truth',[
  ok('15+ mapped places',places.length>=15,true),
  ok('Every place has HTTPS source',places.every(p=>/^https:\/\//.test(p.source?.url||'')),true),
  ok('Every point declares coordinate source and confidence',places.every(p=>p.locationSource&&p.confidence),true),
  ok('Uses USGS National Map GeoJSON',/hydro\.nationalmap\.gov/.test(hydro)&&(/f','geojson'|f=geojson/.test(hydro)),true),
  ok('No hand-drawn river geometry object',!/riverGeometry\s*:/.test(dataJs),true)
]);
section('Persona coverage',[
  ok('Seven distinct decision personas',personaList.length===7,true),
  ok('Trout angler present',Boolean(personas.trout),true),
  ok('Salmon / steelhead angler present',Boolean(personas.salmon),true),
  ok('Paddler present',Boolean(personas.paddle),true),
  ok('Camper / hiker present',Boolean(personas.camp),true),
  ok('Boat angler present',Boolean(personas.boat),true),
  ok('First timer / family present',Boolean(personas.family),true),
  ok('Accessibility persona present',Boolean(personas.access),true)
]);
section('Persona source integrity',[
  ok('Every persona has a concrete promise',personaList.every(([,p])=>p.promise?.length>35),true),
  ok('Every persona has 3 pre-trip checks',personaList.every(([,p])=>p.checks?.length>=3),true),
  ok('Every persona place ref exists',personaPlaceRefs.every(id=>placeIds.has(id)),true),
  ok('Every named persona gauge exists',personaList.every(([,p])=>!p.gauge||gaugeNames.has(p.gauge)),true),
  ok('Every persona source link is HTTPS',personaLinks.every(l=>/^https:\/\//.test(l?.url||'')),true)
]);
section('Angler decision utility',[
  ok('Trout focuses Upper Manistee',personas.trout?.search==='Upper Manistee'&&personas.trout?.activity==='fish',true),
  ok('Trout sends user to Grayling gauge',personas.trout?.gauge==='Manistee near Grayling',true),
  ok('Salmon focuses Lower Manistee',personas.salmon?.search==='Lower Manistee'&&personas.salmon?.activity==='fish',true),
  ok('Salmon sends user to Wellston gauge',personas.salmon?.gauge==='Manistee near Wellston',true),
  ok('No fabricated live fish-run claim',!/run is (hot|good|excellent)|salmon are running now|steelhead are running now/i.test(personaJs),true)
]);
section('Paddle & boat utility',[
  ok('Paddler opens NHD planner',personas.paddle?.primary?.kind==='plan',true),
  ok('Paddler has upper and Pine choices',(personas.paddle?.placeIds||[]).some(id=>id.startsWith('pine-'))&&(personas.paddle?.placeIds||[]).some(id=>['manistee-bridge','ccc','sharon'].includes(id)),true),
  ok('Pine official source linked',/pine-national-scenic-river-0/.test(personaJs),true),
  ok('Boat persona only promotes source-documented Tippy launch',JSON.stringify(personas.boat?.placeIds)==='["tippy-dam"]',true),
  ok('No safety verdict from flow',!/safe to paddle|safe to boat|safe to launch|navigation is safe/i.test(personaJs+js+api),true)
]);
section('Camp, family & accessibility utility',[
  ok('Camp persona includes Seaton and Red Bridge',(personas.camp?.placeIds||[]).includes('seaton-creek')&&(personas.camp?.placeIds||[]).includes('red-bridge'),true),
  ok('Family persona uses curated first-trip places',personas.family?.primary?.kind==='curated'&&(personas.family?.placeIds||[]).length>=3,true),
  ok('Accessibility persona limited to agency-backed Tippy',JSON.stringify(personas.access?.placeIds)==='["tippy-dam"]',true),
  ok('DNR accessible-fishing source linked',/michigan\.gov\/dnr\/about\/accessibility\/fishing/.test(personaJs),true),
  ok('No unsupported accessibility labels on other points',!/accessible.*(High Bridge|Rainbow Bend|Blacksmith|Deward|CCC Bridge)/i.test(personaJs),true)
]);
section('Conditions & regulation honesty',[
  ok('Five active gauges requested',/04123500.*04124000.*04124200.*04125550.*04125460/s.test(api),true),
  ok('Temperature, discharge and staleness included',/00010/.test(api)&&/00060/.test(api)&&/age_minutes/.test(api),true),
  ok('Current DNR rules linked',/michigan\.gov\/dnr\/things-to-do\/fishing\/fishing-regulations/.test(html+personaJs),true),
  ok('No reach-specific legal claim in data',!/artificial flies only|minimum size|daily possession limit/i.test(dataJs),true),
  ok('No hard-coded current site-open claim',!/open now|currently open|site is open today/i.test(personaJs),true)
]);
section('Planner integrity',[
  ok('Graph is built from hydrography',/buildGraph\(features\)/.test(js),true),
  ok('Graph routing is used',/routeGraph\(state\.graphs\[from\.waterway\],from,to\)/.test(js),true),
  ok('Cross-waterway trips rejected',/refuses cross-waterway routing/i.test(js),true),
  ok('No trustworthy route means no mileage',/No trustworthy NHD route could be built/.test(js),true),
  ok('Persona paddler reuses core planner, not second mileage engine',!/function\s+(route|distance|mileage).*persona/i.test(personaJs),true)
]);
section('Mobile, sharing & discovery',[
  ok('Core responsive breakpoint',/@media\(max-width:900px\)/.test(html),true),
  ok('Persona layer has mobile treatment',/@media\(max-width:900px\)/.test(personaJs),true),
  ok('Persona state is shareable by URL',/searchParams\.set\('persona'/.test(personaJs)&&/searchParams\.get\('persona'/.test(personaJs),true),
  ok('Core canonical and schemas remain',/https:\/\/chrisizworski\.com\/manistee-river-map\//.test(html)&&/"WebApplication"/.test(html)&&/"Dataset"/.test(html),true),
  ok('Persona chooser asks the user job first',/What are you here to do\?/.test(personaJs),true)
]);
section('Graceful degradation',[
  ok('Persona enhancement loads additively',/persona layer is intentionally additive/i.test(dataJs),true),
  ok('Core works without persona module',!html.includes('manistee-river-personas.js'),true),
  ok('Hydro outage leaves guide usable',/access points and guide still work/.test(js),true),
  ok('USGS outage leaves static tool usable',/Static access, hydrography and source links remain usable/.test(js),true),
  ok('Unknown readings stay unknown',/discharge_cfs:null/.test(api),true)
]);

const score=checks.reduce((sum,c)=>sum+c.score,0);
const fatals=checks.flatMap(c=>c.tests.map(t=>({...t,section:c.name}))).filter(t=>t.fatal&&!t.ok);
console.log(`Manistee persona-max benchmark: ${score}/100`);
for(const c of checks)console.log(`${String(c.score).padStart(2)}/10  ${c.name}`);
if(fatals.length){console.error('\nFatal persona/product losses:');for(const f of fatals)console.error(`- ${f.section}: ${f.label}`);}
const check=process.argv.includes('--check');
if(check&&(score<95||fatals.length))process.exit(1);
