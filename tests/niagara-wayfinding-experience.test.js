'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {plan}=require('../lib/niagara-falls/planner.js');
const {wayfinding,STOPS,PARKING,chooseParking,parkingRate}=require('../lib/niagara-falls/wayfinding.js');
const opts={visit_date:'2026-10-13',arrival_local:'10:00',duration_minutes:360,starting_side:'US',priority:'boat',adults:2,youth:0};
const itinerary=(extra={})=>plan({...opts,...extra},new Date('2026-10-12T15:00:00Z'));
test('NY boat users see Observation Tower entrance and recommended parking lot 1',()=>{
 const p=itinerary();const a=wayfinding(p,'drive');
 assert.ok(p.stops.some(x=>x.id==='maid'),'test fixture requires boat');
 assert.equal(a.parking.id,'us1');assert.equal(a.parking.address,'333 Prospect Street, Niagara Falls, NY');
 assert.equal(a.parking.price_note.includes('$10 USD'),true);
 assert.ok(a.route_stops.some(x=>x.id==='maid'&&x.hint.includes('ABOVE the dock')));
 assert.ok(a.route_stops.every(s=>s.lng<0&&Number.isFinite(s.lat)));
 assert.equal(a.mode,'drive');
});
test('NY cave/Goat-first route chooses Lot 2, not a remote Maid lot',()=>{
 const p=itinerary({priority:'mist'});
 const fabricated={...p,priority:'mist',stops:[{id:'cave',name:'Cave of the Winds',location:'Cave of the Winds, Niagara Falls',arrival:'10:00',departure:'11:25',transfer_minutes:5}]};
 const g=wayfinding(fabricated,'drive');
 assert.equal(g.parking.id,'us2');
 assert.equal(g.parking.address,'15 Goat Island Loop Road, Niagara Falls, NY');
});
test('Ontario route uses Canadian parking and its own WEGO, not US trolley',()=>{
 const p=itinerary({starting_side:'CA',priority:'views',visit_date:'2026-10-14'});
 const w=wayfinding(p,'drive');
 assert.equal(w.side,'CA');assert.equal(w.parking.side,'CA');
 assert.match(w.transport.transport_name,/WEGO/);
 assert.match(w.parking.price_note,/Variable rate in CAD/);
 assert.ok(w.route_stops.every(s=>s.lng<0));
});
test('Canadian cruise entrance is Grand View ticket kiosk, not boat on river',()=>{
 const p=itinerary({starting_side:'CA'});
 const mock={...p,priority:'boat',stops:[{id:'cruise',name:'Niagara City Cruises',location:'Niagara City Cruises',arrival:'10:00',departure:'11:35',transfer_minutes:30}]};
 const w=wayfinding(mock,'drive');
 assert.equal(w.parking.id,'caQ');
 assert.match(w.route_stops[0].hint,/ticket kiosks/i);
});
test('Transit and walking modes do not claim user has a parking space',()=>{
 for(const m of ['transit','walk']){
  const g=wayfinding(itinerary(),m);assert.equal(g.parking,null);
  assert.equal(g.mode,m);
  assert.ok(g.notes.every(x=>!x.includes('available spaces')));
 }
});
test('Unknown parking rate for unverified season is not fabricated',()=>{
 assert.match(parkingRate(PARKING.us1,'2028-05-12'),/may vary/);
 assert.ok(PARKING.caA.approximate);
});
test('Map and video controls are real interactive DOM inputs, not static images',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/niagara-falls-today/index.html'),'utf8');
 const map=fs.readFileSync(path.join(__dirname,'../public/assets/niagara-visit-map.js'),'utf8');
 const films=fs.readFileSync(path.join(__dirname,'../public/assets/niagara-visit-films.js'),'utf8');
 const script=fs.readFileSync(path.join(__dirname,'../public/assets/niagara-falls-today.js'),'utf8');
 assert.match(html,/id="niagara-route-map"/);
 assert.match(html,/name="arrival_mode"/);
 assert.match(html,/data-niagara-clip="F1D0AUIfKJk"/);
 assert.match(html,/data-niagara-clip="hmQwm0drhGU"/);
 assert.match(html,/data-niagara-clip="l6fu2huqWNE"/);
 assert.match(map,/L\.tileLayer\('https:\/\/\{s\}\.basemaps\.cartocdn\.com/);
 assert.match(map,/https:\/\/www\.google\.com\/maps\/dir\/\?api=1/);
 assert.match(map,/not a walking path|not walking paths|not a walkable/i);
 assert.match(films,/youtube-nocookie\.com\/embed/);
 assert.match(script,/NiagaraVisitMap\.render\(r\)/);
 assert.match(script,/arrival_mode:d\.get\('arrival_mode'\)/);
 assert.doesNotMatch(html,/mapbox\.(com|gl)/i);
});
test('Wayfinding does not import external API, paid service, or browser geolocation',()=>{
 const x=fs.readFileSync(path.join(__dirname,'../lib/niagara-falls/wayfinding.js'),'utf8');
 assert.doesNotMatch(x,/fetch\(|axios|navigator\.geolocation|MAPBOX_TOKEN|process\.env/);
});
