(function(){
'use strict';
const $=id=>document.getElementById(id);
const crop=$('crop'),stage=$('stage'),zip=$('zip'),suspect=$('observed');
const source=$('watch-source-label'),answer=$('primary-answer'),reason=$('answer-reason'),grid=$('watch-cards');
const share=$('share'),form=$('watch-form'),confirm=$('use-observation');
let requestNumber=0,lastCatalog=[];
const fallback={
  squash:'For zucchini and squash, inspect vine bases for frass and turn over leaves for squash bug eggs during the growing season.',
  cucumbers:'On young cucumbers, inspect cotyledons for cucumber beetles. Later, check undersides of leaves for disease symptoms.',
  tomatoes:'Check lower tomato leaves for spots and upper shoots for caterpillar feeding. Look before treating.',
  brassicas:'Inspect cabbage, broccoli and kale plants at the soil line and under leaves for eggs, caterpillars or beetle feeding.',
  potatoes:'Inspect potato beds and new foliage for striped adults, orange egg masses and young larvae.',
  beans:'Inspect bean leaves for beetle skeletonizing, aphids and fine mite stippling.',
  corn:'Watch sweet corn as silks emerge, and use verified regional earworm trap reports when available.',
  lettuce:'Inspect leaves and the damp soil surface for slugs and other visible feeding damage.',
  grapes:'Check grape leaves for chewing insects. Check official state lanternfly status rather than assuming a local infestation.',
  berries:'Examine berry leaves for feeding damage; assess ripe fruit separately for spoilage.',
  roses:'Inspect blossoms for visible Japanese beetles, and check foliage for aphids and mites.',
  eggplant:'Look for flea-beetle feeding holes on young leaves and Colorado potato beetle egg masses.'
};
function el(tag,cls,content){
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(content!==undefined&&content!==null)n.textContent=String(content);
 return n;
}
function setInfo(id,text){$(id).textContent=text;}
function selectValue(node,value){if(value&&Array.from(node.options).some(o=>o.value===value))node.value=value;}
function restore(){
 const u=new URL(location.href);
 selectValue(crop,u.searchParams.get('crop'));
 selectValue(stage,u.searchParams.get('stage'));
 const z=u.searchParams.get('zip');
 if(z&&/^(?:48|49)\d{3}$/.test(z))zip.value=z;
 const o=u.searchParams.get('observed');
 if(o)suspect.dataset.initial=o;
}
function persist(){
 const u=new URL(location.href);
 u.searchParams.set('crop',crop.value);u.searchParams.set('stage',stage.value);
 if(zip.value)u.searchParams.set('zip',zip.value);else u.searchParams.delete('zip');
 if(suspect.value)u.searchParams.set('observed',suspect.value);else u.searchParams.delete('observed');
 history.replaceState(null,'',u.pathname+'?'+u.searchParams.toString()+u.hash);
}
function showUnavailable(errorCode='SOURCE_UNAVAILABLE'){
 const month=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric'}).format(new Date()));
 const winter=month>=11||month<=2;
 const locationProblem=errorCode==='ZIP_NOT_MAPPED'||errorCode==='ZIP_LOOKUP_UNAVAILABLE';
 const clearOption=el('option','','Identification list unavailable until the source reconnects');clearOption.value='';
 suspect.replaceChildren(clearOption);suspect.disabled=true;
 setInfo('answer-heading',winter?'Plan a safe next-season check':'A seasonal scouting reference for '+crop.options[crop.selectedIndex].text);
 answer.textContent=(winter?'This is off-season planning, not an active pest warning. ':'')+(fallback[crop.value]||fallback.squash);
 reason.textContent=locationProblem?'The Census ZIP-area reference could not be verified; no substitute area was used. Clear the ZIP for the Bay City reference.':
  'The tailored source is unavailable. These are general crop reference instructions, not a local pest detection.';
 setInfo('weather-evidence','Official weather not verified. No weather-based pest or disease inference.');
 $('weather-dot').className='lane-dot unknown';
 setInfo('season-evidence','Static seasonal crop reference; no local emergence or sighting is confirmed.');
 setInfo('location-label',zip.value?'ZIP '+zip.value+' NOT VERIFIED':'BAY CITY REFERENCE AREA');
 setInfo('watch-count','One fallback reference. Live crop-specific watch unavailable.');
 const cardNode=el('article','watch-card');
 cardNode.append(el('span','pest-index','SOURCE OUTAGE / REFERENCE'));
 cardNode.append(el('h3','','Scout by plant symptoms'));
 cardNode.append(el('p','',fallback[crop.value]||fallback.squash));
 const link=el('a','','Michigan State University Extension: garden IPM reference');
 link.href='https://msu-prod.dotcmscloud.com/resources/ipm_smart_pest_management_for_the_vegetable_garden';link.target='_blank';link.rel='noopener noreferrer';
 cardNode.append(link);grid.replaceChildren(cardNode);
 source.textContent=locationProblem?'No mapped weather reference for that ZIP. Clear ZIP for a named city.':'Tailored source unavailable; a general crop guide remains. Unknown weather does not mean low risk.';
}
function renderCatalogOptions(items){
 suspect.disabled=false;
 const previous=suspect.value||suspect.dataset.initial||'';
 suspect.textContent='';
 suspect.append(el('option','',"I haven't observed a suspect"));
 suspect.firstChild.value='';
 for(const pest of items){
   const opt=el('option','',pest.name);opt.value=pest.id;suspect.append(opt);
 }
 selectValue(suspect,previous);
 delete suspect.dataset.initial;
}
function pair(dl,heading,value){
 dl.append(el('dt','',heading));dl.append(el('dd','',value));
}
function card(p,i){
 const article=el('article','watch-card'+(p.weatherFavorable?' weather-relevant':''));
 const first=el('span','pest-index',String(i+1).padStart(2,'0')+' / GARDEN FIELD NOTE');article.append(first);
 article.append(el('h3','',p.name));
 article.append(el('span','pest-status',p.label));
 const main=el('p','field-task',p.where);article.append(main);
 const details=el('dl');
 pair(details,'Look for',p.sign);
 pair(details,'Prevent',p.prevent);
 pair(details,'If confirmed',p.found);
 pair(details,'Protect beneficials',p.beneficial);
 article.append(details);
 const e=el('p','confidence','Evidence: '+(p.weatherFavorable?'seasonal guidance + weather-favorability cue':'seasonal Extension reference')+
   (p.state==='GARDENER_REPORTED'?' + your unverified report':'')+'. Not a live local pest count.');
 article.append(e);
 if(typeof p.source==='string'&&p.source.startsWith('https://')){
  const link=el('a','', 'Read original scouting / identification source');
  link.href=p.source;link.target='_blank';link.rel='noopener noreferrer';article.append(link);
 }
 return article;
}
function showData(d){
 if(!d||d.schema!=='michigan-garden-pest-watch-v1'||!Array.isArray(d.featured)||!Array.isArray(d.all))throw Error('UNKNOWN_DATA_SCHEMA');
 lastCatalog=d.all;
 renderCatalogOptions(d.all);
 const locationLabel=d.location?.name||'Michigan reference area';
 setInfo('location-label',locationLabel.toUpperCase());
 const off=d.mode==='OFF_SEASON';
 setInfo('answer-heading',off?'Your next-season field assignment':'Your first scouting assignment');
 answer.textContent=d.firstAction;
 reason.textContent=off?'Off-season planning reference; warm-season pest activity is not implied.':
    'Current season and selected crop stage shape this advice. This tool has no garden-level pest confirmation.';
 const monthName=new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'America/Detroit'}).format(new Date(Date.UTC(2026,d.month-1,15,12)));
 setInfo('season-evidence',monthName+' / '+d.stage+' stage. This is approximate Michigan seasonal timing, not observed emergence.');
 const w=d.weather||{};
 if(w.status==='AVAILABLE'){
  setInfo('weather-evidence',w.summary+' NWS issued '+new Date(w.issuedAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+
    '. Outlook: '+w.forecastLowF+'–'+w.forecastHighF+'°F. Weather does not establish an infestation.');
  $('weather-dot').className='lane-dot available';
 }else if(w.status==='PARTIAL'){
  setInfo('weather-evidence',w.summary+' NWS issued '+new Date(w.issuedAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric'})+
    '. A temperature outlook exists but pest-weather cues are unknown, not zero.');
  $('weather-dot').className='lane-dot unknown';
 }else{
  setInfo('weather-evidence','Current NWS weather not verified. No weather-based pest or disease inference. Seasonal guidance still applies.');
  $('weather-dot').className='lane-dot unknown';
 }
 grid.replaceChildren(...d.featured.map(card));
 const n=d.counts?.pestsForCrop??d.all.length;
 setInfo('watch-count',n+' crop-related pest and disease topics. '+d.featured.length+' selected for this watch.');
 const year=Number(d.asOfDate?.slice(0,4))||new Date().getFullYear();
 const nextSeason=year+(d.month>=11?1:0);
 source.textContent=off?'Michigan off-season: prepare for '+nextSeason+'. We make no claim about current regional outbreaks because field reports are not connected.':
   'Scouting guidance, not an observed outbreak.'+(w.status==='AVAILABLE'?' A checked NWS forecast adds broad weather context.':w.status==='PARTIAL'?' NWS weather coverage is incomplete.':' Weather source unavailable.');
}
async function update(){
 if(zip.value&&!/^(?:48|49)\d{3}$/.test(zip.value)){
   zip.setCustomValidity('Enter a five-digit Michigan ZIP beginning with 48 or 49.');
   zip.reportValidity();return;
 }
 zip.setCustomValidity('');persist();
 const thisRequest=++requestNumber;
 source.textContent='Updating your crop-stage scouting desk from authoritative reference sources…';
 const params=new URLSearchParams({crop:crop.value,stage:stage.value});
 if(zip.value)params.set('zip',zip.value);else params.set('site','bay-city');
 if(suspect.value)params.set('observed',suspect.value);
 try{
  const response=await fetch('/api/michigan-garden-pest-watch?'+params.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(16000)});
  if(!response.ok){
   let code='SOURCE_UNAVAILABLE';
   try{const errorData=await response.json();code=typeof errorData.code==='string'?errorData.code:code;}catch(_ignored){}
   throw Error(code);
  }
  const d=await response.json();
  if(thisRequest!==requestNumber)return;showData(d);
 }catch(err){if(thisRequest!==requestNumber)return;showUnavailable(err?.message);}
}
form.addEventListener('submit',ev=>{ev.preventDefault();update();});
confirm.addEventListener('click',update);
crop.addEventListener('change',()=>{suspect.value='';});
zip.addEventListener('input',()=>zip.setCustomValidity(''));
share.addEventListener('click',async()=>{
 const url=location.href;
 try{if(!navigator.clipboard?.writeText)throw Error('NO_CLIPBOARD');
  await navigator.clipboard.writeText(url);share.textContent='Watch link copied';
 }catch(_error){share.textContent='Copy the URL from your browser';}
 setTimeout(()=>{share.textContent='Copy this garden watch link ↗';},2600);
});
restore();
update();
})();
