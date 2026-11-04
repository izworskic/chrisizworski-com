(function(){
 'use strict';
 const data=window.GardenPestRegionalFieldbook,root=document.getElementById('pest-regional-fieldbook');
 if(!root)return;
 const modelPick=document.getElementById('pest-python-model');
 const stagePick=document.getElementById('pest-python-stage');
 const cityPick=document.getElementById('pest-python-city');
 const notice=document.getElementById('pest-python-status');
 const readout=document.getElementById('pest-python-readout');
 const chart=document.getElementById('pest-python-ladder');
 const years=document.getElementById('pest-python-years');
 const caveat=document.getElementById('pest-python-method');
 const modelSource=document.getElementById('pest-python-model-source');
 if(!modelPick||!stagePick||!cityPick||!notice||!readout||!chart||!years||!caveat||!modelSource)return;
 const yearsExpected=[2021,2022,2023,2024,2025];
 const ids=['bay-city','detroit','grand-rapids','kalamazoo','traverse-city','marquette','houghton'];
 const modelIds=['japanese-beetle','cabbage-maggot'];
 const stageIds={
  'japanese-beetle':['japanese-adults','japanese-eggs'],
  'cabbage-maggot':['cabbage-first','cabbage-second','cabbage-third']
 };
 const allowedSources={
  'japanese-beetle':'https://www.usanpn.org/data/maps/forecasts/Japanese_beetle',
  'cabbage-maggot':'https://enviroweather.msu.edu/crops/coleCrops/cabbagemaggot'
 };
 const isDate=(s,y)=>typeof s==='string'&&new RegExp('^'+y+'-\\d\\d-\\d\\d$').test(s)&&
  !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 function valid(d){
  if(!d||d.schema!=='garden-pest-python-regional-fieldbook-v1'||
   d.purpose!=='HISTORICAL_GRIDDED_HEAT_RECONSTRUCTION_NOT_FORECAST'||
   !Array.isArray(d.sourceYears)||JSON.stringify(d.sourceYears)!==JSON.stringify(yearsExpected)||
   !Array.isArray(d.models)||d.models.length!==2||!Array.isArray(d.cities)||d.cities.length!==7||
   d.audit?.dailyWeatherValuesVerified!==12775||d.audit?.completeClimateLocationYears!==35||
   d.audit?.confirmedPestPresenceRecords!==0||d.audit?.operationalModelParity!=='NOT_ESTABLISHED'||
   d.weatherSource?.provider!=='NASA ORNL DAAC Daymet V4 R1')return false;
  if(!modelIds.every(id=>d.models.some(m=>m.id===id)))return false;
  for(const m of d.models){
   if(!modelIds.includes(m.id)||m.source!==allowedSources[m.id]||
    !Array.isArray(m.stages)||JSON.stringify(m.stages.map(s=>s.id))!==JSON.stringify(stageIds[m.id])||
    m.methodParity===undefined||!m.limitation)return false;
  }
  if(!ids.every(id=>d.cities.some(c=>c.id===id)))return false;
  for(const c of d.cities){
   if(!ids.includes(c.id)||!Array.isArray(c.years)||c.years.length!==5||
    !c.summary||!c.referencePoint||!Number.isFinite(c.referencePoint.lat)||
    !Number.isFinite(c.referencePoint.lon)||!c.sourcePath?.endsWith('/'+c.id+'.csv'))return false;
   for(let i=0;i<5;i++){
    const yr=c.years[i];
    if(yr.year!==yearsExpected[i]||!yr.events)return false;
    for(const keys of Object.values(stageIds))for(const stage of keys){
     const val=yr.events[stage];if(val!==null&&!isDate(val,yr.year))return false;
    }
   }
   for(const keys of Object.values(stageIds))for(const stage of keys){
    const summary=c.summary[stage];
    if(!summary||summary.yearsTotal!==5||!Number.isInteger(summary.yearsReached)||
     summary.yearsReached<0||summary.yearsReached>5||
     !Array.isArray(summary.sampledCrossingYears)||summary.sampledCrossingYears.length!==5)return false;
    const actual=c.years.filter(y=>y.events[stage]!==null).length;
    if(actual!==summary.yearsReached||
     summary.sampledCrossingYears.some((x,i)=>x.year!==yearsExpected[i]||x.date!==c.years[i].events[stage]))return false;
    const complete=actual===5;
    if(summary.status!==(complete?'COMPLETE_HISTORIC_HEAT_RECONSTRUCTION':'INCOMPLETE_THRESHOLD_HISTORY'))return false;
    if(complete){
     const sorted=c.years.map(y=>y.events[stage].slice(5)).sort();
     if(summary.earliestMonthDay!==sorted[0]||summary.latestMonthDay!==sorted[4])return false;
    }else if(summary.earliestMonthDay!==null||summary.latestMonthDay!==null)return false;
   }
  }
  return true;
 }
 function el(tag,cls,value){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;}
 function monthDay(s){if(!s)return 'Not reached';const bits=s.split('-');const m=Number(bits.length===3?bits[1]:bits[0]),day=Number(bits.at(-1));
  return new Date(Date.UTC(2001,m-1,day,12)).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'});
 }
 function dayNumber(s){const [mm,dd]=s.split('-').map(Number);return (Date.UTC(2001,mm-1,dd)-Date.UTC(2001,0,1))/86400000+1;}
 const clamp=n=>Math.max(0,Math.min(100,n));
 if(!valid(data)){
  notice.textContent='The archived NASA regional evidence bundle did not pass its scientific and calendar checks. This panel cannot show timing ranges. Use the original MSU and USA-NPN sources below.';
  readout.replaceChildren();chart.replaceChildren();years.replaceChildren();
  return;
 }
 const interfaceArea=document.getElementById('pest-python-ui');
 if(interfaceArea)interfaceArea.hidden=false;
 const options=[...data.models];
 const refCities=[...data.cities];
 // Never reinterpret a visitor's ZIP as one of seven fixed NASA grid cells.
 modelPick.replaceChildren(...options.map(m=>{const o=el('option','',m.name);o.value=m.id;return o;}));
 cityPick.replaceChildren(...refCities.map(c=>{const o=el('option','',c.name);o.value=c.id;return o;}));
 const initialCity=new URL(location.href).searchParams.get('historyCity');
 cityPick.value=ids.includes(initialCity)?initialCity:'bay-city';
 modelPick.value='japanese-beetle';
 const stageRows=()=>stageIds[modelPick.value].map(id=>data.models.find(x=>x.id===modelPick.value).stages.find(s=>s.id===id));
 function updateStages(){
  const current=stagePick.value;
  const opts=stageRows().map(s=>{const o=el('option','',s.label);o.value=s.id;return o;});
  stagePick.replaceChildren(...opts);
  stagePick.value=opts.some(o=>o.value===current)?current:opts[0].value;
 }
 function render(){
  const model=options.find(m=>m.id===modelPick.value);
  const stage=model?.stages.find(x=>x.id===stagePick.value);
  const chosen=refCities.find(c=>c.id===cityPick.value);
  if(!model||!stage||!chosen)return;
  const summary=chosen.summary[stage.id];
  const complete=summary.status==='COMPLETE_HISTORIC_HEAT_RECONSTRUCTION';
  notice.textContent='OFFLINE NASA ARCHIVE · 2021–2025 ONLY · 35 COMPLETE GRID-POINT SEASONS · NO PEST SIGHTINGS MEASURED';
  const flag=el('p','pest-regional__flag',model.id==='cabbage-maggot'?
    'Unverified calculation method — not the MSU station forecast':'Independent model reconstruction — not official raster parity');
  const heading=el('strong','',chosen.name+' · '+stage.label);
  const result=el('div','',complete?
   'In five reconstructed seasons, this heat threshold was crossed between '+monthDay(summary.earliestMonthDay)+
   ' and '+monthDay(summary.latestMonthDay)+'.':
   'This modeled heat threshold was reached in '+summary.yearsReached+' of five historical years. No five-year timing band is inferred.');
  const hint=el('small','','Seven fixed reference coordinates, not your garden. '+model.start+' start, base '+model.lowerF+'°F'+
   (model.upperF===null?' (no independently verified upper cutoff)':' / upper '+model.upperF+'°F')+
   '. Published heat threshold: '+stage.thresholdGddF+'°F-degree-days. Weather-only reconstruction; not observed flight or insects.');
  readout.replaceChildren(flag,heading,result,hint);
  const pairs=refCities.map(c=>({city:c,summary:c.summary[stage.id]}));
  const completePairs=pairs.filter(x=>x.summary.status==='COMPLETE_HISTORIC_HEAT_RECONSTRUCTION');
  const domain=completePairs.flatMap(x=>[dayNumber(x.summary.earliestMonthDay),dayNumber(x.summary.latestMonthDay)]);
  const rawMin=domain.length?Math.min(...domain):90,rawMax=domain.length?Math.max(...domain):230;
  const min=Math.max(1,rawMin-10),max=Math.min(365,rawMax+10),span=Math.max(1,max-min);
  function pct(day){return clamp((day-min)/span*100)}
  chart.replaceChildren();
  const legend=el('p','pest-regional__legend','Earlier ← Historical heat-threshold dates → Later · bars show the five-year range, not a pest population or probability');
  const list=el('div','pest-regional__rows');
  list.setAttribute('role','list');
  for(const pair of pairs){
   const same=pair.city.id===chosen.id,s=pair.summary;
   const row=el('div','pest-regional__line');
   row.setAttribute('role','listitem');if(same)row.setAttribute('aria-current','true');
   const name=el('div','pest-regional__place',pair.city.name);
   const track=el('div','pest-regional__track'),dates=el('div','pest-regional__dates');
   if(s.status==='COMPLETE_HISTORIC_HEAT_RECONSTRUCTION'){
    const a=pct(dayNumber(s.earliestMonthDay)),b=pct(dayNumber(s.latestMonthDay));
    const bar=el('div','pest-regional__range');bar.style.left=a+'%';bar.style.width=Math.max(.1,b-a)+'%';
    const start=el('div','pest-regional__mark is-start'),end=el('div','pest-regional__mark is-end');
    start.style.left=a+'%';end.style.left=b+'%';
    track.append(bar,start,end);
    dates.textContent=monthDay(s.earliestMonthDay)+'–'+monthDay(s.latestMonthDay);
   }else{
    dates.textContent=s.yearsReached+'/5 crossed';
    dates.append(el('small','','No comparable range'));
   }
   row.setAttribute('aria-label',pair.city.name+' '+(s.status==='COMPLETE_HISTORIC_HEAT_RECONSTRUCTION'?
    'historical heat threshold crossed between '+monthDay(s.earliestMonthDay)+' and '+monthDay(s.latestMonthDay):
    'threshold crossed in '+s.yearsReached+' of five reconstructed seasons'));
   row.append(name,track,dates);list.append(row);
  }
  const axis=el('div','pest-regional__axis');
  const mk=n=>monthDay(new Date(Date.UTC(2001,0,Math.max(1,Math.round(n)),12)).toISOString().slice(5,10));
  axis.append(el('span','',mk(min)),el('span','',mk(min+span/2)),el('span','',mk(max)));
  chart.append(legend,list,axis);
  years.replaceChildren(el('h3','',chosen.name+' · five past weather seasons'),
   el('p','','These are reconstructed threshold-crossing dates from independent thermal calculations. Not emergence observations.'));
  const annual=el('div','pest-regional__year-grid');
  for(const y of chosen.years){
   const box=el('div'),v=y.events[stage.id];
   box.append(el('strong','',y.year),el('span','',v?monthDay(v):'Not reached'));
   annual.append(box);
  }
  years.append(annual);
  caveat.textContent=model.limitation;
  modelSource.href=model.source;
  modelSource.textContent=model.id==='cabbage-maggot'?'MSU Enviroweather cabbage maggot model':'USA-NPN Japanese beetle model';
 }
 modelPick.addEventListener('change',()=>{updateStages();render();});
 stagePick.addEventListener('change',render);
 cityPick.addEventListener('change',render);
 updateStages();
 render();
})();
