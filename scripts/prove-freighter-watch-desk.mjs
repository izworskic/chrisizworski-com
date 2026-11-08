#!/usr/bin/env node
/** Foundry 0.3 source-captured improvement proof. Run in a full Git checkout. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startImprovement,assessRun,proveImprovement,reviewProof} from '../experience-foundry/lib/improvement.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({
  root,slug:'great-lakes-freighter-watch-desk',
  owner:'freighter-watch-desk',
  question:'At a selected Great Lakes shoreline and time, what actual vessel evidence can support a visit?',
  baseline:'3158b475a5debb11df2bf15846ba39a24da4e989',
  files:['public/great-lakes-ship-watching-spots/index.html'],
  newFiles:['public/assets/freighter-watch-desk.js','public/assets/freighter-watch-desk.css']
},registry);
const run=packet.run;
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
  visitorTask:'Choose a Great Lakes viewing area and time and receive a useful source-supported ship watch decision.',
  currentFriction:'The original static shore guide named good locations but left the visitor to compare multiple separate AIS maps and timing models.',
  capabilities:['The existing Soo source model supplies bounded channel passage windows, not guaranteed lock schedules.',
    'The Duluth source model supplies named canal candidates and window evidence; the lake-wide tracker supplies observed positions only.'],
  evidence:[{id:'static-guide',kind:'source',
    file:'public/great-lakes-ship-watching-spots/index.html',startLine:1,endLine:1,
    observation:'The captured canonical page provides editorial shore-viewing guidance and specialist links, with no live location-and-time decision controls.'}]
};
const evidenceIds=['static-guide'];
run.opportunities=[
  {id:'shore-decision',outcome:'Give a visitor a supported viewing window or an explained unknown state for the chosen shore and time.',
    evidenceIds,reuse:'Reuse the Soo and Duluth candidate models and existing live AIS endpoints, without adding a second ETA model.',
    effort:'Build a scoped decision adapter, mobile response panel, live map and fallback tests on the existing canonical.',
    risk:'Raw vessel positions must not be marketed as a shore sighting or a guaranteed future passage.'},
  {id:'vessel-continuity',outcome:'Preserve a chosen vessel identity across every specialist link and return trip.',
    evidenceIds,reuse:'Investigate existing MMSI selectors, specialist page state and passage detail anchors.',
    effort:'Requires destination-page adapters, loaded data identity checks and return-trip browser testing.',
    risk:'A query parameter can falsely imply the receiving page selected the intended vessel.'},
  {id:'weather-access',outcome:'Tell visitors whether access and weather justify traveling to a particular site.',
    evidenceIds,reuse:'Research official public shore access, cameras, buoy and local forecast sources per corridor.',
    effort:'Needs independently dated access and weather evidence before making visit-status recommendations.',
    risk:'Missing access data or marginal forecast evidence cannot become a false GO or safe-viewing claim.'}
];
run.selection={opportunityId:'shore-decision',
  rationale:'The existing specialized models can immediately resolve the largest observed friction while preserving their individual facts; identity and access follow only after source review.'};
run.concepts=[
  {id:'map-side-panel',opportunityId:'shore-decision',
    firstScreen:'Open the existing Great Lakes tracker map and use a new shore-choice drawer next to the current vessels.',
    interaction:'Select a nearby public shoreline marker and inspect the observed vessels or available corridor timing in a map-side panel.',
    completedAction:'The visitor uses one map and a shore filter to choose a viable watching area.',
    feasibility:'The existing tracker map and normalized vessel geometry can support such a drawer without a new provider.',
    tradeoff:'It risks crowding a ranking-performing tracker and shifts the visitor task away from the standalone shore guide.',evidenceIds},
  {id:'shore-watch-desk',opportunityId:'shore-decision',
    firstScreen:'On the existing canonical shore guide, select a location and today, now or tomorrow above a responsive vessel map.',
    interaction:'Show source-checked windows for eligible Soo or Duluth model candidates; otherwise current observations or an explicit unknown.',
    completedAction:'The visitor receives one readable evidence result and a linked verified specialist or shore-viewing guide.',
    feasibility:'Existing same-origin AIS APIs and a scoped JavaScript adapter allow additive HTML with no new backend or database.',
    tradeoff:'Live viewing results require JavaScript; the unchanged source-first guide remains the no-JavaScript path.',evidenceIds}
];
run.design={conceptId:'shore-watch-desk',reviewer:'Experience OS 1.2.1 and Foundry 0.3 agent review',
  rationale:'Place and visit time, not vessel identity, begin this distinctive shore-focused experience. It combines credible specialty predictions without replacing the canonical lake-wide vessel tracker, and never invents future passages.'};
run.scenarios=[
  {id:'shore-selection',role:'improvement',
    journey:'Open the existing shore guide and choose a watching place and departure time.',
    input:'A visitor chooses Soo Locks within the next 90 minutes.',
    expected:'The canonical guide contains interactive place and time selectors instead of sending the visitor to unrelated tools first.'},
  {id:'source-window',role:'improvement',
    journey:'Examine a recent named Soo vessel whose source candidate list supplies a matching arrival window.',
    input:'Fixture AIS candidate with a current timestamp, valid MMSI and 20-to-70-minute modeled window.',
    expected:'The source window is reproduced unaltered and the selected vessel remains visible in the evidence list.'},
  {id:'no-invented-eta',role:'improvement',
    journey:'Choose Port Huron and inspect a vessel observation with speed and a reported destination.',
    input:'Current AIS coordinates in the defined St. Clair River area.',
    expected:'The visitor sees observed activity only and receives no invented arrival time.'},
  {id:'uncertain-state',role:'improvement',
    journey:'Check a stale source and then switch to tomorrow.',
    input:'A ten-minute-old provider check followed by next-day selection.',
    expected:'The product produces distinct unavailable and unknown states without a passage recommendation.'},
  {id:'canonical-guide',role:'preservation',
    journey:'Open the existing public shoreline guide with no JavaScript.',
    input:'Canonical HTML plus FAQ, visitor source references and winter context.',
    expected:'The original editorial guide remains directly readable and retains its canonical URL and related winter link.'},
  {id:'creator-identity',role:'preservation',
    journey:'Inspect the author and structured creator identity.',
    input:'The original Person ID and visible footer creator attribution.',
    expected:'Person identity and the visible Chris Izworski byline remain in the HTML.'}
];
run.measurement={
  event:'A visitor changes the shore choice or opens the specialist evidence action.',
  distinguishingProperty:'The selection is linked to an explicit named shore corridor, not the generic lake-wide map.',
  completionSignal:'The selected corridor renders a current evidence verdict and offers a specific verified next tool.',
  baseline:'No complete historical interaction event series exists for this new surface; replay proves behavior, not visitor adoption.'
};
run.verifier='tests/freighter-watch-desk-foundry-replay.cjs';
const readiness=assessRun(run,packet.run?JSON.parse(packet.files['baseline.json']):null,registry);
if(!readiness.readyToImplement)throw Error('Incomplete Foundry assignment: '+readiness.blockers.map(x=>x.code).join(', '));
const snapshot=JSON.parse(packet.files['baseline.json']);
const result=await proveImprovement({root,run,snapshot,registry});
const review=await reviewProof({root,run,snapshot,proof:result.proof,registry});
const output=path.join(root,'artifacts/freighter-watch-desk-foundry');
await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'proof.json'),JSON.stringify(result.proof,null,2)+'\n');
await fs.writeFile(path.join(output,'run.json'),JSON.stringify(run,null,2)+'\n');
await fs.writeFile(path.join(output,'review.json'),JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({status:result.proof.status,review:review.status,
  cases:result.proof.comparison.map(c=>({id:c.id,result:c.result})),nextAction:result.proof.nextAction},null,2));
if(!result.proof.demonstrated||!review.demonstrated)process.exitCode=1;
