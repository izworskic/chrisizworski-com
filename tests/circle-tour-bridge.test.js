const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const readJSON=(p)=>JSON.parse(readFileSync(path.join(root,p),'utf8'));
const registry=readJSON('benchmarks/tool-network-registry.json');
const seed=readJSON('config/circle-tour-tool-connections.json');
const committed=readJSON('public/assets/circle-tour-tool-catalog.json');
const ui=require('../public/assets/circle-tour-bridge.js');
const library=import(pathToFileURL(path.join(root,'lib/circle-tour-network.mjs')).href);

test('approved catalog is deterministic, has 31 stops and 4 official road sources',async()=>{
  const {compileCircleTourCatalog}=await library;
  const {catalog,report}=compileCircleTourCatalog(registry,seed);
  assert.deepEqual(catalog,committed,'compiled artifact must match committed source');
  assert.equal(catalog.routeOrder.length,31);
  assert.equal(new Set(catalog.routeOrder).size,31);
  assert.equal(catalog.roadChecks.length,4);
  assert.ok(report.approved>=20);
  assert.equal(catalog.connections.length,report.approved);
  assert.ok(catalog.connections.every(x=>x.source==='curated'||x.source==='registry-approved'));
  assert.ok(catalog.connections.every(x=>x.stopIds.every(id=>catalog.routeOrder.includes(id))));
});

test('new approved specialist automatically joins after tool-registry update, with no Circle Tour source edit',async()=>{
  const {compileCircleTourCatalog}=await library;
  const addition={
    id:'hypothetical-keweenaw-guide',
    name:'Hypothetical Keweenaw Trail Decision Tool',
    canonical:'https://new.chrisizworski.com/keweenaw/',
    geographies:['keweenaw','lake-superior'],
    seasons:[5,6,7,8,9,10],
    circleTour:{approval:'approved',productionVerifiedAt:'2026-11-08',stopIds:['8'],theme:'parks',
      decision:'Choose a suitable Keweenaw trail for my stop.',
      caveat:'Trail access and parking must be verified at the destination.'}
  };
  const updated={...registry,tools:[...registry.tools,addition]};
  const {catalog,report}=compileCircleTourCatalog(updated,seed);
  const unverified={...addition,circleTour:{...addition.circleTour,productionVerifiedAt:undefined}};
  assert.throws(()=>compileCircleTourCatalog({...registry,tools:[...registry.tools,unverified]},seed),/productionVerifiedAt/);
  const entry=catalog.connections.find(x=>x.toolId===addition.id);
  assert.equal(entry.source,'registry-approved');
  assert.deepEqual(entry.stopIds,['8']);
  assert.equal(entry.url,addition.canonical);
  assert.equal(report.sources.registryApproved,1);
  assert.equal(committed.connections.some(x=>x.toolId===addition.id),false);
});

test('candidate publication remains gated; no generic geography guess can appear on the website',async()=>{
  const {compileCircleTourCatalog}=await library;
  const tool={id:'hypothetical-north-shore-candidate',name:'North Shore Sample',
    canonical:'https://chrisizworski.com/unreleased/',geographies:['lake-superior'],
    seasons:[6,7,8,9],circleTour:{approval:'candidate',stopIds:['24'],
      theme:'parks',decision:'Choose a short Minnesota hike for my day.',
      caveat:'This tool has not been independently released and approved.'}};
  const {catalog,report}=compileCircleTourCatalog({...registry,tools:[...registry.tools,tool]},seed);
  assert.equal(catalog.connections.some(x=>x.toolId===tool.id),false);
  assert.ok(report.candidates.some(x=>x.toolId===tool.id));
  const unchecked={...tool,id:'unmapped-regional-tool',circleTour:undefined};
  const again=compileCircleTourCatalog({...registry,tools:[...registry.tools,unchecked]},seed);
  assert.equal(again.catalog.connections.some(x=>x.toolId===unchecked.id),false);
  assert.ok(again.report.candidates.some(x=>x.toolId===unchecked.id));
});

test('invalid stop, unregistered owner, duplicate publication and foreign canonical are rejected',async()=>{
  const {compileCircleTourCatalog}=await library;
  assert.throws(()=>compileCircleTourCatalog(registry,{...seed,connections:[...seed.connections,{...seed.connections[0],stopIds:['99']}]}),/duplicate tool placement/);
  assert.throws(()=>compileCircleTourCatalog(registry,{...seed,connections:[{...seed.connections[0],toolId:'nonexistent-tool'}]}),/unregistered tool/);
  assert.throws(()=>compileCircleTourCatalog(registry,{...seed,connections:[{...seed.connections[0],stopIds:['99']}]}),/invalid Circle Tour stop/);
  const foreign={...registry.tools.find(t=>t.id==='apostle-islands'),canonical:'https://bad.example/launch?token=secret'};
  const changed={...registry,tools:registry.tools.map(t=>t.id===foreign.id?foreign:t)};
  assert.throws(()=>compileCircleTourCatalog(changed,{...seed,connections:[seed.connections[0]]}),/unapproved cross-domain/);
});

