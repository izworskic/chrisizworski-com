// A reproducible Foundry 0.3 run comparing the existing dark dashboard
// with a licensed photo-led field guide. This builds an assessment packet only;
// the product changes and browser testing live in the owning repository.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {startImprovement} from '../lib/improvement.mjs';
import {restrictedOutput,writePacket} from '../lib/output.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const packet=startImprovement({
 root,slug:'lighthouse-visual-field-guide-20261117',
 question:'Can a winter lighthouse visitor see the actual places, read the weather without color fatigue, and move from a photograph to the matching hour-by-hour forecast?',
 owner:'frozen-lighthouse-watch',
 baseline:'1d8cc273b517002fd5a4a414617851fc465f51fc',
 files:[
  'public/frozen-lighthouses-michigan/index.html',
  'public/assets/frozen-lighthouse-desk.js',
  'api/lighthouse-ice.js'
 ],
 newFiles:[
  'public/assets/frozen-lighthouse-field-guide.css',
  'data/frozen-lighthouse-photography.json'
 ]
},registry);
const run=packet.run;
run.owningRepository='izworskic/chrisizworski-com';
run.diagnosis={
 visitorTask:'Understand where the Michigan lighthouse icing forecast matters by recognizing the actual piers, then compare the forecast hour for the chosen light.',
 currentFriction:'The baseline opening is an almost entirely navy and blue set of panels with no real lighthouse photo; a visitor cannot recognize the selected pier from the first screen or use photography to choose a forecast.',
 capabilities:[
  'The existing NWS and NOAA API already supplies nine distinct lights, evidence ages and hourly signals.',
  'The existing coast desk already supports a synchronized selected-light and hour slider with safe unknown states.',
  'The static index contains source links, publisher identity, original warnings and content without JavaScript.'
 ],
 evidence:[
  {id:'dark-palette',kind:'source',file:'public/frozen-lighthouses-michigan/index.html',
   startLine:18,endLine:35,observation:'The original inlined root specifies color-scheme dark and dark-blue hero, cards, chart and desk surfaces.'},
  {id:'missing-photography',kind:'source',file:'public/frozen-lighthouses-michigan/index.html',
   startLine:102,endLine:113,observation:'The baseline hero presents text, warnings and links without an actual lighthouse image, despite discussing winter photographs.'},
  {id:'existing-interaction',kind:'source',file:'public/frozen-lighthouses-michigan/index.html',
   startLine:114,endLine:145,observation:'The original page offers a time-connected lighthouse desk and detailed evidence but no photographic destination selector.'},
  {id:'verified-commons-st-joseph',kind:'external',
   url:'https://commons.wikimedia.org/wiki/File:St._Joseph_North_Pier_Inner_Light_winter_takeover.jpg',
   checkedAt:'2026-11-17T11:55:00Z',
   observation:'Actual St. Joseph pier image credited to Don Ashley and available under CC BY-SA 4.0; photographs depict a past winter, not the current forecast.',
   limitation:'Commons description and license were checked; the photograph is historic and cannot establish current ice or pier safety.'},
  {id:'verified-commons-grand-haven',kind:'external',
   url:'https://commons.wikimedia.org/wiki/File:Grand_Haven_MI_Lighthouses_in_winter.jpg',
   checkedAt:'2026-11-17T11:55:00Z',
   observation:'Actual winter photograph of Grand Haven by Wayne Silver with CC BY 2.0 reuse and attribution terms.',
   limitation:'An attributed historic winter scene; not a measurement of current freezing-spray conditions.'},
  {id:'verified-commons-holland',kind:'external',
   url:'https://commons.wikimedia.org/wiki/File:Big_Red_basking_in_the_sunset_glow_-_Flickr_-_rkramer62.jpg',
   checkedAt:'2026-11-17T11:55:00Z',
   observation:'A 2014 winter evening photo at Holland Harbor by Rachel Kramer licensed CC BY 2.0.',
   limitation:'It is a historical sunset scene and not evidence that the lighthouse is currently iced.'}
 ]
};
run.opportunities=[
 {id:'visitor-photo-identity',outcome:'Make three actual harbors recognizable with correctly labeled and licensed historical photography connected to their individual forecasts.',
  evidenceIds:['missing-photography','existing-interaction','verified-commons-st-joseph','verified-commons-grand-haven','verified-commons-holland'],
  reuse:'Keep existing named pier IDs, forecast selection state and source links.',
  effort:'Acquire licensed photography, compress local files, design responsive hero/gallery and connect picture navigation.',
  risk:'A generic image might be mistaken for the wrong harbor or for current ice; attribution, scope and observed date must remain visible.'},
 {id:'palette-and-reading',outcome:'Replace the monotonous dark panels with high-contrast legible winter tones and readable forecast evidence.',
  evidenceIds:['dark-palette','existing-interaction'],
  reuse:'Preserve existing semantic HTML, CSS classes, native controls and forecast behavior.',
  effort:'Audit semantic foreground/background pairs and design a scoped stylesheet with browser contrast/overflow tests.',
  risk:'Changing visual styling can break disabled states, readouts and chart unknown-vs-zero distinctions.'},
 {id:'explain-ice-from-shore',outcome:'Add scene-specific visual interpretation that helps a visitor understand wind-driven ice without implying safe pier access.',
  evidenceIds:['missing-photography','verified-commons-st-joseph'],
  reuse:'Keep original scientific model, historic photography source attribution and safety warning.',
  effort:'Write bounded original copy and place it alongside licensed historical photos.',
  risk:'Tourist prose may obscure that the forecast predicts potential, not observed ice.'}
];
run.selection={opportunityId:'visitor-photo-identity',
 rationale:'The failure is an anonymous blue dashboard with no real place. A three-place photographic field guide delivers direct recognizable location choices and motivates a restrained high-contrast palette, while preserving the proven weather engine; palette-only changes would not solve the missing-place task.'};
