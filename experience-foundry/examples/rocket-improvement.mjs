/** Reproducible diagnostic example. Reads Rocket source; never edits the product. */
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {startImprovement} from '../lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../lib/output.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({root,slug:'rocket-continuity-review',owner:'rocket-launch-usa',
  question:'Can a visitor continue into regional viewing guidance with the selected mission?',
  baseline:'9221c3e638e2e30d564c6d3e3479bad0ed90dde0',files:['public/assets/rocket-flight-desk.js']},registry);
const run=packet.run;
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={visitorTask:'Continue a selected launch decision into its regional viewing guide.',
  currentFriction:'The new contextual source link omits the launch ID while hiding the older ID-preserving regional link.',
  capabilities:['Existing regional guides accept a launchId and restore a mission.',
    'The national flight desk already maintains one selected mission and qualified evidence.'],
  evidence:[{id:'contextual-link',kind:'source',file:'public/assets/rocket-flight-desk.js',startLine:140,endLine:206,
    observation:'nextCheck returns an unqualified specialist URL for the selected mission.'},
  {id:'hidden-existing-link',kind:'source',file:'public/assets/rocket-flight-desk.js',startLine:242,endLine:273,
    observation:'The contextual href is used directly; the older guide link that adds launchId is hidden in specialist states.'}]};
run.opportunities=[
  {id:'mission-continuity',outcome:'Keep the chosen mission when moving into regional planning.',
    evidenceIds:['contextual-link','hidden-existing-link'],reuse:'Reuse the existing UUID and regional URL input.',
    effort:'Link correction plus destination and return-journey verification.',risk:'An expired or missing mission must never be silently replaced.'},
  {id:'evidence-progression',outcome:'Advance to the next useful question when access evidence is available.',
    evidenceIds:['contextual-link'],reuse:'Investigate existing regional access and mission-time weather engines.',
    effort:'Audit data contracts and implement a shared progressive decision model.',risk:'Venue references cannot be mistaken for mission-specific opening evidence.'},
  {id:'viewing-comparison',outcome:'Compare supported viewing choices for the selected mission.',
    evidenceIds:['contextual-link'],reuse:'Investigate existing regional venue inventories and maps.',
    effort:'Research criteria and compare two usable mobile interaction concepts.',risk:'Incomplete source coverage must not become an invented venue ranking.'}
];
run.selection={opportunityId:'mission-continuity',rationale:'This diagnostic run isolates a confirmed prerequisite defect. It does not claim this repair is the largest creative product opportunity.'};
run.concepts=[
  {id:'mission-link',opportunityId:'mission-continuity',firstScreen:'Keep the selected launch identity visible at the regional destination.',
    interaction:'Carry the original mission ID through a shareable guide link and restore it at the receiver.',
    completedAction:'The visitor continues planning the launch they explicitly selected.',
    feasibility:'Most existing regional guides already accept launchId query input.',tradeoff:'Requires separate receiver and unavailable-ID checks for each supported guide.',evidenceIds:['hidden-existing-link']},
  {id:'inline-region',opportunityId:'mission-continuity',firstScreen:'Display regional viewing evidence beside the selected mission on the national page.',
    interaction:'Open a mission-bound regional detail panel without leaving the national selection.',
    completedAction:'The visitor reads the relevant local evidence without a navigation reset.',
    feasibility:'Existing regional data could feed a mission-bound panel after adapter ownership review.',tradeoff:'Substantial integration and risk of duplicating richer regional experiences.',evidenceIds:['contextual-link']}
];
run.design={conceptId:'mission-link',reviewer:'Foundry diagnostic example; product design review still required',
  rationale:'A mission-preserving link is the smallest repair to the verified interruption. The inline concept deserves separate evaluation for a larger product enhancement.'};
run.scenarios=[
  {id:'selected-mission-link',role:'improvement',journey:'Choose a non-default Florida mission and inspect its contextual regional link.',
    input:'An exact-time Florida launch with a stable selected UUID.',expected:'The regional link contains that selected launchId.'},
  {id:'unavailable-source',role:'preservation',journey:'Open the source action when no mission response is available.',
    input:'The national API response is unavailable rather than an empty confirmed schedule.',expected:'The fallback offers an official source without inventing a mission.'}
];
run.measurement={event:'A visitor explicitly opens the contextual regional guide.',
  distinguishingProperty:'A distinct contextual-next-action surface, separate from older flight-desk links.',
  completionSignal:'The receiving regional page confirms that the requested mission was restored.',
  baseline:'Unavailable for this diagnostic: no analytics export was read; replay is not visitor measurement.'};
run.verifier='experience-foundry/examples/rocket-replay.cjs';
packet.files['run.json']=JSON.stringify(run,null,2)+'\n';
packet.files['SCOPE.md']='This diagnostic exercises the outgoing link and an unavailable-source fallback. It does NOT verify a browser click, loaded receiver mission, return journey, six-region behavior, or live data. Extend the source scope and adapter before claiming end-to-end continuity. Both concepts are authored proposals, not approved designs.\n';
const out=await restrictedOutput(root,process.argv[2]||'experience-foundry/drafts/rocket-continuity-review','experience-foundry/drafts');
await writePacket(out,packet.files);
console.log(path.relative(root,out)+'/run.json');
