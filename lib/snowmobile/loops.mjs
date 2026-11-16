import { buildTrailGraph, nearestNode, describePath, MAX_SNAP_MILES, ASSUMED_AVG_MPH } from './routing.mjs';
import { loopWalksRust } from './rust-route.mjs';

/*
 * Loop finder: "about 60 miles out of this junction and back".
 *
 * Proposes closed rides that start and finish at one mapped junction and
 * come close to a requested mileage, over the same closure-filtered official
 * DNR graph the point-to-point planner uses (buildTrailGraph). It never
 * invents a connection, never routes through a segment the data marks
 * closed, and never claims a trail is rideable.
 *
 * Method (identical in rust/snowmobile-routing/src/lib.rs and in the
 * JavaScript search below, which is the fallback and the parity reference).
 * Candidates are built only from shortest paths in the start's component:
 *   F: every trail part off the start's shortest-path tree closes one
 *      circuit: out to one end of the part, across it, home from the other.
 *   P: every junction pair (A, B): start -> A, A -> B, B -> start. Only the
 *      MAX_PAIR_WALKS pairs closest to the target mileage are walked.
 * Each walk is scored |miles - target| + miles ridden a second time, so a
 * true loop beats a lollipop of the same length, and a walk that repeats
 * more than 30% of its own length is not offered as a loop. Up to
 * MAX_LOOPS distinct walks are kept, plus the out-and-back whose round trip
 * is closest to the target.
 *
 * This is a bounded search over shortest-path legs, not an exhaustive search
 * of every possible circuit, and the response says so.
 *
 * Whichever engine proposes the walks, every walk is validated here against
 * the graph (contiguous, starts and ends at the start junction, no closed
 * part) and every distance is recomputed here from the official geometry.
 */

export const MIN_LOOP_MILES = 5;
export const MAX_LOOP_MILES = 300;
export const MAX_LOOPS = 3;
const REVERSE_BIT = 0x80000000;
const EXTRA_OPTION_SHARE = 0.25;
const EXTRA_OPTION_FLOOR = 5;
const MAX_SHARED_SHARE = 0.6;
const MAX_REPEAT_SHARE = 0.3; // repeated miles allowed in something called a loop
const MAX_PAIR_NODES = 1200;
const MAX_PAIR_WALKS = 3000;
const LOLLIPOP_SHARE = 0.05; // more than 5% of the ride on repeated trail = loop with a stem

/* Min-heap on (distance, serial, node): the same total order the Rust
 * BinaryHeap uses, so both engines relax edges in the same sequence. */
class Heap{
  constructor(){this.items=[];}
  static before(a,b){return a.distance!==b.distance?a.distance<b.distance:a.serial!==b.serial?a.serial<b.serial:a.node<b.node;}
  push(item){
    const h=this.items;h.push(item);
    let i=h.length-1;
    while(i>0){const p=(i-1)>>1;if(!Heap.before(h[i],h[p]))break;[h[i],h[p]]=[h[p],h[i]];i=p;}
  }
  pop(){
    const h=this.items;if(!h.length)return undefined;
    const top=h[0],last=h.pop();
    if(h.length){
      h[0]=last;
      let i=0;
      for(;;){
        const l=2*i+1,r=l+1;let m=i;
        if(l<h.length&&Heap.before(h[l],h[m]))m=l;
        if(r<h.length&&Heap.before(h[r],h[m]))m=r;
        if(m===i)break;
        [h[i],h[m]]=[h[m],h[i]];i=m;
      }
    }
    return top;
  }
}

/* Independent JavaScript search. Same inputs, same output shape and, by
 * construction, the same answer as sm_loops in the Rust module. Returns
 * null for malformed input. */
