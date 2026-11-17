(function(root,factory){
'use strict';
const core=factory();
if(typeof module!=='undefined'&&module.exports)module.exports=core;
if(root)root.ManisteeRouteCore=core;
})(typeof window==='undefined'?null:window,function(){
'use strict';
// The single Manistee graph implementation used by both field map and API.
// NHD line routing is not a navigability, direction, access, or safety claim.
function hav(a,b){const R=3958.7613,k=Math.PI/180,p1=a[0]*k,p2=b[0]*k,dp=(b[0]-a[0])*k,dl=(b[1]-a[1])*k;const q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
function nodeKey(c){return `${Number(c[1]).toFixed(5)},${Number(c[0]).toFixed(5)}`;}

function geometryLines(g){return g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];}
function buildGraph(features){
  const coordByKey=new Map(),edges=new Map();
  const edge=(a,b,w)=>{if(!edges.has(a))edges.set(a,[]);edges.get(a).push([b,w]);};
  for(const f of features)for(const line of geometryLines(f.geometry))for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],ka=nodeKey(a),kb=nodeKey(b),w=hav([a[1],a[0]],[b[1],b[0]]);
    coordByKey.set(ka,a);coordByKey.set(kb,b);
    if(w>0&&w<5){edge(ka,kb,w);edge(kb,ka,w);}
  }
  return {nodes:[...coordByKey.keys()],coordByKey,edges};
}
function nearestNode(graph,p){
  if(!graph?.nodes.length)return null;let best=null,bestMiles=Infinity;
  for(const k of graph.nodes){const c=graph.coordByKey.get(k),d=hav([p.lat,p.lon],[c[1],c[0]]);if(d<bestMiles){bestMiles=d;best=k;}}
  return {key:best,snapMiles:bestMiles};
}
// Binary minimum-distance heap keeps large NHD graphs responsive without
// changing the original graph edges or shortest-distance definition.
function routeGraph(graph,start,end){
  const a=nearestNode(graph,start),b=nearestNode(graph,end);
  if(!a||!b||a.snapMiles>.8||b.snapMiles>.8)return null;
  const dist=new Map([[a.key,0]]),prev=new Map(),seen=new Set();
  const heap=[];
  function push(key,d){
    let i=heap.length;
    heap.push([d,key]);
    while(i>0){
      const p=Math.floor((i-1)/2);
      if(heap[p][0]<=d)break;
      heap[i]=heap[p];i=p;
    }
    heap[i]=[d,key];
  }
  function pop(){
    const first=heap[0],last=heap.pop();
    if(!heap.length)return first;
    let i=0;
    while(true){
      const left=2*i+1,right=left+1;
      if(left>=heap.length)break;
      const child=right<heap.length&&heap[right][0]<heap[left][0]?right:left;
      if(heap[child][0]>=last[0])break;
      heap[i]=heap[child];i=child;
    }
    heap[i]=last;
    return first;
  }
  push(a.key,0);
  while(heap.length){
    const [du,u]=pop();
    if(seen.has(u)||du>(dist.get(u)??Infinity))continue;
    if(u===b.key)break;
    seen.add(u);
    for(const [v,w] of graph.edges.get(u)||[]){
      const nd=du+w;
      if(nd<(dist.get(v)??Infinity)){
        dist.set(v,nd);
        prev.set(v,u);
        push(v,nd);
      }
    }
  }
  if(!dist.has(b.key))return null;
  const path=[];
  let cur=b.key;
  while(cur){
    const c=graph.coordByKey.get(cur);
    if(!c)return null;
    path.push([c[1],c[0]]);
    if(cur===a.key)break;
    cur=prev.get(cur);
  }
  if(cur!==a.key)return null;
  path.reverse();
  return {distance:dist.get(b.key),path,startSnap:a.snapMiles,endSnap:b.snapMiles};
}

return Object.freeze({hav,nodeKey,geometryLines,buildGraph,nearestNode,routeGraph});
});
