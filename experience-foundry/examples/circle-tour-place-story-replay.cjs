'use strict';
// One adapter for the captured actual baseline and candidate, with identical static fixtures.
const fs=require('node:fs'),path=require('node:path');
const index=process.argv.indexOf('--source-root');
if(index<0||!process.argv[index+1])throw Error('Missing --source-root');
const root=process.argv[index+1];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const bridge=require(path.join(root,'public/assets/circle-tour-bridge.js'));
const catalog=JSON.parse(read('public/assets/circle-tour-tool-catalog.json'));
const html=read('public/lake-superior-circle-tour/index.html');
const script=read('public/assets/circle-tour-bridge.js');
const dataFile=path.join(root,'public/assets/circle-tour-place-story-data.js');
const stories=fs.existsSync(dataFile)?require(dataFile):null;
const select=id=>stories?.selectPlaceStory?.(id)||null;
const cases=[];
const record=(id,passed,observed)=>cases.push({id,passed:!!passed,observed});
const ids=['15','20','18'];
const correctImages=ids.every(id=>{
 const s=select(id);
 return s?.placeId===id&&s.photos?.length===2&&s.photos.every(p=>
  p.placeId===id&&p.status==='verified-licensed'&&
  /^https:\/\/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\//.test(p.imageURL)&&
  /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(p.sourceURL)&&
  /^(CC BY-SA 4\.0|CC0 1\.0)$/.test(p.licenseName)&&
  /^https:\/\/creativecommons\.org\//.test(p.licenseURL)&&
  p.photographer.length>3&&p.alt.length>30&&p.caption.length>25&&p.captureDate.length===10);
});
record('three-park-photo-identity',correctImages,
 'Three exact-place catalog records with valid photo-level dates, authors, Commons sources, CC licenses and descriptive captions: '+correctImages);
const placeFacts=ids.every(id=>{
 const s=select(id);
 return s&&s.story.length>150&&s.character.length>65&&s.why.length>40&&
 /^https:\/\/(?:www\.ontarioparks\.ca|parks\.canada\.ca)\//.test(s.sourceURL);
});
record('three-distinct-landscapes',placeFacts,
 'Three separate park narratives and authoritative destination descriptions: '+placeFacts);
const reactive=select('15')?.name==='Lake Superior Provincial Park'&&
 select('20')?.name==='Sleeping Giant Provincial Park'&&
 select('15')?.placeId==='15'&&select('24')===null&&
 script.includes('function renderPlaceStory(model,host)')&&
 script.includes('renderPlaceStory(model,host);')&&
 html.indexOf('circle-tour-place-story-data.js')<html.indexOf('circle-tour-bridge.js');
record('reactive-place-renderer',!!reactive,
 'Selected-stop source map and render wiring, including no false Cascade River photo: '+!!reactive);
const parkChecks=ids.every(id=>{
 const next=bridge.planNextDecision(catalog,{selectedIds:[id],theme:'parks'});
 return next?.kind==='next-check'&&next.stopId===id&&next.primary?.url?.startsWith('https://');
});
const missing=bridge.planNextDecision(catalog,{selectedIds:['11'],focusStop:'11',theme:'ships'});
record('preserve-existing-next-check',parkChecks&&missing.kind==='no-specialist'&&missing.primary===null,
 'Original official next-check and unsupported-interest states preserved: '+parkChecks);
record('preserve-planner-static',
 (html.match(/class="stop-card"/g)||[]).length===31&&
 html.includes('id="ctb-fallback"')&&
 html.includes('<link rel="canonical" href="https://chrisizworski.com/lake-superior-circle-tour/">'),
 'Existing 31 stop cards, no-JavaScript specialist fallback and single canonical remain.');
const puka=bridge.planNextDecision(catalog,{selectedIds:['18'],theme:'parks'});
record('preserve-specialist-safety',puka?.primary?.url==='https://chrisizworski.com/pukaskwa-national-park/'&&
 bridge.safeToolUrl('https://unsafe.example/fake')==='', 
 'Pukaskwa specialist canonical and existing foreign-host rejection preserved.');

const northIds=['23','26','27'];
const northPhotos=northIds.every(id=>{
 const story=select(id);
 return story?.placeId===id&&story.photos?.length===2&&story.photos.every(p=>
 p.placeId===id&&p.status==='verified-licensed'&&
 p.imageURL.startsWith('https://thumb.wikimedia.org/wikipedia/commons/thumb/')&&
 p.sourceURL.startsWith('https://commons.wikimedia.org/wiki/File:')&&
 ['CC BY-SA 2.0','CC BY-SA 4.0','CC BY 4.0'].includes(p.licenseName)&&
 p.licenseURL.startsWith('https://creativecommons.org/')&&
 p.photographer.length>3&&p.alt.length>30&&p.caption.includes('display cropped.')&&
 /^(19|20)\d\d-\d\d-\d\d$/.test(p.captureDate));
});
record('north-shore-photo-identity',northPhotos,
 'Six exact-place photographs with authors, licenses, dates, captions and Commons links: '+northPhotos);
const northChoices=northIds.every(id=>{
 const s=select(id);
 return s&&s.story.length>190&&s.character.length>155&&s.why.length>85&&
 ['www.visitcookcounty.com','www.dnr.state.mn.us'].includes(new URL(s.sourceURL).hostname);
})&&select('23')?.character.includes('Gunflint Trail')&&
 select('26')?.character.includes('300 stairs')&&
 select('27')?.character.includes('Minnesota Historical Society');
record('north-shore-distinct-visitor-choices',!!northChoices,
 'Town harbor vs inland trip, Shovel Point vs High Falls, DNR park vs MNHS lighthouse visit: '+!!northChoices);
const none=bridge.planNextDecision(catalog,{selectedIds:['26']});
const yes=bridge.planNextDecision(catalog,{selectedIds:['27']});
const boundary=none.kind==='no-specialist'&&none.primary===null&&
 yes.kind==='next-check'&&yes.primary?.url?.startsWith('https://');
record('north-shore-specialist-preservation',boundary,
 'No fabricated specialist for Tettegouche; Split Rock retains independent approved specialist: '+boundary);
const photoFree=select('24')===null&&select('25')===null&&
 select('23')?.placeId==='23'&&select('27')?.placeId==='27';
record('north-shore-no-photo-leakage',photoFree,
 'Unresearched neighbors have no false landscape photographs: '+photoFree);

console.log(JSON.stringify({cases}));
