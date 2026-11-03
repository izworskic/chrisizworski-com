(function () {
 'use strict';
 const crop=document.getElementById('crop'),stage=document.getElementById('stage'),zip=document.getElementById('zip');
 const box=document.getElementById('borer-records'),button=document.getElementById('borer-record-check');
 const picker=document.getElementById('borer-record-year'),status=document.getElementById('borer-record-status');
 const results=document.getElementById('borer-record-results');
 if(!crop||!stage||!zip||!box||!button||!picker||!status||!results)return;
 const year=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric'}).format(new Date()));
 for(let y=year;y>=Math.max(2025,year-1);y--){
   const o=document.createElement('option');o.value=String(y);o.textContent=String(y);
   picker.append(o);
 }
 let serial=0,controller=null;
 function element(tag,cls,value){
   const n=document.createElement(tag);
   if(cls)n.className=cls;
   if(value!==undefined)n.textContent=String(value);
   return n;
 }
 function link(text,url){
   const a=element('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
 }
 function currentKey(){return [crop.value,stage.value,zip.value,picker.value].join('|');}
 function reset(message){
   serial++;
   if(controller){controller.abort();controller=null;}
   box.hidden=crop.value!=='squash';
   button.disabled=false;
   status.textContent=message||'Not checked. Photo records do not establish pest pressure, absence, timing or diagnosis.';
   results.replaceChildren();
   results.append(element('p','','Choose a year, then check dated public records for this reference area. This source does not monitor gardens systematically.'));
 }
 function validResponse(d,y){
   if(!d||d.schema!=='garden-pest-field-observations-v1'||d.species!=='squash-vine-borer'||d.year!==y||
     d.sourceKind!=='OPPORTUNISTIC_SPECIES_PHOTOGRAPH'||d.lifeStage!=='NOT_INDEPENDENTLY_VERIFIED'||
     !['DOCUMENTED_SPECIES_PHOTO','NO_QUALIFYING_RECORDS_IN_SAMPLE'].includes(d.status)||
     !d.records||!Number.isInteger(d.records.inspectedResults)||!Number.isInteger(d.records.qualifyingRecords)||
     !Array.isArray(d.records.examples)||d.location?.searchRadiusKm!==25||
     !['PAST_OR_DORMANT_SEASON_RECORDS','CURRENT_YEAR_RECORDS_NOT_A_FORECAST'].includes(d.seasonContext))return false;
   if(d.status==='DOCUMENTED_SPECIES_PHOTO'&&(!/^\d{4}-\d\d-\d\d$/.test(d.records.firstSampledDate||'')||
     !d.records.firstSampledDate.startsWith(String(y))))return false;
   return true;
 }
 function render(d){
   results.replaceChildren();
   const historical=d.seasonContext==='PAST_OR_DORMANT_SEASON_RECORDS';
   const lead=element('div','borer-record-verdict');
   lead.append(element('span','borer-proof-label',historical?'PAST OR DORMANT SEASON / NO ACTIVE PEST ALERT':'CURRENT SEASON / NOT AN OUTBREAK FORECAST'));
   if(d.status==='DOCUMENTED_SPECIES_PHOTO'){
     lead.append(element('strong','', 'Photographed species presence in the surrounding area'));
     lead.append(element('p','','Earliest qualifying date in the inspected photo sample: '+new Date(d.records.firstSampledDate+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'})+'. This is not the first arrival or adult emergence date.'));
   }else{
     lead.append(element('strong','','No qualifying public species photo in the inspected sample'));
     lead.append(element('p','','This does not mean squash vine borers were absent. Many gardens are never photographed or reported.'));
   }
   results.append(lead);
   results.append(element('p','borer-proof-explanation','Reference: '+d.location.name+'; 25 km (15.5 mi) search radius. '+d.records.inspectedResults+
     ' source record(s) inspected, '+d.records.qualifyingRecords+' qualifying after photo, species, public-coordinate, and accuracy checks. '+
     (d.records.sampleNote||'Source sampling is opportunistic.')));
   if(d.records.examples.length){
     const sample=element('div','borer-record-links');
     sample.append(element('strong','','Open the original dated photo records'));
     for(const r of d.records.examples.slice(0,4)){
       if(typeof r.url==='string'&&/^https:\/\/www\.inaturalist\.org\/observations\/\d+$/.test(r.url)&&
          /^\d{4}-\d\d-\d\d$/.test(r.date)&&r.date.startsWith(String(d.year))){
         sample.append(link(r.date+' · View original observation',r.url));
       }
     }
     results.append(sample);
   }
   results.append(element('p','borer-proof-limit','Research-grade species identification is not an independent adult-flight or egg-laying verification. These voluntary photographs do not establish local garden infestation, abundance, absence, a control threshold or model skill.'));
   results.append(link('View species and identification on iNaturalist','https://www.inaturalist.org/taxa/1410301'));
   results.append(link('MSU Extension: squash vine borer identification and management','https://msu-prod.dotcmscloud.com/news/squash_vine_borer_biology_and_management'));
   const date=typeof d.checkedAt==='string'&&Number.isFinite(Date.parse(d.checkedAt))?new Date(d.checkedAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'Not verified';
   status.textContent='iNaturalist check recorded '+date+'. '+(historical?'Historical season evidence only.':'Observation records only; no model forecast.');
 }
 async function check(){
   if(crop.value!=='squash')return;
   if(zip.value&&!/^(?:48|49)\d{3}$/.test(zip.value)){
     reset('Enter a complete Michigan ZIP area or clear ZIP to use Bay City. No alternative location will be assumed.');
     return;
   }
   const y=Number(picker.value),key=currentKey(),request=++serial;
   if(controller)controller.abort();
   controller=new AbortController();
   button.disabled=true;status.textContent='Checking dated iNaturalist records for this reference area. No pest-stage or outbreak inference will be made.';
   results.replaceChildren(element('p','','Reading community species-photo records. Not a live garden count.'));
   const params=new URLSearchParams({species:'squash-vine-borer',year:String(y)});
   if(zip.value)params.set('zip',zip.value);else params.set('site','bay-city');
   try{
     const response=await fetch('/api/garden-pest-field-observations?'+params.toString(),
       {headers:{accept:'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(14000)])});
     if(!response.ok)throw Error('SOURCE_UNAVAILABLE');
     const d=await response.json();
     if(request!==serial||key!==currentKey())return;
     if(!validResponse(d,y))throw Error('RECORD_SCHEMA_UNVERIFIED');
     render(d);
   }catch(_error){
     if(request!==serial||key!==currentKey())return;
     results.replaceChildren(element('p','borer-proof-limit','The reference-area source could not be verified. No record count, zero-sighting result or activity forecast is shown.'));
     results.append(link('Explore the species on iNaturalist','https://www.inaturalist.org/taxa/1410301'));
     status.textContent='FIELD SOURCE UNAVAILABLE / NOT VERIFIED. Use MSU scouting guidance instead.';
   }finally{if(request===serial)button.disabled=false;}
 }
 crop.addEventListener('change',()=>reset('Crop changed. Squash vine borer records apply to squash, not every crop.'));
 stage.addEventListener('change',()=>reset('Growth stage changed. Check new evidence if useful; previous records are cleared.'));
 zip.addEventListener('input',()=>reset('Reference area changed. No prior location records are retained.'));
 picker.addEventListener('change',()=>reset('Season changed. Check the selected year before reading dates.'));
 button.addEventListener('click',check);
 reset();
})();
