/* Find a selectable DNR trail junction without tiny map taps.
 * Read only the routeJunctions included in the current region's scored,
 * closure-filtered payload. A display name is a trail label, NEVER a town,
 * trailhead, parking location, verified opening or GPS navigation point.
 * No network calls and no persistent storage.
 */
(function (root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SnowmobileJunctionPicker=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const clean=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const compact=s=>clean(s).replace(/ /g,'');
  function createIndex(featureCollection){
    const seen=new Set(),out=[];
    for(const f of Array.isArray(featureCollection?.features)?featureCollection.features:[]){
      const c=f?.geometry?.coordinates,p=f?.properties||{};
      if(f?.geometry?.type!=='Point'||!Array.isArray(c)||c.length!==2)continue;
      const [lon,lat]=c,id=String(p.id??'');
      if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90||Math.abs(lon)>180||!id||seen.has(id)||!Number.isInteger(p.component))continue;
      seen.add(id);
      const label=String(p.label||'Mapped trail junction').trim().slice(0,160);
      out.push({id,lat,lon,component:p.component,label,search:clean(label+' '+id),compact:compact(label+' '+id)});
    }
    return out;
  }
  function find(index,raw,component=null,limit=12){
    const query=clean(String(raw||'').slice(0,100));
    if(!query)return {matches:[],count:0};
    const tokens=query.split(' ').filter(Boolean),qCompact=compact(query);
    const results=[];
    for(const row of Array.isArray(index)?index:[]){
      if(component!==null&&row.component!==component)continue;
      if(!tokens.every(t=>row.search.includes(t)||row.compact.includes(t)))continue;
      const label=clean(row.label);
      const labelCompact=compact(row.label);
      const score=label===query?0:labelCompact===qCompact?1:
        label.startsWith(query)?2:labelCompact.startsWith(qCompact)?3:
        label.includes(query)?4:5;
      results.push({row,score});
    }
    results.sort((a,b)=>a.score-b.score||a.row.label.localeCompare(b.row.label)||a.row.id.localeCompare(b.row.id));
    const cap=Math.max(1,Math.min(30,Number.isInteger(limit)?limit:12));
    return {matches:results.slice(0,cap).map(r=>r.row),count:results.length};
  }
  return Object.freeze({createIndex,find});
});
