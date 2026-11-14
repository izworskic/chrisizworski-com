import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {CATALOG,matchSponsor,routeClubEvidence}=require('../lib/snowmobile/route-club-sources.cjs');
const {roster}=require('../lib/snowmobile/local-reports.cjs');

// Exact distinct Michigan DNR FeatureServer/15 TrailGrooming strings retrieved
// 2026-11-13. Source is not route freshness or an actual grooming observation.
const dnrValues=[
 '1105 Snow North Country Snowmobile Club',
 '1107 Snow Baraga County Convention And Visitors Bureau',
 '1149 Snow Keweenaw Trails Services Inc',
 '1179 Snow Gogebic Area Grooming Inc',
 'Snow Big Bay 550 Snowmobile Club 1306',
 '1363 Snow Moose Country Snowmobile Club',
 '1635 Snow Paradise Area Night Riders',
 '1647 Snow Tahquamenon Snowmobile Association',
 '1714 Snow Sault Snowmobile Association',
 '2139 Snow Petoskey Snowmobile Club',
 '2141 Snow Jordan Valley Trails Council',
 '2152 Snow Gaylord Area Snow Trails Council',
 '2158 Snow Cheboygan Trail Blazers',
 '2256 Snow Presque Isle Snow Trails Club',
 '2342 Snow Grand Traverse Area Snowmobile Club',
 '2360 Snow Benzie Manistee Snowmobile Club',
 '2422 Snow Cadillac Winter Promotions',
 'Snow Pere Marquette Snowmobile Club 2432',
 '2570 Snow Greater Grayling Snowmobile Association'
];
const regionRoster=new Set(['eastern-up','keweenaw-copper-country','central-western-up','northeast-sunrise','northwest-michigan','west-michigan'].flatMap(key=>(roster(key)||[]).map(x=>x.url)));
const legacy=new Set(['https://misorva.org/trail-reports/gaylord-area-snowmobile-trials-council/','https://misorva.org/trail-reports/greater-grayling-snowmobile-assoc/']);
const geom=attrs=>({type:'FeatureCollection',features:attrs.map(([id,sponsor])=>({type:'Feature',properties:{id,groomingSponsor:sponsor},geometry:{type:'LineString',coordinates:[[-84.7,44.7],[-84.7,44.8]]}}))});
const route=ids=>({routable:true,segmentIds:ids});

test('catalog covers 19 independently matched DNR groomer IDs with official names and actual monitored report URLs',()=>{
 assert.equal(Object.keys(CATALOG).length,dnrValues.length);
 const seen=new Set();
 for(const raw of dnrValues){
  const r=matchSponsor(raw);
  assert.ok(r,'DNR groomer not recognized: '+raw);
  assert.match(r.url,/^https:\/\/misorva\.org\/trail-reports\/[a-z0-9-]+\/$/);
  assert.ok(regionRoster.has(r.url)||legacy.has(r.url),'source not in monitored/local legacy inventory: '+r.url);
  assert.ok(!seen.has(r.sponsorId),'duplicate sponsor mapping');
  seen.add(r.sponsorId);
 }
});

test('fail closed when official numeric groomer code or full DNR name changes, or value is merely similar',()=>{
 assert.equal(matchSponsor('1714 Snow Tahquamenon Snowmobile Association'),null);
 assert.equal(matchSponsor('1714 Snow Sault Snowmobile Association fake'),null);
 assert.equal(matchSponsor('1714 Snow Sault Snowmobile'),null);
 assert.equal(matchSponsor('Snow Ghost Snowmobile Club 1306'),null);
 assert.equal(matchSponsor('Snow Big Bay 550 Snowmobile Club 1306').sponsorId,1306);
 assert.equal(matchSponsor('Not Groomed'),null);
 assert.equal(matchSponsor('-1'),null);
 assert.equal(matchSponsor(''),null);
 assert.equal(matchSponsor('1714 Snow Sault Snowmobile Association 1714'),null);
});

