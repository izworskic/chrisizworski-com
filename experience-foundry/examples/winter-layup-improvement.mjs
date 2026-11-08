/** Foundry v0.3 improvement assignment: dated harbor evidence, never silent time travel. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startImprovement} from '../lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../lib/output.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({
  root,slug:'winter-layup-harbor-journey',owner:'winter-layup',
  question:'For this harbor, what is documented this winter, what was documented before, and which evidence should I open?',
  baseline:'61d427b66901b84bc87f9883d74fb7247b1c1be2',
  files:['public/assets/freighter-layup-model.js','public/assets/freighter-layup.js',
    'public/assets/freighter-winter-home.css','public/great-lakes-freighter-winter-layup/index.html']
},registry);
const run=packet.run;
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
  visitorTask:'Choose a Great Lakes layup harbor and distinguish this winter\'s documented ships from earlier archived winters before opening a ship roster.',
  currentFriction:'When the selected winter lacks records for a harbor, the port-guide button silently switches to an archived winter and shows old ships without an explicit time choice.',
  capabilities:['America/Detroit current-winter rollover and curated historical seasons.',
    'Port-viewing cards already contain separate public shore guidance and linked vessel histories.',
    'Live arrival reports have source confidence and dates separate from harbor AIS activity.'],
  evidence:[
    {id:'silent-fallback',kind:'source',file:'public/assets/freighter-layup.js',startLine:354,endLine:363,
      observation:'Port-card click looks for historical records then invokes setSeason automatically when current records are absent.'},
    {id:'current-boundary',kind:'source',file:'public/assets/freighter-layup.js',startLine:119,endLine:143,
      observation:'The current-season desk deliberately distinguishes reported arrivals from empty evidence and prior winter berths.'},
    {id:'season-reset',kind:'source',file:'public/assets/freighter-layup.js',startLine:226,endLine:231,
      observation:'setSeason resets map and selected harbor, making the hidden archive jump hard to recognize.'},
    {id:'harbor-guide',kind:'source',file:'public/great-lakes-freighter-winter-layup/index.html',startLine:190,endLine:245,
      observation:'Existing purpose-built harbor cards mix public-viewing guidance, archival counts and roster actions.'}
  ]
};
run.opportunities=[
 {id:'explicit-harbor-evidence',outcome:'A visitor can deliberately open current records or an identified historical winter for the same harbor.',
   evidenceIds:['silent-fallback','current-boundary','harbor-guide'],reuse:'Reuse the existing registry, seasonal policy and harbor cards with no new source claims.',
   effort:'Small evidence policy extension, contextual choice UI and before/after regression replay.',
   risk:'Mobile controls must remain readable and older records must never masquerade as present berths.'},
 {id:'public-viewpoint-route',outcome:'Visitors can finish a public-shore viewing plan for each harbor without treating private docks as map destinations.',
   evidenceIds:['harbor-guide'],reuse:'Existing public access prose and port-by-port geography.',
   effort:'Independent permissions and geospatial verification for each specific viewing location.',
   risk:'Invented access or unsafe ice-viewing directions would be worse than an incomplete map.'},
 {id:'fresh-source-expansion',outcome:'More real arrival reports reach current-winter visitors as the season develops.',
   evidenceIds:['current-boundary'],reuse:'Current sourced ledger, Python report-triage pipeline and source confidence policy.',
   effort:'Fresh independent publisher sampling, verification and out-of-time evaluation.',
   risk:'No historical accuracy or publication claim is justified by feed discovery alone.'}
];
run.selection={opportunityId:'explicit-harbor-evidence',
  rationale:'The observed silent season change is a direct false-context risk with a clear, reversible visitor decision; source expansion and viewpoint validation need independent verification beyond this bounded release.'};
run.concepts=[
 {id:'inline-evidence-choices',opportunityId:'explicit-harbor-evidence',
  firstScreen:'The selected port card reveals the exact winter label, count, dated status and separate historical options below its shore-viewing guidance.',
  interaction:'Open the current source ledger or explicitly choose the dated current or archived harbor roster.',
  completedAction:'The visitor enters a specific harbor and winter by deliberate selection, retaining an unambiguous evidence label.',
  feasibility:'The existing client already has harbor IDs, seasonal states and a map/roster filter; no new network feed is needed.',
  tradeoff:'The field-guide card grows on interaction but keeps both the geographic context and public access warning visible.',
  evidenceIds:['silent-fallback','harbor-guide','current-boundary']},
 {id:'all-harbors-comparison',opportunityId:'explicit-harbor-evidence',
  firstScreen:'A compact cross-harbor evidence matrix shows all eight hubs and adjacent current/history columns.',
  interaction:'Choose a harbor row and a winter column before opening the roster and viewing guide.',
  completedAction:'The visitor compares temporal coverage across multiple ports before choosing one harbor.',
  feasibility:'All harbor references and season counts are already local and can be projected without new upstream data.',
  tradeoff:'The matrix increases comparison power but duplicates the purpose-built port cards and crowds a small screen.',
  evidenceIds:['harbor-guide','current-boundary']}
];
run.design={conceptId:'inline-evidence-choices',
  reviewer:'Foundry agent design review, 2026-11-08; independent browser/visual review remains required',
  rationale:'The contextual evidence chooser preserves the harbor\'s native editorial and public-viewing identity, surfaces temporal uncertainty at the moment of choice, and keeps scope small enough for a defensible two-version replay. The matrix is viable for a separate comparative-intent experiment.'};
run.scenarios=[
 {id:'unknown-current-season',role:'improvement',
  journey:'Open Superior from its port guide when the new winter has no sourced arrivals.',
  input:'Synthetic current 2026–27 ledger empty, with two historical Superior records in 2025–26.',
  expected:'The harbor decision shows zero current records and a separately labeled 2025–26 archive option without automatically selecting it.'},
 {id:'current-stay-vs-departed',role:'improvement',
  journey:'Examine a harbor once current winter reports begin to arrive and vessels may depart.',
  input:'Synthetic 2026–27 confirmed and reported arrivals plus a departed vessel; older historical records remain present.',
  expected:'Only current confirmed/reported stays count as current, departed stays are excluded, and archived options remain historically labeled.'},
 {id:'explicit-archive-transition',role:'improvement',
  journey:'Select an older winter explicitly from a harbor card rather than accepting an automatic archive fallback.',
  input:'A port with two historical seasons and a currently unreported winter.',
  expected:'Port-guide source presents an explicit archive button and no automatic setSeason when opening the card.'},
 {id:'existing-status-classification',role:'preservation',
  journey:'Inspect a pre-existing verified historical vessel and a departed current report.',
  input:'Synthetic historical confirmed record and current departed record.',
  expected:'Existing evidence policy still confirms historical reporting and marks departed reports as departed without calling them occupied.'}
];
run.measurement={event:'layup_harbor_evidence_choice',
  distinguishingProperty:'harbor_id, season_id and evidence_kind separate an archive decision from a current-season choice.',
  completionSignal:'A visitor explicitly selects a season and opens that harbor\'s roster; browser/GA4 measurement must validate this funnel.',
  baseline:'No consent-qualified interaction baseline was available for this new action; this Foundry replay proves only bounded synthetic model and source behavior.'};
run.verifier='experience-foundry/examples/winter-layup-replay.cjs';
packet.files['run.json']=JSON.stringify(run,null,2)+'\n';
packet.files['SCOPE.md']='Foundry 0.3 bounded product test. This replay uses synthetic vessel fixtures and source checks for the harbor-card choice; it does NOT claim verified current ships, actual dock access, browser quality, new search traffic, SEO uplift, deployment or visitor completion. Run separate browser and owner CI gates.\n';
const out=await restrictedOutput(root,process.argv[2]||'experience-foundry/drafts/winter-layup-harbor-journey','experience-foundry/drafts');
await writePacket(out,packet.files);
console.log(path.relative(root,out)+'/run.json');
