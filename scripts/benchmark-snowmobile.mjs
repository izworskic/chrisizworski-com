// Snowmobile release gate v3: statewide expansion (7 regions) + UI rebuild
// + point-to-point route planner over the real DNR trail network.
// Extends v2's checks and hard vetoes rather than replacing them: every
// truth-boundary rule the single-corridor tool enforced still applies to
// every region, statewide or legacy. v2's per-region build pipeline (DNR
// fetch, scoring, truth-boundary payload) was extracted out of api.js into
// lib/snowmobile/build-region.mjs so the route planner could reuse it
// through the same cache instead of a second, drift-prone fetch path; the
// markers below were moved to match, not dropped.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const indexPage=read('public/snowmobile/index.html');
const indexJs=read('public/assets/snowmobile-index.js');
const regionJs=read('public/assets/snowmobile-region.js');
const css=read('public/assets/snowmobile.css');
const api=read('api/snowmobile.js');
const buildRegion=read('lib/snowmobile/build-region.mjs');
const engine=read('lib/snowmobile/engine.mjs');
const sources=read('lib/snowmobile/sources.mjs');
const harness=read('lib/snowmobile/harness.mjs');
const routing=read('lib/snowmobile/routing.mjs');
const routeApi=read('api/snowmobile-route.js');
const regionsConfig=read('lib/snowmobile/regions.mjs');
const sitemap=read('public/sitemap-winter.xml');
const drive=read('api/snowmobile-drive.js');
const routingTests=read('tests/snowmobile-routing.test.js');
const REGION_KEYS=['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan'];
const regionPages=Object.fromEntries(REGION_KEYS.map((k)=>[k,read(`public/snowmobile/regions/${k}.html`)]));
const legacyPage=regionPages['grayling-gaylord'];
const flatPage=regionPages['eastern-up'];
const checks=[];
const add=(name,points,ok,detail='')=>checks.push({name,points,earned:ok?points:0,ok,detail});

add('Statewide region roster is real and grounded',5,
  REGION_KEYS.every((k)=>regionsConfig.includes(`key: '${k}'`))
  &&regionsConfig.includes('OUT_OF_SCOPE_NOTE')
  &&regionsConfig.includes('legacyCorridor: true')
);
add('Statewide index is lightweight (no per-segment payload)',6,
  ['id="state-map"','id="region-list"','map-legend'].every(x=>indexPage.includes(x))
  &&indexJs.includes("fetch('/api/snowmobile')")
  &&buildRegion.includes('function regionSummary')
  &&!api.includes('regions:regionResults') // old fat statewide shape must not have survived
);
add('Two-mode API: statewide summary vs single-region detail',6,
  api.includes("req.query?.region")&&api.includes('buildRegion(region,ctx)')&&buildRegion.includes("Unknown region")
  &&buildRegion.includes('trimSegment')&&buildRegion.includes('scoredGeometryFrom')
);
add('api.js is a thin handler; the DNR fetch/scoring pipeline lives in one shared lib module',5,
  api.includes("await import('../lib/snowmobile/build-region.mjs')")&&!api.includes('function buildLegacyCorridor')&&!api.includes('function buildFlatRegion')
  &&buildRegion.includes('function buildLegacyCorridor')&&buildRegion.includes('function buildFlatRegion')&&buildRegion.includes('export async function computeRegionDetail')
);
add('Region detail pages exist for every region with correct embedded key',5,
  REGION_KEYS.every((k)=>regionPages[k].includes(`window.SNOWMOBILE_REGION=${JSON.stringify(k)}`))
);
add('Legacy corridor keeps its bbox fetch, club reports and camera; new regions do not fabricate them',5,
  legacyPage.includes('corridor-sections-wrap')&&legacyPage.includes('data-field-camera="i75-grayling"')
  &&!flatPage.includes('corridor-sections-wrap')&&!flatPage.includes('data-field-camera')
  &&regionJs.includes('No configured local club evidence source for this region yet')
);
add('Trail/segment condition integrity',6,engine.includes('scoreSegment')&&buildRegion.includes('closureForSegment')&&buildRegion.includes('featureLatitude')&&buildRegion.includes('statusFieldDoesNotSetLegalState')&&sources.includes('DNRTrailsOPENDATA')&&engine.includes('CLOSED_DNR_TRAIL_STATUS'));
add('"-1" placeholder trail-name bug is fixed',5,
  sources.includes("!=='-1'?p.TrailNetwork:null")&&sources.includes('rawNetwork||p.TrailNamePrimary')
);
add('rainIn/rainSignal client bug is fixed',5,
  regionJs.includes('rainSignal===true')&&!regionJs.includes('rainIn>=')
);
add('Closure/reroute integrity is statewide, not bbox-limited',5,sources.includes('DNR_Trail_Temporary_Closures')&&engine.includes("routeState:'ROUTE_BROKEN'")&&engine.includes('verifiedClosure')&&sources.match(/fetchDnrClosures[\s\S]{0,200}where:"1=1"/));
add('Closure name matching is exact, not substring (LP 4 vs LP 47 regression)',6,
  engine.includes('id===cid')&&engine.includes('name===cname')&&!engine.match(/id\.includes\(cid\)|cid\.includes\(id\)|name\.includes\(cname\)|cname\.includes\(name\)/)
  &&engine.includes("cid!=='dnr trail'")
);
add('Snow + freeze/thaw intelligence, region-aware bbox',5,engine.includes('maxTempF>=40')&&engine.includes('rainSignal===true')&&engine.includes('snowIn>=8')&&regionJs.includes('NOHRSC_Snow_Analysis')&&regionJs.includes('DATA&&DATA.bbox')&&indexPage.includes('state-map'));
add('Source provenance + confidence per region',5,buildRegion.includes('truthBoundary')&&buildRegion.includes('confidence:conf')&&buildRegion.includes('sourceSummary'));
add('Mobile/map UX',5,css.includes('@media(max-width:640px)')&&flatPage.includes('id="map"')&&regionJs.includes('L.geoJSON')&&flatPage.includes('id="outlook72"')&&flatPage.includes('id="useMyLocation"'));
add('Search/entity architecture covers index + all region pages',5,
  indexPage.includes('rel="canonical" href="https://chrisizworski.com/snowmobile/"')&&indexPage.includes('WebApplication')
  &&REGION_KEYS.every((k)=>sitemap.includes(`https://chrisizworski.com/snowmobile/regions/${k}.html`))
  &&sitemap.includes('https://chrisizworski.com/snowmobile/')
);
add('Route planner reuses the shared per-region cache instead of a second DNR fetch',5,
  routeApi.includes("await import('../lib/snowmobile/build-region.mjs')")&&routeApi.includes('computeRegionDetail')
  &&!routeApi.includes('fetchDnrTrailsByCounty')&&!routeApi.includes('fetchDnrCorridor')&&!routeApi.includes('fetchDnrClosures')
);
add('Route planner is deterministic graph pathfinding, not a JEV call',6,
  routing.includes('Dijkstra')&&!routing.includes('interpretClubReport')&&!routing.includes('jev-latest')&&!routeApi.includes('harness')
);
add('Route response is labeled as deterministic, not JEV, and route tests exist',5,
  routeApi.includes("engine:'deterministic-dijkstra'")&&routingTests.includes('never routes through a closed segment')
);
add('Route-planning UI is wired into every region page and the client reads the real API response, not a guess',5,
  REGION_KEYS.every((k)=>regionPages[k].includes('id="routePlanner"')&&regionPages[k].includes('id="routeModeToggle"')&&regionPages[k].includes('id="routeResult"'))
  &&regionJs.includes("fetch(`/api/snowmobile-route")&&regionJs.includes('onMapClick')&&regionJs.includes('MAP.on(\'click\',onMapClick)')
);

