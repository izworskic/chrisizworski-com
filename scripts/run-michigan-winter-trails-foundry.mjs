/* Reproducible Experience Foundry improvement run for the Winter Trails desk.
 * Generates a baseline packet from the actual pre-change Git commit, fills
 * reviewed evidence, and leaves proving to the official Foundry CLI.
 */
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {startImprovement} from '../experience-foundry/lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../experience-foundry/lib/output.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({
 root,
 slug:'michigan-winter-trails-first-decision-20261122',
 owner:'michigan-winter-trails',
 question:'Can I see a documented trail choice quickly on my phone, inspect area weather, and return to the same choice?',
 baseline:'49bf85a36cb38c5b9b2f7f9d7cd433ca6cd1a74a',
 files:[
  'public/michigan-winter-trails/index.html',
  'public/assets/michigan-winter-trails.css',
  'public/assets/michigan-winter-trail-desk.js',
  'public/assets/michigan-winter-trail-weather.js'
 ]
},registry);
const run=packet.run,baseline=JSON.parse(packet.files['baseline.json']);
const evidence=(id,file,fragment,observation)=>{
 const snap=baseline.files.find(x=>x.path===file);
 if(!snap||!snap.content)throw Error('Missing actual baseline file: '+file);
 const at=snap.content.split('\n').findIndex(x=>x.includes(fragment));
 if(at<0)throw Error('Baseline evidence snippet not found: '+fragment);
 return {id,kind:'source',file,startLine:at+1,endLine:at+1,observation};
};
const html='public/michigan-winter-trails/index.html';
const desk='public/assets/michigan-winter-trail-desk.js';
const css='public/assets/michigan-winter-trails.css';
const weather='public/assets/michigan-winter-trail-weather.js';
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
 visitorTask:'Select an appropriate documented Michigan winter trail, check source-qualified area weather, and return to compare choices before travel.',
 currentFriction:'On a 390px live render, intro text and an oversized second caution occupy the first screen before a named option. The comparison cards have no direct action to reach the existing weather evidence and then return.',
 capabilities:[
  '15 fully source-backed trail dossiers with accurate region, activity and effort tags feed the existing shortlist engine.',
  'A two-option comparison is already available with stable trail IDs and a synchronized Leaflet map.',
  'The existing weather lens checks NOAA modeled snow, NWS forecasts and alerts without implying a groomed or open trail.'
 ],
 evidence:[
  evidence('intro-duplicate',html,'trl-desk-evidence','A separate multi-line safety callout follows a long introduction before any decision control.'),
  evidence('mobile-typography',css,'font-size:clamp(2.55rem,10vw,3.15rem)','The phone heading has a large baseline size while the introductory callout remains in the first vertical stack.'),
  evidence('no-card-weather',desk,"actions.append(visit);",'Each compared option offers field notes and the manager but not the existing area-weather action.'),
  evidence('existing-weather-event',weather,"winter-trails:check-weather",'The shared weather inspector already supports stable route-ID selection from another surface.')
 ]
};
run.opportunities=[
 {id:'first-choice-continuity',outcome:'Bring a named trail decision into the first phone screen and let the visitor check area weather from that choice with a return path.',
  evidenceIds:['intro-duplicate','mobile-typography','no-card-weather','existing-weather-event'],
  reuse:'Keep the existing shortlist, all 15 dossiers, weather event controller, map and official-source handoffs.',
  effort:'Small HTML/CSS hierarchy change and two browser event actions.',
  risk:'Mobile density or focus transfer must not hide source qualifications, change the native map, or falsely equate NOAA weather with trail access.'},
 {id:'real-trail-geometry',outcome:'Show credible complete winter loop shapes and exact matched entrances on the map.',
  evidenceIds:['existing-weather-event'],reuse:'Existing DNR/NPS source catalog and Leaflet.',
  effort:'Large: verify every route line, geometry identity, public access and winter arrival with land managers.',
  risk:'Unverified segments and reference points cannot be represented as navigable winter parking or open trail.'},
 {id:'live-operator-maintenance',outcome:'Integrate actual dated groomer and winter lot status for the matched route.',
  evidenceIds:['no-card-weather','existing-weather-event'],reuse:'Reuse the weather lens source-age and unknown-status contract.',
  effort:'Large: build and maintain authoritative operator-specific updates and expiring access checks.',
  risk:'Incomplete groomer feed must not become a statewide open/safe recommendation.'}
];
run.selection={opportunityId:'first-choice-continuity',
 rationale:'The verified first-screen delay and missing weather handoff can be resolved with the already deployed source-backed data. Geometry and grooming evidence do not yet meet the site safety gate.'};