export function loopWalksJs(nodeCount,edges,start,targetMiles,maxLoops=MAX_LOOPS){
  if(!Number.isInteger(nodeCount)||nodeCount<1||!Number.isInteger(start)||start<0||start>=nodeCount
    ||!Number.isFinite(targetMiles)||targetMiles<=0||!Number.isInteger(maxLoops)||maxLoops<1||maxLoops>3)return null;
  for(const e of edges){
    if(!Number.isInteger(e.a)||!Number.isInteger(e.b)||e.a<0||e.b<0||e.a>=nodeCount||e.b>=nodeCount||!Number.isFinite(e.w)||e.w<0)return null;
  }
  const adjacency=Array.from({length:nodeCount},()=>[]);
  edges.forEach((e,i)=>{
    adjacency[e.a].push([e.b,e.w,i]);
    adjacency[e.b].push([e.a,e.w,(i|REVERSE_BIT)>>>0]);
  });
  const shortestTree=root=>{
    const distance=new Float64Array(nodeCount).fill(Infinity),parent=new Int32Array(nodeCount).fill(-1),code=new Uint32Array(nodeCount);
    const heap=new Heap();
    let serial=0;
    distance[root]=0;
    heap.push({distance:0,node:root,serial});
    for(let current=heap.pop();current;current=heap.pop()){
      if(current.distance>distance[current.node])continue;
      for(const [next,weight,edgeCode] of adjacency[current.node]){
        const alternative=current.distance+weight;
        if(alternative<distance[next]){
          distance[next]=alternative;parent[next]=current.node;code[next]=edgeCode;
          serial++;
          heap.push({distance:alternative,node:next,serial});
        }
      }
    }
    return {distance,parent,code};
  };
  const index=code=>(code&0x7fffffff);
  const treePath=(tree,root,node)=>{
    const codes=[];
    for(let current=node;current!==root;current=tree.parent[current])codes.push(tree.code[current]);
    return codes.reverse();
  };
  const rideBack=out=>[...out].reverse().map(code=>(code^REVERSE_BIT)>>>0);

  const home=shortestTree(start);
  const band=Math.max(targetMiles*EXTRA_OPTION_SHARE,EXTRA_OPTION_FLOOR);
  const seen=new Uint32Array(edges.length);
  let stamp=0;
  const pool=[];
  // Miles and repeated miles in riding order; skipped when it repeats too much to be a loop.
  const score=(codes,kind,a,b)=>{
    stamp++;
    let miles=0,repeated=0;
    for(const code of codes){
      const i=index(code);
      miles+=edges[i].w;
      if(seen[i]===stamp)repeated+=edges[i].w;else seen[i]=stamp;
    }
    if(!(miles>0)||repeated>MAX_REPEAT_SHARE*miles)return;
    pool.push({cost:Math.abs(miles-targetMiles)+repeated,miles,kind,a,b,codes});
  };

  // F: one circuit per edge that is not on the start's tree.
  const onTree=new Uint8Array(edges.length);
  for(let node=0;node<nodeCount;node++)if(home.parent[node]>=0)onTree[index(home.code[node])]=1;
  edges.forEach((e,i)=>{
    if(onTree[i]||!Number.isFinite(home.distance[e.a])||!Number.isFinite(home.distance[e.b]))return;
    score([...treePath(home,start,e.a),i,...rideBack(treePath(home,start,e.b))],0,i,0);
  });

  // P: start -> A -> B -> start for the junction pairs nearest the target.
  const members=[];
  for(let node=0;node<nodeCount;node++)if(node!==start&&Number.isFinite(home.distance[node]))members.push(node);
  if(members.length<MAX_PAIR_NODES){
    const trees=members.map(shortestTree);
    const pairs=[];
    for(let x=0;x<members.length;x++){
      const a=members[x];
      for(let y=x+1;y<members.length;y++){
        const b=members[y];
        const gap=Math.abs(home.distance[a]+trees[x].distance[b]+home.distance[b]-targetMiles);
        if(gap<=band)pairs.push({gap,x,a,b});
      }
    }
    pairs.sort((p,q)=>p.gap-q.gap||p.a-q.a||p.b-q.b);
    for(const {x,a,b} of pairs.slice(0,MAX_PAIR_WALKS)){
      score([...treePath(home,start,a),...treePath(trees[x],a,b),...rideBack(treePath(home,start,b))],1,a,b);
    }
  }

  pool.sort((p,q)=>p.cost-q.cost||p.miles-q.miles||p.kind-q.kind||p.a-q.a||p.b-q.b);

  const walks=[],chosenMarks=[];
  for(const candidate of pool){
    if(walks.length>=maxLoops)break;
    if(walks.length&&Math.abs(candidate.miles-targetMiles)>band)continue;
    const mark=new Uint8Array(edges.length),shared=chosenMarks.map(()=>0);
    let uniqueMiles=0;
    for(const code of candidate.codes){
      const i=index(code);
      if(mark[i])continue;
      mark[i]=1;
      uniqueMiles+=edges[i].w;
      chosenMarks.forEach((other,k)=>{if(other[i])shared[k]+=edges[i].w;});
    }
    if(shared.some(miles=>miles>MAX_SHARED_SHARE*uniqueMiles))continue;
    chosenMarks.push(mark);
    walks.push({kind:0,codes:candidate.codes});
  }

  let best=Infinity,turnaround=-1;
  for(let node=0;node<nodeCount;node++){
    if(node===start||!Number.isFinite(home.distance[node])||!(home.distance[node]>0))continue;
    const gap=Math.abs(2*home.distance[node]-targetMiles);
    if(gap<best){best=gap;turnaround=node;}
  }
  if(turnaround>=0){
    const out=treePath(home,start,turnaround);
    walks.push({kind:1,codes:[...out,...rideBack(out)]});
  }
  return walks;
}

