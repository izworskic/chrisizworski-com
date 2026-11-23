/* River ship-watching presentation, shared by Calumet and Cuyahoga.
 * Reuses the exact Seaway/Soo Locks 9-type AIS silhouettes. A side-view
 * ship must NOT rotate with course-over-ground: that makes it upside down.
 * Reported motion uses a separate, optional compass arrow.
 * No AIS requests, synthetic ship types, scale claims, tracking or ETAs.
 */
(function(root,factory){
  const source=typeof module==='object'&&module.exports
    ?require('./seaway-vessel-icons.js'):root?.SeawayVesselIcons;
  const api=factory(source);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RiverWatchVesselUI=api;
})(typeof window==='object'?window:null,function(Icons){
 'use strict';
 if(!Icons||typeof Icons.icon!=='function')return null;
 const MAX_AGE_MS=30*60*1000;
 const kinds=Icons.KINDS;
 const byKind=new Map(kinds.map(k=>[k.kind,k]));
 function kindOf(v){return Icons.classify(v);}
 function typeName(kind){return byKind.get(kind)?.label||byKind.get('unknown').label;}
 function bearing(v){
   // Only a vessel that actually reports travel speed and course gets a
   // course arrow. This is not a bow heading or a predicted river route.
   if(typeof v?.speedKnots!=='number'||!Number.isFinite(v.speedKnots)||v.speedKnots<=0.5)return null;
   const course=v?.course;
   return typeof course==='number'&&Number.isFinite(course)&&course>=0&&course<360?course:null;
 }
 function heading(v){const h=v?.heading;return typeof h==='number'&&Number.isFinite(h)&&h>=0&&h<=359?h:null;}
 function glyphSvg(kind){return Icons.svg(byKind.has(kind)?kind:'unknown');}
 function marker(v,{zoom=13,selected=false}={}){
   const shape=Icons.icon(v,{zoom,selected});
   const course=bearing(v),trueHeading=heading(v),point=course===null?trueHeading:course;
   const basis=course!==null?'course':trueHeading!==null?'heading':'unknown';
   const direction=point===null?'':'<span class="river-ship-course'+(basis==='heading'?' river-ship-heading':'')+'" style="--river-course:'+
     point.toFixed(1)+'deg" aria-hidden="true"><span>↑</span></span>';
   return {...shape,course,heading:trueHeading,basis,
     className:'river-watch-marker '+shape.className+(basis==='unknown'?' without-course':basis==='heading'?' with-heading':' with-course'),
     html:'<span class="river-ship-art">'+shape.html+'</span>'+direction,
     key:shape.key+':'+basis+'-'+(point===null?'unknown':point.toFixed(1))
   };
 }
 function summarize(report,now=Date.now()){
   const unavailable={available:false,total:0,groups:[],reason:'Type counts are unavailable until a fresh AIS report loads.'};
   if(!report||report.state==='UNAVAILABLE'||report.state==='STALE')return unavailable;
   const checked=Date.parse(report.checkedAt||'');
   if(!Number.isFinite(checked)||now-checked>MAX_AGE_MS||now-checked< -60000)return unavailable;
   if(!['REPORTS_AVAILABLE','NO_FRESH_LOCAL_REPORTS'].includes(report.state)||!Array.isArray(report.vessels))return unavailable;
   const seen=new Set(),values=[];
   for(const v of report.vessels){
     const at=Date.parse(v?.seen||'');
     const id=String(v?.mmsi||'');
     if(!/^\d{9}$/.test(id)||seen.has(id)||!Number.isFinite(at)||now-at>MAX_AGE_MS||now-at< -60000)continue;
     seen.add(id);values.push(v);
   }
   const groups=kinds.map(item=>{
     const members=values.filter(v=>kindOf(v)===item.kind);
     return {kind:item.kind,label:item.label,count:members.length};
   }).filter(g=>g.count>0);
   return {available:true,total:values.length,groups,reason:values.length?
     'Counts are distinct MMSIs with fresh AIS positions, not approaching ships.':
     'No vessels reported in the recent local AIS sample; receiver coverage may be incomplete.'};
 }
 function match(v,filter){return filter==='all'||kindOf(v)===filter;}
 function renderTypeFilters(container,report,active,onSelect){
   if(!container)return;
   const summary=summarize(report);
   container.replaceChildren();
   if(!summary.available||summary.total===0){
     const note=document.createElement('span');note.className='river-type-note';
     note.textContent=summary.reason;container.append(note);return;
   }
   const options=[{kind:'all',label:'All types',count:summary.total},...summary.groups];
   for(const item of options){
     const button=document.createElement('button');
     button.type='button';button.className='river-type-filter type-'+item.kind;
     button.dataset.kind=item.kind;
     button.setAttribute('aria-pressed',String(active===item.kind));
     button.setAttribute('aria-label','Show '+item.label+': '+item.count+' recent '+(item.count===1?'vessel':'vessels'));
     if(item.kind!=='all'){
       const glyph=document.createElement('span');glyph.className='river-type-glyph';
       // svg() accepts an enum from this immutable in-repo icon catalog,
       // never provider-supplied HTML.
       glyph.innerHTML=glyphSvg(item.kind);glyph.setAttribute('aria-hidden','true');
       button.append(glyph);
     }
     const text=document.createElement('span');text.textContent=item.label;button.append(text);
     const count=document.createElement('strong');count.textContent=String(item.count);button.append(count);
     button.addEventListener('click',()=>onSelect(item.kind));
     container.append(button);
   }
 }
 return Object.freeze({KINDS:kinds,kindOf,typeName,bearing,heading,glyphSvg,marker,summarize,match,renderTypeFilters});
});