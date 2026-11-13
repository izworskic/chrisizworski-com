import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {SITES,COUNTY_MAPS,codes,verifySite,reconcile}=require('../public/assets/snowmobile-access-evidence.js');
const club=require('../public/assets/snowmobile-club-staging.js');

// Snapshots transcribed from actual public DNR parking FeatureServer/6
// on 2026-11-13; independent of the hand-audited county-map table.
// Each tuple is OBJECTID, GIS description, GIS road/intersection note.
const GROUND_TRUTH=[
 [28,'Snowmobile Trail LP 7','Snowmobile Parking / ORV Parking NW of Int of M72 and South Blue Bear Trail'],
 [760,'Snowmobile Trail LP 7','Snowmobile Parking North Side of West County Road 612, West of Int with Myrtle Street'],
 [489,'Snowmobile Trail LP 47','Snowmobile Parking Located on the east side of South Wilcox Bridge Road, SE of intersection with West Lewiston Grade Road.'],
 [883,'Snowmobile Trail LP 4 And LP 7','Snowmobile Parking East Side of South Otsego Avenue at intersection with Acorn Road.'],
 [1440,'Snowmobile Trail LP 4 / ORV North Branch Route','Snowmobile Parking / ORV Parking SE of Int of Turtle Lake and Old State Roads'],
 [412,'Snowmobile Trail LP 35 / ORV Little Manistee Route','Snowmobile Parking / ORV Parking Located northeast of the intersection of M-37 and West 3 Mile Road.'],
 [81,'Snowmobile Trail LP 35 And LP 36 . ORV Lincoln Hills / ORV Little Manistee','Snowmobile Parking / ORV Parking South Side of West 7 mile Road, East of M-37.'],
 [1487,'Snowmobile Trail LP 362 And LP 344E / ORV Little Manistee And MCCCT','Snowmobile Parking / ORV Parking Located on the west side of North Kings Highway, north of East F Avenue.'],
 [6,'Snowmobile Trail LP 30 / Pere Marquette State Trail Trailhead - Baldwin','Snowmobile Parking / Rail Trail Parking Located off of 8th St. (east of M-37) in Baldwin.'],
 [88,'Snowmobile Trail LP 35','Snowmobile Parking Off of US Hwy 10 between Mack Rd. and Sheppard Rd. (east of M-37).'],
 [781,'Snowmobile Trail LP 35','Snowmobile Parking NW of Int of East 48.5 and South 33 Roads'],
 [231,'Snowmobile Trail UP 45 / Paradise Pathway','Snowmobile Parking South Side of M-123, West of intersection with North Beaver Road.'],
 [66,'Snwomobile Trail UP 493 / ORV Drummond Island Route (DIR) / ORV Drummond Island Trail (DIT)','Snowmobile Parking / ORV Parking Located on the east side of Maxton Road, northeast of Maxton Cut Across Road.'],
 [702,'Snwomobile Trail UP 510 / ORV Drummond Island Route (DIR) / ORV Drummond Island Trail (DIT)','Snowmobile Parking / ORV Parking Located on the north side of Bass Cove Road.'],
 [798,'Snwomobile Trail UP 489 / ORV Drummond Island Route (DIR) / ORV Drummond Island Trail (DIT)','Snowmobile Parking / ORV Parking Located off of South Turkey Farm Road north of Glen Cove Road.'],
 [325,'Snowmobile Trail UP 8 And UP 88','Snowmobile Parking North Side of Adams Trail East of intersection with H 58, Alger County.'],
 [275,'North Central State Trail - Mackinaw City.','Snowmobile Parking / Rail Trail Parking Nonmotorized Located on the east side of Nicolet Street east of intersection with Mackinaw Crossings Drive in Mackinaw City.'],
 [1473,'Snowmobile Trail LP 7 / ORV Indian River Route (ORR), ORV Tomahawk A Loop','Snowmobile Parking / ORV Parking Parking East of Int of South State Highway and White Road'],
 [730,'Snowmobile Trail LP 344W And LP 344E / ORV Little Manistee Route And MCCCT','Snowmobile Parking / ORV Parking Located on the north side of West 16th Street, east of South James Road.'],
 [84,'Snowmobile Trail LP 6 / North Missaukee Route','Snowmobile Parking / ORV Parking West Side of US 131 BR, South of Int with US 131'],
 [795,'Snowmobile Trail LP 638 And LP 373 / ORV M-55 to 20 Road MCCCT','Snowmobile Parking / ORV Parking Located on the east side of Caberfae Road, North of intersection with M 55.'],
 [1059,'Snowmobile Trail LP 37','Snowmobile Parking West Side of 23 Road, South of Int with West 32.5 Road']
];
test('all 22 reviewed county-map parking entries reconcile with independent live GIS descriptions',()=>{
 assert.equal(Object.keys(SITES).length,GROUND_TRUTH.length);
 for(const [id,name,directionsNote] of GROUND_TRUTH){
   const evidence=verifySite({id,name,directionsNote});
   assert.equal(evidence.grade,'DNR_MAP_PAIRED','DNR county map cross-check failed for OBJECTID '+id);
   assert.ok(evidence.trailCodes.length>0,id+' must retain published trail number');
   assert.equal(evidence.countyMap,COUNTY_MAPS[evidence.county].url);
   assert.match(evidence.countyMap,/\.pdf$/i);
   assert.match(evidence.published,/^2026-\d{2}-\d{2}$/);
   assert.ok(evidence.mapRef.includes('['),'county parking symbol must be cited');
   assert.match(evidence.reason,/lawful ground-level entrance.*unverified/);
 }
});
test('trail numbers use separate LP and UP boundaries, never infer a physical connection',()=>{
 assert.deepEqual([...codes('Snowmobile Trail LP 4 and LP 76, UP 8')].sort(),['LP4','LP76','UP8']);
 assert.equal(verifySite({id:28,name:'Snowmobile Trail LP 76',directionsNote:'M72 Blue Bear'}).grade,'SOURCE_CONFLICT','LP 76 must not match LP 7');
 assert.equal(verifySite({id:28,name:'Snowmobile Trail LP 7',directionsNote:'a different parking site'}).grade,'SOURCE_CONFLICT','road note changed');
 assert.equal(verifySite({id:28,name:'Snowmobile Trail LP 7',directionsNote:'M72 Blue Bear'}).grade,'DNR_MAP_PAIRED');
 assert.equal(verifySite({id:242,name:'Snowmobile Trail LP / Gaylord Gateway Trailhead',directionsNote:'Staging in winter'}).grade,'ASSET_ONLY','unpaired lot cannot be promoted');
 assert.equal(verifySite({id:1025,name:'Snowmobile Trail LP / White Pine Trail State Park',directionsNote:'Cadillac'}).grade,'ASSET_ONLY');
});
test('Keweenaw and Houghton county maps without a confirmed pairing do not manufacture access',()=>{
 assert.equal(Object.values(SITES).some(v=>['Keweenaw','Houghton'].includes(v.county)),false);
 const out=reconcile([{id:242,name:'DNR snowmobile staging',directionsNote:'staging only'},{id:28,name:'Snowmobile Trail LP 7',directionsNote:'M72 Blue Bear'}]);
 assert.equal(out.length,2);
 assert.equal(out[0].accessEvidence.grade,'ASSET_ONLY');
 assert.equal(out[1].accessEvidence.grade,'DNR_MAP_PAIRED');
 assert.equal(out[1].id,28);
 assert.equal(out[1].routable,undefined);
 assert.equal(out[1].connectionGeometry,undefined);
});
test('county map review comes from seven known current DNR county PDFs only',()=>{
 for(const [county,entry] of Object.entries(COUNTY_MAPS)){
   assert.match(entry.url,new RegExp('snowmobile_'+county.toLowerCase()+'\\.pdf$'));
   assert.match(entry.url,/^https:\/\/www\.michigandnr\.com\/Publications\/PDFS\/ForestsLandWater\/SnowmobileTrailMaps\/countymaps\//);
 }
 assert.equal(Object.keys(COUNTY_MAPS).length,7);
});
test('seven regional pages load evidence script and preserve canonical, Ads, independent route planner',()=>{
 const root=new URL('../scripts/generate-snowmobile-region-pages.mjs',import.meta.url);
 const generator=readFileSync(root,'utf8');
 const client=readFileSync(new URL('../public/assets/snowmobile-region.js',import.meta.url),'utf8');
 for(const region of ['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan']){
   const html=readFileSync(new URL('../public/snowmobile/regions/'+region+'.html',import.meta.url),'utf8');
   for(const marker of ['/assets/snowmobile-access-evidence.js','id="loadParking"','id="junctionSearch"','id="closeRouteLoop"','google-adsense-account']){
     assert.ok(html.includes(marker),region+' missing '+marker);
     assert.ok(generator.includes(marker),'generator missing '+marker);
   }
   assert.ok(html.indexOf('/assets/snowmobile-access-evidence.js')<html.indexOf('/assets/snowmobile-region.js'));
   assert.match(html,/rel="canonical"/);
   assert.match(html,/does <strong>not<\/strong> verify a lawful connection/);
 }
 assert.ok(client.includes('DNR county-map parking / trail pairing'));
 assert.ok(client.includes('data-parking-trail'));
 assert.ok(client.includes('accessEvidence'));
 assert.ok(!client.includes('ROUTE_POINTS.push(site)'),'no parking-to-trail route edge permitted');
 assert.ok(!client.includes('JUNCTIONS_BY_ID.set(site'),'parking must not join official trail graph');
});

test('Keweenaw has five club-published staging addresses with truth-preserving overnight and trail limits',()=>{
 assert.equal(club.PLACES.length,5);
 const calumet=club.PLACES.find(p=>p.id==='calumet');
 assert.equal(calumet.address,'56953 Osceola Road, Calumet, MI 49913, USA');
 assert.equal(calumet.trail,'17');
 assert.equal(calumet.overnight,'YES');
 for(const id of ['eagle-harbor','south-range']){
   const item=club.PLACES.find(p=>p.id===id);
   assert.equal(item.overnight,'NO');
 }
 for(const p of club.PLACES){
   assert.match(club.directionsUrl(p),/^https:\/\/www.google.com\/maps\/dir\/\?api=1&destination=/);
   assert.ok(club.directionsUrl(p).includes(encodeURIComponent(p.address)));
   assert.ok(p.access&&p.parking);
 }
 assert.equal(club.directionsUrl({id:'not-listed'}),null);
 assert.match(club.SOURCE,/keweenawsnowmobileclub\.com\/faq/);
 const keweenaw=readFileSync(new URL('../public/snowmobile/regions/keweenaw-copper-country.html',import.meta.url),'utf8');
 const generator=readFileSync(new URL('../scripts/generate-snowmobile-region-pages.mjs',import.meta.url),'utf8');
 assert.ok(keweenaw.includes('id="clubStaging"'));
 assert.ok(keweenaw.indexOf('/assets/snowmobile-club-staging.js')<keweenaw.indexOf('/assets/snowmobile-region.js'));
 assert.ok(generator.includes('id="clubStaging"'));
 for(const other of ['eastern-up','grayling-gaylord','west-michigan']){
   assert.ok(!readFileSync(new URL('../public/snowmobile/regions/'+other+'.html',import.meta.url),'utf8').includes('id="clubStaging"'));
 }
});

test('Gaylord Gateway public trailhead requires both the original DNR staging label and parking note',()=>{
 const site={id:242,name:'Snowmobile Trail LP / Gaylord Gateway Trailhead',directionsNote:'Snowmobile Parking & Staging in winter.  Heated restrooms.'};
 const ev=verifySite(site);
 assert.equal(ev.grade,'OPERATOR_PAIRED');
 assert.equal(ev.trailCodes.length,0,'no fabricated trail number');
 assert.match(ev.publicSource,/cityofgaylord\.com/);
 assert.match(ev.operatorSource,/gaylordmichigan\.net/);
 assert.match(ev.locationNote,/car-and-trailer parking/);
 assert.match(ev.reason,/not verified/);
 const changed=verifySite({...site,name:'Some other parking'});
 assert.equal(changed.grade,'SOURCE_CONFLICT');
 assert.equal(verifySite({...site,directionsNote:'random text'}).grade,'SOURCE_CONFLICT');
 const unpaired=verifySite({id:185,name:'Snowmobile Trail LP 992',directionsNote:'Trail parking'});
 assert.equal(unpaired.grade,'ASSET_ONLY');
});
test('Mackinaw official trail map label may use named North Central State Trail rather than LP numbers',()=>{
 const site={id:275,name:'North Central State Trail - Mackinaw City.',directionsNote:'Nicolet Street east of Mackinaw Crossings Drive'};
 const ev=verifySite(site);
 assert.equal(ev.grade,'DNR_MAP_PAIRED');
 assert.deepEqual(ev.trailCodes,['LP7','LP9']);
 assert.equal(verifySite({...site,name:'Another rail trail'}).grade,'SOURCE_CONFLICT');
 assert.equal(verifySite({...site,directionsNote:'Somewhere else'}).grade,'SOURCE_CONFLICT');
});
test('official Chippewa and Alger DNR county map dates are not overwritten by GIS field-edit timestamps',()=>{
 assert.equal(COUNTY_MAPS.Chippewa.published,'2026-02-10');
 assert.equal(COUNTY_MAPS.Alger.published,'2026-02-09');
 assert.equal(COUNTY_MAPS.Cheboygan.published,'2026-03-02');
 assert.match(COUNTY_MAPS.Chippewa.url,/snowmobile_chippewa\.pdf$/);
});
