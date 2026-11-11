'use strict';
// Identical pre-change/current dated source snapshots. Pure behavior is verified here;
// the actual keyboard, focus, DOM and responsive visitor journeys run in Chromium.
const fs=require('node:fs'),path=require('node:path');
const idx=process.argv.indexOf('--source-root');
if(idx<0||!process.argv[idx+1])throw Error('Missing --source-root');
const root=process.argv[idx+1];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=require(path.join(root,'public/assets/circle-tour-bridge.js'));
const html=read('public/lake-superior-circle-tour/index.html');
const css=read('public/assets/circle-tour-bridge.css');
const bridge=read('public/assets/circle-tour-bridge.js');
const catalog=JSON.parse(read('public/assets/circle-tour-tool-catalog.json'));
const place=require(path.join(root,'public/assets/circle-tour-place-story-data.js'));
const cases=[];
const record=(id,passed,observed)=>cases.push({id,passed:!!passed,observed});
const pick=typeof ui.chooseArrival==='function'?ui.chooseArrival:null;
const a=pick?.('19',0),b=pick?.('19',1);
const distinct=!!a&&!!b&&a.total===2&&b.index===1&&
 a.mapUrl!==b.mapUrl&&a.arrival.label.includes('Marina')&&b.arrival.label.includes('Red Rock')&&
 b.arrival.note.includes('2.6 km return')&&b.arrival.note.includes('10.1 km one way')&&
 new URL(b.arrival.sourceUrl).hostname==='www.parcs.canada.ca';
record('one-selected-map-and-source',distinct,
 JSON.stringify({a:a?.arrival.label,b:b?.arrival.label,differentMaps:!!a&&!!b&&a.mapUrl!==b.mapUrl,redRockNotice:b?.arrival.note.slice(0,85)}));
const before='https://chrisizworski.com/lake-superior-circle-tour/?plan=19%2C25&direction=clockwise';
const share=new URL(ui.buildReturnHref(before,{focusStop:'19',arrivalChoices:{'19':1},theme:'all'}));
const step=new URL(ui.buildReturnHref(share.href,{focusStop:'25',arrivalChoices:{'19':1},theme:'all'}));
const back=new URL(ui.buildReturnHref(step.href,{focusStop:'19',arrivalChoices:{'19':1,'25':0},theme:'all'}));
const shared=share.searchParams.get('ctStop')==='19'&&share.searchParams.get('ctArrival')==='1'&&
 share.searchParams.get('plan')==='19,25'&&share.searchParams.get('direction')==='clockwise'&&
 step.searchParams.get('ctStop')==='25'&&!step.searchParams.has('ctArrival')&&
 back.searchParams.get('ctArrival')==='1';
record('shareable-selected-arrival',shared,
 JSON.stringify({share:share.search,step:step.search,back:back.search}));
const scoped=typeof ui.guideForInterest==='function'&&
 ui.guideForInterest('24','ships')===null&&!!ui.guideForInterest('24','falls')&&
 ui.guideForInterest('25','ships')===null&&!!ui.guideForInterest('25','parks');
record('interest-appropriate-guidance',scoped,
 'Ships interest cannot silently become a park arrival, while the requested park/falls answer remains: '+scoped);
const native=bridge.includes("const switcher=el('div','ctb-arrival-choices')")&&
 bridge.includes("choice.type='button'")&&
 bridge.includes("control.setAttribute('aria-pressed'")&&
 bridge.includes("selected.replaceChildren(")&&
 bridge.includes("selected.setAttribute('aria-live','polite')")&&
 bridge.includes("showArrival(index);")&&
 css.includes('.ctb-arrival-choice[aria-pressed="true"]')&&
 css.includes('@media(max-width:760px){.ctb-arrival-choices');
record('visible-choice-and-focus-contract',native,
 'Native buttons, pressed state, one replaceable selected card, live announcement and responsive switcher wired: '+native+' (real focus checked separately in Chromium).');
const originals=['2','4','17','19','21','24','25','26'];
const counts={'2':1,'4':1,'17':1,'19':2,'21':1,'24':2,'25':2,'26':1};
const preserved=originals.every(id=>{
 const guide=ui.officialStopGuide(id),list=ui.officialArrivals(id);
 return guide?.url?.startsWith('https://')&&list.length===counts[id]&&
 list.every(x=>['address','search'].includes(x.kind)&&x.sourceUrl.startsWith('https://')&&
 ui.arrivalMapUrl(x).startsWith('https://www.google.com/maps/'));
});
record('preserve-eight-official-stops',preserved,
 'Eight original official guides and eleven typed published-address/named-search records retained: '+preserved);
const pictured=ui.planNextDecision(catalog,{selectedIds:['11'],theme:'water'});
const specialist=pictured.kind==='next-check'&&pictured.primary?.url==='https://picturedrocks.chrisizworski.com/'&&
 ui.safeToolUrl('https://unsafe.example')===''&&
 ui.officialArrivals('24')[0].note.includes('construction in 2026')&&
 ui.officialArrivals('24')[0].kind==='search'&&
 ui.officialArrivals('25')[0].kind==='search'&&
 ui.officialArrivals('25')[1].kind==='address';
record('preserve-safety-and-specialists',specialist,
 'Approved Pictured Rocks tool, construction age, no false coordinates and mixed search/address types unchanged: '+specialist);
const ids=['3','6','11','15','18','20','23','26','27'];
const photos=ids.every(id=>place.selectPlaceStory(id)?.photos?.length===2);
const stable=(html.match(/class="stop-card"/g)||[]).length===31&&
 html.includes('id="ctb-fallback"')&&
 html.includes('<link rel="canonical" href="https://chrisizworski.com/lake-superior-circle-tour/">')&&
 photos&&html.indexOf('circle-tour-place-story-data.js')<html.indexOf('circle-tour-bridge.js');
record('preserve-place-and-original-site',stable,
 '31 original stop cards, canonical, no-JS fallback and 9 distinct licensed photo-story mappings: '+stable);
console.log(JSON.stringify({cases}));
