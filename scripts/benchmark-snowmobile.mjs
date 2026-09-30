// Snowmobile release gate v4: destination decision product.
// The hard boundary is now explicit: legal status + snow + weather can
// describe context and deterioration risk, but only current local
// trail-surface evidence may produce a positive ride-quality score.
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
const surface=read('lib/snowmobile/surface-evidence.mjs');
const harness=read('lib/snowmobile/harness.mjs');
const routing=read('lib/snowmobile/routing.mjs');
const routeApi=read('api/snowmobile-route.js');
const regionsConfig=read('lib/snowmobile/regions.mjs');
const sitemap=read('public/sitemap-winter.xml');
const drive=read('api/snowmobile-drive.js');
const routingTests=read('tests/snowmobile-routing.test.js');
const decisionTests=read('tests/snowmobile.test.js');
const generator=read('scripts/generate-snowmobile-region-pages.mjs');
const REGION_KEYS=['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan'];
const regionPages=Object.fromEntries(REGION_KEYS.map((k)=>[k,read(`public/snowmobile/regions/${k}.html`)]));
const legacyPage=regionPages['grayling-gaylord'];
const flatPage=regionPages['eastern-up'];
const checks=[];
const add=(name,points,ok,detail='')=>checks.push({name,points,earned:ok?points:0,ok,detail});

add('Statewide region roster is real and grounded',5,
  REGION_KEYS.every((k)=>regionsConfig.includes(`key: '${k}'`))&&regionsConfig.includes('OUT_OF_SCOPE_NOTE')&&regionsConfig.includes('legacyCorridor: true')
);
add('Statewide index is lightweight and decision-first',6,
  ['id="state-map"','id="region-list"','map-legend'].every(x=>indexPage.includes(x))
  &&indexPage.indexOf('id="region-list"')<indexPage.indexOf('id="state-map"')
  &&indexJs.includes("fetch('/api/snowmobile')")&&buildRegion.includes('function regionSummary')&&!api.includes('regions:regionResults')
);
add('Two-mode API: statewide summary vs single-region detail',6,
  api.includes("req.query?.region")&&api.includes('buildRegion(region,ctx)')&&buildRegion.includes('Unknown region')&&buildRegion.includes('trimSegment')&&buildRegion.includes('scoredGeometryFrom')
);
add('One shared region pipeline feeds detail and route planner',5,
  api.includes("await import('../lib/snowmobile/build-region.mjs')")&&!api.includes('function buildLegacyCorridor')&&!api.includes('function buildFlatRegion')
  &&buildRegion.includes('function buildLegacyCorridor')&&buildRegion.includes('function buildFlatRegion')&&buildRegion.includes('export async function computeRegionDetail')
);
add('Region detail pages exist for every region with correct embedded key',5,
  REGION_KEYS.every((k)=>regionPages[k].includes(`window.SNOWMOBILE_REGION=${JSON.stringify(k)}`))
);
add('Legacy corridor keeps direct club evidence; new regions do not fabricate it',5,
  legacyPage.includes('corridor-sections-wrap')&&legacyPage.includes('data-field-camera="i75-grayling"')
  &&!flatPage.includes('corridor-sections-wrap')&&!flatPage.includes('data-field-camera')
  &&regionJs.includes('No current local surface-report feed is configured')
);
add('Trail/segment condition integrity',6,
  engine.includes('scoreSegment')&&buildRegion.includes('closureForSegment')&&buildRegion.includes('featureLatitude')&&buildRegion.includes('statusFieldDoesNotSetLegalState')&&sources.includes('DNRTrailsOPENDATA')&&engine.includes('CLOSED_DNR_TRAIL_STATUS')
);
add('"-1" placeholder trail-name bug is fixed',5,sources.includes("!=='-1'?p.TrailNetwork:null")&&sources.includes('rawNetwork||p.TrailNamePrimary'));
add('Rain/thaw client semantics are explicit',5,regionJs.includes('rainSignal===true')&&!regionJs.includes('rainIn>=')&&regionJs.includes('recentWeatherLabel'));
add('Current official DNR closure feed is normalized; reroute feed is discoverable',5,
  sources.includes('DNR_RESTRICTIONS_BASE')&&sources.includes('DNR_REROUTES')&&sources.includes('fetchDnrReroutes')&&sources.includes('normalizeRestrictionFeature')&&engine.includes("routeState:'ROUTE_BROKEN'")
);
add('Closure name matching is exact, not substring',6,
  engine.includes('id===cid')&&engine.includes('name===cname')&&!engine.match(/id\.includes\(cid\)|cid\.includes\(id\)|name\.includes\(cname\)|cname\.includes\(name\)/)&&engine.includes("cid!=='dnr trail'")
);
add('Observed snow + recent weather are integrated as supporting evidence',5,
  surface.includes('NWS Local Storm Reports')&&surface.includes('recentWeatherForPoint')&&buildRegion.includes('surfaceEvidence')&&engine.includes('thawRisk')&&regionJs.includes('snowEvidenceLabel')&&regionJs.includes('NOHRSC_Snow_Analysis')
);
add('Source provenance + confidence per region',5,buildRegion.includes('truthBoundary')&&buildRegion.includes('confidence:conf')&&buildRegion.includes('sourceSummary')&&api.includes('rankableRegionCount'));
add('Mobile/map UX',5,css.includes('@media(max-width:640px)')&&flatPage.includes('id="map"')&&regionJs.includes('L.geoJSON')&&flatPage.includes('id="outlook72"')&&flatPage.includes('id="useMyLocation"'));
add('Search/entity architecture covers index + all region pages',5,
  indexPage.includes('rel="canonical" href="https://chrisizworski.com/snowmobile/"')&&indexPage.includes('WebApplication')
  &&REGION_KEYS.every((k)=>sitemap.includes(`https://chrisizworski.com/snowmobile/regions/${k}.html`))&&sitemap.includes('https://chrisizworski.com/snowmobile/')
  &&generator.includes('Snowmobile Trail Conditions')
);
add('Route planner reuses shared per-region cache instead of a second DNR fetch',5,
  routeApi.includes("await import('../lib/snowmobile/build-region.mjs')")&&routeApi.includes('computeRegionDetail')&&!routeApi.includes('fetchDnrTrailsByCounty')&&!routeApi.includes('fetchDnrCorridor')&&!routeApi.includes('fetchDnrClosures')
);
add('Route planner is deterministic graph pathfinding, not a JEV call',6,routing.includes('Dijkstra')&&!routing.includes('interpretClubReport')&&!routing.includes('jev-latest')&&!routeApi.includes('harness'));
add('Route response is labeled deterministic and route tests exist',5,routeApi.includes("engine:'deterministic-dijkstra'")&&routingTests.includes('never routes through a closed segment'));
add('High-cost decision failure cases are regression-tested',5,
  decisionTests.includes('fresh 10 inch snowfall without a surface report stays UNKNOWN')
  &&decisionTests.includes('recent rain and thaw downgrade')
  &&decisionTests.includes('aging positive report is capped at FAIR')
  &&decisionTests.includes('major thaw forecast lowers')
);