/* Integer view of the graph both engines consume. */
export function indexGraph(graph){
  const nodeKeys=[...graph.nodes.keys()];
  const index=new Map(nodeKeys.map((key,i)=>[key,i]));
  const edges=graph.edges.map(edge=>({a:index.get(edge.fromKey),b:index.get(edge.toKey),w:edge.miles}));
  return {nodeKeys,index,edges};
}

function isClosed(props={}){
  return props.band==='CLOSED'||props.legalState==='CLOSED'||/^closed\b/i.test(String(props.officialStatus||''));
}

/* Turn raw edge codes into graph links, or null if the walk is not a real
 * closed ride from the start junction over open, mapped trail. */
export function validateWalk(graph,startKey,codes){
  if(!Array.isArray(codes)||!codes.length||codes.length>2*graph.edges.length+1)return null;
  const links=[];
  let at=startKey;
  for(const code of codes){
    if(!Number.isInteger(code)||code<0)return null;
    const edge=graph.edges[code&0x7fffffff],forward=(code&REVERSE_BIT)===0;
    if(!edge||isClosed(edge.props)||!Number.isFinite(edge.miles)||edge.miles<0)return null;
    const from=forward?edge.fromKey:edge.toKey,to=forward?edge.toKey:edge.fromKey;
    if(from!==at)return null;
    links.push({to,edge,forward});
    at=to;
  }
  return at===startKey?links:null;
}

const round2=n=>Math.round(n*100)/100;

function describeOption(graph,startKey,links,rawKind,targetMiles,order){
  const seen=new Map();
  let miles=0,repeated=0;
  for(const {edge} of links){
    miles+=edge.miles;
    const count=seen.get(edge)||0;
    if(count)repeated+=edge.miles;
    seen.set(edge,count+1);
  }
  if(!Number.isFinite(miles)||miles<=0)return null;
  // Halfway junction by ridden distance: a waypoint for the export, not a stop the rider must make.
  let ridden=0,halfwayKey=startKey;
  for(const link of links){
    ridden+=link.edge.miles;
    halfwayKey=link.to;
    if(ridden>=miles/2)break;
  }
  const [halfLon,halfLat]=graph.nodes.get(halfwayKey);
  const {coords,segIds,trailNames,bandsAlong,worst}=describePath(links);
  const kind=rawKind===1?'OUT_AND_BACK':(repeated/miles>LOLLIPOP_SHARE?'LOLLIPOP':'LOOP');
  return {
    id:`loop-${order}`,
    routable:true,
    kind,
    distanceMiles:round2(miles),
    targetMiles,
    offTargetMiles:round2(miles-targetMiles),
    repeatedMiles:round2(repeated),
    estimatedMinutes:Math.round(miles/ASSUMED_AVG_MPH*60),
    assumedAvgMph:ASSUMED_AVG_MPH,
    stopCount:3,
    startSnapMiles:0,
    endSnapMiles:0,
    halfway:{junctionId:halfwayKey,lat:halfLat,lon:halfLon,milesFromStart:round2(ridden)},
    segmentsTraversed:segIds.length,
    segmentIds:segIds,
    segments:bandsAlong,
    closedSegmentsExcludedFromRegion:graph.closedSegmentsExcluded,
    trailsVia:trailNames.filter(Boolean),
    worstSegmentOnRoute:worst,
    geometry:{type:'LineString',coordinates:coords},
    truth:'Distance is measured directly along official Michigan DNR designated-snowmobile-trail centerline geometry, the same lines shown on this region’s map. It starts and finishes at the selected mapped junction and never routes through a segment this data marks legally closed. Ride time is a rough estimate from an assumed average speed. The loop search is built from shortest-path legs; it is not every possible circuit, and a mapped loop is not proof of rideable conditions.'
  };
}

