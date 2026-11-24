/* Adapter only: all water-balance math remains in the national-garden-water owner. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GardenJournalWater=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DAY=86400000,shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
const numeric=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const profiles=['tomato','pepper','cucumber','squash','beans','corn','brassicas','leafy','roots','onion','herbs','melons','generic'];
const soils=['auto','sand','sandy-loam','loam','silt-loam','clay-loam','clay','potting-mix'];
function profileFor(model){return {'Tomato':'tomato','Sweet pepper':'pepper','Cucumber':'cucumber','Snap bean':'beans','Broccoli':'brassicas'}[model?.crop]||null;}
function validateSetup(s){
 if(!s||!profiles.includes(s.cropId)||!['seedling','developing','mature'].includes(s.stage)||!['ground','raised','container'].includes(s.bed)||!soils.includes(s.soil)||typeof s.mulch!=='boolean'||s.areaSqFt!==null&&!numeric(s.areaSqFt,.1,10000))throw Error('Choose crop, stage, bed, soil and a valid area');
 return {cropId:s.cropId,stage:s.stage,bed:s.bed,soil:s.soil,mulch:s.mulch,areaSqFt:s.areaSqFt};
}
function ledger(entries,today){
 if(!dateOK(today)||!Array.isArray(entries))throw Error('Invalid local date or records');
 const rows=entries.filter(e=>dateOK(e.date)&&e.date<=today);
 const rain=rows.filter(e=>e.kind==='rain-gauge'&&e.date>=shift(today,-7)&&e.date<today&&numeric(e.inches,0,10));
 const irrigation=rows.filter(e=>e.kind==='irrigation'&&e.date>=shift(today,-6)&&numeric(e.inches,0.001,10)).sort((a,b)=>b.date.localeCompare(a.date));
 const feel=rows.find(e=>e.kind==='soil-feel'&&e.date===today&&['wet','moist','getting-dry','dry'].includes(e.feel))?.feel||null;
 return {rain,irrigation,soilFeel:feel,rainDays:rain.length,rainIn:rain.reduce((a,e)=>a+e.inches,0),irrigationIn:irrigation.reduce((a,e)=>a+e.inches,0)};
}
function evaluate({engine,context,crops,setup,entries,today,now,latitude,longitude,activeGrowing}={}){
 const s=validateSetup(setup),l=ledger(entries,today);
 const unavailable=(reason)=>({status:'PARTIAL',state:'CHECK SOIL FIRST',reason,decision:null,ledger:l});
 if(activeGrowing!==true)return unavailable('Confirm the plants are actively growing and the soil is unfrozen before using the watering model.');
 if(!engine||typeof engine.computeDecision!=='function'||typeof engine.selectRecentObservedRain!=='function')return unavailable('The existing watering engine is unavailable.');
 const crop=crops?.find(x=>x.id===s.cropId);
 if(!crop||!numeric(crop.rootDepthIn?.[s.stage],1,60)||!numeric(crop.kc?.[s.stage],.1,2)||!numeric(crop.allowableDepletion?.[s.stage],.1,.9))return unavailable('No matching crop profile.');
 const issued=Date.parse(context?.generatedAt),t=typeof now==='number'?now:Date.parse(now);
 if(!numeric(latitude,-90,90)||!numeric(longitude,-180,180)||!Number.isFinite(t)||!Number.isFinite(issued)||issued>t||t-issued>2*3600000||!numeric(context?.location?.lat,-90,90)||!numeric(context?.location?.lon,-180,180)||Math.abs(context.location.lat-latitude)>.001||Math.abs(context.location.lon-longitude)>.001)return unavailable('Fresh weather for this reference town is unavailable.');
 const et=context.referenceEt?.daily?.[0],q=context.forecastRain,rr=context.recentRain;
 if(!numeric(et,0,1)||!numeric(q?.in24,0,30)||!numeric(q?.in48,0,50)||!numeric(q?.firstWetHours,0,168)||!String(q?.source||'').includes('NWS')||!String(context.referenceEt?.source||'').includes('NWS'))return unavailable('Drying demand or forecast rain evidence is incomplete.');
 const history=new Map(),conflicts=new Set(),gauge=new Map(l.rain.map(e=>[e.date,e.inches]));
 for(const d of context.observedHistory?.days||[]){
  if(!dateOK(d.date)||d.date<shift(today,-14)||d.date>=today||!numeric(d.rainIn,0,30)||!numeric(d.referenceEtIn,0,1))continue;
  const row={date:d.date,rainIn:gauge.has(d.date)?gauge.get(d.date):d.rainIn,referenceEtIn:d.referenceEtIn};
  if(history.has(d.date)&&(history.get(d.date).rainIn!==row.rainIn||history.get(d.date).referenceEtIn!==row.referenceEtIn))conflicts.add(d.date);
  history.set(d.date,row);
 }
 for(const d of conflicts)history.delete(d);
 const days=[...history.values()].sort((a,b)=>a.date.localeCompare(b.date));
 const recentComplete=Array.from({length:7},(_,i)=>shift(today,-i-1)).every(d=>history.has(d));
 const rainAvailable=numeric(rr?.coverage,.7,1)&&numeric(rr?.inches,0,30)&&numeric(rr?.todayIn,0,30)&&numeric(rr?.latestWetHoursAgo,0,72)&&!rr.regionalEstimate;
 // No fabricated rain zeros or invented irrigation aggregation; current soil feel supersedes
 // the ledger in the owner engine. Require it if journal or weather coverage is ambiguous.
 if(!l.soilFeel)return unavailable('Record how the soil feels today before calculating a garden-specific watering decision. Regional rain and irrigation totals alone do not establish root-zone moisture.');
 if(s.soil==='auto'&&s.bed!=='container'&&!numeric(context.soil?.awcPerInch,.04,.24))return unavailable('Mapped soil water capacity is unavailable. Choose your known soil type or check soil before watering.');
 const one=l.irrigation.length===1?l.irrigation[0]:null;
 const signal=rainAvailable?engine.selectRecentObservedRain({historyDays:days,todayRainIn:rr.todayIn,stationRainIn:rr.inches,stationCoverage:rr.coverage,stationRainAgeHours:rr.latestWetHoursAgo,generatedAt:issued,timeZone:context.location.timeZone}):null;
 const d=engine.computeDecision({crop,stage:s.stage,bed:s.bed,soil:s.soil==='auto'?context.soil?.texture:s.soil,awcPerInch:s.soil==='auto'?context.soil?.awcPerInch:undefined,mulch:s.mulch,areaSqFt:s.areaSqFt,
 referenceEtIn:et,fretConfidence:context.referenceEt.confidence||'low',observedHistoryDays:days,historyConfidence:recentComplete?'medium':'low',
 currentObservedRainIn:rainAvailable?rr.todayIn:0,recentRainIn:signal?.inches??0,recentRainConfidence:signal?.confidence||'low',recentRainAgeHours:signal?.ageHours??72,
 irrigationIn:one?.inches??0,irrigationAgeDays:one?(Date.parse(today+'T00:00:00Z')-Date.parse(one.date+'T00:00:00Z'))/DAY:0,irrigationHistorySupplied:!!one,
 soilFeel:l.soilFeel,forecastRain24In:q.in24,forecastRain48In:q.in48,forecastRainTimingHours:q.firstWetHours,soilConfidence:s.soil==='auto'?'low':'medium'});
 if(!['WATER TODAY','WAIT','CHECK SOIL FIRST','HOLD FOR RAIN'].includes(d.state)||!numeric(d.applyIn,0,1)||d.gallons!==null&&!numeric(d.gallons,0,10000))return unavailable('The water model returned an unsupported result.');
 return {status:'AVAILABLE',state:d.state,decision:d,ledger:l,sourceTime:context.generatedAt,gaugeDaysUsed:days.filter(x=>gauge.has(x.date)).length,irrigationUsed:one!==null,soilFeelAnchor:true,regionalRainAvailable:rainAvailable,reason:'Current gardener soil feel anchors the existing root-zone model. Historical rainfall and irrigation are context, not independently measured root-zone moisture.'};
}
return {validateSetup,ledger,evaluate,profileFor,profiles,soils};
});