const hardVetoes=[
 ['Natural snow must not become trail base',buildRegion.includes('naturalSnowIsTrailBase:false')],
 ['Observed snowfall must not become trail base',buildRegion.includes('observedSnowfallIsTrailBase:false')],
 ['NOHRSC depth must not become trail base',buildRegion.includes('nohrscSnowDepthIsTrailBase:false')],
 ['Forecast snow must not become observed accumulation',buildRegion.includes('forecastSnowIsAccumulatedSnow:false')],
 ['Forecast snow cannot upgrade current trail score',buildRegion.includes('forecastSnowCanUpgradeCurrentTrailScore:false')&&!engine.includes('score+=6')],
 ['Current surface report is required for ride-quality scoring',buildRegion.includes('currentSurfaceReportRequiredForRideQuality:true')&&engine.includes("band:'UNKNOWN'")&&engine.includes("surfaceState:'UNVERIFIED'")],
 ['No direct surface report can never be high-confidence',engine.includes('return Math.min(45,s)')],
 ['Aging positive report cannot exceed FAIR',engine.includes('Math.min(score,59)')],
 ['Missing closure must not mean confirmed open',buildRegion.includes('missingClosureIsNotConfirmedOpen:true')],
 ['General Status field must not control legal state',buildRegion.includes('statusFieldDoesNotSetLegalState:true')],
 ['Explicit DNR snowmobile status can close trail',buildRegion.includes('explicitSnowmobileOpenClosedStatusIsAuthoritative:true')&&engine.includes('CLOSED_DNR_TRAIL_STATUS')],
 ['JEV cannot set legal status',buildRegion.includes('jevCannotSetLegalStatus:true')],
 ['Closure must override route score',engine.includes("routeState:'ROUTE_BROKEN'")],
 ['Off-season must not manufacture ride score',engine.includes("score:null,band:'OFF_SEASON'")],
 ['JEV failure must fall back deterministically',harness.includes("mode:'deterministic'")],
 ['Drive routing cannot fabricate a fallback',drive.includes('Drive-time routing unavailable')&&drive.includes('DESTINATION')&&!drive.includes('estimatedMinutes')],
 ['Drive destination is always one of the tool\'s own hubs',drive.includes('FALLBACK_DESTINATIONS')&&!drive.includes('req.query?.to')],
 ['Statewide index never ships a segment array',!indexJs.includes('.segments')&&!indexJs.includes('scoredGeometry')],
 ['Six new regions do not claim club evidence or a camera',!regionsConfig.match(/key: '(?!grayling-gaylord)[^']+'[\s\S]{0,400}(clubs:|cameraId:)/)],
 ['Route planner never returns a path through a legally closed segment',routing.includes('isLegallyClosed')&&routing.includes('continue')&&routingTests.includes('never routes through a closed segment')],
 ['Route planner checks closure independent of season',routing.match(/band===.CLOSED./)&&routing.match(/legalState===.CLOSED./)&&routing.includes('officialStatus')],
 ['Route planner is never invoked with fabricated from/to points',routeApi.includes('parsePoint(req.query?.from)')&&routeApi.includes('parsePoint(req.query?.to)')],
 ['Route distance/geometry come from official DNR geometry',routing.includes('haversineMiles')&&!routing.includes('jev')]
].map(([name,ok])=>({name,ok}));

const score=checks.reduce((n,c)=>n+c.earned,0);
const total=checks.reduce((n,c)=>n+c.points,0);
console.log(JSON.stringify({score,total,checks,hardVetoes},null,2));
const failedVetoes=hardVetoes.filter(v=>!v.ok);
if(process.argv.includes('--check')&&(score<Math.ceil(total*.92)||failedVetoes.length)){console.error(`Snowmobile release gate failed: ${score}/${total}, veto failures=${failedVetoes.length}`);process.exit(1);}