test('route sources follow only the exact traversed DNR segment IDs, dedupe repeats and disclose unmatched portions',()=>{
 const features=geom([['a','1714 Snow Sault Snowmobile Association'],['b','1647 Snow Tahquamenon Snowmobile Association'],['c','Not Groomed'],['d','1714 Snow Sault Snowmobile Association'],['e','2570 Snow Greater Grayling Snowmobile Association']]);
 const result=routeClubEvidence(route(['a','b','b','c','missing']),features);
 assert.equal(result.method,'OFFICIAL_DNR_GROOMING_SPONSOR');
 assert.equal(result.totalDnrSegments,4);
 assert.equal(result.matchedSegments,2);
 assert.equal(result.unmappedSegments,2);
 assert.equal(result.sources.length,2);
 assert.equal(result.sources.some(x=>x.sponsorId===2570),false,'nearby non-traversed groomer must not be shown');
 assert.equal(result.sources.some(x=>x.sponsorId===1714),true);
 assert.equal(result.sources.find(x=>x.sponsorId===1714).matchedSegmentCount,1);
 assert.match(result.advisory,/does not establish recent grooming/);
 assert.equal(result.open,undefined);
 assert.equal(result.rideScore,undefined);
});

test('conflicting official sponsor assignments for the same segment ID never choose a source',()=>{
 const geometry=geom([['x','1714 Snow Sault Snowmobile Association'],['x','1647 Snow Tahquamenon Snowmobile Association']]);
 const result=routeClubEvidence(route(['x']),geometry);
 assert.equal(result.matchedSegments,0);
 assert.equal(result.unmappedSegments,1);
 assert.equal(result.sources.length,0);
});
test('non-routable response cannot receive implied club recommendations',()=>{
 assert.equal(routeClubEvidence({routable:false,segmentIds:['a']},geom([['a',dnrValues[0]]])),null);
 assert.equal(routeClubEvidence(null,null),null);
});

test('the actual snowmobile route UI renders source citations from the API with warnings and safe links',()=>{
 const source=readFileSync(new URL('../public/assets/snowmobile-region.js',import.meta.url),'utf8');
 // Preserve the entire original source so this exercises the exact UI template.
 const context=vm.createContext({document:{querySelector:()=>null,addEventListener(){}},window:{SNOWMOBILE_REGION:null},fetch:()=>new Promise(()=>{}),URLSearchParams,setTimeout,clearTimeout,AbortController,console});
 vm.runInContext(source,context);
 const route={routable:true,distanceMiles:5,estimatedMinutes:10,assumedAvgMph:30,stopCount:2,segmentsTraversed:2,segmentIds:['a','b'],
  segments:[{segmentId:'a',trailNetwork:'UP 8',band:'UNKNOWN',score:null}],legs:[],closedSegmentsExcludedFromRegion:0,
  clubEvidence:routeClubEvidence({routable:true,segmentIds:['a','b']},geom([['a','1714 Snow Sault Snowmobile Association'],['b','Not Groomed']]))};
 const html=context.routeResultHtml(route);
 assert.match(html,/Which clubs work on this route/);
 assert.match(html,/Sault Snowmobile Association/);
 assert.match(html,/href="https:\/\/misorva\.org\/trail-reports\/sault-snowmobile-association\/"/);
 assert.match(html,/1 mapped segment has no independently matched club-report link/);
 assert.match(html,/no club report can override a DNR closure/);
 assert.doesNotMatch(html,/Groomed today/);
 assert.doesNotMatch(html,/confirmed open/);
 const empty=context.routeResultHtml({...route,clubEvidence:routeClubEvidence({routable:true,segmentIds:['b']},geom([['b','Not Groomed']]))});
 assert.match(empty,/No monitored club report matched/);
 const unlinked=context.routeResultHtml({...route,clubEvidence:null});
 assert.doesNotMatch(unlinked,/Which clubs work on this route/);
});

test('all seven public regions load the changed source-aware client, keeping canonical, advertising and route tools',()=>{
 const regions=['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan'];
 const generator=readFileSync(new URL('../scripts/generate-snowmobile-region-pages.mjs',import.meta.url),'utf8');
 assert.match(generator,/groomer-route-1/);
 const api=readFileSync(new URL('../api/snowmobile-route.js',import.meta.url),'utf8');
 assert.match(api,/routeClubEvidence\(route,built\.scoredGeometry\)/);
 for(const key of regions){
  const html=readFileSync(new URL('../public/snowmobile/regions/'+key+'.html',import.meta.url),'utf8');
  for(const marker of ['snowmobile-region.js?v=20261113-groomer-route-1','snowmobile.css?v=20261113-groomer-route-1','id="routePlanner"','id="parkingPlanner"','google-adsense-account'])assert.ok(html.includes(marker),key+': '+marker);
  assert.match(html,/rel="canonical"/);
 }
});
