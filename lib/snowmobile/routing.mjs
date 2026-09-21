/*
 * Point-to-point route planning over a region's official DNR trail
 * geometry: build a graph from scored trail segments, snap two chosen
 * points to the nearest trail junction, and find the shortest legally
 * ridable path between them.
 *
 * This is a deterministic shortest-path problem (Dijkstra over a graph
 * built from DNR line geometry), not a JEV decision. JEV in this codebase
 * is bounded to classifying or ranking among already-computed deterministic
 * candidates (see lib/snowmobile/harness.mjs, docs/mackinac-*-spec.md) and
 * is explicitly barred from creating facts, geometry, or legal status. It
 * has no role here: it cannot invent a route, and it cannot be trusted to
 * add up trail miles correctly. Every number and coordinate this module
 * returns is computed directly from the same official DNR trail-centerline
 * geometry the region's map already shows.
 *
 * A segment is excluded from the routable graph if it is legally closed by
 * any of the three ways scoreSegment() (engine.mjs) can mark that, checked
 * independently of the current season: an in-season matched temporary
 * closure or explicit-closed DNR status (band === 'CLOSED'), the same
 * closure matched while off-season (legalState === 'CLOSED', which is the
 * only place that survives scoreSegment's off-season short-circuit), or an
 * explicit closed officialStatus read directly rather than through band,
 * since scoreSegment never reaches its officialStatus check at all when
 * the season is inactive. A route is never suggested through a trail this
 * data says is closed, in season or out.
 */

const EARTH_RADIUS_MI = 3958.7613;
/* Endpoints within this distance are treated as the same trail junction.
 * Chosen from live connectivity testing against the real DNR layer: at
 * ~11m tolerance the overwhelming majority of "dangling" endpoints turn
 * out to be digitizing slop between independently-drawn segments rather
 * than real dead ends, and raising tolerance further (tested to ~111m)
 * barely changes the dangling count, meaning the true dead ends bottom out
 * well under 20m. Real trail junctions on this network are essentially
 * never this close together, so 20m does not risk merging two genuinely
 * distinct points. */
const SNAP_TOLERANCE_METERS = 20;
/* If the requested point is farther than this from any trail junction in
 * the graph, it is treated as not on the network rather than silently
 * snapped to something far away. */
const MAX_SNAP_MILES = 0.75;
/* Labeled, not asserted as fact: an assumed average including stops, used
 * only to turn a measured distance into a rough time estimate. */
const ASSUMED_AVG_MPH = 30;

function toRad(d){return d*Math.PI/180;}
export function haversineMiles(a,b){
  const [lon1,lat1]=a,[lon2,lat2]=b;
  const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const s=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*EARTH_RADIUS_MI*Math.asin(Math.min(1,Math.sqrt(s)));
}
function lineLengthMiles(coords){
  let total=0;
  for(let i=1;i<coords.length;i++)total+=haversineMiles(coords[i-1],coords[i]);
  return total;
}
function lineParts(geometry){
  if(!geometry)return [];
  if(geometry.type==='LineString')return [geometry.coordinates];
  if(geometry.type==='MultiLineString')return geometry.coordinates;
  return [];
}
/* Independent of `band`, because scoreSegment() only sets band:'CLOSED'
 * when the season is active (see module comment above). */
function isLegallyClosed(props={}){
  if(props.band==='CLOSED')return true;
  if(props.legalState==='CLOSED')return true;
  if(props.officialStatus&&/^closed\b/i.test(String(props.officialStatus)))return true;
  return false;
}

class UnionFind{
  constructor(){this.parent=new Map();}
  find(x){
    if(!this.parent.has(x))this.parent.set(x,x);
    let root=x;
    while(this.parent.get(root)!==root)root=this.parent.get(root);
    let cur=x;
    while(this.parent.get(cur)!==cur){const next=this.parent.get(cur);this.parent.set(cur,root);cur=next;}
    return root;
  }
  union(a,b){const ra=this.find(a),rb=this.find(b);if(ra!==rb)this.parent.set(ra,rb);}
}

/*
 * Builds a routable graph from a region's scoredGeometry FeatureCollection
 * (the same object the region detail page already draws on the map).
 * Nodes are trail-junction clusters (endpoints within SNAP_TOLERANCE_METERS
 * of each other); edges are individual line parts of non-closed segments,
 * weighted by the haversine length of their own coordinate chain.
 */
