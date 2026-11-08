#!/usr/bin/env node
/** Foundry 0.3: independent before/after replay for the complete visitor decision. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startImprovement,assessRun,proveImprovement,reviewProof} from '../experience-foundry/lib/improvement.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({root,slug:'freighter-shore-visit-verdict',
  owner:'freighter-watch-desk',
  question:'Should this visitor go to this public shoreline for a specific ship and time, and why?',
  baseline:'7aed09e449fd7b91aa67cebcf907b5284727772f',
  files:['public/great-lakes-ship-watching-spots/index.html',
    'public/assets/freighter-watch-desk.js','public/assets/freighter-watch-desk.css'],
  newFiles:['public/assets/freighter-watch-decision.js','lib/freighter-watch-sites.js',
    'api/freighter-watch-conditions.js']},registry);
const run=packet.run;
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
 visitorTask:'Decide whether a Great Lakes freighter-watching trip is worth making, to which named public shore, for which ship and time, with weather, access and uncertainties together.',
 currentFriction:'The existing Watch Desk makes the visitor inspect raw AIS and specialist links. It reports observed ships but does not combine source-supported passage, actual named site, weather or published visiting hours into a travel decision.',
 capabilities:['Re-use established Soo and Duluth candidate and modeled-time engines as the only ETA owners.',
   'Keep the existing six-region normalized AIS live map, clickable vessel report list and CARTO tile fallback.',
   'Use the NWS official point hourly forecast/alerts and published local government or USACE venue information, not an unverified GO score.'],
 evidence:[{id:'ais-only',kind:'source',file:'public/assets/freighter-watch-desk.js',startLine:1,endLine:3,
   observation:'Baseline explicitly describes a source-preserving AIS composition with only Soo and Duluth time windows; no complete trip recommendation exists.'},
  {id:'guide-only',kind:'source',file:'public/great-lakes-ship-watching-spots/index.html',startLine:1,endLine:1,
   observation:'The canonical guide displays a Watch Desk and editorial spots, but does not present weather, published access and a travel decision at the point of selection.'}]
};
run.opportunities=[
 {id:'complete-shore-verdict',outcome:'Answer with named public shoreline, conditional trip verdict, source-supplied ship time, published access hours, hourly weather, and specific next steps.',
  evidenceIds:['ais-only','guide-only'],reuse:'Preserve specialist AIS/ETA owners and normalized vessel positions; integrate allowlisted NWS and officially documented public shore choices.',
  effort:'One fixed-site weather adapter, visitor decision module, six-site land-manager inventory, new verdict surface and rigorous browser/failure tests.',
  risk:'Forecasts and park listings must not be confused with observed conditions, closures or a promise of a ship passing.'},
 {id:'follow-hull',outcome:'Carry the exact MMSI from a selected Watch Desk ship to specialist pages and back.',
  evidenceIds:['ais-only'],reuse:'Inspect regional selected-ship adapters, AIS identity and browser navigation semantics.',
  effort:'Requires receiver-side query and boat identity contracts for every specialist page.',
  risk:'A URL parameter alone could falsely claim the destination restored the selected ship.'},
 {id:'photography-guide',outcome:'Show verified ship photographs and camera compositions that fit the visiting shore and vessel size.',
  evidenceIds:['guide-only'],reuse:'Existing freighter vessel imagery catalog, shoreline maps and credited photographs.',
  effort:'Review rights, licenses, identity joins and responsive crop quality for every reused photo.',
  risk:'Incorrect ship photograph or unverified access route would mislead photographers.'}
];
run.selection={opportunityId:'complete-shore-verdict',
 rationale:'A named answer with honest weather and access limits resolves the unfinished visitor task now; vessel handoff and verified photography are valuable but secondary to a functioning go/no-go planning decision.'};
const opportunityId='complete-shore-verdict',evidenceIds=['ais-only','guide-only'];
run.concepts=[
 {id:'all-sources-dashboard',opportunityId,
  firstScreen:'A wide dashboard places AIS ships, regional weather, park notes and clocks in parallel.',
  interaction:'Visitors independently compare each map or data card and decide whether the outing is worthwhile.',
  completedAction:'A motivated visitor assembles a self-chosen viewing plan from the dashboard and official land-manager links.',
  feasibility:'All required components can be composed with same-origin current APIs without creating a new AIS provider.',
  tradeoff:'It remains a technically rich dashboard that places the core interpretation burden on casual visitors.',evidenceIds},
 {id:'shore-trip-verdict',opportunityId,
  firstScreen:'A visitor chooses the shoreline and time, then reads one evidence-qualified recommendation above an explorable AIS map.',
  interaction:'The answer changes between modeled passage, nearby-only, no ship-only trip, weather concern and published-hour conflict; official sources and route search are one tap away.',
  completedAction:'The visitor knows whether this ship justifies traveling, where to look, which hours matter, and what independent conditions remain unverified.',
  feasibility:'A pure JS evidence layer and allowlisted NWS point adapter can reuse the existing map and corridor model without Redis or new credentials.',
  tradeoff:'A definitive ship-only trip recommendation is sometimes impossible. The correct product must say so and provide a useful alternate shore plan.',evidenceIds}
];
run.design={conceptId:'shore-trip-verdict',reviewer:'Experience OS 1.2.1 / Foundry 0.3 agent design review',
 rationale:'The selected trip-verdict design is different from the flagship tracker (vessel first) and the static ship-watching guide (place descriptions). It leads with the specific visitor decision, its constraints and next action, while retaining inspectable AIS details and the map.'};
run.scenarios=[
 {id:'visitor-verdict-surface',role:'improvement',journey:'Select a public shore and viewing time in the existing canonical Watch Desk.',
  input:'A default Soo Locks visit, even before source loading.',expected:'A visible visit-verdict card names the actionable questions of public location, when, NWS weather and access.'},
 {id:'supported-window-trip',role:'improvement',journey:'Evaluate a recent supported Soo passage with a clear hourly forecast and published daytime hours.',
  input:'Source candidate with an unaltered 30–70 minute passage window, within reviewed Soo park hours and no active severe alert.',
  expected:'Give a qualified, named viewing plan with the source-supplied passage window and arrival preparation; no fabricated certainty.'},
 {id:'weather-veto',role:'improvement',journey:'Consider a promising ship when severe NWS weather is active at the viewing time.',
  input:'The same ship and site with an active High Wind Warning.',expected:'Weather warning overrides the ship incentive; visitor receives a clear recommendation to reconsider the outdoor trip.'},
 {id:'nearby-no-eta',role:'improvement',journey:'Choose Port Huron and examine a recent moving commercial AIS report near the shoreline reference.',
  input:'Fresh commercial vessel position without a corridor-specific arrival model.',
  expected:'Only an if-already-nearby shore opportunity appears, without a future passage time or route promise.'},
 {id:'broad-bay-honesty',role:'improvement',journey:'Choose Bay City while a freighter is reporting far offshore in Saginaw Bay.',
  input:'Broad-bay AIS position away from downtown and no river arrival model.',expected:'Do not recommend a downtown ship-only trip based on a distant bay dot.'},
 {id:'access-sources',role:'improvement',journey:'Consider one of six shoreline locations, including parks with unknown opening hours.',
  input:'Official land-manager source, a named public site and NWS shore forecast point.',expected:'Each place has a specific, linked official source, a named navigation search, and explicit unknown closure limitations.'},
 {id:'preserve-corridor-eta-owner',role:'preservation',journey:'Revisit original Soo Locks next-ship candidate selection.',
  input:'Identical fresh matching vessel identity and model-supplied passage window.',expected:'The original model-owned ETA candidate remains authoritative and its provided window is unchanged.'},
 {id:'preserve-canonical-editorial',role:'preservation',journey:'Read the ship-watching guide without JavaScript.',
  input:'Original HTML and canonical structured data.',expected:'Original editorial viewing guidance, FAQ, canonical and Person identity remain intact.'}
];
run.measurement={event:'freighter_watch_decision_action',
 distinguishingProperty:'Visitor-selected corridor, time and explicit verdict code separate from generic AIS interactions.',
 completionSignal:'Visitor reads a shore decision and explicitly follows directions, official access or named live-ship next action.',
 baseline:'No trustworthy visitor completion rate exists yet for the new decision. This replay measures bounded source behavior only, not adoption, weather truth or production access.'};
run.verifier='tests/freighter-watch-visit-foundry-replay.cjs';
const snapshot=JSON.parse(packet.files['baseline.json']);
const check=assessRun(run,snapshot,registry);
if(!check.readyToImplement)throw Error('Foundry assignment incomplete: '+check.blockers.map(b=>b.code).join(','));
const result=await proveImprovement({root,run,snapshot,registry});
const review=await reviewProof({root,run,snapshot,proof:result.proof,registry});
const dest=path.join(root,'artifacts/freighter-watch-visit-foundry');
await fs.mkdir(dest,{recursive:true});
for(const [name,data] of [['proof.json',result.proof],['review.json',review],['run.json',run]])
 await fs.writeFile(path.join(dest,name),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({status:result.proof.status,review:review.status,
 cases:result.proof.comparison.map(c=>({id:c.id,result:c.result})),nextAction:result.proof.nextAction},null,2));
if(!result.proof.demonstrated||!review.demonstrated)process.exitCode=1;
