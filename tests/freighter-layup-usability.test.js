'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./helpers/freighter-layup-harness.cjs');
test('all-lakes resets query, harbor, berth, evidence and selected detail together',async()=>{
 const f=await fixture();await f.event('harbor-filter','change','sturgeon-bay');await f.event('ship-search','input','Barker');await f.ship('james-r-barker');
 assert.equal(f.read().selected,'james-r-barker');await f.click('reset-map');
 assert.equal(f.read().query,'');assert.equal(f.read().activeHarbor,'all');assert.equal(f.read().selected,null);
 assert.equal(f.get('ship-detail').hidden,true);assert.match(f.get('count-note').textContent,/12 of 12/);
});
test('earlier and upcoming winters cannot offer unsupported harbors or retain old vessels',async()=>{
 const f=await fixture();await f.event('season','change','2024-25');
 assert.deepEqual(f.get('harbor-filter').children.map(x=>x.value),['all','owen-sound']);assert.match(f.get('count-note').textContent,/2 of 2/);
 await f.event('season','change','2026-27');assert.equal(f.get('harbor-filter').disabled,true);assert.equal(f.get('stat-ships').textContent,0);assert.equal(f.read().selected,null);
 await f.click('ship-grid',{'data-action':'archive'});assert.match(f.get('count-note').textContent,/12 of 12/);assert.equal(f.get('harbor-filter').disabled,false);
});
test('alias search, reported-only filter and scoped confidence totals agree',async()=>{
 const f=await fixture();await f.event('ship-search','input','Roger M. Kyes');assert.match(f.get('count-note').textContent,/1 of 12.*1 verified \/ 0 reported/);
 await f.click('clear-filters');await f.event('evidence-filter','change','reported');assert.match(f.get('count-note').textContent,/2 of 12.*0 verified \/ 2 reported/);
 await f.event('harbor-filter','change','toledo');assert.match(f.get('count-note').textContent,/1 of 12.*0 verified \/ 1 reported/);
});
test('empty-result recovery preserves harbor and winter; reset restores full winter',async()=>{
 const f=await fixture();await f.event('harbor-filter','change','sturgeon-bay');await f.event('ship-search','input','no-such-vessel');assert.match(f.get('ship-grid').innerHTML,/Clear search/);
 await f.click('ship-grid',{'data-action':'clear-search'});assert.equal(f.read().activeHarbor,'sturgeon-bay');assert.equal(f.read().season,'2025-26');assert.match(f.get('count-note').textContent,/3 of 12/);
});
test('shared selection survives reload parsing and close returns to originating ship',async()=>{
 const f=await fixture();await f.event('harbor-filter','change','owen-sound');await f.ship('algoma-compass');const url=f.location.href;
 assert.equal(f.get('ship-detail').hidden,false);assert.equal(f.focused().id,'ship-detail');
 const reloaded=await fixture({url});assert.equal(reloaded.read().selected,'algoma-compass');assert.equal(reloaded.get('detail-title').textContent,'Algoma Compass');
 await reloaded.click('detail-close');assert.equal(reloaded.focused().dataset.ship,'algoma-compass');assert.equal(reloaded.read().activeHarbor,'owen-sound');
});
test('Back and Forward restore selected records and validated winter-specific filters',async()=>{
 const f=await fixture();await f.event('harbor-filter','change','owen-sound');await f.ship('algoma-compass');await f.event('season','change','2024-25');
 await f.back();assert.equal(f.read().season,'2025-26');assert.equal(f.read().selected,'algoma-compass');assert.equal(f.get('ship-detail').hidden,false);
 await f.forward();assert.equal(f.read().season,'2024-25');assert.equal(f.read().selected,null);assert.deepEqual(f.get('harbor-filter').children.map(x=>x.value),['all','owen-sound']);
});
test('core tasks load while optional biography metadata stalls; failure retry recovers once',async()=>{
 const f=await fixture({stallBios:true});assert.equal(f.get('atlas-controls').disabled,false);assert.match(f.get('count-note').textContent,/12 of 12/);await f.ship('lee-a-tregurtha');assert.equal(f.get('ship-detail').hidden,false);
 const failed=await fixture({failures:1});assert.equal(failed.get('archive-error').hidden,false);await failed.click('archive-retry');assert.equal(failed.get('archive-error').hidden,true);assert.equal(failed.requests(),2);assert.equal(failed.get('atlas-controls').disabled,false);
});
test('hostile or inconsistent URL values normalize without selecting an unrelated ship',async()=>{
 const f=await fixture({url:'https://chrisizworski.com/great-lakes-freighter-winter-layup/?season=2024-25&harbor=superior&vessel=james-r-barker&evidence=bogus&q=%3Cimg%20onerror%3Dx%3E'});
 assert.equal(f.read().activeHarbor,'all');assert.equal(f.read().selected,null);assert.equal(f.read().evidence,'all');assert.equal(f.get('ship-grid').innerHTML.includes('<img onerror'),false);
});
test('cross-winter action retains the curated hull and visibly labels the selected archive',async()=>{
 const f=await fixture();await f.ship('algoma-compass');
 await f.click('detail-body',{'data-winter':'2024-25','data-vessel':'algoma-compass'});
 assert.equal(f.read().season,'2024-25');assert.equal(f.read().selected,'algoma-compass');assert.match(f.get('detail-body').innerHTML,/Winter 2024–25/);
});
test('harbor comparison uses zero-based sample counts and education steps remain general interpretation',async()=>{
 const f=await fixture();assert.deepEqual(f.model.harborCounts(f.registry,'2025-26').map(h=>h.count),[6,3,1,1,1]);
 const chart=f.get('harbor-panel').children.find(n=>n.className==='harbor-comparison');assert.equal(chart.children.length,5);
 assert.equal(chart.children[0].children[1].children[0].attrs.width,'100');
 assert.equal(chart.children[1].children[1].children[0].attrs.width,'50');
});
test('phone and desktop harbor controls share one selection and seasonal validity',async()=>{
 const f=await fixture();await f.event('harbor-filter-mobile','change','toledo');
 assert.equal(f.get('harbor-filter').value,'toledo');assert.equal(f.read().activeHarbor,'toledo');assert.match(f.get('count-note').textContent,/1 of 12/);
 await f.event('season','change','2026-27');assert.equal(f.get('harbor-filter-mobile').disabled,true);assert.equal(f.get('harbor-filter-mobile').value,'all');
});
test('winter-work controls explain each phase without a vessel-specific prediction',async()=>{
 const f=await fixture();await f.work(1);assert.equal(f.get('work-title').textContent,'Make room for the work');assert.match(f.get('work-copy').textContent,/each move needs its own dated evidence/);
 await f.work(2);assert.equal(f.get('work-title').textContent,'Return to the lakes');assert.match(f.get('work-copy').textContent,/do not promise a sailing date/);
});
test('closing a story restored by Back focuses that ship, not the last ship opened',async()=>{
 const f=await fixture();await f.ship('lee-a-tregurtha');await f.ship('james-r-barker');await f.back();
 assert.equal(f.read().selected,'lee-a-tregurtha');await f.click('detail-close');assert.equal(f.focused().dataset.ship,'lee-a-tregurtha');
});
test('harbor and disappearing empty-state actions give keyboard focus a stable destination',async()=>{
 const f=await fixture();await f.chooseHarbor('superior');assert.equal(f.focused().id,'fleet-title');assert.match(f.get('count-note').textContent,/6 of 12/);
 await f.event('season','change','2026-27');await f.click('ship-grid',{'data-action':'archive'});assert.equal(f.focused().id,'fleet-title');
 await f.event('ship-search','input','not-a-ship');await f.click('ship-grid',{'data-action':'reset'});assert.equal(f.focused().id,'fleet-title');
});
test('a known ship in another winter is discoverable without mixing records or switching automatically',async()=>{
 const f=await fixture();await f.event('ship-search','input','Oakglen');assert.equal(f.read().season,'2025-26');assert.match(f.get('ship-grid').innerHTML,/Found in another winter/);
 const found=f.model.otherWinterMatches(f.registry,f.read());assert.deepEqual(found,[{id:'2024-25',label:'Winter 2024–25',count:1}]);
 await f.click('ship-grid',{'data-action':'other-winter','data-season':'2024-25'});assert.equal(f.read().query,'Oakglen');assert.equal(f.read().season,'2024-25');assert.match(f.get('count-note').textContent,/1 of 2/);assert.equal(f.focused().id,'fleet-title');
 assert.deepEqual(f.model.otherWinterMatches(f.registry,{season:'2025-26',query:''}),[]);
 assert.deepEqual(f.model.otherWinterMatches(f.registry,{season:'2025-26',query:'not-a-ship'}),[]);
});
test('fit-records availability follows actual map availability and matching results',async()=>{
 const noMap=await fixture();assert.equal(noMap.get('focus-harbor').disabled,true);
 const f=await fixture({map:true});assert.equal(f.get('focus-harbor').disabled,false);await f.event('ship-search','input','not-a-ship');assert.equal(f.get('focus-harbor').disabled,true);
 await f.click('reset-map');assert.equal(f.get('focus-harbor').disabled,false);
});
test('late or superseded location responses cannot take over a new harbor or overwrite messages',async()=>{
 const f=await fixture({map:true});await f.click('locate');await f.event('harbor-filter','change','sturgeon-bay');const before=f.map.views.length;
 f.geo[0].ok({coords:{latitude:40,longitude:-80}});assert.equal(f.map.views.length,before);assert.doesNotMatch(f.get('map-status').textContent,/Waiting/);
 await f.click('locate');await f.click('locate');f.geo[2].ok({coords:{latitude:44,longitude:-83}});assert.deepEqual(Array.from(f.map.views.at(-1).ll),[44,-83]);
 const status=f.get('map-status').textContent;f.geo[1].error({code:1});assert.equal(f.get('map-status').textContent,status);
});
test('location denial leaves the atlas usable and supplies a non-location alternative',async()=>{
 const f=await fixture({map:true});await f.click('locate');f.geo[0].error({code:1});assert.match(f.get('map-status').textContent,/Location not shared.*Choose a harbor/);
 assert.equal(f.get('atlas-controls').disabled,false);await f.chooseHarbor('toledo');assert.match(f.get('count-note').textContent,/1 of 12/);
});
test('failed and partial tile loads are honest; a removed provider cannot claim the map is ready',async()=>{
 const f=await fixture({map:true,carto:true});const original=f.tiles[0];original.fire('tileerror');assert.equal(f.tiles.length,2);const fallback=f.tiles[1];
 fallback.fire('tileerror');fallback.fire('load');assert.match(f.get('tile-status').textContent,/Basemap unavailable/);
 original.fire('tileload');original.fire('load');assert.match(f.get('tile-status').textContent,/Basemap unavailable/);
 fallback.fire('tileload');assert.match(f.get('tile-status').textContent,/Partial basemap/);
 const healthy=await fixture({map:true});healthy.tiles[0].fire('tileload');healthy.tiles[0].fire('load');assert.equal(healthy.get('tile-status').textContent,'OpenStreetMap basemap');
});
test('new filters and ships close stale popups while clicking a harbor preserves its own popup',async()=>{
 const f=await fixture({map:true});f.markers[0].fire('click');assert.ok(f.map.popup);await f.ship('lee-a-tregurtha');assert.equal(f.map.popup,null);
 f.markers[0].fire('click');assert.ok(f.map.popup);await f.event('ship-search','input','Oakglen');assert.equal(f.map.popup,null);
});
test('selection changes preserve list scroll while changed results reset it',async()=>{
 const f=await fixture();f.get('ship-grid').scrollTop=220;await f.ship('lee-a-tregurtha');assert.equal(f.get('ship-grid').scrollTop,220);
 await f.click('detail-close');assert.equal(f.get('ship-grid').scrollTop,220);await f.event('ship-search','input','Oakglen');assert.equal(f.get('ship-grid').scrollTop,0);
});