run.concepts=[
 {id:'compact-comparison-journey',opportunityId:'first-choice-continuity',
  firstScreen:'A concise ranger-like heading and activity/region choices lead directly to named comparison options before the first phone viewport ends.',
  interaction:'Filter two evidence-linked trail choices; open weather from either card; return by keyboard or button to the same compared route.',
  completedAction:'A visitor can choose a trail, read source-qualified regional weather, inspect the official manager link and resume comparing.',
  feasibility:'Reuse four existing files, map and weather custom event with no additional network, backend or paid infrastructure.',
  tradeoff:'The full illustrative field-guide photography remains below the comparison for visitors who want a richer place story.',
  evidenceIds:['intro-duplicate','mobile-typography','no-card-weather','existing-weather-event']},
 {id:'map-first-place-drawer',opportunityId:'first-choice-continuity',
  firstScreen:'A compact map with a selected-place drawer and activity chips replaces the existing comparison as the dominant phone entry.',
  interaction:'Tap a named list row or pin, then open a route/weather drawer with a persistent return-to-list control.',
  completedAction:'A visitor selects a destination from a geographic overview, checks nearby weather and returns to mapped alternatives.',
  feasibility:'The existing Leaflet markers, route IDs and static list could power a selected-place drawer without a new API.',
  tradeoff:'Considerably more responsive design, focus and tile-failure work; regional pins are only area references and cannot be sold as verified arrival points.',
  evidenceIds:['mobile-typography','existing-weather-event']}
];
run.design={conceptId:'compact-comparison-journey',reviewer:'Experience Investment and Experience OS design review, 2026-11-22',
 rationale:'A direct compared-trail-to-weather handoff fixes the observed completion gap. Compacting the introduction moves the named answer ahead of redundant warnings while preserving all 15 dossiers and source caveats lower in the decision desk. The map-first alternative cannot offer verified winter entrance points.'};
run.scenarios=[
 {id:'first-phone-decision',role:'improvement',journey:'Load the winter guide at phone width and inspect the beginning of the first named trail option.',
  input:'390px visitor, default snowshoe choice.',expected:'Use a compact intro and corresponding mobile hierarchy; browser QA independently measures the actual first-option viewport position.'},
 {id:'compared-trail-weather',role:'improvement',journey:'Compare Pictured Rocks and Tahquamenon, request the weather for the selected option without first scrolling through all dossiers.',
  input:'Click weather from a generated compared trail card.',expected:'Dispatch the stable selected trail ID to the existing on-demand regional weather inspector.'},
 {id:'return-to-same-choice',role:'improvement',journey:'After reading NOAA and NWS evidence, return to the current compared option using a visible keyboard-friendly action.',
  input:'A clicked route is still shown in the current pair.',expected:'Return focus to the originally selected compared option; fallback to activity filter if the pair changed.'},
 {id:'winter-source-preservation',role:'preservation',journey:'Browse all original state/national park trail systems with official links.',
  input:'No JavaScript or weather service unavailable.',expected:'All 15 HTML dossiers and source/winter safety disclosures remain.'},
 {id:'canonical-ads-preservation',role:'preservation',journey:'Load the indexable field guide and existing AdSense configuration.',
  input:'Normal page request.',expected:'Canonical, Person, original Auto ads and no-script fallback remain unchanged.'},
 {id:'map-and-weather-fallback',role:'preservation',journey:'Use field notes if map tiles or live weather sources are missing.',
  input:'No map tiles and unavailable NOAA/NWS.',expected:'A readable static map fallback and source-qualified unavailable weather explanation remain.'}
];
run.measurement={
 event:'A visitor starts from a named comparison option and requests area weather.',
 distinguishingProperty:'The route ID in the compared trail weather action identifies this new path, distinct from dossier and map popup actions.',
 completionSignal:'The selected ID appears in the weather inspector and the return control focuses the associated comparison option.',
 baseline:'No action-level visitor analytics available. Foundry source replay measures handoff presence; browser QA separately reports visual position and actual changed state, not visitor conversion.'
};
run.verifier='tests/michigan-winter-trails-experience-replay.cjs';
packet.files['run.json']=JSON.stringify(run,null,2)+'\n';
packet.files['SCOPE.md']='The Foundry replay proves source-level first-screen structure, trail-to-weather event wiring, return focus wiring and preservation. It cannot certify browser layout, actual NOAA coverage, live access, photos, ad placement or visitor outcomes; those require independent browser and production checks.\n';
const out=await restrictedOutput(root,'experience-foundry/drafts/michigan-winter-trails-first-decision-20261122','experience-foundry/drafts');
await writePacket(out,packet.files);
console.log(path.relative(root,out)+'/run.json');
