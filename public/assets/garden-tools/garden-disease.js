/* Disease scouting, not diagnosis; no pesticide timing or infection probabilities. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GardenDisease=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DAY=86400000,shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
const sources={
 early:'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/early-blight-in-tomato-and-potato',
 septoria:'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/yard-and-garden-problems/tomato-leaf-spot-diseases',
 late:'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/late-blight',
 powder:'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/powdery-mildew-of-cucurbits',
 downy:'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/downy-mildew-of-cucurbits',
 hutton:'https://potatoes.ahdb.org.uk/development-and-implementation-of-a-new-national-warning-system-for-potato-late-blight-in-great-britain-hutton-criteria',
 diagnostic:'https://www.canr.msu.edu/pestid/'
};
const diseases=[
 {id:'early',name:'Early blight',crops:['tomatoes','potatoes'],sign:'rings',where:'Start at older, lower leaves; look for dark spots with concentric rings.',action:'Water near the soil, reduce soil splash with mulch and avoid handling wet leaves.',source:sources.early,cue:'wet'},
 {id:'septoria',name:'Septoria leaf spot',crops:['tomatoes'],sign:'small-spots',where:'Look for numerous small spots with pale centers and darker margins on lower leaves.',action:'Keep foliage dry, improve airflow and compare symptoms with Extension guidance.',source:sources.septoria,cue:'wet'},
 {id:'late',name:'Late blight',crops:['tomatoes','potatoes'],sign:'water-soaked',where:'Inspect rapidly enlarging irregular, water-soaked patches and dark stem lesions; check leaf undersides in humid conditions.',action:'If these symptoms are present, photograph them and contact Extension promptly. Avoid moving suspect plant material.',source:sources.late,cue:'cool'},
 {id:'powder',name:'Powdery mildew',crops:['cucumbers','squash'],sign:'white-powder',where:'Check both surfaces of older leaves for expanding white powdery patches.',action:'Improve airflow; compare natural leaf markings before identifying mildew.',source:sources.powder,cue:'mild'},
 {id:'downy',name:'Downy mildew',crops:['cucumbers','squash'],sign:'angular-yellow',where:'Look for vein-bounded yellow patches and gray-purple growth beneath leaves.',action:'Check Extension guidance and regional reports; wet weather alone does not establish the pathogen is present.',source:sources.downy,cue:'cool'}
];
const crops=['tomatoes','potatoes','cucumbers','squash'];
const dateOK=d=>typeof d==='string'&&/^\d{4}-\d\d-\d\d$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function cropFor(model){return {Tomato:'tomatoes',Cucumber:'cucumbers'}[model?.crop]||null;}
function evaluate({crop,stage,active,entries=[],today,now,siteId,pestResponse=null}={}){
 if(!crops.includes(crop)||!['seedling','growing','flowering','fruiting'].includes(stage)||!dateOK(today)||!Array.isArray(entries))throw Error('Choose a supported crop and its current stage');
 const recent=entries.filter(e=>e.kind==='leaf-check'&&dateOK(e.date)&&e.date>=shift(today,-6)&&e.date<=today).sort((a,b)=>b.date.localeCompare(a.date));
 const latest=recent[0]||null,wet=recent.some(e=>e.foliage==='wet');
 const rain=entries.filter(e=>e.kind==='rain-gauge'&&dateOK(e.date)&&e.date>=shift(today,-3)&&e.date<today&&typeof e.inches==='number'&&e.inches>=0);
 const t=typeof now==='number'?now:Date.parse(now),weather=pestResponse?.weather?.diseaseEvidence,issue=Date.parse(weather?.issuedAt);
 const fresh=pestResponse?.schema==='michigan-garden-pest-watch-v1'&&pestResponse.location?.id===siteId&&pestResponse.crop===crop&&pestResponse.stage===stage&&weather?.schema==='garden-disease-weather-v1'&&['AVAILABLE','PARTIAL'].includes(weather.status)&&Number.isFinite(t)&&Number.isFinite(issue)&&issue<=t&&t-issue<=18*3600000;
 const days=fresh&&Array.isArray(weather.days)?weather.days.filter(d=>dateOK(d.date)&&d.date>today&&d.date<=shift(today,3)&&d.coverage==='complete'&&Number.isInteger(d.humidHours)&&Number.isInteger(d.mildHumidHours)&&Number.isInteger(d.coolHumidHours)):[]; 
 const windows=crop==='potatoes'&&active===true&&fresh&&Array.isArray(weather.huttonWindows)?weather.huttonWindows.filter(w=>days.some(d=>d.date===w.from&&d.huttonDay===true)&&days.some(d=>d.date===w.to&&d.huttonDay===true)&&shift(w.from,1)===w.to):[];
 const relevant=diseases.filter(d=>d.crops.includes(crop)).map(d=>{
  const signs=recent.filter(e=>e.sign===d.sign);
  const hours=days.reduce((n,x)=>n+(d.cue==='wet'?x.humidHours:d.cue==='mild'?x.mildHumidHours:x.coolHumidHours),0);
  const observed=active===true&&signs.length>0;
  // Any measured wet foliage is useful for scouting, not a threshold for infection.
  const condition=active===true&&(hours>0||wet&&d.cue!=='mild');
  return {...d,state:observed?'OBSERVED_SIGN':active!==true?'PLANNING_REFERENCE':condition?'SCOUTING_CUE':'REFERENCE',latestSign:signs[0]||null,forecastHours:active===true&&days.length?hours:null};
 }).sort((a,b)=>(b.state==='OBSERVED_SIGN')-(a.state==='OBSERVED_SIGN')||(b.state==='SCOUTING_CUE')-(a.state==='SCOUTING_CUE'));
 return {status:fresh&&days.length?'AVAILABLE':'PARTIAL',active:active===true,latest,recentChecks:recent.length,wetFoliageReported:wet,rainDays:rain.length,rainIn:rain.reduce((n,e)=>n+e.inches,0),days,windows,issuedAt:fresh?weather.issuedAt:null,diseases:relevant,diagnostic:sources.diagnostic};
}
return {evaluate,cropFor,diseases,sources,crops};
});
