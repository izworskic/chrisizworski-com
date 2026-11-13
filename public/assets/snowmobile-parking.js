/*
 * DNR-listed snowmobile parking, kept separate from the trail graph.
 * Calculates proximity to the existing DNR line overlay as straight-line
 * geometry only. NEVER creates a route edge, trailhead or confirmed access.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SnowmobileParking=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const MAX_MILES=0.9;
const TO_MILES=69.172;
function segmentDistanceMiles(lat,lon,a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length<2||b.length<2)return Infinity;
  if(![...a.slice(0,2),...b.slice(0,2)].every(Number.isFinite))return Infinity;
  const scaleX=TO_MILES*Math.cos(lat*Math.PI/180),scaleY=TO_MILES;
  const px=lon*scaleX,py=lat*scaleY,x1=a[0]*scaleX,y1=a[1]*scaleY,x2=b[0]*scaleX,y2=b[1]*scaleY;
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  const t=l2>0?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l2)):0;
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}
function nearParking(sites,geometry,limit=40,maxMiles=MAX_MILES){
  const features=Array.isArray(geometry?.features)?geometry.features:[];
  if(!features.length||!Array.isArray(sites))return {matches:[],total:0};
  const max=Math.min(1.5,Math.max(0.05,Number.isFinite(maxMiles)?maxMiles:MAX_MILES));
  const paths=[];
  for(const f of features){
    const p=f?.properties||{};
    // Known legal closures must never be used to imply nearby trail access.
    if(p.band==='CLOSED'||p.legalState==='CLOSED')continue;
    const g=f?.geometry,groups=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
    for(const coords of groups){
      if(!Array.isArray(coords)||coords.length<2)continue;
      let minLat=Infinity,maxLat=-Infinity,minLon=Infinity,maxLon=-Infinity;
      for(const c of coords){if(Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])){
        minLon=Math.min(minLon,c[0]);maxLon=Math.max(maxLon,c[0]);
        minLat=Math.min(minLat,c[1]);maxLat=Math.max(maxLat,c[1]);
      }}
      if(Number.isFinite(minLat))paths.push({coords,minLat,maxLat,minLon,maxLon,trail:String(p.trailNetwork||p.TrailNamePrimary||'Mapped DNR trail').slice(0,100)});
    }
  }
  const result=[];
  const seen=new Set();
  for(const site of sites){
    const lat=site?.lat,lon=site?.lon;
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41||lat>49||lon< -91||lon> -82||!Number.isInteger(site?.id)||seen.has(site.id))continue;
    seen.add(site.id);
    let best=Infinity,nearTrail=null;
    const latMargin=max/68.5,lonMargin=max/(TO_MILES*Math.max(.55,Math.cos(lat*Math.PI/180)));
    for(const path of paths){
      if(lat<path.minLat-latMargin||lat>path.maxLat+latMargin||lon<path.minLon-lonMargin||lon>path.maxLon+lonMargin)continue;
      for(let i=1;i<path.coords.length;i++){
        const a=path.coords[i-1],b=path.coords[i];
        if(!a||!b)continue;
        if(Math.min(a[1],b[1])-latMargin>lat||Math.max(a[1],b[1])+latMargin<lat||Math.min(a[0],b[0])-lonMargin>lon||Math.max(a[0],b[0])+lonMargin<lon)continue;
        const miles=segmentDistanceMiles(lat,lon,a,b);
        if(miles<best){best=miles;nearTrail=path.trail;}
      }
    }
    if(best<=max)result.push({...site,nearTrail,nearMiles:Math.round(best*100)/100});
  }
  result.sort((a,b)=>a.nearMiles-b.nearMiles||a.id-b.id);
  const cap=Math.min(80,Math.max(1,Number.isInteger(limit)?limit:40));
  return {matches:result.slice(0,cap),total:result.length};
}
function directionsUrl(site){
  if(!Number.isFinite(site?.lat)||!Number.isFinite(site?.lon)||site.lat<41||site.lat>49||site.lon< -91||site.lon> -82)return null;
  return 'https://www.google.com/maps/dir/?api=1&destination='+site.lat.toFixed(6)+','+site.lon.toFixed(6);
}
return Object.freeze({nearParking,segmentDistanceMiles,directionsUrl});
});
