/* Testable, deterministic segment selection for the existing MapLibre trace.
 * Uses no live routing. Source route and map points must remain in exact order.
 */
const miles=(a,b)=>{
 const r=3958.7613,toRad=n=>n*Math.PI/180;
 const la=toRad(a[1]),lb=toRad(b[1]);
 const q=Math.sin((lb-la)/2)**2+Math.cos(la)*Math.cos(lb)*
   Math.sin(toRad(b[0]-a[0])/2)**2;
 return 2*r*Math.asin(Math.min(1,Math.sqrt(q)));
};
export function readDayFocus(search,route){
 const query=new URLSearchParams(search||'');
 const from=query.get('ct_from'),to=query.get('ct_to');
 if(!from&&!to)return null;
 const first=route.indexOf(from),last=route.indexOf(to);
 if(first<0||last<=first)return null;
 const day=Number(query.get('ct_night_day'));
 if(query.has('ct_night_day')&&(!Number.isInteger(day)||day<1||day>20))return null;
 return {from,to,start:first,end:last,day:day||null};
}
export function snappedStops(route,coordinates,geometry){
 if(!Array.isArray(route)||route.length!==31||!Array.isArray(geometry)||geometry.length<60)
  throw Error('Unexpected source route or geometry');
 const result=[];let previous=0;
 route.forEach((id,i)=>{
  if(!coordinates[id])throw Error('Missing route stop coordinate');
  let nearest;
  if(i===0)nearest={index:0,mi:miles(geometry[0],coordinates[id])};
  else if(i===route.length-1)
   nearest={index:geometry.length-1,mi:miles(geometry.at(-1),coordinates[id])};
  else{
   nearest={index:-1,mi:Infinity};
   for(let idx=previous+1;idx<geometry.length;idx++){
    const value=miles(geometry[idx],coordinates[id]);
    if(value<nearest.mi){nearest={index:idx,mi:value};}
   }
  }
  if(nearest.index<=previous&&i!==0)throw Error('Reversed map road trace');
  if(nearest.mi>2.5)throw Error('Stop too distant from preserved map line');
  result.push({id,index:nearest.index,deviationMiles:nearest.mi});
  previous=nearest.index;
 });
 return result;
}
export function featureForDay(focus,route,coords,geometry){
 if(!focus)return null;
 const matches=snappedStops(route,coords,geometry);
 const begin=matches[focus.start],end=matches[focus.end];
 if(!begin||!end||begin.id!==focus.from||end.id!==focus.to||
    end.index-begin.index<1)return null;
 const line=geometry.slice(begin.index,end.index+1);
 return {type:'Feature',properties:{from:focus.from,to:focus.to,
    description:'Archived simplified road trace: not an independently routed road, ETA, or access guarantee'},
  geometry:{type:'LineString',coordinates:line}};
}
export function focusBounds(feature){
 if(!feature)return null;
 const points=feature.geometry.coordinates;
 return [[Math.min(...points.map(x=>x[0])),Math.min(...points.map(x=>x[1]))],
  [Math.max(...points.map(x=>x[0])),Math.max(...points.map(x=>x[1]))]];
}
