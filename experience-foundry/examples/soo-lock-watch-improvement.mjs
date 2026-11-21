/** Reproducible Foundry 0.3 assignment for the Soo Locks Lock Watch visit planner. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startImprovement} from '../lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../lib/output.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({
  root,slug:'soo-lock-watch',
  owner:'soo-locks',
  question:'Which ships will pass the Soo Locks while I can be on the viewing platform, and when should I be there?',
  baseline:'51a831ffeacedf8fc1e8180fe83052526e490820',
  files:['public/soo-locks/index.html','public/assets/soo-ais.js','lib/soo-locks-next.js'],
  newFiles:['public/assets/soo-lock-watch.js','public/assets/soo-lock-watch.css']
},registry);
const run=packet.run;
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
  visitorTask:'Decide when to be on the Soo Locks viewing platform, for how long, and which named ship to expect while there.',
  currentFriction:'The page answers "what is the next ship" with one pick and folds every other approaching ship into a single run-on sentence. Nothing relates an arrival window to when the visitor can be there, the posted park hours or darkness, and in November the card still offers a boat hotline USACE maintains only May to October.',
  capabilities:[
    'lib/soo-locks-next.js already turns AIS reports across the whole St. Marys River into ships in a chamber now plus up to six approaching ships, each with a stable MMSI and a start/midpoint/end arrival window.',
    'public/assets/soo-ais.js already polls /api/soo-ais every minute, renders the next-ship card and can focus any ship on the Leaflet map.',
    'The page already states the posted USACE park hours by month and the May 1 to October 31 Visitor Center season.'
  ],
  evidence:[
    {id:'single-pick-card',kind:'source',file:'public/assets/soo-ais.js',startLine:91,endLine:92,observation:'Other approaching ships appear only as an "Also heading in" sentence; they cannot be selected, compared or shown on the map from the card.'},
    {id:'hotline-off-season',kind:'source',file:'public/assets/soo-ais.js',startLine:101,endLine:105,observation:'The card action always offers "Boat hotline 906-202-1333", with no season check.'},
    {id:'map-far-below',kind:'source',file:'public/soo-locks/index.html',startLine:279,endLine:341,observation:'Between the next-ship answer and the live vessel map sit the schedule checklist, fleet links, Gazette panel, hero photo, prose and season panel; at 390px the map starts near 4,300px.'},
    {id:'posted-hours-prose',kind:'source',file:'public/soo-locks/index.html',startLine:532,endLine:533,observation:'Park hours exist only as prose deep in the visitor guide and are never compared with an arrival window.'},
    {id:'engine-windows',kind:'source',file:'lib/soo-locks-next.js',startLine:303,endLine:310,observation:'Candidates are already sorted and carry arrival windows, so a planner needs no new data source or API.'},
    {id:'usace-hours',kind:'external',url:'https://www.lrd.usace.army.mil/Submit-ArticleCS/Recreation/Article/3833525/soo-locks-visitor-center/',checkedAt:'2026-11-21T19:55:00Z',observation:'USACE posts 9 a.m. to 10 p.m. June to August, 9 to 9 in May, September and October, and 9 to 6 November to April; the Visitor Center and its boat hotline run May 1 to October 31.',limitation:'Posted park hours by month and the May 1 to October 31 Visitor Center season; the hotline is maintained only while the Visitor Center is open. Hours can change for security, construction and events; platform hours are not listed separately.'},
    {id:'sun-reference',kind:'external',url:'https://www.weather-us.com/en/michigan-usa/sault-ste-marie-weather-november',checkedAt:'2026-11-21T20:05:00Z',observation:'Published Sault Ste. Marie sun times give a fixed check for the computed sunrise and sunset used to flag after-dark windows.',limitation:'Third-party published sunrise/sunset reference (November 30: 8:00 a.m. and 4:52 p.m. EST) used only to check the computed NOAA sunrise equation within three minutes.'}
  ]
};
run.opportunities=[
  {id:'visit-lineup',outcome:'A visitor chooses when they can get there and how long they can stay, and sees which named ships fall inside that visit, inside posted park hours and daylight, with one-tap adjustment to cover a window.',
    evidenceIds:['single-pick-card','posted-hours-prose','engine-windows','usace-hours'],reuse:'Existing next-ship engine windows, MMSI identities, soo-ais polling and map focus.',effort:'Medium: one static script and stylesheet, no API or function change.',risk:'Visitors may read a window as a schedule; mitigated by estimate wording, no probabilities and an explicit beyond-view caveat.'},
  {id:'map-forward',outcome:'Move the live vessel map up beside the next-ship answer so position and estimate are seen together.',
    evidenceIds:['map-far-below'],reuse:'Existing Leaflet map, vessel list and refresh control.',effort:'Medium: move and re-test the map block and its pinned order.',risk:'Restructures a page that carries about 30% of site impressions and pins section order in several tests; the repository is additive by default.'},
  {id:'season-truth',outcome:'Stop offering the boat hotline outside May to October and point to the BoatNerd passage list instead.',
    evidenceIds:['hotline-off-season','usace-hours'],reuse:'Existing next-ship card actions and copy.',effort:'Small: a season check on two strings and one action.',risk:'Low; a necessary repair but not a new visitor capability on its own.'}
];
run.selection={opportunityId:'visit-lineup',rationale:'The lineup answers the decision visitors actually make (when to go and how long to wait) with data the engine already computes, and it carries the season-truth repair with it. Moving the map would reorder a high-impression page for a smaller gain.'};
run.concepts=[
  {id:'visit-timeline',opportunityId:'visit-lineup',firstScreen:'Directly under the next-ship answer: two chip groups (how soon, how long), a plain-language verdict, then a shared time axis with dark and closed-park bands and one row per ship.',
    interaction:'Changing either chip re-plans instantly; selecting a row opens that ship’s dossier and can focus it on the live map; a missed visit offers a one-tap adjustment that covers the next window.',
    completedAction:'The visitor knows which ship to expect, whether it is inside park hours and daylight, and when to be on the platform.',
    feasibility:'Static JS and CSS on the existing feed; deterministic tests with a pinned clock.',tradeoff:'A long block on phones; time is the only axis, so geography stays on the map below.',evidenceIds:['single-pick-card','engine-windows','usace-hours']},
  {id:'river-schematic',opportunityId:'visit-lineup',firstScreen:'A schematic of the St. Marys River with Lake Superior above and Lake Huron below, ships placed by channel miles and converging on the locks, with ETA labels.',
    interaction:'Tap a ship on the schematic to see its window; a visit slider dims ships that will not arrive in time.',
    completedAction:'The visitor sees where ships are and roughly when they arrive.',
    feasibility:'Requires a second spatial rendering of positions the Leaflet map already shows, plus label collision handling on narrow screens.',tradeoff:'Duplicates the map, and park hours and daylight do not fit a spatial view.',evidenceIds:['engine-windows','map-far-below']}
];
run.design={conceptId:'visit-timeline',reviewer:'Experience Investment + Experience OS 1.2.1 review, November 21, 2026',
  rationale:'The visitor question is about time, not place: when to be on the platform. A time axis lets park hours, darkness and the visit share one frame with every ship window, while geography stays with the existing live map. It differs from Duluth (single next-freighter card plus published forecast) and Welland (hero, map and eight-lock explorer) in both decision and interaction.'};
run.scenarios=[
  {id:'visit-time-changes-answer',role:'improvement',journey:'Plan a visit now, then plan one two hours later.',input:'Dated fixture: GOTT in the Poe Lock, BURNS HARBOR window 11:30 a.m. to 1:40 p.m., ALGOMA EQUINOX 6:15 to 7:55 p.m., now 9:45 a.m. EST Nov 21 2026.',expected:'Now leads with the ship in the chamber; two hours later the best bet is BURNS HARBOR.'},
  {id:'after-hours-and-dark-flagged',role:'improvement',journey:'Inspect the evening laker against posted hours and daylight.',input:'Same fixture.',expected:'ALGOMA EQUINOX is flagged outside the 9 a.m. to 6 p.m. posted hours and after dark; BURNS HARBOR is inside both.'},
  {id:'a-b-a-selection-identity',role:'improvement',journey:'Change the visit A to B and back to A.',input:'Same fixture.',expected:'Rows keep the same stable MMSI identities and the A verdict is restored exactly.'},
  {id:'missed-visit-offers-cover',role:'improvement',journey:'Choose a visit that misses every window.',input:'Arrive in 30 min, stay 45 min.',expected:'States no reported ship is due, names the next window, offers to plan around it, and says ships beyond view may still come.'},
  {id:'preserve-search-identity',role:'preservation',journey:'Search and ads contracts stay intact.',input:'The scoped page HTML for /soo-locks/.',expected:'Title, canonical, Person node, the single ad-break marker, next-ship-before-schedule order and the live map container are unchanged.'},
  {id:'preserve-arrival-engine',role:'preservation',journey:'Arrival estimates are unchanged.',input:'lib/soo-locks-next.js.',expected:'minutesToLock(10 nm, 10 kn) is still 78 minutes and the client still reads /api/soo-ais.'}
];
run.measurement={event:'Chip change and lineup row selection inside #soo-lock-watch; no new analytics event is added.',
  distinguishingProperty:'Selected MMSI plus chosen start offset and stay; the planner never stores or sends them.',
  completionSignal:'A verdict naming a ship inside the visit, or the one-tap adjustment, is visible after a choice. Real visitor completion is NOT_MEASURED.',
  baseline:'No GSC query rows, GA4 events or Vercel Analytics export were read in this session; the baseline is the checked-in page.'};
run.verifier='experience-foundry/examples/soo-lock-watch-replay.cjs';
packet.files['run.json']=JSON.stringify(run,null,2)+'\n';
packet.files['SCOPE.md']='Replay covers the planner core loaded from each source root with one dated fixture (visit verdicts, park-hour and darkness flags, stable identities, missed-visit adjustment) plus search-identity and arrival-engine preservation. Browser acceptance (tests/soo-lock-watch-browser.cjs) separately covers chips, rows, keyboard, map focus, feed failure, winter shutdown, summer hotline, no-JS and five viewport widths. REA and Penpot were not used. No deployment, live verification or visitor outcome is claimed.\n';
const out=await restrictedOutput(root,process.argv[2]||'experience-foundry/drafts/soo-lock-watch','experience-foundry/drafts');
await writePacket(out,packet.files);
console.log(path.relative(root,out)+'/run.json');
