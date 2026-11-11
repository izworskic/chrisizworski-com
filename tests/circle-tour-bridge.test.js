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

test('Foundry: a custom trip yields one stop-specific decision and a next planned stop',()=>{
  const result=ui.planNextDecision(committed,{selectedIds:['11','15','18'],theme:'water',date:'2027-07-18'});
  assert.equal(result.kind,'next-check');
  assert.equal(result.stopId,'11');
  assert.equal(result.primary.toolId,'pictured-rocks');
  assert.equal(result.position,1);
  assert.equal(result.total,3);
  assert.equal(result.nextStopId,'15');
  assert.ok(result.primary.caveat.length>12);
  assert.deepEqual(result.orderedStops,['11','15','18']);
});
test('Foundry: only an actually applied published direction can reorder the selected trip',()=>{
  const custom=ui.planNextDecision(committed,{selectedIds:['11','15','18'],direction:'clockwise',theme:'parks'});
  assert.deepEqual(custom.orderedStops,['11','15','18']);
  assert.equal(custom.direction,'');
  const applied=ui.planNextDecision(committed,{selectedIds:['18','15','11'],itinerary:'10',direction:'clockwise'});
  assert.deepEqual(applied.orderedStops,['18','15','11']);
  const saved=ui.planNextDecision(committed,{selectedIds:['11','15','18'],itinerary:'10',direction:'clockwise'});
  assert.deepEqual(saved.orderedStops,['11','15','18'],'original saved order must not reverse twice');
  assert.equal(applied.nextStopId,'15');
  assert.equal(applied.position,1);
});
test('Foundry: unserved interest remains an honest coverage gap with reversible discovery',()=>{
  const blank=ui.planNextDecision(committed,{selectedIds:['11','15'],focusStop:'11',theme:'ships'});
  assert.equal(blank.kind,'no-specialist');
  assert.equal(blank.primary,null);
  assert.equal(blank.otherThemesAvailable,true);
  const retry=ui.planNextDecision(committed,{selectedIds:['11','15'],focusStop:'11',theme:'all'});
  assert.equal(retry.kind,'next-check');
});
test('Foundry: explicit out-of-trip focus and seasonal disclaimers cannot become invented openings',()=>{
  const focus=ui.planNextDecision(committed,{selectedIds:['15','18'],focusStop:'11',theme:'water'});
  assert.equal(focus.inSavedTrip,false);
  assert.equal(focus.nextStopId,'');
  assert.equal(focus.stopId,'11');
  const winter=ui.planNextDecision(committed,{selectedIds:['18'],date:'2027-02-20',theme:'parks'});
  assert.equal(winter.primary.toolId,'pukaskwa-national-park');
  assert.equal(winter.primary.inSeason,false);
});
test('Foundry: no selected itinerary invites an explicit stop rather than inventing a driving priority',()=>{
  const choice=ui.planNextDecision(committed,{selectedIds:[],focusStop:'',theme:'water'});
  assert.equal(choice.kind,'choose-stop');
  assert.equal(choice.primary,null);
  assert.equal(choice.stopId,'');
  assert.equal(choice.total,0);
  const html=readFileSync(path.join(root,'public/lake-superior-circle-tour/index.html'),'utf8');
  assert.match(html,/id="ctb-decision"/);
  assert.match(html,/id="ctb-compare"/);
  assert.match(html,/id="ctb-fallback"/);
});


