/* Sprint 8: land-based ice viewing, grounded in the eleven published stops.
 * Current formation evidence comes ONLY from the existing /api/ice?view=caves
 * source. A missing/stale report can never become a verified trip recommendation.
 * Never interpret NOAA whole-lake cover as local bay ice or safe access.
 */
(function (root, factory) {
 'use strict';
 const api=factory();
 if (typeof module==='object'&&module.exports)module.exports=api;
 if (typeof document!=='undefined')api.mount(document);
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const MODE_IDS=Object.freeze({
  shore:['stop-2','stop-10','stop-11','stop-3'],
  curtains:['stop-1','stop-3','stop-4'],
  falls:['stop-5','stop-6','stop-7','stop-9','stop-8'],
  easy:['stop-2','stop-3','stop-10','stop-11','stop-9'],
  bay:[]
 });
 // Explicit scope matching. Lower Tahquamenon and Sand Point beach do not
 // inherit an Upper Falls / inland-cliff official formation report.
 const SITE_OWNER=Object.freeze({
  'stop-1':'sand-point','stop-3':'grand-island',
  'stop-4':'eben','stop-5':'tahquamenon-falls','stop-7':'wagner-falls'
 });
 const ALLOWED_REGIONS=new Set(['all','up','north','south']);
 const ACCESS_RANK=Object.freeze({documented:0,conditional:1,limited:2});
 function weekendLabel(ms=Date.now()){
  const m=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
   timeZone:'America/Detroit',year:'numeric',month:'numeric',day:'numeric',weekday:'short'
  }).formatToParts(new Date(ms)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(m.weekday);
  if(dow<0)throw Error('Unknown Michigan weekday');
  const days=dow===0?6:(6-dow+7)%7;
  const sat=new Date(Date.UTC(+m.year,+m.month-1,+m.day+days,12));
  const sun=new Date(sat.getTime()+86400000);
  const f=d=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(d);
  return f(sat)+'–'+f(sun);
 }
 function candidates(cards,options={}){
  const goal=options.scene||'shore',region=options.region||'all',access=options.access||'conditional';
  if(!Object.prototype.hasOwnProperty.call(MODE_IDS,goal)||!ALLOWED_REGIONS.has(region)||
     !Object.prototype.hasOwnProperty.call(ACCESS_RANK,access))return [];
  const byId=new Map(cards.map(c=>[c.id,c]));
  return MODE_IDS[goal].map(id=>byId.get(id)).filter(c=>c&&
   (region==='all'||c.region===region)&&
   ACCESS_RANK[c.access]!=null&&ACCESS_RANK[c.access]<=ACCESS_RANK[access]
  ).slice(0,3);
 }
 function freshBundle(bundle,now=Date.now()){
  if(!bundle||bundle.ok!==true||!Array.isArray(bundle.sites)||bundle.sites.length!==5)return false;
  const at=Date.parse(bundle.generatedAt),age=now-at;
  return Number.isFinite(age)&&age>=-120000&&age<=60*60000;
 }
 function sourceSignal(card,bundle,now=Date.now()){
  const siteId=SITE_OWNER[card.id];
  if(!siteId)return {kind:'not-monitored',label:'No site-specific ice formation reading is connected for this particular view.'};
  if(!freshBundle(bundle,now))return {kind:'unavailable',label:'Current official formation evidence not available here. Inspect the five-site source desk.'};
  const site=bundle.sites.find(s=>s.id===siteId),e=site?.evidence;
  if(!e)return {kind:'unavailable',label:'Site evidence unavailable. No formation or access status inferred.'};
  const r=e.report,reportMs=r?.observedOn&&Date.parse(r.observedOn+'T00:00:00Z');
  const reportAge=now-reportMs;
  const actualReport=e.reportFresh===true&&Number.isFinite(reportMs)&&reportAge>=-86400000&&reportAge<=72*3600000;
  const accessAt=Date.parse(e.accessReviewedAt||''),accessAge=now-accessAt;
  const accessRecent=e.access==='reviewed-open'&&Number.isFinite(accessAt)&&accessAge>=-120000&&accessAge<=24*3600000;
  const closure=e.access==='closed';
  if(closure)return {kind:'closed',label:'Access restriction recorded by source. Verify current manager notice; do not use this as an arrival route.'};
  if(!actualReport)return {kind:'unconfirmed',label:'No recent site-specific official report confirms formation. Cold and satellite ice are not proof.'};
  const status={'not-forming':'not forming yet',forming:'forming',formed:'formed',degrading:'degrading'}[r.state]||'reported';
  const expiry=Date.parse(e.validUntil||''),validUntil=Number.isFinite(expiry)&&expiry>now;
  const prime=e.prime===true&&r.state==='formed'&&accessRecent&&validUntil;
  return prime?
    {kind:'recent-official',label:'Recent official report: formed on '+r.observedOn+'; access reviewed. Reconfirm conditions and restrictions before travel.'}:
    {kind:'official-limited',label:'Official report '+r.observedOn+': '+status+'. Current viewing readiness and access are not jointly verified.'};
 }
 function cards(doc){return [...doc.querySelectorAll('.wf-story')].map(el=>({
  id:el.id,el,region:el.dataset.region,access:el.dataset.access,tag:el.dataset.tag
 }));}
 function make(doc,tag,value,cls){
  const el=doc.createElement(tag);if(cls)el.className=cls;
  if(value!==undefined&&value!==null)el.textContent=String(value);
  return el;
 }
 function link(doc,parent,title,href,external=false){
  const el=make(doc,'a',title);el.href=href;
  if(external){el.target='_blank';el.rel='noopener noreferrer';}
  parent.append(el);return el;
 }
 function render(doc,form,result,stamp,bundle=null,now=Date.now()){
  const opts={scene:form.elements.namedItem('scene').value,
   region:form.elements.namedItem('region').value,
   access:form.elements.namedItem('access').value};
  result.replaceChildren();
  if(opts.scene==='bay'){
   const panel=make(doc,'article',null,'fzn-choice');
   panel.append(make(doc,'span','Saginaw Bay observation · not a walking route','fzn-choice-category'),
    make(doc,'h3','Track the bay without treating ice as a trail'),
    make(doc,'p','Start with the Michigan Ice regional report for air-temperature history, wind and source-dated ice observations. The NOAA Great Lakes chart does not measure your local bay ice thickness or safety.'));
   const row=make(doc,'div',null,'fzn-choice-links');
   link(doc,row,'Saginaw Bay regional tracker','/michigan-ice/regions/saginaw-bay.html');
   link(doc,row,'Michigan DNR ice safety','https://www.michigan.gov/dnr/education/safety-info/ice',true);
   link(doc,row,'NOAA ice context','/michigan-ice/');
   panel.append(row);result.append(panel);
   stamp.textContent='Lake ice monitoring is observational only. No ice-crossing, fishing or travel recommendation is being generated.';
   return;
  }
  const picks=candidates(cards(doc),opts);
  if(!picks.length){
   result.append(make(doc,'p','No documented viewpoint matches that combination. Widen the region or review current access requirements; this tool does not invent an alternate destination.'));
   stamp.textContent='No matching documented land-based viewing candidate.';
   return;
  }
  stamp.textContent='For a possible '+weekendLabel(now)+' Michigan weekend: '+picks.length+
   ' editorial viewing '+(picks.length===1?'candidate':'candidates')+'. '+(freshBundle(bundle,now)?
   'Dated site evidence is shown when available; reports remain separate from access.':
   'No verified current formation snapshot is available on this page.');
  picks.forEach((card,i)=>{
   const el=card.el,box=make(doc,'article',null,'fzn-choice'),title=el.querySelector('h3')?.textContent?.trim()||'Winter viewpoint';
   box.append(make(doc,'span',(opts.scene==='curtains'?'Ice curtain':opts.scene==='falls'?'Winter waterfall':'Winter shoreline')+' · option '+(i+1),'fzn-choice-category'),
    make(doc,'h3',title));
   const published=el.querySelector('.fzn-status')?.textContent?.trim();
   if(published)box.append(make(doc,'p','Published approach: '+published));
   const caution=el.querySelector('.wf-access')?.textContent?.replace(/\s+/g,' ').trim();
   if(caution)box.append(make(doc,'p',caution.slice(0,350),null));
   const signal=sourceSignal(card,bundle,now);
   box.append(make(doc,'p',signal.label,'fzn-choice-evidence'));
   const row=make(doc,'div',null,'fzn-choice-links');
   link(doc,row,'Read full field note','#'+card.id).addEventListener('click',()=>doc.getElementById('wf-reset')?.click());
   const official=el.dataset.evidence;
   if(official){try{const u=new URL(official);if(u.protocol==='https:')link(doc,row,'Original land-manager / destination source',u.href,true);}catch(_){}}
   if(SITE_OWNER[card.id])link(doc,row,'Read five-site formation evidence','/michigan-ice-caves/'+SITE_OWNER[card.id]+'/');
   if(card.tag==='falls')link(doc,row,'Waterfall destination inventory','/upper-peninsula-waterfalls/');
   if(card.tag==='shore')link(doc,row,'Great Lakes ice context (not safe ice)','/michigan-ice/');
   box.append(row);result.append(box);
  });
 }
 function mount(doc){
  const form=doc.getElementById('fzn-desk-form'),result=doc.getElementById('fzn-desk-results'),
   stamp=doc.getElementById('fzn-desk-stamp');
  if(!form||!result||!stamp||cards(doc).length!==11)return;
  // Browser-only progressive enhancement; eleven source-backed stories remain static.
  const access=form.elements.namedItem('access');
  if(access)access.value='conditional';
  form.hidden=false;
  let bundle=null;
  const repaint=()=>render(doc,form,result,stamp,bundle);
  form.addEventListener('submit',event=>{event.preventDefault();repaint();});
  repaint();
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),9000);
  fetch('/api/ice?view=caves',{method:'GET',credentials:'same-origin',cache:'no-store',signal:ctl.signal})
   .then(r=>r.ok?r.json():null)
   .then(data=>{bundle=freshBundle(data)?data:null;repaint();})
   .catch(()=>{bundle=null;repaint();})
   .finally(()=>clearTimeout(timer));
 }
 return {MODE_IDS,SITE_OWNER,weekendLabel,candidates,freshBundle,sourceSignal,mount};
});