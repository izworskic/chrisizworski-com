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

      const boundary=[...nodes.values()].filter(n=>n.r===0||n.c===0||n.r===rows-1||n.c===cols-1);
      let seed=null,seedClearance=-1;
      for(const n of boundary){
        const clearance=coastDistance(n);
        const score=Number.isFinite(clearance)?clearance:99;
        if(score>seedClearance){seed=n;seedClearance=score;}
      }
      if(!seed)throw new Error('Could not establish an outside-water routing component');
      const waterKeys=new Set([nkey(seed.r,seed.c)]),queue=[seed];
      for(let qi=0;qi<queue.length;qi++){
        const n=queue[qi];
        for(const d of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
          const nk=nkey(n.r+d[0],n.c+d[1]),nn=nodes.get(nk);
          if(!nn||waterKeys.has(nk)||crosses(n,nn))continue;
          waterKeys.add(nk);queue.push(nn);
        }
      }
      if(waterKeys.size<8)throw new Error('Mapped coastline did not produce a usable outside-water component');

      function nearest(p){
        let best=null,bd=Infinity;
        const shorelineDistance=coastDistance(p);
        const nearShore=Number.isFinite(shorelineDistance)&&shorelineDistance<=0.35;
        for(const nk of waterKeys){
          const n=nodes.get(nk),d=miles(p,n);
          if(d>=bd||d>1.5)continue;
          if(crosses(p,n)&&!(nearShore&&d<=0.55))continue;
          best=n;bd=d;
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
          const nk=nkey(n.r+d[0],n.c+d[1]),nn=nodes.get(nk);if(!nn||!waterKeys.has(nk)||crosses(n,nn))continue;
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
  function projectPointToPath(point,path){
    if(!point||!Array.isArray(path)||path.length<2)return null;
    const cum=cumulative(path);
    let best=null;
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i];
      const ref=rad((point.lat+a.lat+b.lat)/3),sx=69.172*Math.cos(ref),sy=69;
      const px=point.lng*sx,py=point.lat*sy,ax=a.lng*sx,ay=a.lat*sy,bx=b.lng*sx,by=b.lat*sy;
      const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy||1;
      const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/den));
      const projected={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};
      const detour=miles(point,projected);
      if(!best||detour<best.distance_miles){
        best={
          distance_miles:detour,
          along_miles:cum[i-1]+miles(a,projected),
          point:projected,
          segment_index:i-1,
          segment_t:t
        };
      }
    }
    return best;
  }

  function slicePath(points,startMiles,endMiles){
    if(!Array.isArray(points)||points.length<2)return points||[];
    const cum=cumulative(points),total=cum[cum.length-1]||0;
    const start=Math.max(0,Math.min(total,+startMiles||0));
    const end=Math.max(start,Math.min(total,+endMiles||0));
    const out=[pointAt(points,cum,start)];
    for(let i=1;i<points.length-1;i++){
      if(cum[i]>start&&cum[i]<end)out.push({...points[i],distance_miles:cum[i]});
    }
    out.push(pointAt(points,cum,end));
    return out.filter(Boolean);
  }

  function buildItinerary(points,camps,speedMph,hoursPerDay,options={}){
    if(!Array.isArray(points)||points.length<2)return {legs:[],candidates:[],total_miles:0,daily_target_miles:0};
    const cum=cumulative(points),total=cum[cum.length-1]||0;
    const speed=Math.max(.5,+speedMph||3),hours=Math.max(2,+hoursPerDay||6);
    const daily=speed*hours;
    const maxDetour=Math.max(.25,+options.maxDetourMiles||(options.mode==='powerboat'?3:1.75));
    const maxDays=Math.max(1,Math.min(12,+options.maxDays||10));
    const candidates=(camps||[]).map(camp=>{
      const projection=projectPointToPath(camp,points);
      return projection?{...camp,...projection}:null;
    }).filter(c=>c&&!c.closed&&c.along_miles>.35&&c.along_miles<total-.35&&c.distance_miles<=maxDetour)
      .sort((a,b)=>a.along_miles-b.along_miles||a.distance_miles-b.distance_miles);

    const used=new Set(),legs=[];
    let current=0,day=1;
    while(current<total-.05&&day<=maxDays){
      const remaining=total-current;
      const nextManual=candidates.find(c=>c.manual_day_end&&!used.has(c.id)&&c.along_miles>current+.35)||null;
      const nextPinned=candidates.find(c=>c.pinned&&!used.has(c.id)&&c.along_miles>current+.35)||null;
      if(remaining<=daily*1.15&&!nextPinned&&!nextManual){
        legs.push({day,start_miles:current,end_miles:total,distance_miles:remaining,stop:null,alternatives:[],final:true,gap:false});
        current=total;
        break;
      }
      const ideal=Math.min(total,current+daily);
      const minAdvance=Math.max(1,daily*.45),maxAdvance=daily*1.35;
      const minAlong=current+minAdvance;
      const fixedBoundary=nextManual?.along_miles??nextPinned?.along_miles??Infinity;
      const maxAlong=Math.min(total-.35,current+maxAdvance,fixedBoundary);
      const viable=candidates.filter(c=>!used.has(c.id)&&!c.pinned&&!c.manual_day_end&&c.along_miles>current+.5&&c.along_miles>=minAlong&&c.along_miles<=maxAlong);
      const ranked=viable.map(c=>{
        const idealPenalty=Math.abs(c.along_miles-ideal)/Math.max(1,daily);
        const detourPenalty=c.distance_miles/Math.max(.25,maxDetour);
        const shelterBonus=c.shelters?-.06:0;
        const dockBonus=c.dock_depth?-.03:0;
        return {...c,score:idealPenalty*1.25+detourPenalty*.75+shelterBonus+dockBonus};
      }).sort((a,b)=>a.score-b.score||a.along_miles-b.along_miles);

      const pinnedWithinDay=nextPinned&&(nextPinned.along_miles-current)<=maxAdvance;
      const chosen=nextManual
        ? nextManual
        : pinnedWithinDay
          ? nextPinned
          : ranked[0]||nextPinned||null;
      const end=chosen?chosen.along_miles:ideal;
      if(chosen)used.add(chosen.id);
      legs.push({
        day,
        start_miles:current,
        end_miles:end,
        distance_miles:end-current,
        stop:chosen,
        alternatives:chosen?.pinned?ranked.slice(0,3):ranked.slice(chosen?1:0,4),
        final:false,
        gap:!chosen,
        pinned:Boolean(chosen?.pinned),
        manual_day_end:Boolean(chosen?.manual_day_end),
        over_target:Boolean((chosen?.pinned||chosen?.manual_day_end)&&(end-current)>maxAdvance),
        under_target:Boolean(chosen?.manual_day_end&&(end-current)<minAdvance)
      });
      current=end;
      day++;
    }
    if(current<total-.05){
      legs.push({day,start_miles:current,end_miles:total,distance_miles:total-current,stop:null,alternatives:[],final:true,gap:false});
    }
    return {legs,candidates,total_miles:total,daily_target_miles:daily,max_detour_miles:maxDetour};
  }

  function scenarioProfiles(baseHours,mode='paddle'){
    const base=Math.max(2,Math.min(12,+baseHours||6));
    const detourBase=mode==='powerboat'?3:1.75;
    return [
      {id:'conservative',title:'Weather-conservative',short:'Shorter days · more camp flexibility',hours:Math.max(2,Math.round(base*.72*2)/2),max_detour_miles:detourBase*1.25},
      {id:'balanced',title:'Balanced',short:'Your baseline travel day',hours:base,max_detour_miles:detourBase},
      {id:'ambitious',title:'Ambitious',short:'Longer days · fewer overnight stops',hours:Math.min(12,Math.round(base*1.28*2)/2),max_detour_miles:detourBase*.82}
    ];
  }

  function buildScenarioSet(points,camps,speedMph,baseHours,options={}){
    const mode=options.mode||'paddle';
    return scenarioProfiles(baseHours,mode).map(profile=>({
      ...profile,
      itinerary:buildItinerary(points,camps,speedMph,profile.hours,{...options,mode,maxDetourMiles:profile.max_detour_miles})
    }));
  }
  function dayEnds(points,speedMph,hoursPerDay){
    const cum=cumulative(points),total=cum[cum.length-1]||0,step=Math.max(.5,+speedMph||3)*Math.max(1,+hoursPerDay||6);
    const out=[];let day=1;
    for(let d=step;d<total;d+=step)out.push({...pointAt(points,cum,d),day:day++});
    return out;
  }

  window.IsleRoyaleWaterIntel={create,weatherSamples,zonesAlongPath,pathDistance,projectPointToPath,slicePath,buildItinerary,scenarioProfiles,buildScenarioSet,dayEnds,miles};
})();