test('Place & Story pilot has verified site-exact image rights, documentary context and a practical choice for each park',()=>{
  const {stories,selectPlaceStory}=require('../public/assets/circle-tour-place-story-data.js');
  assert.deepEqual(Object.keys(stories).sort((a,b)=>Number(a)-Number(b)),['3','6','11','15','18','20','23','26','27']);
  for(const id of ['3','6','11','15','18','20','23','26','27']){
    const place=selectPlaceStory(id);
    assert.equal(place.placeId,id);
    assert.ok(place.story.length>=150,'interpretation should convey a distinctive real place');
    assert.ok(place.character.length>=65,'visitor scale or access distinction required');
    assert.ok(['www.ontarioparks.ca','parks.canada.ca','www.nps.gov','www.michigan.gov','www.dnr.state.mn.us','www.visitcookcounty.com'].includes(new URL(place.sourceURL).hostname));
    assert.equal(place.photos.length,2);
    if(id==='26')assert.equal(ui.planNextDecision(committed,{selectedIds:[id]}).kind,'no-specialist','do not invent a Tettegouche tool');
    else assert.ok(ui.planNextDecision(committed,{selectedIds:[id]}).primary,'approved specialist must still win');
    for(const p of place.photos){
      assert.equal(p.placeId,id);
      assert.equal(p.status,'verified-licensed');
      assert.match(p.imageURL,/^https:\/\/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\//);
      assert.match(p.sourceURL,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      assert.ok(['CC0 1.0','CC BY-SA 4.0','CC BY 2.0','CC BY-SA 3.0','CC BY-SA 2.0','CC BY 4.0','Public domain (NPS)','Public domain (author dedication)'].includes(p.licenseName));
      assert.match(p.licenseURL,/^https:\/\/creativecommons\.org\//);
      assert.ok(p.photographer.length>3&&p.alt.length>30&&p.caption.length>30);
      assert.match(p.captureDate,/^(19|20)\d\d-\d\d-\d\d$/);
      assert.ok(p.width>=600&&p.height>=500);
    }
  }
  assert.equal(selectPlaceStory('24'),null,'no generic photo substituted for an unresearched park');
  assert.equal(selectPlaceStory('__proto__'),null,'only own approved place IDs may resolve');
});

test('Place & Story script runs before decision renderer and remains within existing bridge only',()=>{
  const html=readFileSync(path.join(root,'public/lake-superior-circle-tour/index.html'),'utf8');
  const bridge=readFileSync(path.join(root,'public/assets/circle-tour-bridge.js'),'utf8');
  assert.ok(html.indexOf('circle-tour-place-story-data.js')<html.indexOf('circle-tour-bridge.js'));
  assert.match(bridge,/function renderPlaceStory\(model,host\)/);
  assert.match(bridge,/renderPlaceStory\(model,host\)/);
  assert.match(bridge,/img\.loading='lazy'/);
  assert.match(bridge,/img\.addEventListener\('error'/);
  assert.match(bridge,/place-story-source-open/);
  assert.doesNotMatch(bridge,/place-story-view/,'rendering is not a measured on-screen photo view');
});

test('new U.S. shore stories distinguish true places and visitor commitments',()=>{
 const {selectPlaceStory}=require('../public/assets/circle-tour-place-story-data.js');
 for(const [id,clues] of [['3',['Meyers Beach','Devils Island']],['6',['Lake of the Clouds','Presque Isle River']],['11',['Miners Castle','Chapel Rock']]]){
  const story=selectPlaceStory(id),prose=story.story+' '+story.character;
  for(const clue of clues)assert.ok(prose.includes(clue),'missing place fact: '+clue);
  assert.equal(story.photos.length,2);
  assert.ok(story.photos.every(p=>p.placeId===id&&p.caption.includes('display cropped.')));
  assert.equal(ui.planNextDecision(committed,{selectedIds:[id]}).kind,'next-check');
 }
 assert.equal(selectPlaceStory('24'),null);
});

test('North Shore stories preserve real geography, distinct admission and no invented specialist',()=>{
 const {selectPlaceStory}=require('../public/assets/circle-tour-place-story-data.js');
 for(const [id,clues,sourceHost] of [
  ['23',["Artist's Point","Gunflint Trail","harbor"],'www.visitcookcounty.com'],
  ['26',['Shovel Point','High Falls','300 stairs'],'www.dnr.state.mn.us'],
  ['27',['Pebble Beach','Minnesota Historical Society','separate'],'www.dnr.state.mn.us']
 ]){
  const story=selectPlaceStory(id),prose=story.story+' '+story.character;
  assert.ok(story.story.length>=190&&story.character.length>=160);
  for(const phrase of clues)assert.ok(prose.includes(phrase),'missing factual distinction: '+id+' '+phrase);
  assert.equal(new URL(story.sourceURL).hostname,sourceHost);
  assert.ok(story.photos.every(p=>p.placeId===id&&p.caption.endsWith('display cropped.')));
  assert.ok(story.photos.every(p=>new URL(p.imageURL).hostname==='thumb.wikimedia.org'));
 }
 assert.equal(ui.planNextDecision(committed,{selectedIds:['26']}).primary,null);
 assert.equal(ui.planNextDecision(committed,{selectedIds:['27']}).kind,'next-check');
 assert.equal(selectPlaceStory('24'),null);
 assert.equal(selectPlaceStory('25'),null);
});

test('eight original uncovered stops offer visitor source choices but never invented specialists',()=>{
 const ids=['2','4','17','19','21','24','25','26'];
 const allowed=new Set(['www.superiorwi.gov','www.visitashland.com','whiteriver.ca','www.nipigon.net','www.dnr.state.mn.us','files.dnr.state.mn.us','www.lutsen.com']);
 assert.deepEqual(Object.keys(ui.officialStops).sort((a,b)=>Number(a)-Number(b)),ids.sort((a,b)=>Number(a)-Number(b)));
 for(const id of ids){
  const decision=ui.planNextDecision(committed,{selectedIds:[id]});
  assert.equal(decision.kind,'no-specialist','an official link must not become an independent tool at '+id);
  assert.equal(decision.primary,null);
  assert.ok(!committed.connections.some(c=>c.stopIds.includes(id)),'source not part of the catalog');
  const guide=ui.officialStopGuide(id);
  assert.ok(guide.question.length>35&&guide.context.length>110&&guide.caution.length>68);
  for(const link of [guide.url,...(guide.extraSources||[]).map(x=>x.url)]){
   const url=new URL(link);
   assert.equal(url.protocol,'https:');assert.ok(allowed.has(url.hostname));
   assert.equal(url.username,'');assert.equal(url.password,'');
  }
 }
 assert.equal(ui.officialStopGuide('11'),null);
 assert.equal(ui.officialStopGuide('__proto__'),null);
 assert.equal(ui.officialStopGuide('99'),null);
});
test('North Shore unserved stops distinguish source-verified hikes, resort operating checks and preserved page ownership',()=>{
 const cascade=ui.officialStopGuide('24'),temperance=ui.officialStopGuide('25');
 assert.match(cascade.context,/0\.5 mile/);
 assert.match(cascade.context,/3\.5 miles/);
 assert.match(cascade.extraSources[0].url,/spk00133\.pdf/);
 assert.match(temperance.context,/0\.25 mile one-way/);
 assert.match(temperance.context,/three miles one-way/);
 assert.match(temperance.caution,/not to swim/);
 assert.equal(temperance.extraSources[0].url,'https://www.lutsen.com/mountain-info/hours-of-operation');
 const original=readFileSync(path.join(root,'public/lake-superior-circle-tour/index.html'),'utf8');
 const bridge=readFileSync(path.join(root,'public/assets/circle-tour-bridge.js'),'utf8');
 assert.equal((original.match(/class="stop-card"/g)||[]).length,31);
 assert.match(bridge,/if\(model\.kind==='next-check'\)/);
 assert.match(bridge,/const guide=guideForInterest\(model\.stopId,model\.theme\)/);
 assert.equal(ui.guideForInterest('24','ships'),null,'ships interest cannot promote a park source');
 assert.ok(ui.guideForInterest('24','falls'),'original park choice remains reachable');
 assert.match(bridge,/official-stop-source-open/);
});

test('eight stop arrival desk has researched destinations, source links and no invented coordinates',()=>{
 const stopIds=['2','4','17','19','21','24','25','26'];
 const expectedCounts={'2':1,'4':1,'17':1,'19':2,'21':1,'24':2,'25':2,'26':1};
 const trusted=new Set(['www.superiorwi.gov','www.visitashland.com','www.whiteriver.ca','www.parcs.canada.ca',
  'files.dnr.state.mn.us','olmwebservices.dot.state.mn.us','www.lutsen.com','www.dnr.state.mn.us']);
 let addresses=0,lookups=0;
 for(const id of stopIds){
  const locations=ui.officialArrivals(id);
  assert.equal(locations.length,expectedCounts[id]);
  assert.equal(ui.planNextDecision(committed,{selectedIds:[id]}).kind,'no-specialist');
  for(const item of locations){
   assert.ok(item.label.length>=22&&item.note.length>=95);
   assert.ok(item.sourceLabel.length>=25);
   assert.ok(trusted.has(new URL(item.sourceUrl).hostname),item.sourceUrl);
   assert.equal(new URL(item.sourceUrl).protocol,'https:');
   assert.ok(['address','search'].includes(item.kind));
   const url=new URL(ui.arrivalMapUrl(item));
   assert.equal(url.protocol,'https:');
   assert.equal(url.hostname,'www.google.com');
   assert.equal(url.searchParams.get('api'),'1');
   if(item.kind==='address'){
    addresses++;
    assert.equal(url.pathname,'/maps/dir/');
    assert.equal(url.searchParams.get('destination'),item.destination);
    assert.equal(url.searchParams.get('travelmode'),'driving');
   }else{
    lookups++;
    assert.equal(url.pathname,'/maps/search/');
    assert.equal(url.searchParams.get('query'),item.destination);
    assert.ok(!url.searchParams.has('destination'),'unverified place is a search, not precise route directions');
   }
   assert.equal(url.searchParams.has('origin'),false,'never assume traveler current location');
   assert.ok(!url.searchParams.has('destination_place_id'),'no fabricated Google place IDs');
  }
 }
 assert.equal(addresses,4);
 assert.equal(lookups,7);
 assert.equal(ui.officialArrivals('11').length,0,'independent specialist still wins');
 assert.equal(ui.officialArrivals('27').length,0);
 assert.equal(ui.officialArrivals('__proto__').length,0);
 assert.equal(ui.arrivalMapUrl({kind:'address',destination:'x'}),'');
 assert.equal(ui.arrivalMapUrl({kind:'untrusted',destination:'Somewhere, ON'}),'');
});
test('North Shore arrival desk preserves park versus resort and the documented construction limit',()=>{
 const nipigon=ui.officialArrivals('19');
 assert.match(nipigon[0].note,/Marina/);
 assert.match(nipigon[1].note,/Third Street/);
 assert.match(nipigon[1].note,/return ride/);
 const cascade=ui.officialArrivals('24');
 assert.match(cascade[0].note,/construction in 2026/);
 assert.match(cascade[0].note,/do not assume/);
 assert.match(cascade[1].note,/not the same entrance/);
 const temperance=ui.officialArrivals('25');
 assert.match(temperance[0].note,/northeast side/);
 assert.match(temperance[0].note,/not a surveyed parking pin/);
 assert.match(temperance[1].destination,/467 Ski Hill Road/);
 assert.match(temperance[1].sourceUrl,/lutsen\.com/);
 assert.match(ui.officialArrivals('21')[0].destination,/9393 East Highway 61/);
 assert.match(ui.officialArrivals('26')[0].destination,/5702 Highway 61/);
 const bridge=readFileSync(path.join(root,'public/assets/circle-tour-bridge.js'),'utf8');
 assert.match(bridge,/arrival-map-open/);
 assert.match(bridge,/if\(guide\)\{/);
 assert.match(bridge,/renderPlaceStory\(model,host\)/);
});

test('Foundry: arrival choice switches one map and shares state without leaking across stops',()=>{
  const a=ui.chooseArrival('19',0),b=ui.chooseArrival('19',1);
  assert.equal(a.stopId,'19');assert.equal(a.index,0);assert.equal(a.total,2);
  assert.match(a.arrival.label,/Nipigon Marina/);
  assert.match(b.arrival.label,/Red Rock/);
  assert.match(b.arrival.note,/2.6 km return/);
  assert.match(b.arrival.note,/10.1 km one way/);
  assert.notEqual(a.mapUrl,b.mapUrl);
  assert.equal(new URL(b.arrival.sourceUrl).hostname,'www.parcs.canada.ca');
  assert.equal(new URL(b.mapUrl).pathname,'/maps/search/');
  assert.equal(ui.chooseArrival('19',99).index,0);
  assert.equal(ui.chooseArrival('25',-1).index,0);
  assert.equal(ui.chooseArrival('24','bad').index,0);
  assert.equal(ui.chooseArrival('11',1),null);
  const url=new URL(ui.buildReturnHref('https://chrisizworski.com/lake-superior-circle-tour/?plan=19%2C25&direction=clockwise',
    {focusStop:'19',arrivalChoices:{'19':1},theme:'all'}));
  assert.equal(url.searchParams.get('ctStop'),'19');
  assert.equal(url.searchParams.get('ctArrival'),'1');
  assert.equal(url.searchParams.get('plan'),'19,25');
  assert.equal(url.searchParams.get('direction'),'clockwise');
  const next=new URL(ui.buildReturnHref(url.href,{focusStop:'25',arrivalChoices:{'19':1},theme:'all'}));
  assert.equal(next.searchParams.get('ctStop'),'25');
  assert.equal(next.searchParams.has('ctArrival'),false);
  const again=new URL(ui.buildReturnHref(next.href,{focusStop:'19',arrivalChoices:{'19':1,'25':0},theme:'all'}));
  assert.equal(again.searchParams.get('ctArrival'),'1');
});
test('Experience OS: visitor interest, parking and operator claims remain source-bounded',()=>{
  assert.equal(ui.guideForInterest('25','ships'),null);
  assert.equal(ui.guideForInterest('24','water'),null);
  assert.ok(ui.guideForInterest('25','falls'));
  assert.ok(ui.guideForInterest('4','history'));
  assert.ok(ui.guideForInterest('19','water'));
  assert.equal(ui.guideForInterest('__proto__','parks'),null);
  const falls=ui.chooseArrival('24',0),office=ui.chooseArrival('24',1);
  assert.notEqual(falls.mapUrl,office.mapUrl);
  assert.match(falls.arrival.note,/construction in 2026/);
  assert.match(office.arrival.note,/not the falls wayside/);
  assert.match(office.arrival.note,/not a guaranteed Lookout Mountain trailhead/);
  assert.equal(office.arrival.kind,'address');
  assert.equal(falls.arrival.kind,'search');
  const trail=ui.chooseArrival('25',0),resort=ui.chooseArrival('25',1);
  assert.match(trail.arrival.label,/Temperance/);
  assert.match(resort.arrival.label,/Lutsen Mountains/);
  assert.match(resort.arrival.sourceUrl,/lutsen\.com/);
  assert.equal(resort.arrival.destination,'467 Ski Hill Road, Lutsen, MN 55612, USA');
  const source=readFileSync(path.join(root,'public/assets/circle-tour-bridge.js'),'utf8');
  assert.match(source,/selected\.setAttribute\('aria-live','polite'\)/);
  assert.match(source,/control\.setAttribute\('aria-pressed'/);
});
