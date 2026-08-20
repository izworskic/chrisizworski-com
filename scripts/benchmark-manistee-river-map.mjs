import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('public/manistee-river-map/index.html','utf8');
const js=fs.readFileSync('public/assets/manistee-river-map.js','utf8');
const dataJs=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const coverageJs=fs.readFileSync('public/assets/manistee-river-coverage.js','utf8');
const coverageUiJs=fs.readFileSync('public/assets/manistee-river-coverage-ui.js','utf8');
const personaJs=fs.readFileSync('public/assets/manistee-river-personas.js','utf8');
const api=fs.readFileSync('api/manistee-river-conditions.js','utf8');
const hydro=fs.readFileSync('api/manistee-river-hydrography.js','utf8');

const dataCtx={window:{},document:{head:{appendChild(){}},createElement(){return {dataset:{}}}}};
vm.createContext(dataCtx);
vm.runInContext(dataJs,dataCtx);
vm.runInContext(coverageJs,dataCtx);
const data=dataCtx.window.MANISTEE_FIELD_DATA;
const personaCtx={window:{MANISTEE_FIELD_DATA:data},document:{readyState:'loading',addEventListener(){}},location:{href:'https://example.test/manistee-river-map/'},history:{replaceState(){}},URL,navigator:{}};
vm.createContext(personaCtx);vm.runInContext(personaJs,personaCtx);const personas=personaCtx.window.MANISTEE_PERSONAS||{};

const checks=[];
function section(name,tests){const passed=tests.filter(t=>t.ok).length;const score=Math.round(10*passed/tests.length);checks.push({name,score,tests});}
function ok(label,value,fatal=false){return {label,ok:Boolean(value),fatal};}
const places=data.places||[],services=data.services||[],coverage=data.coverage||{},gauges=data.gauges||[];
const placeIds=new Set(places.map(p=>p.id)),serviceIds=new Set(services.map(s=>s.id)),gaugeNames=new Set(gauges.map(g=>g.name));
const personaList=Object.entries(personas);
const personaPlaceRefs=personaList.flatMap(([,p])=>p.placeIds||[]);
const personaLinks=personaList.flatMap(([,p])=>p.links||[]).concat(personaList.flatMap(([,p])=>[p.primary,p.secondary].filter(a=>a?.kind==='link')));
const canonical=coverage.canonical||{};
const canonicalIds=Object.values(canonical).flat();
const camps=places.filter(p=>p.activities?.includes('camp'));
const scenic=places.filter(p=>p.activities?.includes('scenic')||['scenic','trailhead','landmark'].includes(p.type));
const guides=services.filter(s=>s.kind?.includes('guide')&&s.kind!=='guide-directory');
const liveries=services.filter(s=>/livery|outfitter/.test(s.kind||''));
const inventory=coverage.inventoryOnly||[];
const duplicates=(arr)=>arr.filter((x,i)=>arr.indexOf(x)!==i);
const near=(a,b,t=.00002)=>Math.abs(Number(a)-Number(b))<=t;

