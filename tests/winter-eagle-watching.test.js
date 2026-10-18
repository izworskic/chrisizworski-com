'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const handler=require('../api/winter-eagle-counts.js');
function response(){
 const r={code:200,headers:{},body:null};
 r.setHeader=(k,v)=>{r.headers[k]=v;return r};
 r.status=c=>{r.code=c;return r};
 r.json=o=>{r.body=o;return r};
 return r;
}
async function run(site,body,status=200){
 const previous=global.fetch;
 global.fetch=async()=>({ok:status===200,status,text:async()=>body});
 try{const res=response();await handler({method:'GET',query:{site}},res);return res}finally{global.fetch=previous}
}
const rows='<table><tr><th>Date</th><th>Site</th><th>Adults</th><th>Juveniles</th></tr>'+
 '<tr><td>2/18/2026</td><td>Lock and Dam 13 (Fulton, IL)</td><td>1</td><td>3</td></tr>'+
 '<tr><td>2/25/2026</td><td>Lock and Dam 13 (Fulton, IL)</td><td>5</td><td>1</td></tr>'+
 '<tr><td>2/25/2026</td><td>Lock and Dam 14</td><td>NO</td><td>REPORT</td></tr>'+
 '<tr><td>2/25/2026</td><td>Starved Rock (Ottawa, Illinois)</td><td>5</td><td>2</td></tr></table>';
test('Corps adapter returns the newest dated numeric eagle count, not a live sighting',async()=>{
 const r=await run('ld13',rows);
 assert.equal(r.code,200);assert.equal(r.body.available,true);assert.equal(r.body.count.date,'2/25/2026');
 assert.equal(r.body.count.adults,5);assert.equal(r.body.count.juveniles,1);
 assert.equal(r.body.stale,true);assert.match(r.body.sourceType,/observed on stated date/);
 assert.match(r.headers['X-Robots-Tag'],/noindex/);
});
test('no report does not get converted into zero eagles',async()=>{
 const r=await run('ld14',rows);
 assert.equal(r.code,200);assert.equal(r.body.available,false);assert.equal(r.body.count,undefined);
});
test('Illinois report is distinct from Mississippi report',async()=>{
 const r=await run('starved',rows);
 assert.equal(r.body.available,true);assert.equal(r.body.count.adults,5);assert.equal(r.body.count.juveniles,2);
 assert.match(r.body.source,/illinoiswaterway/);
});
test('upstream errors are unknown, not zero',async()=>{
 const r=await run('ld13','',503);
 assert.equal(r.code,200);assert.equal(r.body.available,false);
});
test('unknown site cannot become an arbitrary upstream request',async()=>{
 const res=response();await handler({method:'GET',query:{site:'https://example.com'}},res);
 assert.equal(res.code,400);assert.equal(res.body.available,false);
});
test('site serves a self-hosted interactive map without external tile dependencies',()=>{
 const root=path.join(__dirname,'..','public','winter-eagle-watching');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(html,/https:\/\/chrisizworski.com\/winter-eagle-watching\//);
 assert.match(html,/G-Y5D2V2W7HN/);
 assert.match(html,/ca-pub-8222782620788075/);
 assert.ok(js.includes('/winter-eagle-watching/midwest-vector-map.svg'));
 assert.ok(js.includes('native-map-canvas'));
 assert.ok(js.includes('moveMapToSelected'));
 assert.ok(js.includes('native-pin'));
 assert.ok(!js.includes('api.mapbox.com/styles/'));
 assert.ok(!js.includes('tile.openstreetmap.org/'));
 assert.ok(!js.includes('basemaps.cartocdn.com/'));
 const bg=fs.readFileSync(path.join(root,'midwest-vector-map.svg'),'utf8');
 assert.ok(bg.startsWith('<svg'));
 for(const name of ['MICHIGAN','MINNESOTA','WISCONSIN','Lake Superior','Lake Erie']) assert.ok(bg.includes(name));
 assert.ok(bg.includes('Natural Earth'));
 assert.match(html,/Unconfirmed/);
 assert.match(js,/api.weather.gov\/points/);
 assert.ok(html.includes('Bald_Eagle_%2850983412142%29'));
 assert.ok(html.includes('Karl Fleming'));
 assert.ok(html.includes('Ottawa National Wildlife Refuge'));
 assert.ok(html.includes('Historical photo, not a current sighting'));
 assert.ok(!html.includes('images.unsplash.com/photo-1641917743953'));
});

test('CARTO-ready map page keeps accessible local map fallback if MapLibre is blocked',()=>{
 const root=path.join(__dirname,'..','public','winter-eagle-watching');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const map=fs.readFileSync(path.join(root,'eagle-map.js'),'utf8');
 const svg=fs.readFileSync(path.join(root,'midwest-vector-map.svg'),'utf8');
 assert.ok(page.includes('maplibre-gl@5.16.0/dist/maplibre-gl.js'));
 assert.ok(page.includes('/winter-eagle-watching/eagle-map.js?v=1'));
 assert.ok(app.includes('window.EagleMap.init'));
 assert.ok(app.includes('updateMapMatches(matches)'));
 assert.ok(map.includes('CARTO_STYLE'));
 assert.ok(map.includes('FALLBACK_STYLE'));
 assert.ok(map.includes('cluster:true'));
 assert.ok(map.includes('getClusterExpansionZoom'));
 assert.ok(map.includes('cartoResourceUrl(url,key)'));
 // The static visual map remains a functional accessible fallback.
 assert.ok(app.includes('holder.replaceChildren()'));
 assert.ok(app.includes('holder.addEventListener("pointermove"'));
 assert.ok(app.includes('b.addEventListener("click",()=>pick(s))'));
 assert.ok(app.includes('b.dataset.spot=s.id'));
 assert.ok(svg.includes('preserveAspectRatio="none"'));
 assert.ok(!app.includes('basemaps.cartocdn.com/light_all'));
 assert.ok(!app.includes('tile.openstreetmap.org/'));
});
