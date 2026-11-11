/** Foundry 0.3: real pre-change baseline, researched choices, then a candidate replay.
 * Visitor task: choose a *single* source-backed arrival at a selected Circle Tour stop. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startImprovement} from '../lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../lib/output.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const snapshot=startImprovement({
  root,slug:'circle-tour-arrival-choice',owner:'circle-tour',
  question:'Which specific, source-backed starting area fits my outing, and will the map, directions and trip link follow that choice?',
  baseline:'53ef82aa15a545c4d760c7512e84c988b1b605c8',
  files:[
    'public/assets/circle-tour-bridge.js',
    'public/assets/circle-tour-bridge.css',
    'public/lake-superior-circle-tour/index.html',
    'public/assets/circle-tour-tool-catalog.json',
    'public/assets/circle-tour-place-story-data.js'
  ]
},registry);
const run=snapshot.run;
run.owningRepository='izworskic/chrisizworski-com';
const checkedAt=new Date().toISOString();
run.diagnosis={
 visitorTask:'A traveler has chosen a Circle Tour stop and must identify the correct start for a concrete activity, see what is still uncertain and open one relevant map destination.',
 currentFriction:'At stops 19, 24 and 25 the current arrival desk renders two independent map actions and source cards simultaneously. No active choice connects the intended outing, displayed starting area, map target and shareable trip state. A ships-only interest at a park can still show a waterfall arrival.',
 capabilities:[
  'Eight unserved stops already provide source-backed visitor questions and official visitor links, separate from 22 approved first-party specialist tools.',
  'Eleven researched parking/search destinations include four land-manager/operator addresses, seven explicitly uncertain named searches and individual sources/caveats.',
  'The Circle Tour already has a saved-stop selector, route progression, share-link controls, 31-stop fallback and nine distinct Place & Story records.'
 ],
 evidence:[
  {id:'two-active-cards',kind:'source',file:'public/assets/circle-tour-bridge.js',startLine:482,endLine:506,
   observation:'The arrival desk iterates over both start records and exposes two equally weighted map links; there is no active start selection or synchronized state.'},
  {id:'return-link-misses-arrival',kind:'source',file:'public/assets/circle-tour-bridge.js',startLine:247,endLine:255,
   observation:'The existing share URL preserves stop/date/topic but cannot distinguish the two trailheads within that stop.'},
  {id:'existing-parking-ledger',kind:'source',file:'public/assets/circle-tour-bridge.js',startLine:84,endLine:198,
   observation:'The existing arrival catalog contains typed street addresses/search locations and source labels. No new geocoder or route engine is needed.'},
  {id:'existing-static-fallback',kind:'source',file:'public/lake-superior-circle-tour/index.html',startLine:460,endLine:479,
   observation:'The 31-stop guide has a real no-JavaScript fallback, map/trip planner and canonical; the improvement must not change them.'},
  {id:'parks-canada-starts',kind:'external',url:'https://www.parcs.canada.ca/amnc-nmca/on/super/activ/experiences/randonnees-hiking/nipigon',
   checkedAt,limitation:'Parks Canada describes 2.6 km return Lloyd’s Lookout from Red Rock and 10.1 km one-way full route; source is not live trail access or shuttle confirmation.',
   observation:'Red Rock supports both a short lookout outing and the full one-way trail; the current combined label does not explain that distinction near its map action.'},
  {id:'dnr-cascade',kind:'external',url:'https://www.dnr.state.mn.us/state-parks/virtual-tours/cascade-river/dialup.html',
   checkedAt,limitation:'Published virtual tour descriptions, not current trail or parking status.',
   observation:'DNR describes Lookout Mountain from a day-use parking area, not necessarily the park-office address supplied as an arrival option.'},
  {id:'mndot-construction',kind:'external',url:'https://www.dot.state.mn.us/news/2026/05/27-d1-cascade.html',
   checkedAt,limitation:'May 27, 2026 work announcement only. No reopening date or current access verdict may be inferred.',
   observation:'Cascade wayside parking was subject to construction changes; routing directly to an imprecise parking pin would risk a misleading visitor decision.'}
 ]
};
run.opportunities=[
 {id:'selected-arrival',outcome:'Show one active, source-backed arrival and allow a reversible choice that changes its map destination and source without losing the saved trip.',
  evidenceIds:['two-active-cards','return-link-misses-arrival','existing-parking-ledger','parks-canada-starts'],
  reuse:'Original eleven entry ledger, Google Maps address/search distinction, original single-stop decision and route URL.',
  effort:'Small pure chooser, buttons, one live card, URL query, source phrasing, responsive/browser and Foundry before-after replay.',
  risk:'An ambiguous start could be portrayed as a trailhead if park-office and wayside are incorrectly treated as interchangeable.'},
 {id:'live-parking-status',outcome:'Show open-now parking availability at each arrival.',
  evidenceIds:['existing-parking-ledger','mndot-construction'],
  reuse:'Land-manager notices and road information could contribute to a separate status engine.',
  effort:'Independent official adapters, freshness boundaries, change monitoring and actual lot-level coverage.',
  risk:'An old work-zone notice must never be upgraded into current open/closed parking status.'},
 {id:'surveyed-navigation-map',outcome:'Provide exact on-page route geometry from parking to every activity.',
  evidenceIds:['existing-parking-ledger','dnr-cascade','parks-canada-starts'],
  reuse:'Future official GIS route and parking data with source-level permissions.',
  effort:'Trailhead point and route centerline validation, GIS and seasonal/access coverage for two countries.',
  risk:'Address and street-search URLs are not validated surveyed parking or safe footpath geometries.'}
];
run.selection={opportunityId:'selected-arrival',rationale:'An active arrival choice and corresponding destination answers the immediate visitor problem with existing reviewed sources. Parking status and surveyed routes would require evidence the tool does not have and should remain separate investments.'};
run.concepts=[
 {id:'compact-choice-one-arrival',opportunityId:'selected-arrival',
  firstScreen:'The existing exact-stop outing question, official unknowns and action remain first; directly beneath, two compact named starting-area controls lead to one visible arrival note, map link and source.',
  interaction:'Keyboard/button selection switches one live arrival panel without moving focus; per-stop selection is reversible and the namespaced share URL restores the chosen start.',
  completedAction:'Visitor can identify the correct starting area, see uncertainty and open only the map or primary source belonging to that choice.',
  feasibility:'Pure state and minimal native controls extend the current static catalog; no external APIs, new maps or cross-tool changes.',
  tradeoff:'A visitor still verifies actual access and Google search matches; labels are editorial and not live parking availability.',
  evidenceIds:['two-active-cards','return-link-misses-arrival','existing-parking-ledger']},
 {id:'two-row-comparison-then-commit',opportunityId:'selected-arrival',
  firstScreen:'Two compact rows compare the map precision and caveat of each starting area, followed by an explicit confirmation that selects one destination.',
  interaction:'A visitor compares both arrival descriptions before checking one option and pressing a separate directions action.',
  completedAction:'Visitor understands both alternatives and commits to a chosen starting area using the original map provider.',
  feasibility:'Uses current two-source ledger with an additional confirmation state and no GIS dependencies.',
  tradeoff:'At 360 pixels, two evidence rows and a confirmation action repeat text and make simple one-stop visitors do more work.',
  evidenceIds:['two-active-cards','dnr-cascade','parks-canada-starts']}
];
run.design={conceptId:'compact-choice-one-arrival',
 reviewer:'Experience OS v1.2.1 editorial, safety and accessibility review for Circle Tour, 2026-11-11',
 rationale:'A distinct roadside arrival choice complements rather than clones the Circle Tour planner (route ordering) and Journey Atlas (visual destination exploration). One map action follows the selected real-world starting area; the focus stays on the native control, the source and historical access caveat remain adjacent, and 1-start stops do not gain decorative choices.'};
run.scenarios=[
 {id:'one-selected-map-and-source',role:'improvement',
  journey:'At Nipigon, choose the Marina walk and switch to the Red Rock start for Lloyd’s Lookout or the full trail.',
  input:'Stop 19, options 0 and 1; the exact same static Parks Canada fixtures in both revisions.',
  expected:'Only the active start determines the Google Maps URL and source; Red Rock explains 2.6-km return versus 10.1-km one-way full trail.'},
 {id:'shareable-selected-arrival',role:'improvement',
  journey:'Choose Red Rock, share the current Circle Tour, switch to Temperance River and return to Nipigon.',
  input:'Existing plan=19,25 and direction=clockwise; ctStop=19 and selected index 1.',
  expected:'ctArrival=1 is paired with ctStop=19 and survives in the returned link, but never leaks to another stop.'},
 {id:'interest-appropriate-guidance',role:'improvement',
  journey:'Ask for ships at Cascade River, then reset to the original waterfall options.',
  input:'Stop 24 with theme ships versus falls.',
  expected:'No waterfall map or irrelevant official handoff is presented under ships; the original park outing can be recovered explicitly.'},
 {id:'visible-choice-and-focus-contract',role:'improvement',
  journey:'Choose between two starts by keyboard and review the selected detail without focus jumping or an extra map.',
  input:'Nipigon/Temperance/Cascade with two actual starts each.',
  expected:'Renderer exposes a native button group, an aria-pressed active item, exactly one changing live detail and only one source/map action.'},
 {id:'preserve-eight-official-stops',role:'preservation',
  journey:'Select every original uncovered Circle Tour stop.',
  input:'Original eight stop IDs, eleven source-backed arrival entries and address/search types.',
  expected:'All existing source-backed starts, kinds and guide URLs remain; no unresearched destination is invented.'},
 {id:'preserve-safety-and-specialists',role:'preservation',
  journey:'Select an unsupported interest, a released Pictured Rocks specialist and a historic parking construction reference.',
  input:'Original catalog, Cascade wayside notes and published Park map/source.',
  expected:'Specialist ownership, no fabricated parking coordinates and caution about construction status all remain.'},
 {id:'preserve-place-and-original-site',role:'preservation',
  journey:'Switch between existing photo-rich parks and load the Circle Tour with JavaScript disabled.',
  input:'Original HTML canonical, 31 cards, static fallback and nine Place & Story IDs.',
  expected:'Original static visitor guide, canonical, nine-photo-story mapping and official stop sources remain intact.'}
];
run.measurement={
 event:'tool-bridge-arrival-choice followed by tool-bridge-arrival-map-open or tool-bridge-arrival-source-open',
 distinguishingProperty:'Exact stop ID, selected entry index and kind (published address versus named search); does not record precise coordinates, ETA, actual opening or completion.',
 completionSignal:'One deliberate map/source opening for the chosen starting area after the user has reviewed its matching caveat; on-site success remains unmeasured.',
 baseline:'No verified completed-visit outcomes or comparable funnel export was available. Foundry replays selection semantics only, while Chromium independently checks the actual DOM.'
};
run.verifier='experience-foundry/examples/circle-tour-arrival-choice-replay.cjs';
snapshot.files['run.json']=JSON.stringify(run,null,2)+'\n';
snapshot.files['READ_ME_FIRST.md']='The original baseline is the actual merged pre-improvement Circle Tour commit 53ef82a... . Source and experience are reviewed before implementing this two-way arrival choice. CI runs assess, prove, post-proof assess, Experience OS, Chromium and full repository audit as separate checks. Structural proof never establishes live park access or measured visitor conversion.\n';
const out=await restrictedOutput(root,process.argv[2]||'experience-foundry/drafts/circle-tour-arrival-choice','experience-foundry/drafts');
await writePacket(out,snapshot.files);
console.log(path.relative(root,out)+'/run.json');