export function buildTrailGraph(scoredGeometry){
  const features=(scoredGeometry?.features||[]).filter(f=>f?.geometry);
  const rawEdges=[]; // {fromPt,toPt,coords,miles,props}
  let closedSegmentsExcluded=0;
  const closedSegmentIds=new Set();
  for(const f of features){
    const props=f.properties||{};
    if(isLegallyClosed(props)){
      if(!closedSegmentIds.has(props.id)){closedSegmentIds.add(props.id);closedSegmentsExcluded++;}
      continue;
    }
    for(const coords of lineParts(f.geometry)){
      if(coords.length<2)continue;
      rawEdges.push({fromPt:coords[0],toPt:coords[coords.length-1],coords,miles:lineLengthMiles(coords),props});
    }
  }

  // Cluster endpoints into junction nodes. Small N (at most a few thousand
  // endpoints even for the largest region), so a plain pairwise pass is
  // simple, correct, and fast enough without a spatial index.
  const endpoints=[];
  for(const e of rawEdges){endpoints.push(e.fromPt);endpoints.push(e.toPt);}
  const uf=new UnionFind();
  for(let i=0;i<endpoints.length;i++)uf.find(i);
  for(let i=0;i<endpoints.length;i++){
    for(let j=i+1;j<endpoints.length;j++){
      const meters=haversineMiles(endpoints[i],endpoints[j])*1609.344;
      if(meters<=SNAP_TOLERANCE_METERS)uf.union(i,j);
    }
  }
  const nodePosition=new Map(); // rootIndex -> representative [lon,lat]
  const nodeKeyOf=new Map(); // rootIndex -> stable string key
  for(let i=0;i<endpoints.length;i++){
    const root=uf.find(i);
    if(!nodePosition.has(root))nodePosition.set(root,endpoints[i]);
  }
  let n=0;
  for(const root of nodePosition.keys())nodeKeyOf.set(root,`n${n++}`);

  const adjacency=new Map(); // nodeKey -> [{to,miles,edge}]
  const nodes=new Map(); // nodeKey -> [lon,lat]
  for(const [root,pos] of nodePosition)nodes.set(nodeKeyOf.get(root),pos);
  const addAdj=(k)=>{if(!adjacency.has(k))adjacency.set(k,[]);return adjacency.get(k);};

  // Each rawEdges[i] contributed endpoints[2*i] (fromPt) and
  // endpoints[2*i+1] (toPt) above, in that order, so its own two node
  // roots are looked up directly by index rather than by re-searching the
  // endpoints array (which would be unreliable when coordinates repeat).
  const edgeList=rawEdges.map((e,i)=>{
    const fromRoot=uf.find(i*2), toRoot=uf.find(i*2+1);
    const fromKey=nodeKeyOf.get(fromRoot), toKey=nodeKeyOf.get(toRoot);
    return {fromKey,toKey,coords:e.coords,miles:e.miles,props:e.props};
  });
  for(const edge of edgeList){
    addAdj(edge.fromKey).push({to:edge.toKey,edge,forward:true});
    addAdj(edge.toKey).push({to:edge.fromKey,edge,forward:false});
  }

  return {nodes,adjacency,edges:edgeList,closedSegmentsExcluded,segmentCount:features.length};
}

/* Nearest junction node to an arbitrary point, or null if every node is
 * farther than MAX_SNAP_MILES away. */
export function nearestNode(graph,lat,lon){
  let best=null,bestMiles=Infinity;
  for(const [key,pos] of graph.nodes){
    const miles=haversineMiles([lon,lat],pos);
    if(miles<bestMiles){bestMiles=miles;best=key;}
  }
  if(best==null||bestMiles>MAX_SNAP_MILES)return null;
  return {nodeKey:best,position:graph.nodes.get(best),snapMiles:bestMiles};
}

/* Plain Dijkstra; region graphs top out around a few hundred nodes, so a
 * simple array-scan priority step is fine without a heap. */
