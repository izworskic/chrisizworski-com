(function(){
'use strict';
// Private, self-reported 2027 field journal. Browser storage only, no server POST.
// This is intentionally NOT submitted to the independent USA-NPN database.
const $=id=>document.getElementById(id),root=$('beetle-monitoring');if(!root)return;
const form=$('monitor-form'),site=$('monitor-site'),crop=$('monitor-crop'),date=$('monitor-date'),method=$('monitor-method'),minutes=$('monitor-minutes'),
 status=$('monitor-status'),count=$('monitor-count'),interference=$('monitor-treatment'),seasonStatus=$('monitor-season-status'),
 verdict=$('monitor-verdict'),reason=$('monitor-reason'),snapshotStatus=$('monitor-snapshot-status'),visitsBox=$('monitor-visits'),
 exportBtn=$('monitor-export'),importBtn=$('monitor-import-button'),importInput=$('monitor-import'),clearBtn=$('monitor-clear'),
 checkBtn=$('monitor-npn-check'),checkResult=$('monitor-npn-result'),snapBtn=$('monitor-snapshot');
const KEY='freighterviewfarms-japanese-beetle-monitoring-v1',SEASON=2027,MAX=400,headers=['site','date','crop','method','minutes','adults','count','reference','interference','checkedAt','modelDate','modelSourceDate','modelCapturedOn'];
let entries=[],snapshots=[],storageOK=true;
function nowMI(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;}
function validDate(d){return typeof d==='string'&&/^20\d\d-\d\d-\d\d$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;}
function diff(a,b){return Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);}
function reference(){const z=$('zip')?.value?.trim()||'';return /^(48|49)\d{3}$/.test(z)?'zip:'+z:'site:bay-city';}
function read(){
 try{const text=localStorage.getItem(KEY);if(!text)return;const d=JSON.parse(text);
  if(Array.isArray(d?.entries)&&d.entries.length<=MAX)entries=d.entries.filter(x=>validEntry(x,{allowPast:true}));
  if(Array.isArray(d?.snapshots)&&d.snapshots.length<=40)snapshots=d.snapshots.filter(x=>validSnapshot(x));
 }catch(_err){storageOK=false}
}
function persist(){
 if(!storageOK)return;
 try{localStorage.setItem(KEY,JSON.stringify({schema:1,entries,snapshots}))}
 catch(_err){storageOK=false;seasonStatus.textContent='Browser storage is unavailable; export this session to CSV before closing the tab.'}
}
function validEntry(x,{allowPast=false}={}){
 if(!x||!/^([a-z0-9][a-z0-9_-]{1,29})$/.test(x.site||'')||!validDate(x.date)||x.date.slice(0,4)!=='2027')return false;
 if(!allowPast&&x.date>nowMI())return false;
 if(!['roses','beans','grapes','berries'].includes(x.crop)||!['visual-host-check','leaf-inspection','fixed-transect'].includes(x.method)||
  !Number.isInteger(x.minutes)||x.minutes<5||x.minutes>90||!['no','yes','uncertain'].includes(x.adults)||
  !['no','yes','unknown'].includes(x.interference)||!/^zip:(48|49)\d{3}$|^site:bay-city$/.test(x.reference))return false;
 if(x.adults==='yes'&&(!Number.isInteger(x.count)||x.count<1||x.count>10000))return false;
 if(x.adults==='no'&&x.count!==0)return false;
 return x.adults!=='uncertain'||x.count===0;
}
function validSnapshot(x){
 return x&&/^[a-z0-9][a-z0-9_-]{1,29}$/.test(x.site||'')&&
 ['roses','beans','grapes','berries'].includes(x.crop)&&/^zip:(48|49)\d{3}$|^site:bay-city$/.test(x.reference||'')&&
 validDate(x.modelDate)&&validDate(x.sourceDate)&&validDate(x.capturedOn)&&
 [x.modelDate,x.sourceDate,x.capturedOn].every(d=>d.startsWith('2027-'))&&
 x.sourceDate<=x.capturedOn&&x.capturedOn<=x.modelDate&&diff(x.modelDate,x.sourceDate)<=6;
}
function selectedKey(){return site.value.trim().toLowerCase()+'|'+crop.value+'|'+method.value+'|'+minutes.value+'|'+reference();}
function sameGroup(x){return [x.site,x.crop,x.method,String(x.minutes),x.reference].join('|')===selectedKey();}
function summarize(list){
 const byDay=new Map();
 for(const x of list){
  if(!byDay.has(x.date))byDay.set(x.date,new Set());
  byDay.get(x.date).add(x.adults);
 }
 if([...byDay.values()].some(v=>v.has('yes')&&v.has('no')))return{status:'CONFLICT',text:'Contradictory yes and no entries on the same day.',explain:'Correct the entry; do not treat contradictory reports as a scientific onset window.'};
 const ordered=[...byDay.entries()].map(([date,v])=>({date,st:v.has('yes')?'yes':v.has('no')?'no':'uncertain'})).sort((a,b)=>a.date.localeCompare(b.date));
 const first=ordered.find(x=>x.st==='yes');
 if(!first)return{status:'PENDING',text:'Keep recording real no visits before emergence.',explain:'You have '+ordered.filter(x=>x.st==='no').length+' completed negative inspection date(s) and no confirmed positive. This does not mean beetles are absent from the area.'};
 const neg=ordered.filter(x=>x.st==='no'&&x.date<first.date),last=neg.at(-1);
 if(!last)return{status:'LEFT_CENSORED',text:'Adult observed without an earlier negative inspection.',explain:'The first yes cannot locate onset without a previous date when a complete check found no adults.'};
 const gap=diff(first.date,last.date),baseline=neg.filter(x=>x.date<last.date&&diff(last.date,x.date)<=14);
 if(gap>7)return{status:'GAP_TOO_LARGE',text:'Monitoring gap too long to bracket the adult visit.',explain:'There were '+gap+' days between the last no and first yes; check at least every 2–3 days near the anticipated event.'};
 if(!baseline.length)return{status:'NO_BASELINE',text:'A second earlier negative visit is needed.',explain:'At least two negative visits with a consistent method and effort are required; the prior negative should fall within 14 days before the last negative.'};
 return{status:'INTERVAL',text:'First observed adult activity: after '+last.date+' through '+first.date+'.',
  explain:'A '+gap+'-day self-reported detection interval, not the first true emergence date or a measured forecast accuracy score. Keep reviewing identification and possible pesticide/trap effects.'};
}
function el(tag,txt,cls){const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x}
function currentSnapshot(){return snapshots.filter(x=>x.site===site.value.trim().toLowerCase()&&x.crop===crop.value&&x.reference===reference()).sort((a,b)=>a.capturedOn.localeCompare(b.capturedOn)).at(0)||null;}
function render(){
 const today=nowMI(),active=today.startsWith('2027-');
 date.max=active?today:'2027-12-31';
 if(active&&(!date.value||date.value>today))date.value=today;
 form.querySelectorAll('input,select').forEach(x=>{x.disabled=!active});
 $('monitor-save').disabled=!active;snapBtn.disabled=!active;
 seasonStatus.textContent=active?'2027 field season: record only inspections you completed. This browser holds your private observations; it is not an independent scientific dataset.':
  today<'2027-01-01'?'The 2027 study season has not begun. Prepare a fixed plot now, and download the empty field sheet. The journal activates with the 2027 season.':
  'The 2027 study season is finished. Your private exports remain available but new visits are closed.';
 const rows=entries.filter(sameGroup).sort((a,b)=>a.date.localeCompare(b.date));const s=summarize(rows);
 verdict.textContent=s.text;reason.textContent=s.explain;
 const snap=currentSnapshot();
 snapshotStatus.textContent=snap?'Locally saved provisional source snapshot: model '+snap.modelDate+', official dated layer '+snap.sourceDate+', captured in this browser '+snap.capturedOn+'. Client timestamps are self-reported and not independently archived; no accuracy score is authorized.':
  'No near-term official prediction was captured before an adult visit. An October retrospective raster cannot establish predictive skill.';
 const view=el('div');
 if(!rows.length)view.appendChild(el('p','No inspected visits for this selected plot, method and effort. Other sites or methods are intentionally kept separate.'));
 else{
  const table=el('table'),thead=el('thead'),tr=el('tr');
  for(const h of ['Visit','Adult beetles','Minutes','Interference','Action'])tr.appendChild(el('th',h));
  thead.appendChild(tr);table.appendChild(thead);const tbody=el('tbody');
  for(const row of rows.slice(-45)){
   const t=el('tr');
   for(const v of [row.date,row.adults==='yes'?'Yes ('+row.count+')':row.adults==='no'?'No':'Uncertain',String(row.minutes),row.interference]){
    const td=el('td',v);if(v==='No')td.className='study-no';if(v.startsWith('Yes'))td.className='study-yes';if(v==='Uncertain')td.className='study-uncertain';t.appendChild(td);
   }
   const td=el('td'),remove=el('button','Remove');remove.type='button';remove.className='study-delete';remove.setAttribute('aria-label','Remove visit from '+row.date);
   remove.addEventListener('click',()=>{if(!window.confirm('Remove this local visit?'))return;entries=entries.filter(x=>x!==row);persist();render()});
   td.appendChild(remove);t.appendChild(td);tbody.appendChild(t);
  }
  table.appendChild(tbody);view.appendChild(table);
 }
 visitsBox.replaceChildren(view);
}
function csvCell(x){let t=String(x??'');if(/^[=+@\-\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'}
function csvToRows(str){
 if(str.length>120000)throw Error('FILE_TOO_LARGE');const out=[];let row=[],cell='',quote=false;
 for(let i=0;i<str.length;i++){const c=str[i];if(quote){if(c==='"'&&str[i+1]==='"'){cell+='"';i++}else if(c==='"')quote=false;else cell+=c}
 else if(c==='"')quote=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));out.push(row);row=[];cell=''}else cell+=c}
 if(quote)throw Error('CSV_QUOTE_UNCLOSED');if(row.length||cell){row.push(cell);out.push(row)}
 return out;
}
function download(){
 const rows=[headers.join(',')];
 for(const x of [...entries].sort((a,b)=>a.date.localeCompare(b.date))){
  const snap=snapshots.find(y=>y.site===x.site&&y.crop===x.crop&&y.reference===x.reference);
  rows.push([x.site,x.date,x.crop,x.method,x.minutes,x.adults,x.count,x.reference,x.interference,x.checkedAt,snap?.modelDate||'',snap?.sourceDate||'',snap?.capturedOn||''].map(csvCell).join(','));
 }
 const blob=new Blob([rows.join('\r\n')+'\r\n'],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=el('a');
 a.href=u;a.download='japanese-beetle-field-journal-2027.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
 seasonStatus.textContent='Exported local 2027 observations. This CSV is self-reported and has not been submitted to an independent monitoring program.';
}
function currentRecord(){
 return {site:site.value.trim().toLowerCase(),date:date.value,crop:crop.value,method:method.value,minutes:Number(minutes.value),
 adults:status.value,count:Number(count.value),reference:reference(),interference:interference.value,checkedAt:new Date().toISOString()};
}
form.addEventListener('submit',e=>{
 e.preventDefault();const x=currentRecord();
 if(!validEntry(x)||!nowMI().startsWith('2027-')){seasonStatus.textContent='This record is outside the active 2027 season or has an invalid date, site code, adult status, inspection effort or beetle count.';return}
 const previous=entries.findIndex(y=>[y.site,y.crop,y.method,y.minutes,y.reference,y.date].join('|')===
  [x.site,x.crop,x.method,x.minutes,x.reference,x.date].join('|'));
 if(previous>=0){if(!window.confirm('A visit already exists for this plot and day. Replace it with this completed inspection?'))return;entries[previous]=x}
 else{if(entries.length>=MAX){seasonStatus.textContent='Journal full: export and archive data before adding more visits.';return}entries.push(x)}
 persist();render();seasonStatus.textContent='Saved this dated check locally. "No" means you actually completed the inspection. Nothing was uploaded to the site or USA-NPN.';
});
status.addEventListener('change',()=>{if(status.value==='no'||status.value==='uncertain')count.value='0';else if(Number(count.value)<1)count.value='1'});
for(const field of [site,crop,method,minutes])field.addEventListener('change',render);
const zip=$('zip');if(zip)zip.addEventListener('input',render);
exportBtn.addEventListener('click',download);
importBtn.addEventListener('click',()=>importInput.click());
importInput.addEventListener('change',async()=>{
 const file=importInput.files?.[0];if(!file)return;
 try{
  if(file.size>120000)throw Error('FILE_TOO_LARGE');
  const data=csvToRows(await file.text());
  if(data.length<2||data.length>MAX+1||data[0].join(',')!==headers.join(','))throw Error('CSV_FORMAT_MISMATCH');
  const incoming=[];
  for(const fields of data.slice(1)){
   if(fields.length!==headers.length)throw Error('CSV_COLUMNS_INVALID');
   const o=Object.fromEntries(headers.map((h,i)=>[h,fields[i]]));
   const x={site:o.site,date:o.date,crop:o.crop,method:o.method,minutes:Number(o.minutes),adults:o.adults,
    count:Number(o.count),reference:o.reference,interference:o.interference,checkedAt:o.checkedAt};
   if(!validEntry(x,{allowPast:true}))throw Error('CSV_INVALID_VISIT');
   incoming.push(x);
  }
  if(!window.confirm('Import '+incoming.length+' previous visits? This replaces your existing local field journal but preserves separately saved model snapshots.'))return;
  entries=incoming;persist();render();seasonStatus.textContent='Imported '+incoming.length+' local self-reported visits. Their dates and observations have not been independently verified.';
 }catch(err){seasonStatus.textContent='Could not import this CSV ('+String(err.message||err)+'). Existing records are unchanged.'}
 finally{importInput.value=''}
});
clearBtn.addEventListener('click',()=>{if(!window.confirm('Erase ALL saved field visits and model snapshots on this browser? Export first if you need a copy.'))return;entries=[];snapshots=[];persist();render()});
snapBtn.addEventListener('click',async()=>{
 const id=site.value.trim().toLowerCase(),ref=reference(),today=nowMI();
 if(!activeSeason()||!/^[a-z0-9][a-z0-9_-]{1,29}$/.test(id)){snapshotStatus.textContent='Choose a stable study plot during the 2027 season.';return}
 snapBtn.disabled=true;snapshotStatus.textContent='Checking official dated USA-NPN model before storing a local snapshot…';
 try{
  const p=new URLSearchParams({crop:crop.value});if(ref.startsWith('zip:'))p.set('zip',ref.slice(4));else p.set('site','bay-city');
  const r=await fetch('/api/japanese-beetle-forecast?'+p.toString(),{signal:AbortSignal.timeout(16000),headers:{accept:'application/json'}});
  if(!r.ok)throw Error('OFFICIAL_MODEL_UNAVAILABLE');const d=await r.json();
  if(d?.status!=='OFFICIAL_MODEL_AVAILABLE'||d.sourceKind!=='OFFICIAL_SPECIES_SPECIFIC_GRIDDED_MODEL'||d.year!==2027||!validDate(d.sourceDate)||
     !validDate(d.stages?.adult?.approximateDate))throw Error('OFFICIAL_MODEL_INCOMPLETE');
  const x={site:id,crop:crop.value,reference:ref,sourceDate:d.sourceDate,modelDate:d.stages.adult.approximateDate,capturedOn:today};
  if(!validSnapshot(x))throw Error('NO_PROSPECTIVE_SIX_DAY_FORECAST');
  // Keep first qualifying snapshot for the site and reference, never silently overwrite.
  if(!snapshots.some(y=>y.site===id&&y.crop===crop.value&&y.reference===ref))snapshots.push(x);
  persist();render();
 }catch(err){snapshotStatus.textContent='No eligible official near-term 2027 source snapshot could be frozen. The model may be unpublished, too far out, past or unavailable; no retrospective prediction has been saved.'}
 finally{snapBtn.disabled=!activeSeason()}
});
function activeSeason(){return nowMI().startsWith('2027-')}
checkBtn.addEventListener('click',async()=>{
 checkBtn.disabled=true;checkResult.textContent='Checking official USA-NPN Michigan adult yes/no status records…';
 try{
  const year=Math.min(2027,Number(nowMI().slice(0,4))),r=await fetch('/api/japanese-beetle-monitoring-coverage?year='+year,{headers:{accept:'application/json'},signal:AbortSignal.timeout(16000)});
  if(!r.ok)throw Error('SOURCE_UNAVAILABLE');const d=await r.json();
  if(d.schema!=='japanese-beetle-monitoring-coverage-v1'||d.year!==year||d.accuracyClaimsAllowed!==false)throw Error('INVALID_SCHEMA');
  checkResult.textContent=d.status==='NO_NPN_MICHIGAN_ADULT_RECORDS'?
   'USA-NPN official '+year+' query returned no Michigan Japanese beetle adult status records. This is a dataset coverage gap, NOT evidence that beetles were absent. Model accuracy remains unvalidated.':
   'USA-NPN checked '+d.checkedAt.slice(0,10)+': '+d.coverage.monitoredSites+' monitoring site(s), '+d.coverage.candidateIntervals+' candidate bounded yes/no sequences. Model accuracy remains unvalidated; details for fewer than five sites are withheld.';
 }catch{checkResult.textContent='Official USA-NPN monitoring coverage could not be verified. Neither no beetles nor a valid model can be inferred.'}
 finally{checkBtn.disabled=false}
});
read();render();
})();