test('selected itinerary determines which specialists appear and their order',()=>{
  const all=ui.rankConnections(committed);
  assert.ok(all.total>=20);
  const picked=ui.rankConnections(committed,{selectedIds:['15','11','27'],theme:'parks'});
  assert.ok(picked.items.every(x=>x.theme==='parks'));
  assert.ok(picked.items.every(x=>x.stopIds.some(id=>['15','11','27'].includes(id))));
  const focus=ui.rankConnections(committed,{selectedIds:['15','11','27'],focusStop:'11',theme:'water'});
  assert.ok(focus.total>0);
  assert.ok(focus.items.every(x=>x.stopIds.includes('11')));
  assert.equal(focus.scope.length,1);
  const none=ui.rankConnections(committed,{selectedIds:['24'],theme:'ships'});
  assert.equal(none.total,0,'no substitute specialist should be fabricated for a gap');
});

test('trip month changes priority without turning seasonal metadata into an opening guarantee',()=>{
  const feb=ui.rankConnections(committed,{selectedIds:['11'],date:'2027-02-16'});
  const july=ui.rankConnections(committed,{selectedIds:['11'],date:'2027-07-16'});
  const picturedFeb=feb.items.find(x=>x.toolId==='pictured-rocks');
  const picturedJuly=july.items.find(x=>x.toolId==='pictured-rocks');
  assert.equal(picturedFeb.inSeason,false);
  assert.equal(picturedJuly.inSeason,true);
  assert.equal(feb.items.length,july.items.length,'out-of-season is labeled, not silently deleted');
  assert.equal(ui.safeDate('2027-02-30'),'');
});

test('official road checks remain source links, limited to actual itinerary regions',()=>{
  const mi=ui.roadChecks(committed,{scope:['5','6','10']});
  assert.deepEqual(mi.map(x=>x.region),['mi']);
  const ontario=ui.roadChecks(committed,{scope:['18']});
  assert.deepEqual(ontario.map(x=>x.region),['on']);
  assert.deepEqual(ui.roadChecks(committed,{scope:['13']}).map(x=>x.region),['mi','on']);
  assert.deepEqual(ui.roadChecks(committed,{scope:['21']}).map(x=>x.region),['on','mn']);
  assert.equal(ui.roadChecks(committed,{scope:[]}).length,4);
  assert.equal(ui.safeRoadUrl('https://example.org/traffic'),'');
});

test('return URL preserves existing trip plan without app storage, network or specialist parameters',()=>{
  const base='https://chrisizworski.com/lake-superior-circle-tour/?plan=11%2C15&itinerary=10&direction=clockwise';
  const href=ui.buildReturnHref(base,{date:'2027-07-15',theme:'parks',focusStop:'15'});
  const u=new URL(href);
  assert.equal(u.searchParams.get('plan'),'11,15');
  assert.equal(u.searchParams.get('direction'),'clockwise');
  assert.equal(u.searchParams.get('ctDate'),'2027-07-15');
  assert.equal(u.searchParams.get('ctStop'),'15');
  assert.equal(u.searchParams.get('ctTheme'),'parks');
  assert.equal(ui.safeToolUrl('javascript:alert(1)'),'');
  assert.equal(ui.safeToolUrl('https://example.com/'),'');
});

test('new UI is isolated and preserves the current 31-stop planner, canonical and no-JS routes',()=>{
  const html=readFileSync(path.join(root,'public/lake-superior-circle-tour/index.html'),'utf8');
  const bridge=readFileSync(path.join(root,'public/assets/circle-tour-bridge.js'),'utf8');
  assert.equal((html.match(/class="stop-card"/g)||[]).length,31);
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/"/);
  assert.ok(html.indexOf('id="circle-tour-tool-bridge"')>html.indexOf('class="route-planner"'));
  assert.ok(html.indexOf('id="circle-tour-tool-bridge"')<html.indexOf('id="journey-atlas"'));
  assert.match(html,/id="ctb-fallback"/);
  assert.match(html,/href="\/apostle-islands\/"/);
  assert.match(bridge,/circle-tour:trip-change/);
  assert.match(bridge,/circle-tour:stop-open/);
  assert.doesNotMatch(bridge,/localStorage|sessionStorage|document\.cookie|geolocation|serviceWorker/);
  assert.match(bridge,/The original Circle Tour map, stops and itineraries remain available/);
  assert.match(bridge,/target='_blank'/);
});
