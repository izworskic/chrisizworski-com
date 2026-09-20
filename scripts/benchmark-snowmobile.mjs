// Snowmobile release gate v1 — rerun after authority/closure hardening.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('public/snowmobile/index.html');
const ui=read('public/assets/snowmobile.js');
const css=read('public/assets/snowmobile.css');
const api=read('api/snowmobile.js');
const engine=read('lib/snowmobile/engine.mjs');
const sources=read('lib/snowmobile/sources.mjs');
const harness=read('lib/snowmobile/harness.mjs');
const sitemap=read('public/sitemap-winter.xml');
const drive=read('api/snowmobile-drive.js');
const checks=[];
const add=(name,points,ok,detail='')=>checks.push({name,points,earned:ok?points:0,ok,detail});
add('First-screen riding decision',20,['id="status"','id="best"','id="risk"','id="grooming"','id="forecastSnow"','id="routeStatus"','id="confidence"','id="drive"','id="sourceLine"','id="corridorSections"','id="originPreset"'].every(x=>page.includes(x))&&engine.includes('rankRideWindows')&&drive.includes("label:'Grayling, Michigan'"));
add('Trail/segment condition integrity',15,engine.includes('scoreSegment')&&api.includes('corridorSection')&&api.includes('featureLatitude')&&api.includes('statusFieldDoesNotSetLegalState'));
add('Grooming freshness',10,api.includes("freshness(r.lastGroomedAt,'grooming')")&&engine.includes('not used as current grooming evidence'));
add('Closure/reroute integrity',10,sources.includes('DNR_Trail_Temporary_Closures')&&engine.includes("routeState:'ROUTE_BROKEN'")&&engine.includes('verifiedClosure'));
add('Snow + freeze/thaw intelligence',10,engine.includes('maxTempF>=40')&&engine.includes('rainSignal===true')&&engine.includes('snowIn>=8')&&api.includes('NOHRSC_Snow_Analysis')&&page.includes('toggleSnowDepth'));
add('Source provenance + confidence',10,api.includes('truthBoundary')&&api.includes('confidence:conf')&&api.includes('sourceSummary')&&page.includes('Source contract')&&page.includes('data-field-camera="i75-grayling"'));
add('Route/corridor intelligence',10,engine.includes('worst.score+18')&&engine.includes("routeState:worst.score<35?'DETOUR_OR_AVOID'")&&api.includes('Grayling → Frederic → Waters → Gaylord')&&api.includes('sectionOrder'));
add('Mobile/map UX',5,css.includes('@media(max-width:760px)')&&page.includes('id="map"')&&ui.includes('L.geoJSON')&&page.includes('id="outlook72"')&&page.includes('id="useMyLocation"'));
add('Search/entity architecture',5,page.includes('rel="canonical" href="https://chrisizworski.com/snowmobile/"')&&page.includes('WebApplication')&&sitemap.includes('https://chrisizworski.com/snowmobile/'));
add('JEV safety + deterministic fallback',5,harness.includes("choice!=='NONE'")&&harness.includes('injection_dependency')&&harness.includes("mode:'deterministic'")&&harness.includes('Do not invent grooming'));
const hardVetoes=[
 ['Natural snow must not become trail base',api.includes('naturalSnowIsTrailBase:false')],
 ['NOHRSC depth must not become trail base',api.includes('nohrscSnowDepthIsTrailBase:false')],
 ['Forecast snow must not become observed accumulation',api.includes('forecastSnowIsAccumulatedSnow:false')],
 ['Missing closure must not mean confirmed open',api.includes('missingClosureIsNotConfirmedOpen:true')],
 ['General Status field must not control legal state',api.includes('statusFieldDoesNotSetLegalState:true')],
 ['JEV cannot set legal status',api.includes('jevCannotSetLegalStatus:true')],
 ['Closure must override route score',engine.includes("routeState:'ROUTE_BROKEN'")],
 ['Off-season must not manufacture ride score',engine.includes("score:null,band:'OFF_SEASON'")],
 ['JEV failure must fall back deterministically',harness.includes("mode:'deterministic'")],
 ['Drive routing cannot fabricate a fallback',drive.includes("Drive-time routing unavailable")&&drive.includes("DESTINATION")&&!drive.includes('estimatedMinutes')]
].map(([name,ok])=>({name,ok}));
const score=checks.reduce((n,c)=>n+c.earned,0);
console.log(JSON.stringify({score,total:100,checks,hardVetoes},null,2));
const failedVetoes=hardVetoes.filter(v=>!v.ok);
if(process.argv.includes('--check')&&(score<92||failedVetoes.length)){console.error(`Snowmobile release gate failed: ${score}/100, veto failures=${failedVetoes.length}`);process.exit(1);}