export function shortestPath(graph,fromKey,toKey){
  if(fromKey===toKey)return {miles:0,edges:[]};
  const dist=new Map([[fromKey,0]]);
  const prevEdge=new Map(); // nodeKey -> {fromKey,edgeRef}
  const visited=new Set();
  while(true){
    let u=null,best=Infinity;
    for(const [k,d] of dist){if(!visited.has(k)&&d<best){best=d;u=k;}}
    if(u==null)break;
    if(u===toKey)break;
    visited.add(u);
    for(const link of (graph.adjacency.get(u)||[])){
      const alt=best+link.edge.miles;
      if(alt<(dist.get(link.to)??Infinity)){dist.set(link.to,alt);prevEdge.set(link.to,{fromKey:u,link});}
    }
  }
  if(!dist.has(toKey)||!Number.isFinite(dist.get(toKey)))return null;
  const edges=[];
  let cur=toKey;
  while(cur!==fromKey){
    const step=prevEdge.get(cur);
    if(!step)return null;
    edges.unshift({...step.link});
    cur=step.fromKey;
  }
  return {miles:dist.get(toKey),edges};
}

/*
 * Full route between two lon/lat points in one region: snaps each point to
 * the network, finds the shortest legally-ridable path, and assembles the
 * result geometry, distance, rough time estimate, and per-segment quality
 * along the route. Returns {routable:false,reason} rather than a route
 * when either point is too far from any mapped trail or the two points sit
 * in genuinely separate, unconnected trail clusters.
 */
export function planRoute(scoredGeometry,{fromLat,fromLon,toLat,toLon}){
  const graph=buildTrailGraph(scoredGeometry);
  if(!graph.nodes.size)return {routable:false,reason:'This region has no routable trail geometry right now.'};
  const from=nearestNode(graph,fromLat,fromLon);
  const to=nearestNode(graph,toLat,toLon);
  if(!from)return {routable:false,reason:`Start point is more than ${MAX_SNAP_MILES} miles from the nearest mapped trail junction.`};
  if(!to)return {routable:false,reason:`End point is more than ${MAX_SNAP_MILES} miles from the nearest mapped trail junction.`};
  if(from.nodeKey===to.nodeKey)return {routable:false,reason:'Start and end both snap to the same trail junction, so there is no route to draw.',fromSnap:from,toSnap:to};
  const path=shortestPath(graph,from.nodeKey,to.nodeKey);
  if(!path)return {routable:false,reason:'No connected path of open, mapped trail links these two points. They may sit on separate, unconnected trail systems.',fromSnap:from,toSnap:to};

  const coords=[];
  const segIds=[];
  const trailNames=[];
  const bandsAlong=[];
  for(const link of path.edges){
    const {edge,forward}=link;
    const chain=forward?edge.coords:[...edge.coords].reverse();
    if(coords.length&&chain.length){
      const last=coords[coords.length-1];
      // avoid a duplicate vertex at the junction where two edges meet
      if(last[0]===chain[0][0]&&last[1]===chain[0][1])coords.push(...chain.slice(1));
      else coords.push(...chain);
    }else coords.push(...chain);
    if(!segIds.includes(edge.props.id))segIds.push(edge.props.id);
    const name=edge.props.trailNetwork||edge.props.id;
    if(!trailNames.length||trailNames[trailNames.length-1]!==name)trailNames.push(name);
    bandsAlong.push({segmentId:edge.props.id,trailNetwork:edge.props.trailNetwork,band:edge.props.band,score:edge.props.score,miles:edge.miles});
  }
  const scored=bandsAlong.filter(b=>Number.isFinite(b.score));
  const worst=scored.length?[...scored].sort((a,b)=>a.score-b.score)[0]:null;

  return {
    routable:true,
    distanceMiles:Math.round(path.miles*100)/100,
    estimatedMinutes:Math.round((path.miles/ASSUMED_AVG_MPH)*60),
    assumedAvgMph:ASSUMED_AVG_MPH,
    startSnapMiles:Math.round(from.snapMiles*100)/100,
    endSnapMiles:Math.round(to.snapMiles*100)/100,
    segmentsTraversed:segIds.length,
    closedSegmentsExcludedFromRegion:graph.closedSegmentsExcluded,
    trailsVia:trailNames.filter(Boolean),
    worstSegmentOnRoute:worst,
    geometry:{type:'LineString',coordinates:coords},
    truth:'Distance is measured directly along official Michigan DNR designated-snowmobile-trail centerline geometry, the same lines shown on this region\u2019s map. It never routes through a segment this data marks legally closed. Ride time is a rough estimate from an assumed average speed, not a live or personalized prediction. Start/end points are snapped to the nearest mapped trail junction, not a precise point along a trail.'
  };
}
