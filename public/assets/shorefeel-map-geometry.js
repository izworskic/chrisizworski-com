(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.ShoreMapGeometry=factory();
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 // Greedy screen-space packing. Keep the first actual beach as the marker
 // anchor: moving to a centroid can reintroduce overlap between groups.
 // A grid of neighboring cells avoids quadratic work at wide zooms.
 function cluster(points,spacing=68){
  const buckets=new Map(),groups=[];
  for(const p of points){
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   const x=Math.floor(p.x/spacing),y=Math.floor(p.y/spacing);
   let closest=null,best=spacing*spacing;
   for(let i=x-1;i<=x+1;i++)for(let j=y-1;j<=y+1;j++){
    for(const g of buckets.get(i+':'+j)||[]){
     const d=(p.x-g.x)**2+(p.y-g.y)**2;
     if(d<best){best=d;closest=g;}
    }
   }
   if(closest){closest.members.push(p);continue;}
   const group={x:p.x,y:p.y,anchor:p,members:[p]};
   const key=x+':'+y;if(!buckets.has(key))buckets.set(key,[]);
   buckets.get(key).push(group);groups.push(group);
  }
  return groups;
 }
 function temperature(row,now=Date.now()){
  if(!row||row.status!=='forecast-based'||!Number.isFinite(row.feelsLikeF)||
    !Number.isFinite(Date.parse(row.validAt))||!Number.isFinite(Date.parse(row.validUntil))||
    Date.parse(row.validAt)>now||Date.parse(row.validUntil)<=now)return null;
  return row.feelsLikeF;
 }
 return {cluster,temperature};
});
