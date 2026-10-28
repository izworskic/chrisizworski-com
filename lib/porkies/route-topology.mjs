/* Source geometry graph for DNR trails and MGF road centerlines.
 * Research topology only: endpoint connections do not certify a signed, safe or legal route.
 * Never join lines by crossing in their interiors. Never infer bridges, ford safety or road openness.
 */
export function metric(p) {
 const lat=46.76*Math.PI/180;return [p[0]*111320*Math.cos(lat),p[1]*111320];
}
export function distance(a,b) { const m=metric(a),n=metric(b);return Math.hypot(m[0]-n[0],m[1]-n[1]); }
export function parts(f) {
 const g=f.geometry||{};
 if(g.type==="LineString")return [g.coordinates];
 if(g.type==="MultiLineString")return g.coordinates;
 return [];
}
export function lengthMeters(line) {
 let n=0;for(let i=1;i<line.length;i++)n+=distance(line[i-1],line[i]);return n;
}
class DSU {
 constructor(n){this.p=Array.from({length:n},(_,i)=>i);this.sz=Array(n).fill(1);}
 find(i){while(this.p[i]!==i){this.p[i]=this.p[this.p[i]];i=this.p[i];}return i;}
 union(i,j){let a=this.find(i),b=this.find(j);if(a===b)return;if(this.sz[a]<this.sz[b])[a,b]=[b,a];this.p[b]=a;this.sz[a]+=this.sz[b];}
}
function nearPointInPolyline(point,line) {
 const m=metric(point);let best=Infinity;
 for(let i=1;i<line.length;i++){
  const a=metric(line[i-1]),b=metric(line[i]);const vx=b[0]-a[0],vy=b[1]-a[1];
  const t=Math.min(1,Math.max(0,((m[0]-a[0])*vx+(m[1]-a[1])*vy)/Math.max(1e-12,vx*vx+vy*vy)));
  const d=Math.hypot(m[0]-a[0]-t*vx,m[1]-a[1]-t*vy);
  if(d<best)best=d;
 }
 return best;
}
export function closestLine(point,features) {
 let best=null;
 for(const f of features)for(const line of parts(f)){
  if(line.length<2)continue;
  const m=nearPointInPolyline(point,line);
  if(!best||m<best.meters)best={meters:m,sourceId:f.properties?.OBJECTID??f.id,name:f.properties?.TrailNamePrimary??f.properties?.RDNAME??"Unclassified"};
 }
 return best;
}
export function graphAudit(features, snapMeters=5, nameField="TrailNamePrimary") {
 if(!Number.isFinite(snapMeters)||snapMeters<0.1||snapMeters>20)throw Error("Snap tolerance outside research bounds");
 const edges=[],ends=[],byName=new Map(),bad=[];
 for(const f of features){
  const sourceId=f.properties?.OBJECTID??f.id, name=f.properties?.[nameField]||"UNNAMED";
  for(const line of parts(f)){
   if(!Array.isArray(line)||line.length<2)continue;
   if(line.some(p=>!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))){bad.push(sourceId);continue;}
   let m=lengthMeters(line);
   if(m<0.2)continue;
   const eid=edges.length, start=ends.length;
   ends.push({eid,pos:line[0]} , {eid,pos:line[line.length-1]});
   edges.push({sourceId,name,meters:m,partCount:line.length,start:start,end:start+1});
   const z=byName.get(name)||{name,parts:0,meters:0};
   z.parts++;z.meters+=m;byName.set(name,z);
  }
 }
 if(bad.length)throw Error("Invalid line geometry IDs "+bad.slice(0,8));
 const nodes=new DSU(ends.length),cells=new Map();
 for(let i=0;i<ends.length;i++){
  const p=metric(ends[i].pos),ix=Math.floor(p[0]/snapMeters),iy=Math.floor(p[1]/snapMeters);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   for(const j of cells.get((ix+dx)+":"+(iy+dy))||[])if(distance(ends[i].pos,ends[j].pos)<=snapMeters)nodes.union(i,j);
  }
  const k=ix+":"+iy;const a=cells.get(k)||[];a.push(i);cells.set(k,a);
 }
 const componentDSU=new DSU(ends.length);
 for(const edge of edges)componentDSU.union(edge.start,edge.end);
 for(let i=0;i<ends.length;i++)componentDSU.union(i,nodes.find(i));
 const graphComponents=new Map(),degrees=new Map();
 const endpointRoots=new Set(ends.map((_,i)=>nodes.find(i)));
 for(const edge of edges){
  const root=componentDSU.find(edge.start),s=nodes.find(edge.start),t=nodes.find(edge.end);
  const c=graphComponents.get(root)||{parts:0,meters:0,sourceIDs:new Set()};
  c.parts++;c.meters+=edge.meters;c.sourceIDs.add(edge.sourceId);graphComponents.set(root,c);
  degrees.set(s,(degrees.get(s)||0)+1);degrees.set(t,(degrees.get(t)||0)+1);
 }
 const nameSummary=Array.from(byName.values()).map(x=>({name:x.name,parts:x.parts,miles:+(x.meters/1609.344).toFixed(3)})).sort((a,b)=>a.name.localeCompare(b.name));
 const comps=Array.from(graphComponents.values()).map(c=>({parts:c.parts,miles:+(c.meters/1609.344).toFixed(3),sourceFeatures:c.sourceIDs.size})).sort((a,b)=>b.parts-a.parts);
 return {snapMeters,sourceFeatureCount:features.length,lineParts:edges.length,totalGeometryMiles:+(edges.reduce((a,e)=>a+e.meters,0)/1609.344).toFixed(3),componentCount:comps.length,largestComponents:comps.slice(0,10),endpointNodes:endpointRoots.size,degreeOneNodes:Array.from(degrees.values()).filter(d=>d===1).length,names:nameSummary};
}
export function classifyRoad(f) {
 const p=f.properties||{},s=String(p.RDNAME||"").toLowerCase();
 if(s.includes("boundary")&&!s.includes("old"))return "south-boundary";
 if(s.includes("107th engineers")||s==="m-107"||s==="county road 107")return "m107";
 if(s.includes("519"))return "county-519";
 if(s.includes("summit peak"))return "summit-road";
 if(s.includes("64")||s.includes("headquarters"))return "east-approach";
 return "unclassified";
}
export function roadGate(corridor,season) {
 if(["winter","spring"].includes(season)&&["south-boundary","m107","summit-road"].includes(corridor))return {vehicleStatus:"seasonally-restricted",routeEligible:false};
 if(season==="november"&&["south-boundary","m107","summit-road"].includes(corridor))return {vehicleStatus:"weather-review-needed",routeEligible:false};
 return {vehicleStatus:"not-live-verified",routeEligible:false}; // no automatically computed legal vehicle routing
}