/*
 * Loop options from one start point in one region.
 * engine: 'auto' (Rust proposals when trustworthy, else JavaScript),
 * 'js' or 'rust' (tests and the parity benchmark).
 */
export function findLoops(scoredGeometry,{lat,lon,targetMiles,engine='auto'}){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return {routable:false,reason:'Choose a valid start junction.'};
  if(!Number.isFinite(targetMiles)||targetMiles<MIN_LOOP_MILES||targetMiles>MAX_LOOP_MILES)return {routable:false,reason:`Choose a ride length from ${MIN_LOOP_MILES} to ${MAX_LOOP_MILES} miles.`};
  const graph=buildTrailGraph(scoredGeometry);
  if(!graph.nodes.size)return {routable:false,reason:'This region has no routable trail geometry right now.'};
  const start=nearestNode(graph,lat,lon);
  if(!start)return {routable:false,reason:`Start point is more than ${MAX_SNAP_MILES} miles from the nearest mapped trail junction.`};
  const {index,edges}=indexGraph(graph);
  const startIndex=index.get(start.nodeKey);

  let raw,used='javascript';
  if(engine!=='js'){
    raw=loopWalksRust(graph.nodes.size,edges,startIndex,targetMiles,MAX_LOOPS);
    if(raw!==undefined)used='rust-wasm';
  }
  const assemble=walks=>{
    const options=[];
    for(const walk of walks){
      const links=validateWalk(graph,start.nodeKey,walk.codes);
      if(!links)return null; // one unprovable walk discredits the whole reply
      const option=describeOption(graph,start.nodeKey,links,walk.kind,targetMiles,options.length+1);
      if(!option)return null;
      options.push(option);
    }
    return options;
  };
  let options=raw===undefined?null:assemble(raw);
  if(options===null){
    if(engine==='rust')return {routable:false,reason:'The Rust loop engine did not return a provable result.'};
    used='javascript';
    const walks=loopWalksJs(graph.nodes.size,edges,startIndex,targetMiles,MAX_LOOPS);
    options=walks?assemble(walks):null;
  }
  const [startLon,startLat]=start.position;
  const base={
    targetMiles,
    engine:used,
    start:{junctionId:start.nodeKey,lat:startLat,lon:startLon,snapMiles:round2(start.snapMiles)},
    closedSegmentsExcludedFromRegion:graph.closedSegmentsExcluded
  };
  if(!options)return {...base,routable:false,reason:'Loop search could not produce a provable ride from this junction.'};
  if(!options.length)return {...base,routable:false,reason:'No open, mapped trail leaves this junction, so there is no ride to suggest from here.'};
  const loops=options.filter(o=>o.kind!=='OUT_AND_BACK').length;
  return {
    ...base,
    routable:true,
    loopsFound:loops,
    note:loops?null:'No loop was found from this junction on the open, mapped trail in this data. The closest ride that returns to the start is an out-and-back on the same trail.',
    options
  };
}
