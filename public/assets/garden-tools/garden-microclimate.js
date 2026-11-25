/* Shared browser / Node garden engine. See docs/GARDEN_INTELLIGENCE_ENGINES_V1.md. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GardenMicroclimate=factory();})(typeof globalThis!=='undefined'?globalThis:this,function microFactory(){
  'use strict';
  const schema='garden-microclimate-v1';
  const source='https://msu-prod.dotcmscloud.com/news/monitoring_for_the_risk_of_frost_and_freezing_temperatures';
  const regimes=['clear-calm','cloudy-windy','other'];
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const temp=n=>Number.isFinite(n)&&n>=-80&&n<=140;
  const median=a=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  function assess(input={}){
    const {asOf,siteId,referenceId,regime,referenceLowF,referenceDate,pairs=[],site={},thresholdF=32}=input;
    const result={schema,source,status:'UNAVAILABLE',scope:'paired-night-air-temperature-scenario-only',sampleCount:0,referenceLowF:null,scenario:null,flags:[],rejected:[],thresholdF:null};
    if(!validDate(asOf)||!validDate(referenceDate)||typeof siteId!=='string'||!siteId.trim()||typeof referenceId!=='string'||!referenceId.trim()||siteId===referenceId||!regimes.includes(regime)||!temp(referenceLowF)||!temp(thresholdF)||!Array.isArray(pairs)||pairs.length>730||referenceDate<asOf||Date.parse(referenceDate)-Date.parse(asOf)>7*86400000){result.flags.push('INVALID_OR_OUT_OF_HORIZON_REFERENCE');return result;}
    result.referenceLowF=referenceLowF;result.thresholdF=thresholdF;
    result.referenceDate=referenceDate;result.asOf=asOf;result.siteId=siteId;result.referenceId=referenceId;result.regime=regime;
    if(site.lowSpot===true)result.flags.push('COLD_AIR_POOLING_POSSIBLE');
    if(site.shoreExposure===true)result.flags.push('SHORE_EFFECT_DIRECTION_AND_SIZE_UNKNOWN');
    if(site.raisedBed===true)result.flags.push('RAISED_BED_SOIL_NOT_AIR_TEMPERATURE');
    if(site.cover===true)result.flags.push('COVER_EFFECT_NOT_ESTIMATED');
    if(site.shade===true)result.flags.push('SHADE_EFFECT_NOT_QUANTIFIED');
    const groups=new Map();
    for(const p of pairs){
      if(!p||!validDate(p.date)||p.date>=asOf||p.siteId!==siteId||p.referenceId!==referenceId||p.regime!==regime||p.sameNightWindow!==true||p.comparableShieldedAirHeight!==true||!temp(p.gardenLowF)||!temp(p.referenceLowF)||Date.parse(asOf)-Date.parse(p.date)>90*86400000){
        result.rejected.push({date:validDate(p?.date)?p.date:null,reason:'INCOMPARABLE_OR_STALE_PAIR'});continue;
      }
      const a=groups.get(p.date)||[];a.push(p);groups.set(p.date,a);
    }
    const offsets=[];
    for(const [date,rows] of groups){
      if(rows.some(p=>p.gardenLowF!==rows[0].gardenLowF||p.referenceLowF!==rows[0].referenceLowF)){result.rejected.push({date,reason:'CONFLICTING_PAIR'});continue;}
      offsets.push(rows[0].gardenLowF-rows[0].referenceLowF);
    }
    result.sampleCount=offsets.length;
    if(referenceLowF<=thresholdF)result.flags.push('REFERENCE_AT_OR_BELOW_THRESHOLD');
    if(offsets.length<5){result.status='PARTIAL';result.flags.push('NEED_FIVE_COMPARABLE_NIGHTS');return result;}
    const min=Math.min(...offsets),max=Math.max(...offsets),mid=median(offsets);
    const low=referenceLowF+min,high=referenceLowF+max,central=referenceLowF+mid;
    if(![low,high,central].every(temp)){result.status='PARTIAL';result.flags.push('SCENARIO_OUTSIDE_SUPPORTED_RANGE');return result;}
    result.status='AVAILABLE';result.scenario={medianOffsetF:mid,observedMinOffsetF:min,observedMaxOffsetF:max,lowF:low,highF:high,centralF:central,notPredictionInterval:true};
    if(low<=thresholdF)result.flags.push('PAIRED_SCENARIO_REACHES_THRESHOLD');
    if(regime==='clear-calm')result.flags.push('PLANT_SURFACES_CAN_BE_COLDER_THAN_SHIELDED_AIR');
    result.flags.push('NO_FROST_SAFETY_GUARANTEE');
    return result;
  }
  return {schema,assess};
});
