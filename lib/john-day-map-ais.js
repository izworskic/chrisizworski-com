'use strict';
const {normalize}=require('./soo-ais');
const MAX_VESSELS=300;
function tileAddress(query={}){
 const values=['z','x','y'].map(k=>String(query[k]??''));
 if(!values.every(v=>/^\d{1,8}$/.test(v)))return null;
 const [z,x,y]=values.map(Number),n=2**z;
 return z<=14&&x<n&&y<n?{z,x,y}:null;
}
async function decodeTile(bytes,{z,x,y},now=Date.now()){
 const [{VectorTile},{default:Pbf}]=await Promise.all([import('@mapbox/vector-tile'),import('pbf')]);
 const layer=new VectorTile(new Pbf(bytes)).layers.vessels;
 const features=[];
 for(let i=0;i<(layer?.length||0);i++){
  const f=layer.feature(i).toGeoJSON(x,y,z),p=f.properties||{};
  if(p.kind!=='vessel'||!Number.isFinite(p.age_s)||p.age_s<0||p.age_s>28*60)continue;
  p.seen=new Date(now-p.age_s*1000).toISOString();features.push(f);
 }
 const data=normalize({type:'FeatureCollection',features},now,[-90,-180,90,180]);
 return {...data,vessels:data.vessels.slice(0,MAX_VESSELS),truncated:data.vessels.length>MAX_VESSELS,overview:true};
}
// Match a canonical report longitude to the world copy currently on screen.
function inView(v,b){
 const center=(b.west+b.east)/2,lon=v.lon+360*Math.round((center-v.lon)/360);
 return v.lat>=b.south&&v.lat<=b.north&&lon>=b.west&&lon<=b.east?{...v,lon}:null;
}
function visibleReports(local,tiles,b,now=Date.now()){
 const unique=new Map();
 for(const v of [...local,...tiles]){
  const age=now-Date.parse(v.seen);
  if(!Number.isFinite(age)||age< -60000||age>1800000||!Number.isFinite(v.lat)||!Number.isFinite(v.lon))continue;
  const point=inView(v,b),previous=unique.get(v.mmsi);if(point&&(!previous||Date.parse(point.seen)>Date.parse(previous.seen)))unique.set(v.mmsi,point);
 }
 return [...unique.values()];
}
module.exports={tileAddress,decodeTile,MAX_VESSELS,inView,visibleReports};