const hardVetoes=[
 ['Natural snow must not become trail base',buildRegion.includes('naturalSnowIsTrailBase:false')],
 ['NOHRSC depth must not become trail base',buildRegion.includes('nohrscSnowDepthIsTrailBase:false')],
 ['Forecast snow must not become observed accumulation',buildRegion.includes('forecastSnowIsAccumulatedSnow:false')],
 ['Missing closure must not mean confirmed open',buildRegion.includes('missingClosureIsNotConfirmedOpen:true')],
 ['General Status field must not control legal state',buildRegion.includes('statusFieldDoesNotSetLegalState:true')],
 ['Explicit DNR snowmobile status can close trail',buildRegion.includes('explicitSnowmobileOpenClosedStatusIsAuthoritative:true')&&engine.includes('CLOSED_DNR_TRAIL_STATUS')],
 ['JEV cannot set legal status',buildRegion.includes('jevCannotSetLegalStatus:true')],
 ['Closure must override route score',engine.includes("routeState:'ROUTE_BROKEN'")],
 ['Off-season must not manufacture ride score',engine.includes("score:null,band:'OFF_SEASON'")],
 ['JEV failure must fall back deterministically',harness.includes("mode:'deterministic'")],
 ['Drive routing cannot fabricate a fallback',drive.includes('Drive-time routing unavailable')&&drive.includes('DESTINATION')&&!drive.includes('estimatedMinutes')],
 ['Drive destination is always one of the tool\'s own hubs, never an arbitrary point',drive.includes('FALLBACK_DESTINATIONS')&&!drive.includes('req.query?.to')],
 ['Statewide index never ships a segment array (verified 26MB regression)',!indexJs.includes('.segments')&&!indexJs.includes('scoredGeometry')],
 ['Six new regions do not claim club evidence or a camera they do not have',!regionsConfig.match(/key: '(?!grayling-gaylord)[^']+'[\s\S]{0,400}(clubs:|cameraId:)/)],
 ['Route planner never returns a path through a segment marked legally closed',routing.includes('isLegallyClosed')&&routing.includes('continue')&&routingTests.includes('never routes through a closed segment')],
 ['Route planner checks closure independent of season (band, legalState, and officialStatus all covered)',routing.match(/band===.CLOSED./)&&routing.match(/legalState===.CLOSED./)&&routing.includes('officialStatus')],
 ['Route planner is never invoked with a fabricated destination; from/to always come from the request',routeApi.includes('parsePoint(req.query?.from)')&&routeApi.includes('parsePoint(req.query?.to)')],
 ['Route distance/geometry are measured from official DNR geometry, not asserted by JEV or hardcoded',routing.includes('haversineMiles')&&!routing.includes('jev')]
].map(([name,ok])=>({name,ok}));

const score=checks.reduce((n,c)=>n+c.earned,0);
console.log(JSON.stringify({score,total:100,checks,hardVetoes},null,2));
const failedVetoes=hardVetoes.filter(v=>!v.ok);
if(process.argv.includes('--check')&&(score<92||failedVetoes.length)){console.error(`Snowmobile release gate failed: ${score}/100, veto failures=${failedVetoes.length}`);process.exit(1);}
