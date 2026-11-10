/** Place & Story: reviewable Foundry 0.3 before/after assignment against the live decision desk. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startImprovement} from '../lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../lib/output.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({root,slug:'circle-tour-place-story-pilot',owner:'circle-tour',
  question:'Can a Circle Tour visitor picture the selected park and understand the difference between its scenery and their practical next decision?',
  baseline:'d78a8bbdca3a02e636ead41a31ac0ae3226783b6',
  files:['public/assets/circle-tour-bridge.js','public/assets/circle-tour-bridge.css',
    'public/lake-superior-circle-tour/index.html','public/assets/circle-tour-tool-catalog.json'],
  newFiles:['public/assets/circle-tour-place-story-data.js']},registry);
const run=packet.run;run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
  visitorTask:'Choose the experience that fits a real Lake Superior park, understand its distinctive scenery and scale, then continue to the correct independent specialist decision.',
  currentFriction:'The existing stop decision has a correct next-check question and source caveat, but no site-exact photos or authored interpretive geography for the currently selected park.',
  capabilities:['Approved-only stop-to-specialist catalog and pure stop-specific decision sequence are already installed.',
    'Original itinerary, saved stop IDs, shareable link and keyboard stop progression work independently.',
    'An existing Ontario park photo standard and per-image Wikimedia Commons rights catalog establish reviewable sources.'],
  evidence:[
    {id:'existing-decision-without-place',kind:'source',file:'public/assets/circle-tour-bridge.js',
      startLine:172,endLine:197,observation:'The existing decision begins with a title and an approved tool check, but supplies no destination-specific documentary photographs or interpretation.'},
    {id:'html-has-original-fallback',kind:'source',file:'public/lake-superior-circle-tour/index.html',
      startLine:460,endLine:478,observation:'The current next-check panel, collapsible alternatives and static field-guide fallback are already in place and must not be replaced by a decorative gallery.'},
    {id:'official-park-places',kind:'external',url:'https://www.ontarioparks.ca/park/sleepinggiant/activities',
      checkedAt:'2026-11-09T08:20:00-05:00',
      limitation:'Published park activities and 21.8 km summit-route length; not current trail access, travel time or live weather.',
      observation:'The Top of the Giant requires a substantial return hike from parking, so its cliffs and nearby Sea Lion are materially different experiences.'},
    {id:'licensed-specific-photo',kind:'external',url:'https://commons.wikimedia.org/wiki/File:Old_Woman_Bay.jpg',
      checkedAt:'2026-11-09T08:20:00-05:00',
      limitation:'File-level photo and CC0 rights record, dated August 2022; does not depict current lake or road conditions.',
      observation:'A specific Old Woman Bay landscape photograph is reusable and distinguishable from generic Lake Superior stock imagery.'}
  ]};
run.opportunities=[
 {id:'place-story',outcome:'Help visitors understand exactly what makes their selected park visually and experientially different before following its specialist link.',
  evidenceIds:['existing-decision-without-place','official-park-places','licensed-specific-photo'],
  reuse:'Read existing selected stop ID, protect the existing decision hierarchy, use exact-place licensed photos and official published park descriptions.',
  effort:'Human-vetted six-photo catalog, interpretive field notes, responsive isolated renderer and browser failure tests.',
  risk:'A beautiful photo could falsely suggest open trails or could misidentify a neighboring shoreline without source-level checks.'},
 {id:'route-mood-comparison',outcome:'Compare the character of two named route stops before choosing which to prioritize.',
  evidenceIds:['existing-decision-without-place','html-has-original-fallback'],
  reuse:'Existing Journey Atlas destination summaries and saved stop selection could support side-by-side comparisons.',
  effort:'New compare controls and state synchronization with existing Journey Atlas.',
  risk:'Duplicates the separate Journey Atlas journey instead of helping the currently chosen stop.'},
 {id:'seasonal-recreation-proof',outcome:'Show a genuinely current photograph tied to date, weather and known visitor access for the selected park.',
  evidenceIds:['licensed-specific-photo','official-park-places'],
  reuse:'Official park notices could serve a separate access engine with date and validity controls.',
  effort:'Large: consented cameras, licensed dated images, current source adapters and historical source retention.',
  risk:'Dated stock images and a month label cannot prove future trail, beach or boat conditions.'}
];
run.selection={opportunityId:'place-story',
  rationale:'Exact-place documentary photography and specific narration add a meaningful visitor capability now while retaining all existing planning. Compared with a second Journey Atlas or pseudo-live seasonal imagery, the rights, landforms and editorial limits can be independently verified.'};
run.concepts=[
 {id:'decision-anchored-field-note',opportunityId:'place-story',
  firstScreen:'The already-tested park choice and specialist action remain immediately readable, followed by two complementary real photographs and a concise landscape field note.',
  interaction:'Selecting another planned stop synchronizes the park story, two attributed images, official source and existing decision, with unmatched stops rendered text-only.',
  completedAction:'Visitor chooses a park-specific specialist with a concrete mental picture of the shore, trail or headland and the scale of the outing.',
  feasibility:'A small static verified photo ledger and isolated bridge section require no map or specialist changes.',
  tradeoff:'Adds some vertical page length and relies on Wikimedia image delivery; preserve text if pictures fail.',
  evidenceIds:['existing-decision-without-place','licensed-specific-photo','official-park-places']},
 {id:'expandable-photographic-field-journal',opportunityId:'place-story',
  firstScreen:'A small photographic invitation sits alongside the original next-check action; the full photo essay opens only when requested.',
  interaction:'The visitor opens place field notes with multiple captions and a separate photo sequence, closing the journal to return to planning.',
  completedAction:'Visitor can explore photographic context in depth and still return to the same selected park decision.',
  feasibility:'Existing native details and selection state can support a small accessible disclosure without reworking the planner.',
  tradeoff:'Requires an extra tap to gain any sense of place, and adds another disclosure adjacent to existing specialist alternatives.',
  evidenceIds:['html-has-original-fallback','licensed-specific-photo']}
];
run.design={conceptId:'decision-anchored-field-note',
  reviewer:'Experience OS v1.2.1 site-specific editorial and visual research review, November 9, 2026',
  rationale:'The first concept preserves the proven practical answer while directly answering the missing sense-of-place task. It differs from Journey Atlas general inspiration because the photos and place distinction follow the exact current stop. An optional gallery drawer could be better for extended photo essays, not this compact bridge.'};
run.scenarios=[

 {id:'north-shore-photo-identity',role:'improvement',journey:'Select Grand Marais, Tettegouche and Split Rock Lighthouse and see two matching, attributed photos at each stop.',input:'Stop IDs 23, 26 and 27 and six Wikimedia Commons photo rights.',expected:'Each exact-place photo has a file-level author, source, license, dated caption and alt text.'},
 {id:'north-shore-distinct-visitor-choices',role:'improvement',journey:'Choose between harbor and Gunflint road trip, Shovel Point and High Falls, Split Rock shore and historic tour.',input:'Minnesota DNR, Minnesota Historical Society and Visit Cook County source-backed visitor distinctions.',expected:'Each stop answers a practical choice without inventing current trail access, tickets or conditions.'},
 {id:'north-shore-specialist-preservation',role:'preservation',journey:'Inspect Tettegouche and Split Rock specialist recommendations.',input:'Original current independent approval catalog for stops 26 and 27.',expected:'Tettegouche gains no invented specialist; approved Split Rock tool is unchanged.'},
 {id:'north-shore-no-photo-leakage',role:'preservation',journey:'Switch from Split Rock to unresearched nearby stops 24 and 25, then return to Grand Marais.',input:'Four fixed Circle Tour stop IDs.',expected:'Photographs and text always follow only their actual stop; unresearched locations remain photo-free.'},
 {id:'three-park-photo-identity',role:'improvement',journey:'Select Lake Superior Provincial Park, Sleeping Giant and Pukaskwa in turn.',
  input:'Three fixed approved stop IDs 15, 20 and 18 in the current Circle Tour.',
  expected:'Exactly two distinct, exact-location image records per park with licenses, authors, dates, captions and allowed Commons links.'},
 {id:'three-distinct-landscapes',role:'improvement',journey:'Read the interpretation after choosing each of the three Ontario parks.',
  input:'Same three selected stop IDs, using their original approved specialist catalog.',
  expected:'Specific authored shore, geology or hiking-scale story for each stop linked to the official park activity source.'},
 {id:'reactive-place-renderer',role:'improvement',journey:'Switch parks, return to the first and choose unresearched Cascade River.',
  input:'Stop sequence 15 then 20 then 15 then 24.',
  expected:'The bridge references the selected stop story at render and refuses an unrelated park photo on unresearched stop 24.'},
 {id:'preserve-existing-next-check',role:'preservation',journey:'Read approved park questions after selecting the same three stops.',
  input:'Stop 15 parks, stop 20 parks, stop 18 parks and one no-match interest.',
  expected:'The original approved tool decision and honest no-match behavior remain unchanged.'},
 {id:'preserve-planner-static',role:'preservation',journey:'Use the saved original route when the photo script is unavailable or JavaScript is disabled.',
  input:'Original 31 stop-card markup, canonical and no-JS field-guide fallback.',
  expected:'The original 31-stop planner, source fallback and canonical are retained with no new public URL.'},
 {id:'preserve-specialist-safety',role:'preservation',journey:'Open the approved specialist and inspect a foreign-host link.',
  input:'Existing approved Pukaskwa tool and malicious third-party candidate.',
  expected:'The approved specialist URL stays unchanged and foreign tool destinations remain blocked.'}
];
run.measurement={
 event:'tool-bridge-place-story-source-open',
 distinguishingProperty:'User-initiated official park source click with a bounded stop ID; passive rendering is not counted as a view.',
 completionSignal:'A visitor opens the sourced interpretation or existing highlighted specialist; this does not prove a visit was completed.',
 baseline:'No measured photo engagement or booking conversion baseline was available; the replay only demonstrates authored data and behavior.'};
run.verifier='experience-foundry/examples/circle-tour-place-story-replay.cjs';
packet.files['run.json']=JSON.stringify(run,null,2)+'\n';
packet.files['SCOPE.md']='This bounded Foundry proof checks story identity, attributed photographic metadata, source-backed interpretation and existing pure planning contracts. It does not prove live image loading, visual composition, current access, rights beyond source file assertions or visitor engagement; run browser QA and independent public smoke separately.\n';
const out=await restrictedOutput(root,process.argv[2]||'experience-foundry/drafts/circle-tour-place-story-pilot','experience-foundry/drafts');
await writePacket(out,packet.files);console.log(path.relative(root,out)+'/run.json');