run.concepts=[
 {id:'photo-first-coast-desk',opportunityId:'visitor-photo-identity',
  firstScreen:'An ivory editorial split hero with a true St. Joseph winter photograph, a compact forecast action and a plain-language shore safety note.',
  interaction:'One native 72-hour coast desk remains primary; a three-photo place gallery offers direct site selection and preserves a single selected hour.',
  completedAction:'The visitor recognizes St. Joseph, Grand Haven or Holland and opens that actual pier forecast with an obvious historical image qualification.',
  feasibility:'Three separately licensed Commons photos and existing selected-site handlers allow a dependency-free extension.',
  tradeoff:'Only three of nine lights get verified photographs; the other six remain text-only rather than using the wrong image.',
  evidenceIds:['existing-interaction','verified-commons-st-joseph','verified-commons-grand-haven','verified-commons-holland']},
 {id:'full-bleed-image-atlas',opportunityId:'visitor-photo-identity',
  firstScreen:'A sequence of large lighthouse photographs dominates the page, with a location-based weather strip underneath each scene.',
  interaction:'Tap a photographic tile to enter that harbor-specific page state, with optional horizontal galleries for the other locations.',
  completedAction:'A photographer moves through visual harbor scenes and discovers each named light forecast.',
  feasibility:'Existing site IDs and media allow a full photographic layout with the same forecast API.',
  tradeoff:'The imagery-heavy approach would push the first useful 72-hour answer below the mobile fold and cannot responsibly fill six missing-location photographs.',
  evidenceIds:['missing-photography','verified-commons-st-joseph','verified-commons-grand-haven']}
];
run.design={conceptId:'photo-first-coast-desk',
 reviewer:'Assistant / owner-directed Experience OS and Foundry design review on 2026-11-17',
 rationale:'The split hero plus three-spot photo trail serves a single winter viewing decision, respects unphotographed locations, keeps a source-rich hour-by-hour weather engine early, and provides a distinct seasonal field-guide identity rather than a generic card grid.'};
run.scenarios=[
 {id:'historic-photo',role:'improvement',
  journey:'Visit the page before selecting a source hour and view the St. Joseph photograph and honest historical caption.',
  input:'Open the main static page with the existing source and all approved optimized photographs present.',
  expected:'Visible St. Joseph historic hero picture and named photographer/CC link, not a blank navy hero or live-photo claim.'},
 {id:'place-connected',role:'improvement',
  journey:'Choose the Grand Haven or Holland photograph and follow it to that specific lighthouse forecast, not a generic page.',
  input:'Use the three licensed gallery selections and the existing forecast desk selected light state.',
  expected:'Three distinct credited images link to distinct existing pier IDs and the client script changes selected ID and renders it.'},
 {id:'light-palette',role:'improvement',
  journey:'Read the selected winter weather hour, link, and alert in daylight on a small phone.',
  input:'Load the full authored stylesheet after the legacy inlined CSS.',
  expected:'A light snow-and-stone background, dark ink and WCAG AA contrast for principal reading and action combinations.'},
 {id:'original-source-truth',role:'preservation',
  journey:'Read official sources with JavaScript disabled and understand that the model is not an observation or access permission.',
  input:'Open the same canonical page and associated API source without networked external photography.',
  expected:'The canonical, exact Person ID, official NWS/NOAA provenance, HTML FAQs, source caution and no fake safe-access verdict remain.'},
 {id:'single-source-ad-policy',role:'preservation',
  journey:'Open the page and use the existing source forecast without causing extra tracking, ad loaders or API calls.',
  input:'Inspect static source and the unchanged edge API with existing forecast and reload IDs.',
  expected:'Exactly one AdSense script, unchanged source API URL and original loader/selector IDs are present.'}
];
run.measurement={
 event:'A visitor uses a real lighthouse photograph to choose a matching pier forecast.',
 distinguishingProperty:'A clicked data-select-lighthouse location from a rights-credited photo, distinct from the existing coast text selector.',
 completionSignal:'The chosen image corresponds to an active selected site and its forecast reading in a browser test.',
 baseline:'Unavailable: no measured photo engagement exists, because baseline has no photographs. Foundry replay establishes authored capability only, not observed visitor uptake.'
};
run.verifier='experience-foundry/examples/lighthouse-visual-replay.cjs';
packet.files['run.json']=JSON.stringify(run,null,2)+'\n';
packet.files['SCOPE.md']='This Foundry replay checks static authored photo/color/contract features using captured source and identical rules. It does not render pixels, measure current weather, validate real access or substitute for separate Chromium photo-load and mobile browser screenshots. Optimized binary photos cannot be captured by Foundry 0.3 text-only baseline; those are independently tested for valid WebP and rights metadata. The generated packet is a review artifact, not a production page.\n';
const out=await restrictedOutput(root,'experience-foundry/drafts/lighthouse-visual-field-guide-20261117','experience-foundry/drafts');
await writePacket(out,packet.files);
console.log(path.relative(root,out)+'/run.json');
