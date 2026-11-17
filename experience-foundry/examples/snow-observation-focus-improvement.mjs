/** Reproducible Foundry 0.3 assignment for a real Snow Totals visitor handoff. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startImprovement} from '../lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../lib/output.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({
  root,slug:'snow-observation-focus',
  owner:'michigan-snow-totals',
  question:'Can I select one exact NWS snowfall report, locate it and inspect its source without silently changing the town or implying public access?',
  baseline:'9d8a5dabe2561552aa3e8cc7a786c07bd9967733',
  files:['public/assets/michigan-snow-totals.js','public/michigan-snow-totals/index.html']
},registry);
const run=packet.run;
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
  visitorTask:'Select the specific 27-inch report in the ranked list, locate its associated map marker, and open that same report\'s authoritative source.',
  currentFriction:'The ranked button stores only a base town string and starts a secondary town search, which can map to another report, an ambiguous township, or a delayed place lookup. Neither a stable selected-report ID nor a source-focused detail panel exists.',
  capabilities:[
    'Existing API supplies each report\'s place, county, observed timestamp, inches, coordinates, measured or estimated qualifier and optional original NWS product URL.',
    'SnowCore already ranks reports for the selected time window and region and supports nearby distance calculations.',
    'Leaflet layer already stores one marker per reported place and uses the allowlisted NWS product URL in source popups; the page already has native time controls and a no-JavaScript archive link.'
  ],
  evidence:[
    {id:'rank-button-town',kind:'source',file:'public/assets/michigan-snow-totals.js',startLine:132,endLine:148,observation:'The ranked control is keyed by data-pulse-town (derived from a base place name), not an exact observation identity.'},
    {id:'rank-click-async',kind:'source',file:'public/assets/michigan-snow-totals.js',startLine:368,endLine:385,observation:'Clicking a ranked item starts loadPlaces and re-renders a town search rather than binding the chosen report identity to the source detail and map.'},
    {id:'map-source-popup',kind:'source',file:'public/assets/michigan-snow-totals.js',startLine:81,endLine:104,observation:'The map already has evidence-bearing circle markers and original NWS popup links that can be synchronized without another map layer.'},
    {id:'original-html-archive',kind:'source',file:'public/michigan-snow-totals/index.html',startLine:169,endLine:190,observation:'The ranked card and existing map already have source links and a full report table, but no focused selected-report panel.'}
  ]
};
run.opportunities=[
  {id:'exact-report-focus',outcome:'A ranked or mapped source-backed observation becomes one reversible selected report, with precise NWS source and approximate location reference.',
    evidenceIds:['rank-button-town','rank-click-async','map-source-popup'],reuse:'Use existing NWS report fields, Leaflet markers and SnowCore nearby reports; no new provider request.',
    effort:'Small vanilla JS state and accessible source panel plus browser A-to-B-to-A testing.',risk:'Approximate reported coordinates must never become directions or a verified public entrance.'},
  {id:'storm-period-compare',outcome:'Compare total snowfall across equal-duration observations or storm periods rather than ranked individual reports.',
    evidenceIds:['rank-button-town','map-source-popup'],reuse:'Could reuse dated NWS reports as input after evaluating how observers aggregate durations.',
    effort:'Requires additional authoritative time-window/measurement semantics and a new source reconciliation contract.',risk:'Different spotter report durations cannot be honestly summed as equal storm totals.'},
  {id:'regional-source-coverage',outcome:'Show expected reporting coverage and age by county, not merely the latest report magnitude.',
    evidenceIds:['original-html-archive','map-source-popup'],reuse:'Existing source region IDs and NWS WFO fields may support coverage metadata if verified.',
    effort:'Research station cadence and systematic LSR publication coverage; source-qualified modeling.',risk:'No report does not establish a snow-free county, and models could imply unsupported certainty.'}
];
run.selection={opportunityId:'exact-report-focus',
  rationale:'The existing reports and map already contain sufficient verified evidence for a specific visitor action. The other two options require new measurement semantics or sampling-bias research; they are not safe visual-only modifications.'};
run.concepts=[
  {id:'inline-source-dossier',opportunityId:'exact-report-focus',
    firstScreen:'Preserve the number-first answer and map; when a ranked report is selected, reveal a compact evidence dossier directly below the ranked list, and highlight its exact map popup.',
    interaction:'Rank A, rank B, rank A or click a map marker; one stable report key changes visible pressed state, source, place, timestamp, nearby observations and coordinate-only map search together.',
    completedAction:'Visitor identifies which specific source report made the ranking and opens the original NWS text or approximate report area without losing the time-window context.',
    feasibility:'Uses existing JavaScript, Leaflet marker events, NWS attributes and native buttons. No new client library, backend, third-party fetch or build pipeline.',
    tradeoff:'The source dossier sits below the map to preserve the map-first viewport; linked report coordinates describe an approximate observation, never public arrival.',
    evidenceIds:['rank-button-town','rank-click-async','map-source-popup']},
  {id:'map-popup-ledger',opportunityId:'exact-report-focus',
    firstScreen:'Retain the report list and use a larger Leaflet popup alone as the primary report dossier, with a second full table for keyboard.',
    interaction:'Selecting a rank jumps the viewport into the map and opens the detailed popup; other places remain clickable.',
    completedAction:'Visitor sees the observed value, source, and approximate map reference in context with geographic neighbors.',
    feasibility:'Would change only popup HTML and focus behavior; native report table could supply fallback.',
    tradeoff:'Long popups obstruct the map on mobile, and keyboard focus can move offscreen from the ranked button. The inline source dossier preserves an accessible nearby reading path.',
    evidenceIds:['map-source-popup','original-html-archive']}
];
run.design={conceptId:'inline-source-dossier',reviewer:'Experience OS 1.2.1 and Foundry source inspection, November 17, 2026',
  rationale:'The explicit report dossier gives one immediate source-backed answer after a deliberate selection while retaining the map above it. It avoids competing with Michigan Snow Depth or Lake-Effect forecasting and preserves the existing visual tokens.'};
run.scenarios=[
  {id:'exact-ranked-report-reversal',role:'improvement',
    journey:'Select the leading NWS report, select a second report, then return to the first without a town lookup.',
    input:'Recorded two-place NWS fixture with different counties, coordinates, timestamps and original NWS URLs.',
    expected:'The selected title and authoritative source match A, then B, then A; pressed state and content remain coherent.'},
  {id:'approximate-not-directions',role:'improvement',
    journey:'Open an NWS observation location on Google Maps, not a driving-route instruction.',
    input:'Report coordinates at 46.2 N, 89.1 W and one report without valid Michigan coordinates.',
    expected:'A coordinate-based Google Maps search URL is available only for the real coordinates, and no directions URL is invented.'},
  {id:'source-fallback-without-place',role:'improvement',
    journey:'Show an exact record that does not have an allowlisted original NWS source link.',
    input:'Selected NWS row has no productUrl.',
    expected:'Honest unavailable original-link message; no fabricated NWS source URL, with observable location and timestamp.'},
  {id:'preserve-original-archive',role:'preservation',
    journey:'Read the source archive without JavaScript or an available map.',
    input:'Crawlable HTML and existing fallback.',
    expected:'The original NWS Local Storm Report archive and static canonical remain unchanged.'},
  {id:'preserve-report-allowlist',role:'preservation',
    journey:'A malicious or unsupported productURL must never be passed to a source action.',
    input:'A normal NWS URL and an untrusted URL.',
    expected:'Original allowlist preserves NWS HTTPS and rejects untrusted hosts.'}
];
run.measurement={event:'Explicit report selection via ranked button or map marker; no new analytics event is added.',
  distinguishingProperty:'Stable place+county+reportedAt identity and selected source action; not a share URL or saved home location.',
  completionSignal:'A real report detail becomes visible and links to the selected NWS text; outgoing click/user completion is not measured.',
  baseline:'The checked-in baseline shows a town lookup rather than an exact source panel. No GSC/GA4 event or visitor conversion export was read.'};
run.verifier='experience-foundry/examples/snow-observation-focus-replay.cjs';
packet.files['run.json']=JSON.stringify(run,null,2)+'\n';
packet.files['SCOPE.md']='Proof covers actual report detail construction with A-B-A selection, real coordinate-only Google Maps search and unchanged source/canonical invariants. Browser acceptance separately verifies Leaflet marker focus, keyboard, mobile, network failure and real tiles. Penpot-importable SVG is a design study; it is not claimed to be a live Penpot MCP run. REA was not invoked without an on-demand provider. No live visitor, CTR or production change is claimed.\n';
const out=await restrictedOutput(root,process.argv[2]||'experience-foundry/drafts/snow-observation-focus','experience-foundry/drafts');
await writePacket(out,packet.files);
console.log(path.relative(root,out)+'/run.json');
