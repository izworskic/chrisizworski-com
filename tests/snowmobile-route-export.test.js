import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Export=require('../public/assets/snowmobile-route-export.js');
const stops=[
 {lat:44.662,lng:-84.772,label:'LP 7 & a mapped junction'},
 {lat:44.669,lng:-84.760,label:'LP 7 <next> mapped junction'}
];
const route={
 routable:true,
 distanceMiles:1.6,stopCount:2,
 segments:[{segmentId:28,band:'UNKNOWN',trailNetwork:'LP7',miles:1.6}],
 geometry:{type:'LineString',coordinates:[[-84.772,44.662],[-84.766,44.665],[-84.760,44.669]]}
};
const context={route,stops,region:'grayling-gaylord',generatedAt:'2026-11-13T20:00:00.000Z',closureVerified:false,seasonActive:false};
const lines=(xml,tag)=>(xml.match(new RegExp('<'+tag+'\\b','g'))||[]).length;
test('GPX 1.1 track has actual DNR vertex order, WGS84 lat/lon and separate junction waypoints',()=>{
 const gpx=Export.createGpx(context);
 assert.equal(gpx.filename,'michigan-snowmobile-grayling-gaylord-2026-11-13.gpx');
 assert.equal(gpx.vertexCount,3);
 assert.equal(gpx.stopCount,2);
 assert.equal(lines(gpx.xml,'trkpt'),3);
 assert.equal(lines(gpx.xml,'wpt'),2);
 assert.ok(gpx.xml.indexOf('lat="44.662000" lon="-84.772000"')<gpx.xml.indexOf('lat="44.665000" lon="-84.766000"'));
 assert.match(gpx.xml,/version="1.1"/);
 assert.match(gpx.xml,/xmlns="http:\/\/www\.topografix\.com\/GPX\/1\/1"/);
 assert.match(gpx.xml,/<trk><name>/);
 assert.match(gpx.xml,/<trkseg>/);
 assert.match(gpx.xml,/Stop 1: LP 7 &amp; a mapped junction/);
 assert.match(gpx.xml,/Stop 2: LP 7 &lt;next&gt; mapped junction/);
 assert.ok(!gpx.xml.includes('<next>'));
 assert.match(gpx.xml,/NOT a parking location or confirmed physical entrance/);
 assert.match(gpx.xml,/outside designated riding season/i);
 assert.match(gpx.xml,/Official DNR closure source was NOT verified/);
 assert.match(gpx.xml,/<time>2026-11-13T20:00:00\.000Z<\/time>/);
 // Python's stdlib XML parser independently checks generated GPX syntax and order.
 const file='/tmp/snowmobile-gpx-schema-smoke.xml';
 try{
  writeFileSync(file,gpx.xml);
  execFileSync('python3',['-c',`import xml.etree.ElementTree as ET,sys
r=ET.parse(sys.argv[1]).getroot()
ns={'g':'http://www.topografix.com/GPX/1/1'}
assert r.tag=='{http://www.topografix.com/GPX/1/1}gpx'
assert len(r.findall('g:wpt',ns))==2
p=r.findall('g:trk/g:trkseg/g:trkpt',ns)
assert len(p)==3
assert p[0].get('lon')=='-84.772000'
assert p[0].get('lat')=='44.662000'
assert r.find('g:metadata/g:time',ns).text=='2026-11-13T20:00:00.000Z'
`,file]);
 }finally{try{unlinkSync(file)}catch{}}
});
test('a non-routable or known closed segment is not downloadable',()=>{
 assert.match(Export.validate({...route,routable:false},stops).reason,/No complete/);
 assert.throws(()=>Export.createGpx({...context,route:{...route,segments:[{band:'CLOSED'}]}}),/closed/i);
 assert.throws(()=>Export.createGpx({...context,route:{...route,segments:[{legalState:'CLOSED'}]}}),/closed/i);
 assert.throws(()=>Export.createGpx({...context,route:{...route,segments:[]}}),/Segment evidence/);
 assert.throws(()=>Export.createGpx({...context,route:{...route,geometry:null}}),/geometry/i);
});
test('reject out-of-Michigan, invalid coordinates, invalid distances, or waypoint mismatch',()=>{
 const badCoords=[[-84.7,44.6],[0,0]];
 assert.throws(()=>Export.createGpx({...context,route:{...route,geometry:{type:'LineString',coordinates:badCoords}}}),/invalid coordinates/);
 assert.throws(()=>Export.createGpx({...context,route:{...route,geometry:{type:'LineString',coordinates:[[-84.7,44.6],[NaN,44.7]]}}}),/invalid coordinates/);
 assert.throws(()=>Export.createGpx({...context,route:{...route,distanceMiles:0}}),/distance/);
 assert.throws(()=>Export.createGpx({...context,stops:[{lat:44.6,lng:-84.7}]}),/2–12/);
 assert.throws(()=>Export.createGpx({...context,stops:[{lat:44.6,lng:-84.7},{lat:0,lng:0}]}),/invalid coordinates/);
 assert.throws(()=>Export.createGpx({...context,route:{...route,stopCount:3}}),/no longer agree/);
 assert.throws(()=>Export.createGpx({...context,route:{...route,geometry:{type:'LineString',coordinates:Array.from({length:100001},()=>[-84.7,44.7])}}}),/too large/);
});
test('GPX warning distinguishes verified closure feed from authorization and off-season planning',()=>{
 const out=Export.createGpx({...context,closureVerified:true,seasonActive:true});
 assert.match(out.xml,/Official DNR closure source was checked/);
 assert.match(out.xml,/Within designated season dates, which do not guarantee/);
 assert.match(out.xml,/NOT A RIDE RECOMMENDATION OR LEGAL ACCESS AUTHORIZATION/);
 assert.match(out.xml,/Download maps separately/);
 assert.doesNotMatch(out.xml,/<rtept/,'DNR track must not include guessed turn-by-turn road access');
});
test('summary includes source timestamp and actual junction stops, not parking routes',()=>{
 const s=Export.summary(context);
 assert.match(s,/Distance: 1\.60 miles on mapped DNR trail centerlines/);
 assert.match(s,/LP 7 & a mapped junction/);
 assert.match(s,/Current official DNR closure source was NOT verified/);
 assert.match(s,/outside designated riding season/i);
 assert.match(s,/snowmobile\/regions\/grayling-gaylord\.html/);
 assert.doesNotMatch(s,/Drive to lot|parking route/i);
});
test('all seven pages include export script before route UI and preserve SEO / ad contracts',()=>{
 const script=readFileSync(new URL('../scripts/generate-snowmobile-region-pages.mjs',import.meta.url),'utf8');
 const client=readFileSync(new URL('../public/assets/snowmobile-region.js',import.meta.url),'utf8');
 for(const key of ['grayling-gaylord','eastern-up','central-western-up','keweenaw-copper-country','northeast-sunrise','northwest-michigan','west-michigan']){
  const html=readFileSync(new URL('../public/snowmobile/regions/'+key+'.html',import.meta.url),'utf8');
  assert.ok(html.includes('snowmobile-route-export.js'),'Missing exporter '+key);
  assert.ok(script.includes('snowmobile-route-export.js'));
  assert.ok(html.indexOf('snowmobile-route-export.js')<html.indexOf('snowmobile-region.js'));
  assert.ok(html.includes('id="routeResult"'));
  assert.ok(html.includes('google-adsense-account'));
  assert.match(html,/rel="canonical"/);
 }
 assert.ok(client.includes('function invalidateRoute(){LAST_ROUTE_EXPORT=null;'));
 assert.ok(client.includes('const canExport=!rejected&&window.SnowmobileRouteExport?.validate'));
 assert.ok(client.includes('Download GPX track'));
 assert.ok(client.includes('Copy ride summary'));
 assert.ok(!client.includes('ROUTE_POINTS.push(site)'),'do not merge parking into mapped junction graph');
});
