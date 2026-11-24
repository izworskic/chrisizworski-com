/* On-device field journal UI; no network writes or new visitor tracking. */
(function(){
'use strict';
const J=window.GardenFieldJournal,R=window.GardenHistory,H=window.GardenHarvest,root=document.getElementById('field-journal');if(!J||!R||!H||!root)return;
const get=id=>document.getElementById(id),key='fvfFieldJournalV1',places={'bay-city':'Bay City',detroit:'Detroit','grand-rapids':'Grand Rapids',kalamazoo:'Kalamazoo','traverse-city':'Traverse City',marquette:'Marquette',houghton:'Houghton'};
const labels={'emergence':'Seedlings emerged','flowering':'First flowers','fruit-set':'Fruit set','first-green-harvest':'First green harvest','first-ripe-harvest':'First ripe harvest','first-harvest':'First harvest','harvest':'Harvest','note':'Field note','daily-air':'Full-day air temperature','paired-night':'Paired overnight readings','rain-gauge':'Daily rain gauge','irrigation':'Irrigation applied','soil-feel':'Soil feel','leaf-check':'Leaf scouting observation','harvest-weight':'Weighed harvest','plant-loss':'Plants lost'};
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Detroit'}).formatToParts(new Date()).map(p=>[p.type,p.value])),today=parts.year+'-'+parts.month+'-'+parts.day;
const fmt=d=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function uid(){return typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
const num=id=>get(id).value.trim()===''?null:Number(get(id).value);
let data=J.blank(),selected=null,modelId=null,biofix=null,historyPromise=null,revision=0,storageBlocked=false;
const status=s=>{get('fj-status').textContent=s;};
try{const raw=localStorage.getItem(key);if(raw)data=J.validate(JSON.parse(raw),today);}catch{storageBlocked=true;status('Saved journal could not be read. Existing stored data has not been overwritten. Export it from browser storage before clearing, or use this session only.');}
function commit(next){
 let checked;try{checked=J.validate(next,today);}catch(e){status(e.message+'. Nothing changed.');return false;}
 data=checked;
 if(storageBlocked){status('Changed for this session only. Existing browser storage was not overwritten. Export a backup.');}
 else try{localStorage.setItem(key,JSON.stringify(data));status('Saved in this browser.');}catch{status('Browser storage unavailable. Changes are in this session only; export a backup.');}
 return true;
}
function option(list,value,text){const e=node('option',text);e.value=value;list.appendChild(e);}
Object.entries(places).forEach(([id,name])=>option(get('fj-town'),id,name));
Object.entries(labels).forEach(([id,name])=>option(get('fj-kind'),id,name));
get('fj-town').value='bay-city';get('fj-plant-date').value=today;get('fj-plant-date').max=today;get('fj-entry-date').value=today;get('fj-entry-date').max=today;
get('fj-controls').hidden=false;
function setModel(id,stage){modelId=id;biofix=stage;get('fj-model').textContent=id?'Linked crop model: '+H.models[id].variety+' · '+stage.replace(/-/g,' ')+'. Confirm the actual planting date and matching starting stage.':'No heat model linked. You can still record all milestones and compare with packet days.';}
setModel(null,null);
get('fj-crop').addEventListener('input',()=>setModel(null,null));
window.addEventListener('garden-journal-plan',e=>{
 const s=e.detail;if(!s||!J.sites.includes(s.siteId))return;
 root.open=true;get('fj-crop').value=s.crop;get('fj-town').value=s.siteId;get('fj-plant-date').value=s.date<=today?s.date:'';
 get('fj-packet').value=s.packetDays??'';setModel(s.modelId||null,s.biofix||null);
 get('fj-bed').focus();status('Plan copied. Confirm the actual planting date and name the bed; nothing is recorded until you save.');
});
function history(){if(!historyPromise)historyPromise=fetch('/assets/garden-tools/garden-daymet-2021-2025.json').then(r=>{if(!r.ok)throw Error('History unavailable');return r.json()}).catch(e=>{historyPromise=null;throw e});return historyPromise;}
function paintComparison(summary){
 const area=get('fj-comparison');area.replaceChildren();
 if(summary.firstHarvest)area.appendChild(node('p','Recorded '+labels[summary.firstHarvest.kind].toLowerCase()+': '+fmt(summary.firstHarvest.date)+' · '+summary.actualDays+' days after planting.','fj-lead'));
 else area.appendChild(node('p',summary.endpoint?'Waiting for a matching '+labels[summary.endpoint].toLowerCase()+' observation.':'Record a first harvest to compare with your seed packet.'));
 if(summary.packetDelta!==null){const n=summary.packetDelta;area.appendChild(node('p',n===0?'Matched packet days.':Math.abs(n)+' days '+(n<0?'earlier':'later')+' than your packet reference.'));}
 if(summary.comparison){const c=summary.comparison;area.appendChild(node('p','Five historical regional heat crossings: '+c.minDays+' to '+c.maxDays+' days from planting.'));if(c.relation)area.appendChild(node('p','Your recorded milestone fell '+(c.relation==='within'?'within':c.relation==='earlier'?'before':'after')+' that historical range.'));}
 else if(summary.planting.modelId)area.appendChild(node('p','Historical comparison not available for this selection.'));
 if(summary.heat){const h=summary.heat;area.appendChild(node('p',h.observedDays?'Recorded consecutive full days: '+h.observedDays+' · '+Math.round(h.observedGddF)+' °F degree-days through those readings.':'No uninterrupted full-day temperature series from planting yet.'));
 if(h.missingDate)area.appendChild(node('p','First missing day: '+fmt(h.missingDate)+'. Later readings stay in the journal but do not fill this gap.','fj-small'));
 if(h.observedCrossingDate)area.appendChild(node('p','Calculated heat threshold reached '+fmt(h.observedCrossingDate)+'. This does not establish that the crop was ready to harvest.'));}
 area.appendChild(node('p','Your notes are self-reported observations. The historical range comes from regional weather and a published cultivar model, not actual Michigan harvests or a validated prediction.','fj-small'));
}
function describe(e){
 let s=labels[e.kind];if(e.kind==='rain-gauge'||e.kind==='irrigation')s+=' · '+e.inches+' in';if(e.kind==='harvest-weight')s+=' · '+weight(e.usableG)+' usable, '+weight(e.discardedG)+' discarded';if(e.kind==='plant-loss')s+=' · '+e.lostCount+' plants';if(e.kind==='leaf-check')s+=' · '+e.leavesAffected+'/'+e.leavesChecked+' leaves with signs · foliage '+e.foliage+' · '+e.sign.replace(/-/g,' ');if(e.kind==='soil-feel')s+=' · '+e.feel.replace(/-/g,' ');if(e.kind==='daily-air')s+=' · '+e.minF+' to '+e.maxF+'°F';if(e.kind==='paired-night')s+=' · garden '+e.gardenLowF+'°F, '+e.referenceId+' '+e.referenceLowF+'°F · '+e.regime.replace(/-/g,' ');return s;
}
async function render(){
 const v=++revision,select=get('fj-selected'),area=get('fj-entries');select.replaceChildren();area.replaceChildren();get('fj-comparison').replaceChildren();get('fj-pair-result').replaceChildren();
 if(!data.plantings.some(p=>p.id===selected))selected=data.plantings.at(-1)?.id||null;
 data.plantings.forEach(p=>option(select,p.id,p.bed+' · '+p.crop+' · '+fmt(p.date)));if(selected)select.value=selected;
 get('fj-record').hidden=!selected;get('fj-export').disabled=!data.plantings.length;get('fj-count').textContent=data.plantings.length+' planting'+(data.plantings.length===1?'':'s')+' · '+data.entries.length+' observation'+(data.entries.length===1?'':'s');
 if(!selected){get('fj-empty').hidden=false;resetWater(null);resetDisease(null);resetProductivity(null);return;}get('fj-empty').hidden=true;
 const s=J.summarize(data,selected,today);resetWater(s);resetDisease(s);resetProductivity(s);get('fj-entry-date').min=s.planting.date;get('fj-entry-date').value=today;fields();get('fj-confirm-delete').checked=false;get('fj-planting-info').textContent=places[s.planting.siteId]+' · '+s.planting.bed+' · planted '+fmt(s.planting.date);
 const list=node('ol',undefined,'fj-timeline');const planted=node('li');planted.append(node('time',fmt(s.planting.date)),node('strong','Planted: '+s.planting.crop));list.appendChild(planted);
 for(const e of s.entries){const li=node('li');li.append(node('time',fmt(e.date)),node('strong',describe(e)));if(e.note)li.appendChild(node('p',e.note));const b=node('button','Remove','gs-secondary');b.type='button';b.setAttribute('aria-label','Remove '+labels[e.kind]+' on '+fmt(e.date));b.addEventListener('click',()=>{if(commit({...data,plantings:reopenFor(e.kind,e.plantingId),entries:data.entries.filter(x=>x.id!==e.id)}))render();});li.appendChild(b);list.appendChild(li);}
 area.appendChild(list);paintComparison(s);
 if(!s.planting.modelId||s.planting.date.slice(5)==='02-29')return;
 try{const a=await history();if(v!==revision)return;const p=s.planting,h=R.replay(R.unpack(a,p.siteId),{modelId:p.modelId,biofix:p.biofix,monthDay:p.date.slice(5),packetDays:p.packetDays});paintComparison(J.summarize(data,p.id,today,h));}
 catch{if(v===revision)get('fj-comparison').appendChild(node('p','Regional historical archive unavailable; your observations are still here.'));}
}
get('fj-plant-form').addEventListener('submit',e=>{e.preventDefault();const p={id:uid(),crop:get('fj-crop').value,bed:get('fj-bed').value,siteId:get('fj-town').value,date:get('fj-plant-date').value,packetDays:num('fj-packet'),modelId,biofix};if(!commit({...data,plantings:[...data.plantings,p]}))return;selected=p.id;get('fj-crop').value='';get('fj-bed').value='';get('fj-packet').value='';setModel(null,null);render();get('fj-kind').focus();});
get('fj-selected').addEventListener('change',()=>{selected=get('fj-selected').value;render();});
function fields(){const kind=get('fj-kind').value;for(const [id,show] of [['fj-air-fields',kind==='daily-air'],['fj-night-fields',kind==='paired-night'],['fj-water-amount-fields',kind==='rain-gauge'||kind==='irrigation'],['fj-feel-fields',kind==='soil-feel'],['fj-leaf-fields',kind==='leaf-check'],['fj-harvest-fields',kind==='harvest-weight'],['fj-loss-fields',kind==='plant-loss']]){const el=get(id);el.hidden=!show;el.disabled=!show;}get('fj-entry-date').max=(kind==='daily-air'||kind==='rain-gauge')?new Date(Date.parse(today+'T00:00:00Z')-86400000).toISOString().slice(0,10):today;if(get('fj-entry-date').value>get('fj-entry-date').max)get('fj-entry-date').value=get('fj-entry-date').max;}
get('fj-kind').addEventListener('change',fields);fields();
get('fj-entry-form').addEventListener('submit',e=>{e.preventDefault();if(!selected)return;const kind=get('fj-kind').value,r={id:uid(),plantingId:selected,date:get('fj-entry-date').value,kind,note:get('fj-note').value};
 if(kind==='rain-gauge'||kind==='irrigation')r.inches=num('fj-water-inches');
 if(kind==='harvest-weight'){try{Object.assign(r,{usableG:P.toGrams(num('fj-usable-weight'),get('fj-weight-unit').value),discardedG:P.toGrams(num('fj-discard-weight'),get('fj-weight-unit').value)});}catch(e){status(e.message);return;}}
 if(kind==='plant-loss')r.lostCount=num('fj-lost-count');
 if(kind==='leaf-check')Object.assign(r,{sign:get('fj-leaf-sign').value,foliage:get('fj-leaf-wet').value,leavesChecked:num('fj-leaf-checked'),leavesAffected:num('fj-leaf-affected')});
 if(kind==='soil-feel')r.feel=get('fj-feel').value;
 if(kind==='daily-air')Object.assign(r,{minF:num('fj-min'),maxF:num('fj-max'),fullShieldedDay:get('fj-full-day').checked});
 if(kind==='paired-night')Object.assign(r,{gardenLowF:num('fj-garden-low'),referenceLowF:num('fj-ref-low'),referenceId:get('fj-ref-id').value,regime:get('fj-regime').value,sameNightWindow:get('fj-same-night').checked,comparableShieldedAirHeight:get('fj-same-height').checked});
 if(commit({...data,plantings:reopenFor(kind,selected),entries:[...data.entries,r]})){get('fj-note').value='';for(const id of ['fj-min','fj-max','fj-garden-low','fj-ref-low','fj-water-inches','fj-leaf-checked','fj-leaf-affected','fj-usable-weight','fj-discard-weight','fj-lost-count'])get(id).value='';for(const id of ['fj-full-day','fj-same-night','fj-same-height'])get(id).checked=false;render();fields();}
});
get('fj-delete').addEventListener('click',()=>{if(!selected||!get('fj-confirm-delete').checked){status('Tick the confirmation box before removing the planting and all its observations.');return;}if(commit({schema:J.schema,plantings:data.plantings.filter(p=>p.id!==selected),entries:data.entries.filter(e=>e.plantingId!==selected)})){delete waterProfiles[selected];try{localStorage.setItem('fvfJournalWaterProfilesV1',JSON.stringify(waterProfiles));}catch{}get('fj-confirm-delete').checked=false;selected=null;render();}});
get('fj-pair-form').addEventListener('submit',e=>{e.preventDefault();if(!selected)return;const result=get('fj-pair-result');result.replaceChildren();try{const r=J.paired(data,selected,today,{referenceId:get('fj-scenario-ref').value.trim(),regime:get('fj-scenario-regime').value,referenceLowF:num('fj-scenario-low'),referenceDate:get('fj-scenario-date').value});if(!r.scenario){result.appendChild(node('p','Comparable nights available: '+r.sampleCount+'. Five unique past nights within 90 days, matching this reference and regime, are required. No adjustment calculated.'));return;}const s=r.scenario;result.appendChild(node('p','Historical median difference: '+s.medianOffsetF.toFixed(1)+'°F. If that difference recurred: '+s.centralF.toFixed(1)+'°F.','fj-lead'));result.appendChild(node('p','Observed-offset scenario: '+s.lowF.toFixed(1)+' to '+s.highF.toFixed(1)+'°F. This is not a forecast interval or frost-safety guarantee.'));}catch{result.appendChild(node('p','Check the reference low, date and matched readings.'));}});
get('fj-scenario-date').value=today;get('fj-scenario-date').min=today;get('fj-scenario-date').max=new Date(Date.parse(today+'T00:00:00Z')+7*86400000).toISOString().slice(0,10);
get('fj-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download='freighter-view-field-journal.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
get('fj-import').addEventListener('change',async()=>{const file=get('fj-import').files[0];if(!file)return;try{if(data.plantings.length||storageBlocked)throw Error('Restore is only available in an empty, readable journal. Export your existing records first.');if(file.size>6000000)throw Error('Backup exceeds size limit');const next=J.validate(JSON.parse(await file.text()),today);if(data.plantings.length||storageBlocked)throw Error('Journal changed while reading the backup');if(commit(next))render();}catch(e){status(e.message+'. No records replaced.');}finally{get('fj-import').value='';}});

// Watering uses the canonical extracted tool's existing engine and data API.
// The journal never uploads its observations; the only request is for the reference town.
const W=window.GardenJournalWater;
let waterVersion=0,waterPlant=null,waterModules=null,waterProfiles={};
const coords={'bay-city':[43.5945,-83.8889],detroit:[42.3314,-83.0458],'grand-rapids':[42.9634,-85.6681],kalamazoo:[42.2917,-85.5872],'traverse-city':[44.7631,-85.6206],marquette:[46.5436,-87.3954],houghton:[47.1211,-88.5694]};
try{const x=JSON.parse(localStorage.getItem('fvfJournalWaterProfilesV1')||'{}');if(x&&typeof x==='object'&&!Array.isArray(x))waterProfiles=x;}catch{}
function resetWater(s){
 waterVersion++;const output=get('fj-water-result');output.replaceChildren();
 if(!W||!s){waterPlant=null;return;}
 const p=s.planting,l=W.ledger(s.entries,today);
 get('fj-water-ledger').textContent='Last 7 completed days: '+l.rainDays+'/7 rain-gauge days, '+l.rainIn.toFixed(2)+' in recorded rain. Irrigation recorded in the last 7 days through today: '+l.irrigationIn.toFixed(2)+' in across '+l.irrigation.length+' watering dates. Missing dates are unknown. Soil today: '+(l.soilFeel?l.soilFeel.replace(/-/g,' '):'not recorded')+'.';
 if(waterPlant===p.id)return;waterPlant=p.id;
 const x=Object.hasOwn(waterProfiles,p.id)?waterProfiles[p.id]:null;
 get('fj-water-crop').value=x?.cropId||W.profileFor(H.models[p.modelId])||'';
 get('fj-water-stage').value=x?.stage||'developing';get('fj-water-bed').value=x?.bed||'ground';get('fj-water-soil').value=x?.soil||'auto';
 get('fj-water-length').value=x?.length??'';get('fj-water-width').value=x?.width??'';get('fj-water-mulch').checked=x?.mulch===true;get('fj-water-active').checked=false;
}
function waterLib(){if(!waterModules)waterModules=Promise.all([import('/assets/national-garden-water-engine.js?v=20260904-v5'),fetch('/data/national-garden-water-crops.json').then(r=>{if(!r.ok)throw Error('Crop profiles unavailable');return r.json();})]).catch(e=>{waterModules=null;throw e;});return waterModules;}
get('fj-water-form').addEventListener('input',()=>{waterVersion++;get('fj-water-result').replaceChildren();});
get('fj-water-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!W||!selected)return;const p=data.plantings.find(x=>x.id===selected),v=++waterVersion,area=get('fj-water-result');area.replaceChildren();
 const entries=data.entries.filter(x=>x.plantingId===p.id),l=W.ledger(entries,today);
 if(!l.soilFeel){area.appendChild(node('p','Check soil first. Record how the soil feels today in your journal before running a watering calculation.','fj-lead'));return;}
 const length=num('fj-water-length'),width=num('fj-water-width');
 if((length===null)!==(width===null)){area.appendChild(node('p','Enter both watered dimensions, or leave both blank.'));return;}
 let setup;try{setup=W.validateSetup({cropId:get('fj-water-crop').value,stage:get('fj-water-stage').value,bed:get('fj-water-bed').value,soil:get('fj-water-soil').value,mulch:get('fj-water-mulch').checked,areaSqFt:length===null?null:length*width});}catch(e){area.appendChild(node('p',e.message));return;}
 if(!get('fj-water-active').checked){area.appendChild(node('p','Confirm active growth and unfrozen soil first.'));return;}
 try{waterProfiles[p.id]={...setup,length,width};localStorage.setItem('fvfJournalWaterProfilesV1',JSON.stringify(waterProfiles));}catch{}
 const [lat,lon]=coords[p.siteId]||[];if(!Number.isFinite(lat)||!Number.isFinite(lon)){area.appendChild(node('p','Reference town unavailable.'));return;}
 area.appendChild(node('p','Reading the existing Garden Water weather and soil sources…'));
 try{const [[engine,profiles],context]=await Promise.all([waterLib(),fetch('/api/national-garden-water?lat='+lat+'&lon='+lon).then(r=>{if(!r.ok)throw Error('Weather unavailable');return r.json();})]);if(v!==waterVersion)return;
 const r=W.evaluate({engine,context,crops:profiles.crops,setup,entries,today,now:Date.now(),latitude:lat,longitude:lon,activeGrowing:true});area.replaceChildren();
 area.appendChild(node('p',r.state==='WATER TODAY'?'Watering indicated':r.state==='WAIT'?'Wait and check again':r.state==='HOLD FOR RAIN'?'Hold for rain':'Check soil first','fj-lead'));
 if(!r.decision){area.appendChild(node('p',r.reason));return;}
 const d=r.decision;if(d.state==='WATER TODAY')area.appendChild(node('p','Modeled application: '+d.applyIn.toFixed(2)+' inches'+(d.gallons===null?'':', about '+d.gallons.toFixed(1)+' gallons over the entered area')+'. Apply slowly and check infiltration.','fj-lead'));
 area.appendChild(node('p','Based on your recorded soil feel today and the existing model. '+(d.state==='HOLD FOR RAIN'?'Regional forecast rain may reduce the need to irrigate.':'Check the actual bed before acting.')));
 area.appendChild(node('p','NWS forecast reference ET: '+context.referenceEt.daily[0].toFixed(2)+' in/day; next 24h rain: '+context.forecastRain.in24.toFixed(2)+' in. Weather context generated '+new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Detroit'}).format(new Date(r.sourceTime))+' local.','fj-small'));
 area.appendChild(node('p',r.gaugeDaysUsed+' rain-gauge days replaced regional history for matching dates. '+(l.irrigation.length>1?'Multiple irrigation dates remain in the journal; the current soil observation anchors the estimate rather than pretending the owner model replays all events.':r.irrigationUsed?'One recorded irrigation date supplied to the existing model.':'No recent irrigation record supplied; missing is unknown.')+' No independent measurement of root-zone moisture or garden-level forecast validation.','fj-small'));
 }catch{if(v===waterVersion){area.replaceChildren(node('p','Check soil first. Fresh watering evidence is unavailable. No amount calculated.','fj-lead'));}}
});


// Scout only the selected planting. The Pest Watch request sends town, crop and stage,
// never private notes, symptom counts or sensor readings.
const D=window.GardenDisease;let diseaseVersion=0,diseasePlant=null;
function resetDisease(s){
 diseaseVersion++;get('fj-disease-result').replaceChildren();if(!D||!s){diseasePlant=null;return;}
 const checks=s.entries.filter(e=>e.kind==='leaf-check').sort((a,b)=>b.date.localeCompare(a.date));
 get('fj-disease-ledger').textContent=checks.length?'Latest check '+fmt(checks[0].date)+': '+checks[0].leavesAffected+' of '+checks[0].leavesChecked+' inspected leaves showed visible signs. '+checks.length+' recorded checks. These are sample counts, not whole-garden disease prevalence.':'No leaf checks recorded for this planting yet.';
 if(diseasePlant===s.planting.id)return;diseasePlant=s.planting.id;
 get('fj-disease-crop').value=D.cropFor(H.models[s.planting.modelId])||'';
 get('fj-disease-stage').value='growing';get('fj-disease-active').checked=false;
}
function sourceLink(url,label){const a=node('a',label);a.href=url;return a;}
function paintDisease(r,area){
 area.replaceChildren();
 area.appendChild(node('p',!r.active?'Plan your next scouting visit':r.diseases.some(d=>d.state==='OBSERVED_SIGN')?'Compare the signs you recorded':'Where to look on your next garden walk','fj-lead'));
 if(r.latest)area.appendChild(node('p','Most recent check in the last 7 days: '+fmt(r.latest.date)+' · '+r.latest.leavesAffected+' of '+r.latest.leavesChecked+' leaves with visible signs.'));
 else area.appendChild(node('p','No leaf checks in the last 7 days. That is not evidence of healthy plants.'));
 area.appendChild(node('p',r.rainDays+'/3 completed rain-gauge days recorded, '+r.rainIn.toFixed(2)+' in total. '+(r.wetFoliageReported?'Wet foliage was reported during at least one recent inspection.':'No recent wet-foliage observation recorded.')+' Rain depth and a spot observation are not measured leaf-wetness duration.','fj-small'));
 if(r.active){
  if(r.days.length){const list=node('ul',undefined,'fj-weather-days');for(const day of r.days)list.appendChild(node('li',fmt(day.date)+': '+day.humidHours+' forecast hourly samples at 90% humidity or above; minimum '+Math.round(day.minF)+'°F.'));area.appendChild(node('p','Regional NWS forecast · issued '+new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Detroit'}).format(new Date(r.issuedAt))+' local · '+r.days.length+'/3 complete future local days.','fj-small'));area.appendChild(list);}
  else area.appendChild(node('p','Fresh complete forecast days are unavailable. Local observations and general scouting guidance remain available.'));
 }
 for(const d of r.diseases){
  const item=node('section',undefined,'fj-add');item.appendChild(node('h3',d.name));item.appendChild(node('p',d.state==='OBSERVED_SIGN'?'Recorded sign resembles this disease; identification unconfirmed.':d.state==='SCOUTING_CUE'?'Weather or foliage observations suggest a closer look, not an outbreak.':d.state==='PLANNING_REFERENCE'?'Season planning reference.':'General scouting reference; absence of a cue does not rule out disease.','fj-small'));
  if(d.forecastHours!==null)item.appendChild(node('p',d.forecastHours+' matching forecast hourly samples in complete days. Descriptive temperature/humidity cue only, not an infection model.','fj-small'));
  item.append(node('p',d.where),node('p',d.action),sourceLink(d.source,'Read Extension identification guidance'));area.appendChild(item);
 }
 if(r.windows.length){const part=node('section',undefined,'fj-add');part.append(node('h3','Published potato late-blight weather criterion'),node('p',r.windows.map(w=>fmt(w.from)+' to '+fmt(w.to)).join('; ')+': forecast samples meet the Hutton temperature/humidity reference.'),node('p','Developed for Great Britain potatoes. Not validated in Michigan, not a diagnosis, not evidence of pathogen presence or a spray recommendation.','fj-small'),sourceLink(D.sources.hutton,'Published Hutton criteria'));area.appendChild(part);}
 area.appendChild(node('p','If suspicious lesions spread rapidly, seek expert identification. No local disease or spore report is inferred from weather.'));area.appendChild(sourceLink(r.diagnostic,'MSU Plant & Pest Diagnostics'));
}
get('fj-disease-form').addEventListener('input',()=>{diseaseVersion++;get('fj-disease-result').replaceChildren();});
get('fj-disease-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!D||!selected)return;
 const p=data.plantings.find(x=>x.id===selected),v=++diseaseVersion,area=get('fj-disease-result'),crop=get('fj-disease-crop').value,stage=get('fj-disease-stage').value,active=get('fj-disease-active').checked,entries=data.entries.filter(x=>x.plantingId===p.id);
 const args={crop,stage,active,entries,today,now:Date.now(),siteId:p.siteId};
 try{paintDisease(D.evaluate(args),area);}catch(e){area.replaceChildren(node('p',e.message));return;}
 if(!active)return;
 area.prepend(node('p','Checking regional forecast evidence…','fj-small'));
 try{const res=await fetch('/api/michigan-garden-pest-watch?mode=disease&site='+encodeURIComponent(p.siteId)+'&crop='+encodeURIComponent(crop)+'&stage='+encodeURIComponent(stage));if(!res.ok)throw Error('Forecast unavailable');const pestResponse=await res.json();if(v!==diseaseVersion)return;paintDisease(D.evaluate({...args,now:Date.now(),pestResponse}),area);}
 catch{if(v===diseaseVersion)paintDisease(D.evaluate(args),area);}
});


// Productivity uses only weighed visitor records. No source requests or projected crop yields.
const P=window.GardenProductivity;let yieldPlant=null;
const yieldKinds=['harvest-weight','plant-loss','first-harvest','first-green-harvest','first-ripe-harvest','harvest'];
function reopenFor(kind,id){return yieldKinds.includes(kind)?data.plantings.map(p=>p.id===id&&p.productivity?.complete?{...p,productivity:{...p.productivity,complete:false,closedOn:null}}:p):data.plantings;}
const number=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
function weight(g){return g===null?'Not recorded':g===0?'0 lb':P.pounds(g)<.01?g+' g':number(P.pounds(g))+' lb';}
function yieldMetric(n,unit){return n===null?'Not available':n>0&&n<.01?'<0.01 '+unit:number(n)+' '+unit;}
function yieldLine(parent,label,value){const r=node('div',undefined,'fj-yield-line');r.append(node('span',label),node('strong',value));parent.appendChild(r);}
function paintSeason(){
 const area=get('fj-yield-season');area.replaceChildren();const year=num('fj-yield-year');if(!Number.isInteger(year)||year<1900||year>Number(today.slice(0,4))){area.appendChild(node('p','Choose a harvest year through the current year.'));return;}
 const r=P.season(data,year);
 area.appendChild(node('p',r.usableG===null?'No weighed harvests recorded for '+year:weight(r.usableG)+' usable produce recorded in '+year,'fj-lead'));
 yieldLine(area,'Weighed discarded produce',weight(r.discardedG));
 area.appendChild(node('p',r.plantingsWithWeights+' of '+r.plantingCount+' recorded planting cohorts have weighed harvests in this year. '+r.openPlantings+' associated plantings are not marked finished. This total is recorded weight, not total production if records are incomplete.','fj-small'));
 for(const g of r.groups)yieldLine(area,g.group==='unclassified'?'Unclassified crop':g.group.replace(/-/g,' '),weight(g.usableG)+' usable');
 area.appendChild(node('p','Totals use the actual harvest date, even if a planting began in a previous year. Shared and reused bed areas are not added.','fj-small'));
}
function paintProductivity(){
 if(!selected||!P)return;
 const area=get('fj-yield-summary'),compare=get('fj-yield-compare');area.replaceChildren();compare.replaceChildren();
 const r=P.compare(data,selected),s=r.selected;
 area.appendChild(node('p',s.usableG===null?'No weighed harvest recorded yet':weight(s.usableG)+' usable produce '+(s.complete?'for this finished planting':'recorded so far'),'fj-lead'));
 yieldLine(area,'Weighed discarded produce',weight(s.discardedG));
 yieldLine(area,'Usable yield per allocated square foot',yieldMetric(s.lbPerSqFt,'lb/ft²'));
 yieldLine(area,'Usable yield per original plant',yieldMetric(s.lbPerPlant,'lb/plant'));
 yieldLine(area,'Plants reported lost',String(s.lossCount)+(s.plantedCount===null?' (original count unknown)':' of '+s.plantedCount+' planted'));
 if(s.discardFraction!==null)yieldLine(area,'Share of weighed produce discarded',number(s.discardFraction*100)+'%');
 if(s.firstHarvestDays!==null)yieldLine(area,'Days to earliest recorded harvest',String(s.firstHarvestDays));
 area.appendChild(node('p',s.recordedHarvestDays+' weighed harvest dates. '+(s.complete?'Finished and attested complete by you.':'Open planting: recorded totals may increase.')+' Missing weights are not inferred. Loss counts are recorded losses, not a survival survey.','fj-small'));
 if(s.unweighedDates.length)area.appendChild(node('p',s.unweighedDates.length+' harvest milestone date(s) lack a corresponding weighed entry. Resolve these before comparing finished yield.','fj-small'));
 if(!s.eligible)compare.appendChild(node('p','Save the crop group, allocated area and completed harvest record before comparing yield. Other crops and incomplete records are excluded.'));
 else if(!r.rows.length)compare.appendChild(node('p','No other eligible completed planting of this crop group in the same reference town yet. Record another planting or season to compare.'));
 else{
  const rows=[s,...r.rows],max=Math.max(.000001,...rows.map(x=>x.lbPerSqFt));const list=node('ol',undefined,'fj-yield-list');
  for(const x of rows){const li=node('li'),head=node('div',undefined,'gs-row-head');head.append(node('strong',x.crop+(x.id===selected?' (selected)':'')),node('span',yieldMetric(x.lbPerSqFt,'lb/ft²')));li.append(head,node('p',x.bed+' · planted '+fmt(x.plantingDate)+' · '+number(x.areaSqFt)+' ft² · '+weight(x.usableG)+' usable','fj-small'));const track=node('div',undefined,'gs-track'),bar=node('span',undefined,'gs-bar');track.setAttribute('aria-hidden','true');bar.style.width=100*x.lbPerSqFt/max+'%';track.appendChild(bar);li.appendChild(track);list.appendChild(li);}
  compare.appendChild(list);compare.appendChild(node('p','Same crop group and reference town, finished records only. Not a controlled variety trial; seasons, spacing, crop types within a group and care may differ.','fj-small'));
 }
 paintSeason();
}
function resetProductivity(s){
 if(!P||!s){yieldPlant=null;return;}
 const p=s.planting,q=p.productivity;
 // Always restore the saved completion state after record edits, which reopen a cohort.
 get('fj-yield-group').value=q?.group||P.cropFor(H.models[p.modelId])||'';
 get('fj-yield-length').value=q?.lengthFt??'';get('fj-yield-width').value=q?.widthFt??'';get('fj-yield-plants').value=q?.plantedCount??'';
 get('fj-yield-complete').checked=q?.complete===true;get('fj-yield-close').value=q?.closedOn||'';get('fj-yield-close').min=p.date;get('fj-yield-close').max=today;get('fj-yield-close').disabled=!q?.complete;
 if(yieldPlant!==p.id){yieldPlant=p.id;get('fj-yield-year').value=p.date.slice(0,4);}
 get('fj-yield-year').max=today.slice(0,4);paintProductivity();
}
get('fj-yield-complete').addEventListener('change',()=>{const checked=get('fj-yield-complete').checked;get('fj-yield-close').disabled=!checked;if(checked&&!get('fj-yield-close').value)get('fj-yield-close').value=today;});
get('fj-yield-year').addEventListener('input',paintSeason);
get('fj-yield-form').addEventListener('submit',e=>{
 e.preventDefault();if(!P||!selected)return;
 const p=data.plantings.find(x=>x.id===selected),complete=get('fj-yield-complete').checked,closedOn=complete?get('fj-yield-close').value:null;
 const q={group:get('fj-yield-group').value,lengthFt:num('fj-yield-length'),widthFt:num('fj-yield-width'),plantedCount:num('fj-yield-plants'),complete,closedOn};
 if(complete&&P.summarize({...p,productivity:q},data.entries).unweighedDates.length){status('A harvest milestone date has no weighed entry. Keep the record open until the weights are known.');return;}
 if(commit({...data,plantings:data.plantings.map(x=>x.id===selected?{...x,productivity:q}:x)})){resetProductivity({planting:{...p,productivity:q}});}
});

root.addEventListener('toggle',()=>{if(root.open)render();});function hash(){if(location.hash==='#field-journal')root.open=true;}window.addEventListener('hashchange',hash);hash();
get('fj-count').textContent=data.plantings.length+' planting'+(data.plantings.length===1?'':'s')+' · '+data.entries.length+' observation'+(data.entries.length===1?'':'s');if(root.open)render();
})();
