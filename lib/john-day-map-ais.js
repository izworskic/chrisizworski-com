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
// Fixed world-pixel cells keep overview groups steady while panning or refreshing.
// A group is a count of loaded reports, not a vessel position or a complete traffic census.
function groupReports(vessels,zoom,selected=null){
 if(zoom>5)return vessels.map(v=>({type:'ship',key:v.mmsi,vessel:v}));
 const scale=256*2**zoom,cell=64,groups=new Map(),items=[];
 for(const v of vessels){
  if(v.mmsi===selected){items.push({type:'ship',key:v.mmsi,vessel:v});continue}
  const lat=Math.max(-85.0511,Math.min(85.0511,v.lat))*Math.PI/180;
  const x=(v.lon+180)/360*scale,y=(1-Math.asinh(Math.tan(lat))/Math.PI)/2*scale;
  const cx=Math.floor(x/cell),cy=Math.floor(y/cell),key='group:'+zoom+':'+cx+':'+cy;
  if(!groups.has(key))groups.set(key,{type:'group',key,members:[],lon:(cx+.5)*cell/scale*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*(cy+.5)*cell/scale)))*180/Math.PI});
  groups.get(key).members.push(v);
 }
 return [...items,...[...groups.values()].map(g=>({...g,count:g.members.length}))];
}
module.exports={tileAddress,decodeTile,MAX_VESSELS,inView,visibleReports,groupReports};
