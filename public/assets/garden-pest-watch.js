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
// Photo comparisons receive only advice from the verified, same-selection watch response.
// Never pass a visitor's photo selections as observations or pest forecast evidence.
function publishVisualPlan(data) {
 const valid=data?.schema==='michigan-garden-pest-watch-v1' &&
  data.crop===crop.value && data.stage===stage.value &&
  ['SCOUTING','OFF_SEASON'].includes(data.mode) && Array.isArray(data.all);
 const detail=valid?{
  crop:data.crop,stage:data.stage,zip:zip.value,mode:data.mode,
  asOfDate:data.asOfDate,
  items:data.all.map(p=>({
   id:p.id,where:p.where,prevent:p.prevent,found:p.found,source:p.source,
   seasonMatches:p.seasonMatches,stageMatches:p.stageMatches,
   weatherFavorable:p.weatherFavorable,state:p.state
  }))
 }:null;
 window.dispatchEvent(new CustomEvent('garden-pest-watch:evidence',{detail}));
}
function showUnavailable(errorCode='SOURCE_UNAVAILABLE'){
 publishVisualPlan(null);
 resetBeetle('Main crop/ZIP source unavailable. The official beetle model is not being linked to an unverified reference area.');
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
 const photoPair=window.GardenPestVisuals?.renderPair?.(p.id,true);
 if(photoPair)article.append(photoPair);
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
 publishVisualPlan(d);
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
 if(off){
  // A real forecast is still valid weather, but November-February temperature
  // and humidity cues must never imply warm-season leaf or insect scouting.
  const dated=(w.status==='AVAILABLE'||w.status==='PARTIAL')&&w.issuedAt;
  setInfo('weather-evidence','Off-season in Michigan. '+
    (dated?'NWS outlook issued '+new Date(w.issuedAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+
    ', '+w.forecastLowF+'–'+w.forecastHighF+'°F. ':'Current NWS forecast not verified. ')+
    'Weather is context for bed preparation, not evidence of active warm-season pests or a reason to scout summer foliage.');
  $('weather-dot').className='lane-dot unknown';
 }else if(w.status==='AVAILABLE'){
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
 void updateBeetle(d);
}
async function update(){
 if(zip.value&&!/^(?:48|49)\d{3}$/.test(zip.value)){
   zip.setCustomValidity('Enter a five-digit Michigan ZIP beginning with 48 or 49.');
   zip.reportValidity();return;
 }
 zip.setCustomValidity('');persist();
 publishVisualPlan(null); // Prevent a previous crop, stage or ZIP's action plan from surviving a refresh.
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
crop.addEventListener('change',()=>{publishVisualPlan(null);suspect.value='';resetBeetle('Crop changed. Update your watch to check the appropriate model and location.');});
stage.addEventListener('change',()=>publishVisualPlan(null));
zip.addEventListener('input',()=>{publishVisualPlan(null);zip.setCustomValidity('');resetBeetle('ZIP reference changed. Update your watch to request an exact matching forecast pixel.');});
share.addEventListener('click',async()=>{
 const url=location.href;
 try{if(!navigator.clipboard?.writeText)throw Error('NO_CLIPBOARD');
  await navigator.clipboard.writeText(url);share.textContent='Watch link copied';
 }catch(_error){share.textContent='Copy the URL from your browser';}
 setTimeout(()=>{share.textContent='Copy this garden watch link ↗';},2600);
});

/* Opt-in NASA Daymet historical weather/USA-NPN research model.
 * Never changes biologicalForecast, the primary pest verdict or any
 * gardener-confirmed state. Static 2021-2025, not a current-year alert. */
const historyBtn=$('history-load'),historyState=$('history-status'),historyOutput=$('history-results');
let historicalRequest=0,historicalReference='';
function clearHistorical(){
 historicalRequest++;
 historicalReference='';
 historyBtn.disabled=false;
 historyBtn.textContent='Explore five seasons at my location ↗';
 historyState.textContent='Location changed. Run a new historical comparison to avoid mixing reference points.';
 historyOutput.replaceChildren();
 const wrapper=el('div','history-placeholder');
 wrapper.append(el('p','', 'Five complete historical years are required before a timing range is shown.'));
 historyOutput.append(wrapper);
}
function monthDay(iso){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return 'Unavailable';
 return new Date(iso+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
}
function yearDate(stage,year){
 const p=stage.samples.find(s=>s.year===year);
 return p?monthDay(p.date):'Not reached';
}
function drawHistory(payload){
 if(payload?.status!=='HISTORIC_MODELLED_RESEARCH_ONLY'||payload?.publishedUse!=='HISTORIC_RESEARCH_ONLY'||payload?.realTimeForecast!=='UNAVAILABLE'||
 !Array.isArray(payload.events)||payload.events.length!==2||!Array.isArray(payload.years)||payload.years.length!==5)throw Error('HISTORICAL_EVIDENCE_NOT_VERIFIED');
 const adult=payload.events.find(x=>x.id==='adults'),egg=payload.events.find(x=>x.id==='eggs');
 if(!adult||!egg||adult.status!=='HISTORIC_MODELLED'||egg.status!=='HISTORIC_MODELLED')throw Error('INCOMPLETE_HISTORICAL_THRESHOLDS');
 if(payload.events.some(x=>x.yearsCrossed!==5||x.medianYday===null))throw Error('INSUFFICIENT_YEAR_COVERAGE');
 const location=payload.location?.name||'Michigan reference area';
 historyOutput.replaceChildren();
 const kpis=el('div','history-kpis');
 for(const event of [adult,egg]){
  const block=el('div');
  const label=el('small','',event.id==='adults'?'EARLIEST ADULT HEAT THRESHOLD':'EGG-HATCH HEAT THRESHOLD');
  const median=event.samples.find(x=>x.yday===event.medianYday);
  block.append(label,el('strong','',median?monthDay(median.date):'Unverified'),
    el('small','','Five-season middle threshold date (historical only)'));
  kpis.append(block);
 }
 historyOutput.append(kpis);
 const intro=el('p','history-warning','These dates are reconstructed from NASA historical temperature records, not beetle observations. The published 873/1,543°F degree-day thresholds were applied using an independent single-triangle calculation; operational USA-NPN parity has not been verified.');
 historyOutput.append(intro);
 const plot=el('div','history-plot');
 const key=el('div','history-plot-key');
 key.append(el('span','history-key-adult','Adult threshold'),el('span','history-key-egg','Egg-hatch threshold'));
 plot.append(key);
 for(const year of payload.years){
  const row=el('div','history-row'),track=el('div','history-track');
  row.append(el('span','history-row-label',String(year)));
  for(const stage of [adult,egg]){
   const sample=stage.samples.find(x=>x.year===year);
   if(!sample)continue;
   const dot=el('span','history-mark '+(stage.id==='adults'?'adult':'egg'));
   dot.style.left=Math.max(0,Math.min(100,sample.yday/365*100))+'%';
   dot.title=year+': '+stage.stage+' reached model threshold '+monthDay(sample.date);
   dot.setAttribute('aria-label',dot.title);
   track.append(dot);
  }
  row.append(track);plot.append(row);
 }
 const axis=el('div','history-axis');
 for(const label of ['Jan','May','Sep','Dec'])axis.append(el('span','',label));
 plot.append(axis);historyOutput.append(plot);
 const table=el('table','history-detail-table');
 table.append(el('caption','','Historical heat-threshold dates for '+location+' (NOT sightings)'));
 const head=el('thead'),thr=el('tr');
 for(const label of ['Year','Adult heat stage','Egg-hatch heat stage'])thr.append(el('th','',label));
 head.append(thr);table.append(head);
 const body=el('tbody');
 for(const year of payload.years){
  const tr=el('tr');
  for(const val of [String(year),yearDate(adult,year),yearDate(egg,year)])tr.append(el('td','',val));
  body.append(tr);
 }
 table.append(body);historyOutput.append(table);
 const details=el('p','history-note','Data: NASA Daymet V4 R1, 1 km reference pixel. 2021–2025. Minimum and maximum daily temperatures used; no incomplete year accepted. The chart locates past degree-day crossings, not verified field dates.');
 historyOutput.append(details);
 if(typeof payload.source?.url==='string'&&payload.source.url.startsWith('https://daymet.ornl.gov/')){
  const link=el('a','', 'View the actual NASA Daymet source data used');
  link.href=payload.source.url;link.rel='noopener noreferrer';link.target='_blank';
  historyOutput.append(link);
 }
 historyState.textContent='Five complete seasons reconstructed for '+location+'. These modeled dates are historical research, not a forecast for this year or next year.';
}
async function loadHistorical(){
 if(zip.value&&!/^(?:48|49)\d{3}$/.test(zip.value)){
  zip.setCustomValidity('Enter a five-digit Michigan ZIP beginning with 48 or 49.');
  zip.reportValidity();return;
 }
 const requestId=++historicalRequest;
 const params=new URLSearchParams();
 if(zip.value)params.set('zip',zip.value);else params.set('site','bay-city');
 historicalReference=zip.value?'zip:'+zip.value:'site:bay-city';
 historyBtn.disabled=true;historyState.textContent='Checking NASA Daymet for five complete calendar years; only verified historical data will be displayed.';
 historyOutput.replaceChildren(el('p','history-warning','Reading 2021–2025 daily gridded temperature records. This is not a live insect detection.'));
 try{
  const res=await fetch('/api/garden-pest-timing-lab?'+params.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(21000)});
  if(!res.ok)throw Error('DAYMET_SOURCE_UNAVAILABLE');
  const payload=await res.json();
  if(requestId!==historicalRequest)return;
  drawHistory(payload);
  historyBtn.textContent='Refresh the historical comparison ↗';
 }catch(_error){
  if(requestId!==historicalRequest)return;
  historyOutput.replaceChildren(el('p','history-warning','Complete NASA Daymet historical data or reproducible model timings could not be verified for this reference area. No dates or estimated pest stages are shown.'));
  historyState.textContent='Historical source unavailable. Follow the official NASA and USA-NPN references below; no missing dates have been estimated.';
 }finally{if(requestId===historicalRequest)historyBtn.disabled=false;}
}
historyBtn.hidden=false;
historyBtn.addEventListener('click',loadHistorical);
zip.addEventListener('input',clearHistorical);


/* USA-NPN official species-specific Japanese beetle pilot.
 * This output is independent from the historical NASA Daymet research and from
 * the primary Michigan seasonal/pest evidence decision. Model =/= detection. */
const beetleHosts=new Set(['beans','berries','grapes','roses']);
const beetleState=$('beetle-evidence-type'),beetleAnswer=$('beetle-answer'),beetleAction=$('beetle-action'),
 beetleLocation=$('beetle-location'),beetleAdult=$('beetle-adult-date'),beetleEgg=$('beetle-egg-date'),
 beetleSource=$('beetle-source-note'),beetleRaster=$('beetle-raster-source'),biologyEvidence=$('biology-evidence');
let beetleSeq=0;
const fieldPanel=$('beetle-field-check'),fieldEvidence=fieldPanel?.querySelector('.beetle-field-evidence'),
 fieldStatus=$('beetle-field-status'),fieldFirst=$('beetle-field-first'),
 fieldCompare=$('beetle-field-comparison'),fieldCaveat=$('beetle-field-caveat'),fieldLinks=$('beetle-field-links');
let fieldSeq=0;
function fieldReset(message){
 fieldSeq++;
 if(!fieldStatus)return;
 fieldStatus.textContent='FIELD SOURCE · NOT VERIFIED';
 fieldFirst.textContent='No verified field date yet';
 fieldCompare.textContent=message||'The independent observation source has not been checked for this crop and location.';
 fieldCaveat.textContent='Unknown or missing sightings never mean no beetles. Voluntary observations cannot determine forecast accuracy.';
 fieldEvidence.className='beetle-field-evidence is-missing';
 const a=el('a','', 'See Michigan Japanese beetle records on iNaturalist');
 a.href='https://www.inaturalist.org/observations?taxon_id=67760&place_id=29';
 fieldLinks.replaceChildren(a);
}
function fieldDate(date){return new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'});}
function fieldComparison(observed,modeled){
 const ms=Date.parse(observed+'T12:00:00Z')-Date.parse(modeled+'T12:00:00Z');
 if(!Number.isFinite(ms))return 'Source dates are not comparable.';
 const days=Math.round(ms/86400000);
 if(days<0)return 'The earliest qualifying species-level photo is '+Math.abs(days)+' days before the adult-model threshold at the reference point. The photo record alone does not certify adult life stage. This warrants investigation, not an accuracy verdict.';
 if(days>0)return 'The earliest qualifying species-level photo is '+days+' days after the adult-model threshold. This is not proof of model timing: adult stage is unverified and earlier beetles could have gone unreported.';
 return 'The earliest qualifying species photo and modeled adult stage share a calendar date. The photo record does not independently certify adult stage, and this match does not establish forecast accuracy.';
}
async function loadFieldEvidence(model,ref){
 const ticket=++fieldSeq,year=model.year;
 fieldStatus.textContent='CHECKING RESEARCH-GRADE FIELD RECORDS';
 fieldFirst.textContent='Reading dated public sightings…';
 fieldCompare.textContent='Independent iNaturalist photo records, not a source of modelled weather or non-detections.';
 const p=new URLSearchParams({year:String(year)});
 if(ref)p.set('zip',ref);else p.set('site','bay-city');
 try{
  const response=await fetch('/api/japanese-beetle-field-evidence?'+p.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(13000)});
  if(!response.ok)throw Error('FIELD_SOURCE_UNAVAILABLE');
  const d=await response.json();
  if(ticket!==fieldSeq)return;
  if(d?.schema!=='japanese-beetle-field-evidence-v1'||d.adultLifeStage!=='NOT_VERIFIED_BY_SPECIES_IDENTIFICATION'||d.year!==year||
  !['DOCUMENTED_PRESENCE','NO_QUALIFYING_RECORDS_IN_SAMPLE'].includes(d.status)||
  !d.observationalEvidence||!Number.isInteger(d.observationalEvidence.inspectedResults)||
  !Array.isArray(d.observationalEvidence.examples))throw Error('FIELD_SOURCE_SCHEMA_INVALID');
  const e=d.observationalEvidence;
  fieldEvidence.className='beetle-field-evidence '+(d.status==='DOCUMENTED_PRESENCE'?'is-present':'is-missing');
  fieldStatus.textContent=d.status==='DOCUMENTED_PRESENCE'?'PHOTOGRAPHED PRESENCE · INDEPENDENT SOURCE':'NO QUALIFYING PUBLIC PHOTO IN SAMPLE';
  const dated=typeof e.firstObservationDate==='string'&&/^\d{4}-\d\d-\d\d$/.test(e.firstObservationDate)&&e.firstObservationDate.startsWith(String(year));
  if(d.status==='DOCUMENTED_PRESENCE'&&!dated)throw Error('FIELD_DATE_INVALID');
  fieldFirst.textContent=dated?'First eligible record: '+fieldDate(e.firstObservationDate):'No qualifying date in checked records';
  fieldCompare.textContent=dated?fieldComparison(e.firstObservationDate,model.stages.adult.approximateDate):
   'No qualifying record was found in the inspected source sample. This cannot rule out beetles at any Michigan location.';
  fieldCaveat.textContent='Independent iNaturalist research-grade photos within 25 km (15.5 miles) of the reference point. '+
    e.inspectedResults+' source record(s) inspected; '+e.qualifyingRecords+' met the conservative public-location filters. '+
    (e.limitedSearch?'More source records exist than this bounded sample; it is not exhaustive. ':'')+
    'The species-level records do not independently verify adult life stage, first emergence or egg hatch. Checked '+fieldDate(d.checkedAt.slice(0,10))+'.';
  const a=el('a','', 'Explore the original records');
  a.href='https://www.inaturalist.org/observations?taxon_id=67760&place_id=29';
  const children=[a];
  for(const rec of e.examples.slice(0,3)){
   if(typeof rec.url==='string'&&/^https:\/\/www\.inaturalist\.org\/observations\/\d+$/.test(rec.url)&&
    typeof rec.date==='string'&&/^\d{4}-\d\d-\d\d$/.test(rec.date)){
    const link=el('a','', 'View '+fieldDate(rec.date)+' photo record');
    link.href=rec.url;link.target='_blank';link.rel='noopener noreferrer';children.push(link);
   }
  }
  fieldLinks.replaceChildren(...children);
 }catch(_error){
  if(ticket===fieldSeq)fieldReset('Field observation data could not be checked. We are not showing zero sightings or using historical model output as an observation.');
 }
}

function resetBeetle(message,mode='unknown'){
 beetleSeq++;
 fieldReset('Update the watch to examine dated observations for the same location as the verified model.');
 beetleState.className='beetle-state'+(mode==='unknown'?' is-unknown':'');
 beetleState.textContent=mode==='not-applicable'?'NOT A PILOT HOST':'OFFICIAL MODEL · NOT VERIFIED';
 beetleAnswer.textContent=mode==='not-applicable'?'Choose a Japanese beetle host crop.':'No current official beetle timing verified.';
 beetleAction.textContent=message||'Select beans, grapes, berries or roses to request the official USA-NPN point forecast.';
 beetleLocation.textContent='Reference point: '+(zip.value?'ZIP '+zip.value+' (not yet checked)':'Bay City')+'.';
 beetleAdult.textContent='Not verified';beetleEgg.textContent='Not verified';
 beetleSource.textContent='No official species-specific model data verified for this selection. Unknown does not mean no beetles.';
 if(biologyEvidence)biologyEvidence.textContent='Japanese beetle official model not verified for this garden selection. Other species models remain unavailable.';
}
function validBeetle(data,crop){
 if(!data||data.schema!=='japanese-beetle-forecast-truth-v1'||data.status!=='OFFICIAL_MODEL_AVAILABLE'||
 data.sourceKind!=='OFFICIAL_SPECIES_SPECIFIC_GRIDDED_MODEL'||data.crop!==crop||
 !/^\d{4}-\d\d-\d\d$/.test(data.sourceDate)||!data.stages||!data.verdict||typeof data.verdict.status!=='string')return false;
 const a=data.stages.adult,e=data.stages.egg;
 return a&&e&&typeof a.dayOfYear==='number'&&typeof e.dayOfYear==='number'&&
 Number.isFinite(a.dayOfYear)&&Number.isFinite(e.dayOfYear)&&a.dayOfYear>=1&&a.dayOfYear<=366&&
 e.dayOfYear>=a.dayOfYear&&e.dayOfYear<=366&&
 /^\d{4}-\d\d-\d\d$/.test(a.approximateDate||'')&&/^\d{4}-\d\d-\d\d$/.test(e.approximateDate||'')&&
 ['OFF_SEASON','SCOUT','EGG_WINDOW','THRESHOLD_PASSED','PREPARE','NOT_APPLICABLE'].includes(data.verdict.status);
}
function renderBeetle(data){
 const mode=data.verdict.status,year=data.year;
 const label={OFF_SEASON:'SOURCE CHECKED · PAST SEASON',SCOUT:'OFFICIAL MODEL · SCOUTING WINDOW',
 EGG_WINDOW:'OFFICIAL MODEL · EGG STAGE NEAR',THRESHOLD_PASSED:'OFFICIAL MODEL · THRESHOLD EARLIER',PREPARE:'OFFICIAL MODEL · PREPARATION',NOT_APPLICABLE:'NOT A PILOT HOST'};
 beetleState.className='beetle-state'+(mode==='SCOUT'||mode==='EGG_WINDOW'?' is-active':'');
 beetleState.textContent=label[mode]||'OFFICIAL SPECIES MODEL';
 beetleAnswer.textContent=data.verdict.verdict;
 beetleAction.textContent=data.verdict.action;
 beetleLocation.textContent='Reference: '+(data.location?.name||'Michigan location')+
  '. Census-area or named-city gridded point, not a garden inspection.';
 const eventText=(stage)=>new Date(stage.approximateDate+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'});
 beetleAdult.textContent=(mode==='PREPARE'?'Provisional · ':'Modeled · ')+eventText(data.stages.adult);
 beetleEgg.textContent=(mode==='PREPARE'?'Provisional · ':'Modeled · ')+eventText(data.stages.egg);
 const remaining=data.source?.remainingNearTermForecastDays;
 const forecastWindow=Number.isInteger(remaining)&&remaining>=4&&remaining<=6?
  ' Remaining official near-term window: '+remaining+' day(s) from today; older source days are subtracted from the normal six-day horizon. ':' Near-term source horizon is not verified. ';
 beetleSource.textContent='USA-NPN model layer date '+data.sourceDate+'. Verified exact raster time dimension and adult/egg point values. '+
 (mode==='OFF_SEASON'?'This is a completed season, not a forecast of the next summer. ':
  'Modeled threshold dates are not detections. '+forecastWindow)+'Provider coverage date is not a measured publication timestamp.';
 const modelLink=data.source?.coverageUrl;
 if(typeof modelLink==='string'&&modelLink.startsWith('https://geoserver.usanpn.org/geoserver/'))beetleRaster.href=modelLink;
 if(biologyEvidence)biologyEvidence.textContent='USA-NPN official Japanese beetle model: '+data.sourceDate+
  ', '+(data.location?.name||'Michigan reference area')+'. Model timing only. No beetle sighting has been confirmed.';
}
async function updateBeetle(d){
 const selected=crop.value,hasValidMain=d&&d.crop===selected;
 if(!beetleHosts.has(selected)){
  resetBeetle('This pilot is specific to beetles on beans, grapes, berries and roses. Use the crop scout notes for '+crop.options[crop.selectedIndex].text+'.','not-applicable');return;
 }
 if(!hasValidMain){resetBeetle('The selected crop and Michigan reference location have not been verified.');return;}
 const ref=zip.value;
 if(ref&&!/^(?:48|49)\d{3}$/.test(ref)){resetBeetle('Enter a complete Michigan ZIP before requesting model data.');return;}
 const req=++beetleSeq;
 beetleState.className='beetle-state is-unknown';beetleState.textContent='CHECKING OFFICIAL USA-NPN LAYERS';
 beetleAnswer.textContent='Reading Japanese beetle heat-stage model…';
 beetleAction.textContent='Checking two species-specific raster layers and their exact source dates for '+selected+'.';
 beetleAdult.textContent='Checking source…';beetleEgg.textContent='Checking source…';
 beetleSource.textContent='This does not use the generic 50°F accumulated heat map.';
 const p=new URLSearchParams({crop:selected});
 if(ref)p.set('zip',ref);else p.set('site','bay-city');
 try{
  const response=await fetch('/api/japanese-beetle-forecast?'+p.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(24000)});
  if(!response.ok)throw Error('OFFICIAL_SOURCE_UNAVAILABLE');
  const payload=await response.json();
  if(req!==beetleSeq)return;
  if(!validBeetle(payload,selected))throw Error('INVALID_FORECAST_EVIDENCE');
  renderBeetle(payload);
  loadFieldEvidence(payload,ref);
 }catch(_error){if(req===beetleSeq)resetBeetle('The official species-specific forecast, time dimension or reference pixel is unavailable. Continue plant inspection and consult the linked USA-NPN map; an unknown model result is never low risk.');}
}

restore();
update();
})();
