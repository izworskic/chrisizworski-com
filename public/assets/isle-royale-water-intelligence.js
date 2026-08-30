(() => {
  'use strict';

  const BUCKET=.04;
  const BOUNDS={south:47.70,west:-89.55,north:48.45,east:-88.00};

  function rad(v){return v*Math.PI/180;}
  function miles(a,b){
    const R=3958.7613,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng);
    const la=rad(a.lat),lb=rad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function bearing(a,b){
    const la=rad(a.lat),lb=rad(b.lat),dl=rad(b.lng-a.lng);
    const y=Math.sin(dl)*Math.cos(lb);
    const x=Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dl);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  function orientation(a,b,c){
    const v=(b.lng-a.lng)*(c.lat-a.lat)-(b.lat-a.lat)*(c.lng-a.lng);
    return Math.abs(v)<1e-11?0:(v>0?1:-1);
  }
  function onSegment(a,b,p){
    return p.lng>=Math.min(a.lng,b.lng)-1e-9&&p.lng<=Math.max(a.lng,b.lng)+1e-9
      && p.lat>=Math.min(a.lat,b.lat)-1e-9&&p.lat<=Math.max(a.lat,b.lat)+1e-9;
  }
  function intersects(a,b,c,d){
    const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);
    if(o1!==o2&&o3!==o4)return true;
    return (o1===0&&onSegment(a,b,c))||(o2===0&&onSegment(a,b,d))||(o3===0&&onSegment(c,d,a))||(o4===0&&onSegment(c,d,b));
  }
  function pointSegmentMiles(p,a,b){
    const ref=rad((p.lat+a.lat+b.lat)/3),sx=69.172*Math.cos(ref),sy=69;
    const px=p.lng*sx,py=p.lat*sy,ax=a.lng*sx,ay=a.lat*sy,bx=b.lng*sx,by=b.lat*sy;
    const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy||1;
    const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/den));
    return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));
  }
  function heapPush(heap,item){
    heap.push(item);let i=heap.length-1;
    while(i>0){const p=Math.floor((i-1)/2);if(heap[p].score<=item.score)break;heap[i]=heap[p];i=p;}
    heap[i]=item;
  }
  function heapPop(heap){
    if(!heap.length)return null;
    const root=heap[0],last=heap.pop();
    if(heap.length&&last){let i=0;while(true){const l=i*2+1,r=l+1;if(l>=heap.length)break;const c=r<heap.length&&heap[r].score<heap[l].score?r:l;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c;}heap[i]=last;}
    return root;
  }
  function cumulative(points){
    const out=[0];
    for(let i=1;i<points.length;i++)out.push(out[i-1]+miles(points[i-1],points[i]));
    return out;
  }
  function pointAt(points,cum,target){
    if(!points.length)return null;
    const total=cum[cum.length-1]||0;
    if(target<=0)return {...points[0],distance_miles:0};
    if(target>=total)return {...points[points.length-1],distance_miles:total};
    let i=1;while(i<cum.length&&cum[i]<target)i++;
    const span=cum[i]-cum[i-1]||1,t=(target-cum[i-1])/span,a=points[i-1],b=points[i];
    return {lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t,distance_miles:target,bearing_deg:bearing(a,b)};
  }
  function sample(points,spacing){
    const cum=cumulative(points),total=cum[cum.length-1]||0;
    if(!total)return points.length?[{...points[0],distance_miles:0}]:[];
    const n=Math.max(2,Math.ceil(total/spacing)+1),out=[];
    for(let i=0;i<n;i++)out.push(pointAt(points,cum,total*i/(n-1)));
    return out;
  }
  function pointInRing(p,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const xi=+ring[i][0],yi=+ring[i][1],xj=+ring[j][0],yj=+ring[j][1];
      if(((yi>p.lat)!==(yj>p.lat))&&p.lng<((xj-xi)*(p.lat-yi)/(yj-yi)+xi))inside=!inside;
    }
    return inside;
  }
  function inGeometry(p,g){
    const inPoly=rings=>Array.isArray(rings)&&rings.length&&pointInRing(p,rings[0])&&!rings.slice(1).some(r=>pointInRing(p,r));
    if(g?.type==='Polygon')return inPoly(g.coordinates);
    if(g?.type==='MultiPolygon')return (g.coordinates||[]).some(inPoly);
    return false;
  }

  function create(lines){
    const segments=[],buckets=new Map();
    function key(r,c){return r+':'+c;}
    for(const line of lines||[]){
      for(let i=1;i<(line?.length||0);i++){
        const a={lng:+line[i-1][0],lat:+line[i-1][1]},b={lng:+line[i][0],lat:+line[i][1]};
        if(![a.lng,a.lat,b.lng,b.lat].every(Number.isFinite))continue;
        const seg={a,b};segments.push(seg);
        const r0=Math.floor(Math.min(a.lat,b.lat)/BUCKET),r1=Math.floor(Math.max(a.lat,b.lat)/BUCKET);
        const c0=Math.floor(Math.min(a.lng,b.lng)/BUCKET),c1=Math.floor(Math.max(a.lng,b.lng)/BUCKET);
        for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
          const k=key(r,c);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(seg);
        }
      }
    }
    function nearby(a,b,pad){
      const out=new Set(),r0=Math.floor((Math.min(a.lat,b.lat)-pad)/BUCKET),r1=Math.floor((Math.max(a.lat,b.lat)+pad)/BUCKET);
      const c0=Math.floor((Math.min(a.lng,b.lng)-pad)/BUCKET),c1=Math.floor((Math.max(a.lng,b.lng)+pad)/BUCKET);
      for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)for(const seg of buckets.get(key(r,c))||[])out.add(seg);
      return [...out];
    }
    function crosses(a,b){
      return nearby(a,b,.003).some(seg=>intersects(a,b,seg.a,seg.b));
    }
    function coastDistance(p){
      let best=Infinity;
      for(let ring=1;ring<=4;ring++){
        const d=ring*BUCKET;
        for(const seg of nearby({lat:p.lat-d,lng:p.lng-d},{lat:p.lat+d,lng:p.lng+d},0))best=Math.min(best,pointSegmentMiles(p,seg.a,seg.b));
        if(best<Infinity)break;
      }
      return Number.isFinite(best)?best:null;
    }
    function compact(points){
      if(points.length<=2)return points;
      const out=[points[0]];
      for(let i=1;i<points.length-1;i++){
        const turn=Math.abs(((bearing(points[i],points[i+1])-bearing(points[i-1],points[i])+540)%360)-180);
        if(turn>10||miles(out[out.length-1],points[i])>1.25)out.push(points[i]);
      }
      out.push(points[points.length-1]);return out;
    }
    function routeSegment(start,end,mode){
      if(!segments.length)throw new Error('No shoreline geometry loaded');
      const direct=miles(start,end),margin=mode==='paddle'?.18:.13,mid=(start.lat+end.lat)/2;
      let south=Math.max(BOUNDS.south,Math.min(start.lat,end.lat)-margin),north=Math.min(BOUNDS.north,Math.max(start.lat,end.lat)+margin);
      let west=Math.max(BOUNDS.west,Math.min(start.lng,end.lng)-margin),east=Math.min(BOUNDS.east,Math.max(start.lng,end.lng)+margin);
      let latStep=mode==='paddle'?.0085:.0115,lngStep=latStep/Math.max(.55,Math.cos(rad(mid)));
      let rows=Math.ceil((north-south)/latStep)+1,cols=Math.ceil((east-west)/lngStep)+1,estimate=rows*cols;
      if(estimate>11000){const scale=Math.sqrt(estimate/11000);latStep*=scale;lngStep*=scale;rows=Math.ceil((north-south)/latStep)+1;cols=Math.ceil((east-west)/lngStep)+1;}
      const nodes=new Map();
      function nkey(r,c){return r+':'+c;}
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)nodes.set(nkey(r,c),{r,c,lat:south+r*latStep,lng:west+c*lngStep});
      function nearest(p){
        let best=null,bd=Infinity;
        for(const n of nodes.values()){
          const d=miles(p,n);if(d>=bd||d>1.5||crosses(p,n))continue;best=n;bd=d;
        }
        if(!best)throw new Error('Selected point is not connected to mapped water within the routing grid');
        return {...best,access:bd};
      }
      const a=nearest(start),b=nearest(end),ak=nkey(a.r,a.c),bk=nkey(b.r,b.c);
      const dist=new Map([[ak,0]]),prev=new Map(),heap=[];
      heapPush(heap,{key:ak,travel:0,score:miles(a,b)});
      const dirs=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      let loops=0;
      while(heap.length&&loops<50000){
        const cur=heapPop(heap);if(!cur)break;
        const known=dist.get(cur.key);if(known==null||Math.abs(known-cur.travel)>1e-7)continue;
        if(cur.key===bk)break;loops++;
        const n=nodes.get(cur.key);
        for(const d of dirs){
          const nk=nkey(n.r+d[0],n.c+d[1]),nn=nodes.get(nk);if(!nn||crosses(n,nn))continue;
          const edge=miles(n,nn),shore=coastDistance({lat:(n.lat+nn.lat)/2,lng:(n.lng+nn.lng)/2});
          const threshold=mode==='paddle'?1.25:4.5;
          const excess=Number.isFinite(shore)?Math.max(0,shore-threshold):3;
          const bias=mode==='paddle'?1+Math.min(.55,excess*.08):1+Math.min(.08,excess*.01);
          const travel=known+edge*bias;
          if(travel<(dist.get(nk)??Infinity)){
            dist.set(nk,travel);prev.set(nk,cur.key);
            heapPush(heap,{key:nk,travel,score:travel+miles(nn,b)});
          }
        }
      }
      if(!dist.has(bk))throw new Error('No mapped-coastline-safe route found. Add a via point to choose the side of the island or channel you want.');
      const raw=[];let cursor=bk;
      while(cursor){const n=nodes.get(cursor);if(n)raw.push({lat:n.lat,lng:n.lng});if(cursor===ak)break;cursor=prev.get(cursor);}
      raw.reverse();
      return {points:[{...start},...compact(raw),{...end}],access_miles:a.access+b.access};
    }
    function route(controlPoints,mode){
      if(!Array.isArray(controlPoints)||controlPoints.length<2)throw new Error('Two route points are required');
      const out=[];let access=0;
      for(let i=1;i<controlPoints.length;i++){
        const part=routeSegment(controlPoints[i-1],controlPoints[i],mode);
        access+=part.access_miles;
        for(const p of part.points){const last=out[out.length-1];if(!last||miles(last,p)>.01)out.push(p);}
      }
      return {points:out,access_miles:access};
    }
    function analyze(path){
      const samples=sample(path,.25);let maxOff=0,exposed=0,longest=0,current=0;
      for(let i=0;i<samples.length;i++){
        const d=coastDistance(samples[i]);if(Number.isFinite(d))maxOff=Math.max(maxOff,d);
        if(i===0)continue;
        const span=samples[i].distance_miles-samples[i-1].distance_miles;
        if(Number.isFinite(d)&&d>1.5){exposed+=span;current+=span;longest=Math.max(longest,current);}else current=0;
      }
      return {max_offshore_miles:maxOff,exposed_miles:exposed,longest_exposed_miles:longest};
    }
    return {route,analyze,coastDistance,crosses,segment_count:segments.length};
  }

  function weatherSamples(points,maxSamples){
    const cum=cumulative(points),total=cum[cum.length-1]||0;
    const max=Math.max(2,maxSamples||5);
    const count=Math.min(max,Math.max(2,Math.ceil(total/4)+1));
    const out=[];
    for(let i=0;i<count;i++)out.push(pointAt(points,cum,total*i/(count-1)));
    return out;
  }
  function zonesAlongPath(points,features){
    const samples=sample(points,.2),out=[];
    for(const f of features||[]){
      if(!samples.some(p=>inGeometry(p,f.geometry)))continue;
      const props=f.properties||{};
      out.push({name:String(props.name||'NPS boating zone'),type:String(props.zone_type||'regulated zone')});
    }
    return out;
  }
  function pathDistance(point,path){
    let best=Infinity;
    for(let i=1;i<(path?.length||0);i++)best=Math.min(best,pointSegmentMiles(point,path[i-1],path[i]));
    return best;
  }
  function dayEnds(points,speedMph,hoursPerDay){
    const cum=cumulative(points),total=cum[cum.length-1]||0,step=Math.max(.5,+speedMph||3)*Math.max(1,+hoursPerDay||6);
    const out=[];let day=1;
    for(let d=step;d<total;d+=step)out.push({...pointAt(points,cum,d),day:day++});
    return out;
  }

  window.IsleRoyaleWaterIntel={create,weatherSamples,zonesAlongPath,pathDistance,dayEnds,miles};
})();