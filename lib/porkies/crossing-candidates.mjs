/* Candidate GIS trail-stream intersections.
 * IMPORTANT: A geometric intersection is NOT an official trail ford, bridge,
 * designated pedestrian crossing or verified passability. Keep candidates
 * out of public navigation until individually checked against signed DNR map.
 */
function xy(p){return [p[0]*76200,p[1]*111200];}
function bb(line){let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;for(let p of line){const v=xy(p);a=Math.min(a,v[0]);b=Math.min(b,v[1]);c=Math.max(c,v[0]);d=Math.max(d,v[1]);}return [a,b,c,d];}
function overlap(a,b,pad=0){return a[0]<=b[2]+pad && a[2]>=b[0]-pad && a[1]<=b[3]+pad && a[3]>=b[1]-pad;}
function parts(feature){const g=feature.geometry||{};return g.type==="LineString"?[g.coordinates]:g.type==="MultiLineString"?g.coordinates:[];}
function cross(a,b){return a[0]*b[1]-a[1]*b[0];}
function intersection(A,B,C,D){
 const a=xy(A),b=xy(B),c=xy(C),d=xy(D),r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=cross(r,s);
 if(Math.abs(den)<1e-8)return null;
 const v=[c[0]-a[0],c[1]-a[1]],t=cross(v,s)/den,u=cross(v,r)/den;
 if(t<0||t>1||u<0||u>1)return null;
 return [A[0]+t*(B[0]-A[0]),A[1]+t*(B[1]-A[1])];
}
function distance(a,b){let x=xy(a),y=xy(b);return Math.hypot(x[0]-y[0],x[1]-y[1]);}
function nearestOnSegment(P,A,B){
 const p=xy(P),a=xy(A),b=xy(B),v=[b[0]-a[0],b[1]-a[1]],n=v[0]*v[0]+v[1]*v[1],t=n?Math.max(0,Math.min(1,((p[0]-a[0])*v[0]+(p[1]-a[1])*v[1])/n)):0;
 return {point:[A[0]+t*(B[0]-A[0]),A[1]+t*(B[1]-A[1])],distance:Math.hypot(p[0]-a[0]-t*v[0],p[1]-a[1]-t*v[1])};
}
function segments(line){const x=[];for(let i=1;i<line.length;i++)x.push({a:line[i-1],b:line[i],bb:bb([line[i-1],line[i]])});return x;}
function closeCandidates(a,b,tol){
 let near=null;
 for(const x of a)for(const y of b){
  if(!overlap(x.bb,y.bb,tol))continue;
  let hit=intersection(x.a,x.b,y.a,y.b);
  if(hit)return {point:hit,relationship:"line-intersection",offsetMeters:0};
  let candidates=[
   nearestOnSegment(x.a,y.a,y.b),nearestOnSegment(x.b,y.a,y.b),
   nearestOnSegment(y.a,x.a,x.b),nearestOnSegment(y.b,x.a,x.b)
  ];
  let p=candidates.reduce((x,y)=>x.distance<y.distance?x:y);
  if(p.distance<=tol && (!near||p.distance<near.offsetMeters))near={point:p.point,relationship:"near-line",offsetMeters:p.distance};
 }
 return near;
}
export function candidates(trails,streams,{nearMeters=12,maxResults=1200}={}){
 if(nearMeters<0||nearMeters>25)throw Error("Invalid hydrology candidate tolerance");
 const streamParts=[];
 for(const hydro of streams){
  const id=hydro.properties?.OBJECTID??hydro.id,name=hydro.properties?.GNIS_Name||null;
  for(const line of parts(hydro))if(line.length>=2)streamParts.push({sourceId:id,river:name,bb:bb(line),segments:segments(line)});
 }
 let hits=[];
 for(const trail of trails){
  let trailId=trail.properties?.OBJECTID??trail.id,name=trail.properties?.TrailNamePrimary||"Unnamed trail";
  for(const line of parts(trail)){
   if(line.length<2)continue;
   const tB=bb(line),tS=segments(line);
   for(const water of streamParts){
    if(!overlap(tB,water.bb,nearMeters))continue;
    const hit=closeCandidates(tS,water.segments,nearMeters);
    if(!hit)continue;
    hits.push({trailId,trail:name,hydroId:water.sourceId,river:water.river,
      location:hit.point.map(v=>+v.toFixed(6)),offsetMeters:+hit.offsetMeters.toFixed(1),relationship:hit.relationship,
      evidenceClass:"candidate-geometry-only",bridgeOrFord:"unverified",routeEligible:false});
    if(hits.length>maxResults)throw Error("Too many stream proximity hits, tighter filter needed");
   }
  }
 }
 hits.sort((a,b)=>a.offsetMeters-b.offsetMeters||a.trailId-b.trailId||a.hydroId-b.hydroId);
 const dedup=[];
 for(const h of hits){
  if(dedup.some(x=>x.trailId===h.trailId&&x.hydroId===h.hydroId&&distance(x.location,h.location)<20))continue;
  dedup.push(h);
 }
 return dedup;
}
export const crossingPolicy="candidate-only; no ford, bridge, accessibility, season or live route claim";
