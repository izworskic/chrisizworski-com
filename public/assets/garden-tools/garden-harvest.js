/* Shared browser / Node garden engine. See docs/GARDEN_INTELLIGENCE_ENGINES_V1.md. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GardenHarvest=factory();})(typeof globalThis!=='undefined'?globalThis:this,function harvestFactory(){
  'use strict';
  const schema='garden-harvest-v1';
  const source='https://extension.oregonstate.edu/catalog/em-9305-vegetable-degree-day-models-introduction-farmers-gardeners';
  const models=Object.freeze(Object.fromEntries([
    ['big-beef','Tomato','Big Beef','transplant-3-5-leaves',45,92,1970,84],
    ['indigo-rose','Tomato','Indigo Rose','transplant-3-5-leaves',45,92,2010,85],
    ['monica','Tomato','Monica','transplant-3-5-leaves',45,92,1976,83],
    ['new-girl','Tomato','New Girl','transplant-3-5-leaves',45,92,1844,80],
    ['marketmore-76-seed','Cucumber','Marketmore 76','direct-seed',50,90,1211,67],
    ['marketmore-76-transplant','Cucumber','Marketmore 76','transplant-2-leaves',50,90,805,46],
    ['cobra','Cucumber','Cobra','direct-seed',50,90,964,57],
    ['dasher-ii','Cucumber','Dasher II','direct-seed',50,90,1060,55],
    ['provider','Snap bean','Provider','direct-seed',40,90,1681,61],
    ['sahara','Snap bean','Sahara','direct-seed',40,90,1805,64],
    ['arcadia','Broccoli','Arcadia','transplant-2-4-leaves',32,70,2281,null],
    ['green-magic','Broccoli','Green Magic','transplant-2-4-leaves',32,70,2103,null],
    ['bell-king-green','Sweet pepper','Bell King','transplant-4-7-leaves',52,100,1447,84],
    ['bell-king-ripe','Sweet pepper','Bell King','transplant-4-7-leaves',52,100,1998,null],
    ['king-arthur-green','Sweet pepper','King Arthur','transplant-4-7-leaves',52,100,1321,73],
    ['king-arthur-ripe','Sweet pepper','King Arthur','transplant-4-7-leaves',52,100,1767,null]
  ].map(([id,crop,variety,biofix,baseF,capF,targetGddF,trialMeanDays])=>[id,Object.freeze({id,crop,variety,biofix,baseF,capF,targetGddF,trialMeanDays,endpoint:id.endsWith('-green')?'first green harvest':id.endsWith('-ripe')?'first ripe harvest':crop==='Tomato'?'first ripe harvest':'first harvest',method:'single-sine-horizontal-cutoff',source})])));
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const add=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
  const temp=n=>Number.isFinite(n)&&n>=-80&&n<=140;
  function dailyGdd(min,max,base,cap){
    if(![min,max,base,cap].every(temp)||min>max||base>=cap)throw new RangeError('Invalid Fahrenheit temperatures or thresholds');
    const mean=(min+max)/2,amp=(max-min)/2;
    function above(t){
      if(min>=t)return mean-t;
      if(max<=t)return 0;
      const theta=Math.asin((t-mean)/amp);
      return ((mean-t)*(Math.PI/2-theta)+amp*Math.cos(theta))/Math.PI;
    }
    return Math.max(0,Math.min(cap-base,above(base)-above(cap)));
  }
  function evaluate(input={}){
    const {modelId,biofix,asOf,plantingDate,weather=[],siteId,packetDays}=input;
    const r={schema,status:'UNAVAILABLE',scope:'unvalidated-regional-model-scenario',source,model:null,calendarDate:null,heatCrossingDate:null,observedCrossingDate:null,observedGddF:0,scenarioGddF:null,observedDays:0,forecastDays:0,missingDate:null,rejected:[],flags:['NOT_LOCALLY_VALIDATED','HEAT_THRESHOLD_IS_NOT_OBSERVED_HARVEST']};
    if(!validDate(asOf)||!validDate(plantingDate)||plantingDate>asOf||Date.parse(asOf)-Date.parse(plantingDate)>365*86400000||typeof siteId!=='string'||!siteId.trim()||!Array.isArray(weather)||weather.length>400){r.flags.push('INVALID_INPUT');return r;}
    if(Number.isInteger(packetDays)&&packetDays>=1&&packetDays<=365)r.calendarDate=add(plantingDate,packetDays);
    const model=Object.hasOwn(models,modelId)?models[modelId]:null;
    if(!model||biofix!==model.biofix){r.status=r.calendarDate?'PARTIAL':'UNAVAILABLE';r.flags.push('NO_MATCHING_VARIETY_AND_START_STAGE');return r;}
    r.model=model;r.status='PARTIAL';
    if(model.trialMeanDays!==null)r.trialCalendarDate=add(plantingDate,model.trialMeanDays);
    const groups=new Map();
    for(const w of weather){
      const valid=w&&validDate(w.date)&&w.date>=plantingDate&&w.date<=add(asOf,7)&&w.siteId===siteId&&typeof w.source==='string'&&w.source.trim()&&temp(w.minF)&&temp(w.maxF)&&w.minF<=w.maxF&&((w.kind==='observation'&&w.date<asOf)||(w.kind==='forecast'&&w.date>=asOf&&w.issuedDate===asOf));
      if(!valid){r.rejected.push({date:validDate(w?.date)?w.date:null,reason:'INVALID_OR_WRONG_VINTAGE'});continue;}
      const a=groups.get(w.date)||[];a.push(w);groups.set(w.date,a);
    }
    let cumulative=0;
    for(let d=plantingDate;d<=add(asOf,7);d=add(d,1)){
      const rows=groups.get(d);
      if(!rows||rows.some(w=>w.minF!==rows[0].minF||w.maxF!==rows[0].maxF||w.source!==rows[0].source)){
        r.missingDate=d;if(rows)r.rejected.push({date:d,reason:'CONFLICTING_DAY'});break;
      }
      const w=rows[0];cumulative+=dailyGdd(w.minF,w.maxF,model.baseF,model.capF);
      if(w.kind==='observation'){r.observedDays++;r.observedGddF=cumulative;}else r.forecastDays++;
      if(cumulative>=model.targetGddF){
        r.heatCrossingDate=d;if(w.kind==='observation')r.observedCrossingDate=d;
        r.status='AVAILABLE';break;
      }
    }
    r.scenarioGddF=r.observedDays+r.forecastDays?cumulative:null;
    if(!r.heatCrossingDate)r.flags.push(r.missingDate?'INCOMPLETE_DAILY_SERIES':'THRESHOLD_NOT_REACHED_IN_HORIZON');
    return r;
  }
  return {schema,models,dailyGdd,evaluate};
});
