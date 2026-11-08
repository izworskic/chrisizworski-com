/** Foundry 0.3 genuine improvement assignment, pinned to the first live bridge release. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startImprovement} from '../lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../lib/output.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const snapshot=startImprovement({
  root,slug:'circle-tour-decision-sequence',
  owner:'circle-tour',
  question:'For the stops in my Lake Superior trip, which exact specialist decision should I make next, what remains unknown, and how do I advance to the next stop?',
  baseline:'faa4b83712a20f40c97d8ec161fd6d11332808db',
  files:[
    'public/assets/circle-tour-bridge.js',
    'public/assets/circle-tour-bridge.css',
    'public/lake-superior-circle-tour/index.html',
    'public/assets/circle-tour-tool-catalog.json',
    'public/assets/lake-superior-circle-tour-core.js'
  ]
},registry);
const run=snapshot.run;
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
  visitorTask:'Keep the chosen Circle Tour itinerary and identify one specific, useful next check for the visitor’s current stop, without falsely claiming live access.',
  currentFriction:'The first integration renders six generic specialist cards at once. A visitor with several stops must decide which check is next, which stop it belongs to, and whether the published trip direction matters. The route chips jump to detail rather than progressing the decision.',
  capabilities:[
    'The original 31-stop planner publishes selected stop IDs and a shareable URL, and emits trip-change, stop-open and preset-change events.',
    'The independent approved-only connection catalog has stop IDs, visitor questions, caveats, canonical specialist URLs and monthly season metadata.',
    'The bridge already protects special-tool ownership, official two-jurisdiction highway links, and the original trip planner when the catalog is unavailable.'
  ],
  evidence:[
    {id:'six-generic-results',kind:'source',file:'public/assets/circle-tour-bridge.js',startLine:123,endLine:162,
      observation:'The main response loops over up to six matching tools and only reports the count; there is no explicit single next decision or an ordering through selected stops.'},
    {id:'route-chip-not-decision',kind:'source',file:'public/assets/circle-tour-bridge.js',startLine:99,endLine:121,
      observation:'The stop chips are anchors to the original stop cards, not a control for changing the specialist decision surfaced by the integration.'},
    {id:'silent-focus-reset',kind:'source',file:'public/assets/circle-tour-bridge.js',startLine:183,endLine:194,
      observation:'A trip-change event clears an explicitly chosen stop if it is outside the new selected list, removing a visitor preference without explaining it.'},
    {id:'planner-has-source-events',kind:'source',file:'public/assets/lake-superior-circle-tour-core.js',startLine:98,endLine:107,
      observation:'The original planner already publishes authoritative selected stop IDs through its own public trip-change event.'},
    {id:'itinerary-direction-exists',kind:'source',file:'public/assets/lake-superior-circle-tour-core.js',startLine:236,endLine:242,
      observation:'Published itinerary preview events distinguish clockwise from counterclockwise direction; a separate route planner is unnecessary.'},
    {id:'existing-html-block',kind:'source',file:'public/lake-superior-circle-tour/index.html',startLine:429,endLine:470,
      observation:'The bridge places a filter bar, a route chip strip and a full grid of tools ahead of the source checks; the page already has Journey Atlas nearby.'}
  ]
};
run.opportunities=[
  {id:'decision-progression',
    outcome:'Replace the first set of indistinguishable tool cards with one scoped, sourced next-check decision and a real selected-stop progression.',
    evidenceIds:['six-generic-results','route-chip-not-decision','planner-has-source-events','existing-html-block'],
    reuse:'Read the existing saved itinerary, selectedIds and approved specialist metadata without writing to any independent tool.',
    effort:'Pure decision model, compact focused card, route-step controls, browser tests and complete Foundry replay.',
    risk:'A direction label could falsely imply navigation if it is not tied to an actually applied published itinerary.'},
  {id:'date-bound-access-engine',
    outcome:'Tell visitors if a particular ferry or park trip is actually usable on their proposed travel date.',
    evidenceIds:['six-generic-results','existing-html-block'],
    reuse:'Eventually work with existing independent ferry or park official source adapters under a clear freshness contract.',
    effort:'Requires independently checked, dated official source coverage, source rights, failure states and likely new APIs.',
    risk:'Seasonal metadata is not an opening or ticket confirmation and must not be promoted into a false go verdict.'},
  {id:'two-way-specialist-reentry',
    outcome:'Carry the selected itinerary into specialist destinations and return with confirmed updates in one continuous trip.',
    evidenceIds:['silent-focus-reset','planner-has-source-events'],
    reuse:'A future documented inter-tool context interface could be adopted by independently owned specialists.',
    effort:'Needs separate owner approvals, compatibility contracts and destination-level tests across different repositories.',
    risk:'Changing specialist internals here would violate the explicit independent-tool ownership boundary.'}
];
run.selection={
  opportunityId:'decision-progression',
  rationale:'The existing approved catalog supports an immediate useful answer while date-bound access and two-way engines need separately verified integrations. A single contextual decision removes the primary observed friction without risky source claims or changes to specialist tools.'
};
run.concepts=[
  {id:'one-check-stop-desk',opportunityId:'decision-progression',
    firstScreen:'A single visible stop title, immediate question, unknown/access caveat and destination action. Other specialists are secondary in a disclosure.',
    interaction:'Route chips and Previous/Next buttons advance across the saved stops; one primary decision updates from the curated specialist catalog, with an honest missing-match state and a reversible interest reset.',
    completedAction:'Visitor opens the relevant independent expert check, knows what to verify there and retains the original Circle Tour in another tab.',
    feasibility:'Uses existing selectedIds, saved itinerary direction, JS-only static catalog and no new network, source or location requirements.',
    tradeoff:'Does not claim to calculate optimal driving order, exact daily durations or ticket availability; user still verifies access at the destination.',
    evidenceIds:['six-generic-results','route-chip-not-decision','planner-has-source-events']},
  {id:'route-checklist-ledger',opportunityId:'decision-progression',
    firstScreen:'A personalized multi-stop checklist shows separate access, transport and experience decisions for all selected stops, with a completion state per row.',
    interaction:'Visitors mark each independently verified specialist decision complete and expand a stop for alternative actions; the checklist tracks unresolved tasks across the selected trip.',
    completedAction:'Visitor leaves with a manually verified checklist of stops and sources and knows which independent source to revisit.',
    feasibility:'Could use selected IDs and explicit local, in-page checkboxes without new APIs or background sources.',
    tradeoff:'Adds controls, storage/share semantics and a cognitive burden; a visitor might mistake manually checked items for verified current conditions.',
    evidenceIds:['six-generic-results','silent-focus-reset']}
];
run.design={
  conceptId:'one-check-stop-desk',
  reviewer:'Experience OS v1.2.1 agent review against existing Circle Tour/ Journey Atlas and original trip planner on November 8, 2026',
  rationale:'The decision-led desk is visually, hierarchically and behaviorally distinct from the map itinerary and photograph-led Journey Atlas. It gives one action, a prominent source limitation, reversible progress through applied trip stops and an explicit coverage gap. It retains the alternate checklist idea for later measured need instead of imposing task-completion storage.'
};
run.scenarios=[
  {id:'trip-one-next-check',role:'improvement',journey:'Choose summer Pictured Rocks, LSPP and Pukaskwa as a custom trip with water interests.',input:'Selected stop IDs 11, 15, 18; July 18, 2027; water interest.',expected:'One Pictured Rocks specialist question, its honest access caveat, stop one of three and next stop 15.'},
  {id:'applied-direction-progression',role:'improvement',journey:'Apply an actual published clockwise ten-day route and follow selected stops.',input:'The original planner saved an applied clockwise ten-day route in stop order 18, 15, 11.',expected:'The saved sequence starts at stop 18 then advances to stop 15, without reversing twice or inventing a driving route.'},
  {id:'honest-empty-next-action',role:'improvement',journey:'Choose a ship-watching interest at Pictured Rocks where no appropriate specialist has been approved.',input:'Stop 11 with ships interest while other interests have approved tools.',expected:'Explicit no-match state and a reversible invitation to consider another interest rather than invented access or unrelated links.'},
  {id:'season-evidence-progress',role:'improvement',journey:'Evaluate Pukaskwa as a winter parks stop while the usual specialist season is summer.',input:'Stop 18, February 20, 2027, parks interest.',expected:'The relevant Pukaskwa tool is identified but flagged as outside usual listed season, never portrayed as open.'},
  {id:'explicit-stop-not-in-plan',role:'improvement',journey:'Inspect Pictured Rocks even when the saved itinerary currently contains only Ontario stops.',input:'Selected stops 15, 18, manual focus 11.',expected:'The explicit stop remains visible and is labeled outside the saved itinerary without invented next-step movement.'},
  {id:'preserve-specialist-canonical',role:'preservation',journey:'Open the independently owned Pictured Rocks specialist.',input:'Stop 11 water interest and untrusted external URL.',expected:'Keep original first-party HTTPS canonical and block arbitrary foreign hosts from approved links.'},
  {id:'preserve-both-border-road-sources',role:'preservation',journey:'Prepare for both international border crossings.',input:'Stop 13 at Sault and stop 21 at Pigeon River.',expected:'Each crossing surfaces both official road jurisdictions without claiming live route status.'},
  {id:'preserve-return-link',role:'preservation',journey:'Leave and return to a published clockwise trip and selected specialist context.',input:'Stored itinerary 10 clockwise, stops 11 and 15, date and interest.',expected:'Share URL preserves plan, direction, date, explicit stop and interest without browser storage.'},
  {id:'preserve-original-planner',role:'preservation',journey:'Use the original map and 31-stop itinerary even if the bridge is unavailable.',input:'Static source and existing original planner event interface.',expected:'All 31 stop cards, canonical, HTML fallback and original core events remain unchanged.'}
];
run.measurement={
  event:'tool-bridge-next-check-open',
  distinguishingProperty:'Approved specialist tool ID, chosen stop ID, topic and usual-season flag; no precise visitor coordinates or date analytics.',
  completionSignal:'The visitor explicitly opens the highlighted independent specialist and keeps the active trip in the original tab; destination task completion is not claimed.',
  baseline:'No comparable live visitor funnel or controlled conversion export was obtained; deterministic replay compares behavior, not actual traffic uplift.'
};
run.verifier='experience-foundry/examples/circle-tour-decision-replay.cjs';
snapshot.files['run.json']=JSON.stringify(run,null,2)+'\n';
snapshot.files['READ_ME_FIRST.md']='Real Foundry 0.3 diagnosis for the existing Circle Tour bridge. The attached snapshot comes from the first merged production bridge commit. This packet does not rewrite specialist tools, assert live conditions, or claim measured visitor outcomes. Run assess, prove, assess --proof, then actual Chromium and full repository CI; their outcomes are separately reported.\n';
const out=await restrictedOutput(root,process.argv[2]||'experience-foundry/drafts/circle-tour-decision-sequence','experience-foundry/drafts');
await writePacket(out,snapshot.files);
console.log(path.relative(root,out)+'/run.json');
