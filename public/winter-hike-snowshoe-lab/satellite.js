'use strict';
/**
 * NASA MODIS historical context (GIBS WMTS), NOT lot, road or legal access.
 * This is deliberately a read-only dated image viewer, not a classifier.
 * NASA instrument provenance is distinct from NOAA NOHRSC modeled depth.
 * Generic XYZ tile templates match Web Mercator GoogleMapsCompatible WMTS.
 */
(function(root,factory) {
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.WinterHikeSatellite=api;
})(typeof window==='object'?window:null,function(){
 const START='2000-03-01';
 const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
 const MODES=Object.freeze({
  trueColor:Object.freeze({label:'MODIS Terra · true color',layer:'MODIS_Terra_CorrectedReflectance_TrueColor',level:9,format:'jpg'}),
  snowCover:Object.freeze({label:'MODIS Terra · NDSI snow cover',layer:'MODIS_Terra_NDSI_Snow_Cover',level:8,format:'png'})
 });
 const pad=n=>String(n).padStart(2,'0');
 const isoDate=date=>date.getUTCFullYear()+'-'+pad(date.getUTCMonth()+1)+'-'+pad(date.getUTCDate());
 function parseDay(day) {
  if(typeof day!=='string'||!/^\d{4}-\d\d-\d\d$/.test(day))return null;
  const d=new Date(day+'T12:00:00.000Z');
  if(!Number.isFinite(d.getTime())||isoDate(d)!==day)return null;
  return d;
 }
 function latestHistoricalDay(now=Date.now()) {
  const date=new Date(now);
  if(!Number.isFinite(date.getTime()))throw new Error('Invalid reference time');
  const day=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()-1,12));
  return isoDate(day);
 }
 function validHistoricalDay(day,now=Date.now()){
  return !!parseDay(day) && day>=START && day<=latestHistoricalDay(now);
 }
 function tileTemplate(mode,day,now=Date.now()) {
  const entry=MODES[mode];
  if(!entry||!validHistoricalDay(day,now))return null;
  return GIBS+entry.layer+'/default/'+day+'/GoogleMapsCompatible_Level'+entry.level+'/{z}/{y}/{x}.'+entry.format;
 }
 function scene(mode,day,now=Date.now()){
  const config=MODES[mode],tile=tileTemplate(mode,day,now);
  if(!config||!tile)return null;
  return {mode,date:day,label:config.label,tile,maxzoom:config.level,tileSize:256,
   opacity:mode==='snowCover'?.72:.81,
   resolution:mode==='snowCover'?'approximately 500 m snow-classification grid':'250 m browse imagery; many input bands are 500 m',
   provenance:'NASA ESDIS Global Imagery Browse Services (GIBS); MODIS aboard Terra',
   interpretation:'Satellite landscape context only. Clouds, shadows and imagery gaps can obscure snow. Neither product observes plowing, parking availability, legal road access or trail conditions.',
   snowMeasurement:false,parkingVerified:false,routeAccessVerified:false};
 }
 function historicalPresets(now=Date.now()){
  const recent=Number(latestHistoricalDay(now).slice(0,4));
  const days=[];
  for(let year=recent;year>=2000&&days.length<8;year--){
   for(const month of [2,1]){
    const day=year+'-'+pad(month)+'-15';
    if(validHistoricalDay(day,now))days.push(day);
   }
  }
  return days;
 }
 function moveDay(day,increment,now=Date.now()){
  const date=parseDay(day);
  if(!date||!Number.isInteger(increment)||Math.abs(increment)>31)return null;
  date.setUTCDate(date.getUTCDate()+increment);
  const next=isoDate(date);
  return validHistoricalDay(next,now)?next:null;
 }
 return Object.freeze({MODES,START,latestHistoricalDay,validHistoricalDay,tileTemplate,scene,historicalPresets,moveDay});
});
