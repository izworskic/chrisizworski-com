/* On-device field journal UI; no network writes or new visitor tracking. */
(function(){
'use strict';
const J=window.GardenFieldJournal,R=window.GardenHistory,H=window.GardenHarvest,root=document.getElementById('field-journal');if(!J||!R||!H||!root)return;
const get=id=>document.getElementById(id),key='fvfFieldJournalV1',places={'bay-city':'Bay City',detroit:'Detroit','grand-rapids':'Grand Rapids',kalamazoo:'Kalamazoo','traverse-city':'Traverse City',marquette:'Marquette',houghton:'Houghton'};
const labels={'emergence':'Seedlings emerged','flowering':'First flowers','fruit-set':'Fruit set','first-green-harvest':'First green harvest','first-ripe-harvest':'First ripe harvest','first-harvest':'First harvest','harvest':'Harvest','note':'Field note','daily-air':'Full-day air temperature','paired-night':'Paired overnight readings'};
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
 let s=labels[e.kind];if(e.kind==='daily-air')s+=' · '+e.minF+' to '+e.maxF+'°F';if(e.kind==='paired-night')s+=' · garden '+e.gardenLowF+'°F, '+e.referenceId+' '+e.referenceLowF+'°F · '+e.regime.replace(/-/g,' ');return s;
}
async function render(){
 const v=++revision,select=get('fj-selected'),area=get('fj-entries');select.replaceChildren();area.replaceChildren();get('fj-comparison').replaceChildren();get('fj-pair-result').replaceChildren();
 if(!data.plantings.some(p=>p.id===selected))selected=data.plantings.at(-1)?.id||null;
 data.plantings.forEach(p=>option(select,p.id,p.bed+' · '+p.crop+' · '+fmt(p.date)));if(selected)select.value=selected;
 get('fj-record').hidden=!selected;get('fj-export').disabled=!data.plantings.length;get('fj-count').textContent=data.plantings.length+' planting'+(data.plantings.length===1?'':'s')+' · '+data.entries.length+' observation'+(data.entries.length===1?'':'s');
 if(!selected){get('fj-empty').hidden=false;return;}get('fj-empty').hidden=true;
 const s=J.summarize(data,selected,today);get('fj-entry-date').min=s.planting.date;get('fj-entry-date').value=today;get('fj-planting-info').textContent=places[s.planting.siteId]+' · '+s.planting.bed+' · planted '+fmt(s.planting.date);
 const list=node('ol',undefined,'fj-timeline');const planted=node('li');planted.append(node('time',fmt(s.planting.date)),node('strong','Planted: '+s.planting.crop));list.appendChild(planted);
 for(const e of s.entries){const li=node('li');li.append(node('time',fmt(e.date)),node('strong',describe(e)));if(e.note)li.appendChild(node('p',e.note));const b=node('button','Remove','gs-secondary');b.type='button';b.setAttribute('aria-label','Remove '+labels[e.kind]+' on '+fmt(e.date));b.addEventListener('click',()=>{if(commit({...data,entries:data.entries.filter(x=>x.id!==e.id)}))render();});li.appendChild(b);list.appendChild(li);}
 area.appendChild(list);paintComparison(s);
 if(!s.planting.modelId||s.planting.date.slice(5)==='02-29')return;
 try{const a=await history();if(v!==revision)return;const p=s.planting,h=R.replay(R.unpack(a,p.siteId),{modelId:p.modelId,biofix:p.biofix,monthDay:p.date.slice(5),packetDays:p.packetDays});paintComparison(J.summarize(data,p.id,today,h));}
 catch{if(v===revision)get('fj-comparison').appendChild(node('p','Regional historical archive unavailable; your observations are still here.'));}
}
get('fj-plant-form').addEventListener('submit',e=>{e.preventDefault();const p={id:uid(),crop:get('fj-crop').value,bed:get('fj-bed').value,siteId:get('fj-town').value,date:get('fj-plant-date').value,packetDays:num('fj-packet'),modelId,biofix};if(!commit({...data,plantings:[...data.plantings,p]}))return;selected=p.id;get('fj-crop').value='';get('fj-bed').value='';get('fj-packet').value='';setModel(null,null);render();get('fj-kind').focus();});
get('fj-selected').addEventListener('change',()=>{selected=get('fj-selected').value;render();});
function fields(){const kind=get('fj-kind').value;for(const [id,show] of [['fj-air-fields',kind==='daily-air'],['fj-night-fields',kind==='paired-night']]){const el=get(id);el.hidden=!show;el.disabled=!show;}get('fj-entry-date').max=kind==='daily-air'?new Date(Date.parse(today+'T00:00:00Z')-86400000).toISOString().slice(0,10):today;if(get('fj-entry-date').value>get('fj-entry-date').max)get('fj-entry-date').value=get('fj-entry-date').max;}
get('fj-kind').addEventListener('change',fields);fields();
get('fj-entry-form').addEventListener('submit',e=>{e.preventDefault();if(!selected)return;const kind=get('fj-kind').value,r={id:uid(),plantingId:selected,date:get('fj-entry-date').value,kind,note:get('fj-note').value};
 if(kind==='daily-air')Object.assign(r,{minF:num('fj-min'),maxF:num('fj-max'),fullShieldedDay:get('fj-full-day').checked});
 if(kind==='paired-night')Object.assign(r,{gardenLowF:num('fj-garden-low'),referenceLowF:num('fj-ref-low'),referenceId:get('fj-ref-id').value,regime:get('fj-regime').value,sameNightWindow:get('fj-same-night').checked,comparableShieldedAirHeight:get('fj-same-height').checked});
 if(commit({...data,entries:[...data.entries,r]})){get('fj-note').value='';for(const id of ['fj-min','fj-max','fj-garden-low','fj-ref-low'])get(id).value='';for(const id of ['fj-full-day','fj-same-night','fj-same-height'])get(id).checked=false;render();fields();}
});
get('fj-delete').addEventListener('click',()=>{if(!selected||!get('fj-confirm-delete').checked){status('Tick the confirmation box before removing the planting and all its observations.');return;}if(commit({schema:J.schema,plantings:data.plantings.filter(p=>p.id!==selected),entries:data.entries.filter(e=>e.plantingId!==selected)})){get('fj-confirm-delete').checked=false;selected=null;render();}});
get('fj-pair-form').addEventListener('submit',e=>{e.preventDefault();if(!selected)return;const result=get('fj-pair-result');result.replaceChildren();try{const r=J.paired(data,selected,today,{referenceId:get('fj-scenario-ref').value.trim(),regime:get('fj-scenario-regime').value,referenceLowF:num('fj-scenario-low'),referenceDate:get('fj-scenario-date').value});if(!r.scenario){result.appendChild(node('p','Comparable nights available: '+r.sampleCount+'. Five unique past nights within 90 days, matching this reference and regime, are required. No adjustment calculated.'));return;}const s=r.scenario;result.appendChild(node('p','Historical median difference: '+s.medianOffsetF.toFixed(1)+'°F. If that difference recurred: '+s.centralF.toFixed(1)+'°F.','fj-lead'));result.appendChild(node('p','Observed-offset scenario: '+s.lowF.toFixed(1)+' to '+s.highF.toFixed(1)+'°F. This is not a forecast interval or frost-safety guarantee.'));}catch{result.appendChild(node('p','Check the reference low, date and matched readings.'));}});
get('fj-scenario-date').value=today;get('fj-scenario-date').min=today;get('fj-scenario-date').max=new Date(Date.parse(today+'T00:00:00Z')+7*86400000).toISOString().slice(0,10);
get('fj-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download='freighter-view-field-journal.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
get('fj-import').addEventListener('change',async()=>{const file=get('fj-import').files[0];if(!file)return;try{if(data.plantings.length||storageBlocked)throw Error('Restore is only available in an empty, readable journal. Export your existing records first.');if(file.size>6000000)throw Error('Backup exceeds size limit');const next=J.validate(JSON.parse(await file.text()),today);if(commit(next))render();}catch(e){status(e.message+'. No records replaced.');}finally{get('fj-import').value='';}});
root.addEventListener('toggle',()=>{if(root.open)render();});function hash(){if(location.hash==='#field-journal')root.open=true;}window.addEventListener('hashchange',hash);hash();
get('fj-count').textContent=data.plantings.length+' planting'+(data.plantings.length===1?'':'s')+' · '+data.entries.length+' observation'+(data.entries.length===1?'':'s');if(root.open)render();
})();