section('Comprehensive place corpus',[
  ok('53+ mapped places',places.length>=53,true),
  ok('20+ verified service/directory records',services.length>=20,true),
  ok('8+ audited unpinned or legacy records',inventory.length>=8,true),
  ok('No duplicate place IDs',duplicates(places.map(p=>p.id)).length===0,true),
  ok('No duplicate service IDs',duplicates(services.map(s=>s.id)).length===0,true),
  ok('Every place has HTTPS source',places.every(p=>/^https:\/\//.test(p.source?.url||'')),true),
  ok('Every mapped point declares coordinate source/confidence',places.every(p=>p.locationSource&&p.confidence),true),
  ok('Every service has HTTPS source and audit date',services.every(s=>/^https:\/\//.test(s.url||'')&&/^20\d\d-\d\d-\d\d$/.test(s.checked||'')),true)
]);

section('Canonical public-access spine',[
  ok('Upper canonical list has 24+ stops',(canonical.upper||[]).length>=24,true),
  ok('Middle canonical list has 10+ stops',(canonical.middle||[]).length>=10,true),
  ok('Lower canonical list has 11+ stops',(canonical.lower||[]).length>=11,true),
  ok('Pine canonical list has all five USFS sites',(canonical.pine||[]).length>=5,true),
  ok('Every canonical ID resolves to a mapped place',canonicalIds.length>=50&&canonicalIds.every(id=>placeIds.has(id)),true),
  ok('Upper spine includes M-72, CCC, Sharon, Sand Banks and Smithville',['m72-public','ccc','sharon','sand-banks','smithville'].every(id=>placeIds.has(id)),true),
  ok('US-131 / Old US-131 / Baxter / Harvey all mapped',['us131-access','old-us131-sfcg','baxter-bridge','harvey-bridge'].every(id=>placeIds.has(id)),true),
  ok('Tippy-to-Rainbow lower corridor represented',['tippy-lower-launch','high-bridge','blacksmith','udell-rollways','bear-creek-access','rainbow-bend'].every(id=>placeIds.has(id)),true)
]);

section('Official lower/Pine coordinate truth',[
  ok('Suicide Bend matches USFS brochure',placeIds.has('suicide-bend')&&near(places.find(p=>p.id==='suicide-bend')?.lat,44.269624)&&near(places.find(p=>p.id==='suicide-bend')?.lon,-85.942586),true),
  ok('Tunk Hole matches USFS brochure',placeIds.has('tunk-hole')&&near(places.find(p=>p.id==='tunk-hole')?.lat,44.22936)&&near(places.find(p=>p.id==='tunk-hole')?.lon,-85.947431),true),
  ok('Sawdust Hole matches USFS brochure',placeIds.has('sawdust-hole')&&near(places.find(p=>p.id==='sawdust-hole')?.lat,44.269311)&&near(places.find(p=>p.id==='sawdust-hole')?.lon,-85.951683),true),
  ok('High Bridge matches USFS brochure',near(places.find(p=>p.id==='high-bridge')?.lat,44.268242)&&near(places.find(p=>p.id==='high-bridge')?.lon,-86.015563),true),
  ok('Blacksmith matches USFS brochure',near(places.find(p=>p.id==='blacksmith')?.lat,44.259178)&&near(places.find(p=>p.id==='blacksmith')?.lon,-86.033027),true),
  ok('Udell Rollways matches USFS brochure',near(places.find(p=>p.id==='udell-rollways')?.lat,44.258357)&&near(places.find(p=>p.id==='udell-rollways')?.lon,-86.080124),true),
  ok('Bear Creek and Rainbow Bend match USFS brochure',near(places.find(p=>p.id==='bear-creek-access')?.lat,44.291727)&&near(places.find(p=>p.id==='rainbow-bend')?.lat,44.29352),true),
  ok('Pine has Dobson, Elm, Peterson North/South and Low Bridge',['dobson-bridge','pine-elm-flats','pine-peterson','peterson-south','pine-low-bridge'].every(id=>placeIds.has(id)),true)
]);

section('Camp, scenic & service breadth',[
  ok('12+ camping-capable mapped places',camps.length>=12,true),
  ok('15+ scenic/trail/landmark places',scenic.length>=15,true),
  ok('9+ fishing guide/outfitter records',guides.length>=9,true),
  ok('8+ paddle livery/outfitter records',liveries.length>=8,true),
  ok('Hawkins and Schmidt guide coverage included',['hawkins-outfitters','schmidt-outfitters'].every(id=>serviceIds.has(id)),true),
  ok('Shel-Haven and Pine operators included',['shel-haven','pine-river-paddlesports','hoxeyville-outfitters','horinas','sportsmans-port'].every(id=>serviceIds.has(id)),true),
  ok('Private landing caution is explicit',/private.*landing/i.test(coverageJs)&&/not.*public/i.test(coverageJs),true),
  ok('Coverage UI exposes services and audit inventory',/Guides, liveries & outfitters/.test(coverageUiJs)&&/Coverage audit/.test(coverageUiJs),true)
]);

section('Persona & source integrity',[
  ok('Seven distinct decision personas',personaList.length===7,true),
  ok('Core personas present',Boolean(personas.trout&&personas.salmon&&personas.paddle&&personas.camp&&personas.boat&&personas.family&&personas.access),true),
  ok('Every persona has a concrete promise',personaList.every(([,p])=>p.promise?.length>35),true),
  ok('Every persona has 3 pre-trip checks',personaList.every(([,p])=>p.checks?.length>=3),true),
  ok('Every persona place ref exists',personaPlaceRefs.every(id=>placeIds.has(id)),true),
  ok('Every named persona gauge exists',personaList.every(([,p])=>!p.gauge||gaugeNames.has(p.gauge)),true),
  ok('Every persona source link is HTTPS',personaLinks.every(l=>/^https:\/\//.test(l?.url||'')),true),
  ok('Coverage method and honesty claim are explicit',coverage.method?.length>80&&/not a warranty/i.test(coverage.claim||''),true)
]);

section('Angler, paddle & boat utility',[
  ok('Trout focuses Upper Manistee',personas.trout?.search==='Upper Manistee'&&personas.trout?.activity==='fish',true),
  ok('Trout sends user to Grayling gauge',personas.trout?.gauge==='Manistee near Grayling',true),
  ok('Salmon focuses Lower Manistee',personas.salmon?.search==='Lower Manistee'&&personas.salmon?.activity==='fish',true),
  ok('Salmon sends user to Wellston gauge',personas.salmon?.gauge==='Manistee near Wellston',true),
  ok('Paddler opens NHD planner',personas.paddle?.primary?.kind==='plan',true),
  ok('Paddler has Manistee and Pine choices',(personas.paddle?.placeIds||[]).some(id=>id.startsWith('pine-'))&&(personas.paddle?.placeIds||[]).some(id=>['manistee-bridge','ccc','sharon'].includes(id)),true),
  ok('No fabricated live fish-run claim',!/run is (hot|good|excellent)|salmon are running now|steelhead are running now/i.test(personaJs),true),
  ok('No safety verdict from flow',!/safe to paddle|safe to boat|safe to launch|navigation is safe/i.test(personaJs+js+api),true)
]);

section('Conditions & regulation honesty',[
  ok('Five active gauges requested',/04123500.*04124000.*04124200.*04125550.*04125460/s.test(api),true),
  ok('Temperature, discharge and staleness included',/00010/.test(api)&&/00060/.test(api)&&/age_minutes/.test(api),true),
  ok('Current DNR rules linked',/michigan\.gov\/dnr\/things-to-do\/fishing\/fishing-regulations/.test(html+personaJs),true),
  ok('No reach-specific legal claim in base data',!/artificial flies only|minimum size|daily possession limit/i.test(dataJs),true),
  ok('No hard-coded current site-open claim',!/open now|currently open|site is open today/i.test(personaJs+coverageJs),true),
  ok('High Bridge 2026 route caution retained',places.find(p=>p.id==='high-bridge')?.status==='route-caution',true),
  ok('Legacy/unresolved accesses are audited, not guessed',inventory.some(x=>/Missaukee Bridge/.test(x.name))&&inventory.some(x=>/Sherman/.test(x.name)),true),
  ok('Closed/retired sites have exclusions',(coverage.exclusions||[]).some(x=>/Chase Creek/.test(x.name))&&(coverage.exclusions||[]).some(x=>/Edgetts/.test(x.name)),true)
]);

section('Planner integrity',[
  ok('Graph is built from hydrography',/buildGraph\(features\)/.test(js),true),
  ok('Graph routing is used',/routeGraph\(state\.graphs\[from\.waterway\],from,to\)/.test(js),true),
  ok('Cross-waterway trips rejected',/refuses cross-waterway routing/i.test(js),true),
  ok('No trustworthy route means no mileage',/No trustworthy NHD route could be built/.test(js),true),
  ok('Planner only admits access/access-camp types',/p\.type==='access'\|\|p\.type==='access-camp'/.test(js),true),
  ok('Private liveries are services, never planner places',!placeIds.has('shel-haven')&&!placeIds.has('smithville-landing'),true),
  ok('Backwater boat launches are not simple river endpoints',places.filter(p=>['woodpecker-creek','burtons-landing','robinson-backwater','first-street-ramp'].includes(p.id)).every(p=>p.type!=='access'&&p.type!=='access-camp'),true),
  ok('Persona paddler reuses core planner',!/function\s+(route|distance|mileage).*persona/i.test(personaJs),true)
]);

section('Mobile, sharing & discovery',[
  ok('Core responsive breakpoint',/@media\(max-width:900px\)/.test(html),true),
  ok('Persona layer has mobile treatment',/@media\(max-width:900px\)/.test(personaJs),true),
  ok('Persona state is shareable by URL',/searchParams\.set\('persona'/.test(personaJs)&&/searchParams\.get\('persona'/.test(personaJs),true),
  ok('Core canonical and schemas remain',/https:\/\/chrisizworski\.com\/manistee-river-map\//.test(html)&&/"WebApplication"/.test(html)&&/"Dataset"/.test(html),true),
  ok('Coverage layer loads before map engine',html.indexOf('manistee-river-coverage.js')>0&&html.indexOf('manistee-river-coverage.js')<html.indexOf('manistee-river-map.js'),true),
  ok('Coverage UI loads after map engine',html.indexOf('manistee-river-coverage-ui.js')>html.indexOf('manistee-river-map.js'),true),
  ok('Service directory is source-linked',/Operator \/ source/.test(coverageUiJs),true),
  ok('Persona chooser asks user job first',/What are you here to do\?/.test(personaJs),true)
]);

section('Graceful degradation',[
  ok('Core coverage is additive',/const D=window\.MANISTEE_FIELD_DATA;if\(!D\)return/.test(coverageJs),true),
  ok('Core works without persona/depth optional modules',!html.includes('manistee-river-personas.js')&&!html.includes('manistee-river-live-depth.js'),true),
  ok('Hydro outage leaves guide usable',/access points and guide still work/.test(js),true),
  ok('USGS outage leaves static tool usable',/Static access, hydrography and source links remain usable/.test(js),true),
  ok('Unknown readings stay unknown',/discharge_cfs:null/.test(api),true),
  ok('Coverage UI is defensive when panel is absent',/if\(!panel\|\|/.test(coverageUiJs),true),
  ok('No service is silently promoted into mapped places',services.every(s=>!placeIds.has(s.id)),true),
  ok('USGS National Map hydrography remains authoritative',/hydro\.nationalmap\.gov/.test(hydro)&&(/f','geojson'|f=geojson/.test(hydro)),true)
]);

const score=checks.reduce((sum,c)=>sum+c.score,0);
const fatals=checks.flatMap(c=>c.tests.map(t=>({...t,section:c.name}))).filter(t=>t.fatal&&!t.ok);
console.log(`Manistee comprehensive-field benchmark: ${score}/100`);
console.log(`Coverage: ${places.length} mapped places · ${services.length-1} operators · ${inventory.length} audited unpinned/legacy records`);
for(const c of checks)console.log(`${String(c.score).padStart(2)}/10  ${c.name}`);
if(fatals.length){console.error('\nFatal Manistee coverage/product losses:');for(const f of fatals)console.error(`- ${f.section}: ${f.label}`);}
const check=process.argv.includes('--check');
if(check&&(score<95||fatals.length))process.exit(1);
