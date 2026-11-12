'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('public/lake-superior-circle-tour/index.html');
const core=read('public/assets/lake-superior-circle-tour-core.js');
const live=read('public/assets/lake-superior-circle-tour-live-day.js');
const ledger=JSON.parse(read('data/circle-tour-road-evidence.json'));
const sitemap=read('public/sitemap.xml');
function section(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'function segment exists: '+start);
  return source.slice(a,b);
}
function roadFunctions(){
  const source=section(core,'  // Fixed, named routing destinations','  function allRouteIds(');
  return new Function('shortStopName',source+'\nreturn {routeWaypoints,googleMapsUrl,roadEvidenceForDay};')(id=>String(id));
}

test('30 contiguous published road legs are audited without promoting estimates into routed miles',()=>{
  const order=[...html.matchAll(/<article class="stop-card" id="stop-(\d+)"/g)].map(m=>m[1]);
  assert.equal(order.length,31);
  assert.equal(ledger.edges.length,30);
  assert.deepEqual(ledger.edges.map(x=>x.from),order.slice(0,-1));
  assert.deepEqual(ledger.edges.map(x=>x.to),order.slice(1));
  assert.equal(new Set(ledger.edges.map(x=>x.from+'-'+x.to)).size,30);
  assert.ok(ledger.edges.every(x=>['published-estimate-unverified','arrival-choice-unresolved','partial-source-only'].includes(x.status)));
  assert.ok(ledger.edges.every(x=>!('verifiedFullLegMiles' in x)&&!('eta' in x)));
  assert.equal(ledger.edges.find(x=>x.to==='21').status,'partial-source-only');
  assert.equal(ledger.edges.find(x=>x.to==='31').status,'partial-source-only');
  assert.equal(ledger.edges.find(x=>x.to==='8').status,'arrival-choice-unresolved');
  assert.equal(ledger.edges.find(x=>x.to==='13').status,'arrival-choice-unresolved');
});
test('source mileages preserve exact endpoints, units and source provenance',()=>{
  const anchors=ledger.publishedDistanceAnchors;
  assert.equal(anchors.length,7);
  assert.equal(new Set(anchors.map(x=>x.id)).size,anchors.length);
  for(const x of anchors){
    assert.ok(x.from&&x.to&&x.scope&&Number.isFinite(x.distanceMiles)&&x.distanceMiles>0);
    assert.ok(x.scope.length>35);
    const url=new URL(x.source);
    assert.equal(url.protocol,'https:');
    assert.ok(['superiorcountry.ca','www.destinationontario.com','www.nps.gov','www.ridelakesuperior.com','shipwreckmuseum.com'].includes(url.hostname));
  }
  assert.equal(anchors.find(x=>x.id==='thunderbay-pigeon').distanceMiles,38);
  assert.equal(anchors.find(x=>x.id==='paradise-whitefish').distanceMiles,11);
  assert.equal(anchors.find(x=>x.id==='pictured-h58').distanceMiles,52);
  assert.equal(anchors.find(x=>x.id==='duluth-thunderbay').distanceMiles,190);
});
test('Google Maps route uses meaningful source-backed named arrivals and preserves directional corridor',()=>{
  const road=roadFunctions();
  const north=['20','21','22','23','24','25','26','27','28','29','30'];
  const ccw=road.routeWaypoints(north);
  assert.equal(ccw.length,6,'no arbitrary truncation to 8 waypoints');
  assert.equal(ccw[0],'Thunder Bay, Ontario, Canada');
  assert.equal(ccw.at(-1),'Duluth, Minnesota, USA');
  assert.ok(ccw.some(x=>x.includes('Pigeon River Border Crossing')));
  assert.ok(ccw.some(x=>x.includes('Grand Portage')));
  assert.deepEqual(road.routeWaypoints(north.slice().reverse()),ccw.slice().reverse());
  const map=new URL(road.googleMapsUrl(north));
  assert.equal(map.hostname,'www.google.com');
  assert.equal(map.searchParams.get('travelmode'),'driving');
  assert.equal(map.searchParams.get('destination'),'Duluth, Minnesota, USA');
  assert.ok(map.searchParams.get('waypoints').includes('Grand Marais'));
  assert.ok(!map.searchParams.get('waypoints').includes('Tettegouche'),'side-trip park destinations cannot silently become main-road waypoints');
  const munising=road.routeWaypoints(['10','11','12']);
  assert.ok(munising[1].includes('1505 Sand Point Road'),'NPS explicitly recommends this visitor center for routing');
  const whitefish=road.routeWaypoints(['12','31','13']);
  assert.ok(whitefish[1].includes('18335 N Whitefish Point Road'),'museum physical address used');
  assert.equal(road.googleMapsUrl([]),'');
});
test('Keweenaw directions distinguish Houghton base from Copper Harbor scenic detour',()=>{
  const road=roadFunctions();
  const budget=['6','7','8','9','10'];
  const quick=road.routeWaypoints(budget);
  const scenic=road.routeWaypoints(budget,{viaCopperHarbor:true});
  assert.equal(quick.filter(x=>x.includes('Copper Harbor')).length,0);
  assert.equal(scenic.filter(x=>x.includes('Copper Harbor')).length,1);
  assert.equal(scenic.length,quick.length+1);
  const clockwise=road.routeWaypoints(budget.slice().reverse(),{viaCopperHarbor:true});
  assert.ok(clockwise.indexOf('Copper Harbor, Michigan, USA')<clockwise.indexOf('Houghton, Michigan, USA'));
  assert.equal(road.routeWaypoints(['8','9','10'])[0],'Copper Harbor, Michigan, USA');
  assert.equal(road.routeWaypoints(['10','9','8']).at(-1),'Copper Harbor, Michigan, USA');
  assert.equal(road.routeWaypoints(['7','8']).at(-1),'Houghton, Michigan, USA');
});
test('road reality notes are scoped to actual day corridors and never declare live access',()=>{
  const road=roadFunctions();
  const checks=[
    {stops:['6','7','8','9','10'],expected:'keweenaw'},
    {stops:['10','11','12','31','13'],expected:'whitefish'},
    {stops:['16','17','18','19','20'],expected:'ontario17'},
    {stops:['20','21','22','23','24','25','26','27','28','29','30'],expected:'northshore'}
  ];
  for(const {stops,expected} of checks){
    const notes=road.roadEvidenceForDay({stops});
    assert.ok(notes.length>0);
    assert.ok(notes.some(x=>x.title.toLowerCase().includes(expected==='ontario17'?'ontario':expected==='northshore'?'thunder bay':expected)));
    assert.ok(notes.every(x=>x.url.startsWith('https://')&&x.check.startsWith('https://')));
  }
  assert.deepEqual(road.roadEvidenceForDay({stops:['1','2','3']}),[]);
  assert.match(core,/Road reality · verified sources and detours/);
  assert.match(core,/The route link uses core towns and the border/);
  assert.doesNotMatch(core,/Brockway Mountain Drive is open today/);
});
test('partial published miles never flow into the live itinerary travel clock',()=>{
  const order=[...html.matchAll(/<article class="stop-card" id="stop-(\d+)"/g)].map(x=>x[1]);
  const card=id=>({
    querySelector(){
      const entry=html.match(new RegExp('<article class="stop-card" id="stop-'+id+'"[^]*?<\\/article>'))?.[0]||'';
      const found=entry.match(/<span class="stop-dist"([^>]*)>([^<]*)<\/span>/);
      return {textContent:found?.[2]||'',dataset:{edgeVerified:found?.[1]?.includes('data-edge-verified="false"')?'false':undefined}};
    }
  });
  const code=section(live,'  function edgeMiles(', '  function totalMiles(');
  const get=new Function('card','ROUTE_ORDER',code+'\nreturn edgeMiles;')(card,order);
  assert.equal(get('12','31'),null,'Paradise-to-museum 11 miles is not Tahquamenon-to-Whitefish');
  assert.equal(get('20','21'),null,'38 miles to border is not a park parking guarantee');
  assert.equal(get('31','13'),null,'Whitefish-to-Sault full mileage is unverified');
  assert.equal(get('5','6'),43,'existing explicit Ironwood-to-Lake-of-the-Clouds reference remains');
  assert.equal(get('1','30'),0,'same-city closing seam remains zero');
  assert.equal((html.match(/data-edge-verified="false"/g)||[]).length,4);
});
test('Circle Tour page and sitemap indicate actual November source correction',()=>{
  assert.match(html,/"dateModified":"2026-11-12"/);
  assert.match(sitemap,/<loc>https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/<\/loc>\s*<lastmod>2026-11-12<\/lastmod>/);
  assert.match(html,/~38 mi from Thunder Bay to the Pigeon River border; park approach extra/);
  assert.match(html,/11 mi north of Paradise via Whitefish Point Road/);
  assert.doesNotMatch(html,/115 mi from Thunder Bay/);
  assert.doesNotMatch(html,/71 mi NE of Tahquamenon/);
  assert.equal((html.match(/class="stop-card"/g)||[]).length,31);
});
