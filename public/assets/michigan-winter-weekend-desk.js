/* Sprint 6: progressive enhancement of the 12 published winter weekend trips.
   No weather network calls or public trail-opening/parking determinations. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') api.mount(document);
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const MODES = Object.freeze({
    snowshoe: {label:'Snowshoe & winter walking', ids:['stop-2','stop-8','stop-11','stop-1','stop-9','stop-5'], tool:'/michigan-winter-trails/',title:'Winter trail rules'},
    xc: {label:'Cross-country skiing', ids:['stop-8','stop-4','stop-9','stop-3','stop-11','stop-6'], tool:'/michigan-cross-country-skiing/',title:'XC grooming & operators'},
    downhill: {label:'Downhill skiing', ids:['stop-10','stop-5','stop-3'], tool:'/michigan-ski-hills/',title:'Compare ski hills'},
    ships: {label:'Winter ships & shores', ids:['stop-6','stop-3','stop-12','stop-7'], tool:'/great-lakes-freighter-tracking/',title:'Ship positions'},
    town: {label:'Sheltered town alternatives', ids:['stop-12','stop-10','stop-8','stop-3','stop-7','stop-11'], tool:'/michigan-winter-activities/',title:'Winter activity ideas'}
  });
  function detroitDate(ms) {
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'numeric',day:'numeric',weekday:'short'})
      .formatToParts(new Date(ms));
    const p=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    return {year:+p.year,month:+p.month,day:+p.day,weekday:p.weekday};
  }
  function weekendInfo(ms=Date.now()) {
    const d=detroitDate(ms),day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(d.weekday);
    if(day<0)throw Error('Invalid Michigan date');
    const ahead=day===0?6:(6-day+7)%7;
    const saturday=new Date(Date.UTC(d.year,d.month-1,d.day+ahead,12));
    const sunday=new Date(saturday.getTime()+86400000);
    const fmt=x=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(x);
    const m=saturday.getUTCMonth()+1,n=saturday.getUTCDate();
    const window=m===11?'early':m===12?(n>=20?'holiday':'early'):m===1||m===2?'deep':m===3?'late':'outside';
    return {label:fmt(saturday)+'–'+fmt(sunday),window};
  }
  function validOrigin(raw) {
    const x=String(raw||'').trim();
    return !x||(/^[a-zA-Z0-9 .,'-]{2,60}$/.test(x)&&x.length>=2);
  }
  function depthUrl(origin) {
    const x=String(origin||'').trim();
    return '/michigan-snow-depth/'+(x&&validOrigin(x)?'?origin='+encodeURIComponent(x):'');
  }
  function shortlist(items,options={},ms=Date.now()) {
    const kind=options.kind||'snowshoe',region=options.region||'all',when=options.when||'upcoming';
    const cfg=MODES[kind];
    if(!cfg||!['all','up','north','south'].includes(region)||!['upcoming','all'].includes(when))return [];
    const season=when==='upcoming'?weekendInfo(ms).window:null;
    if(season==='outside')return [];
    const byId=new Map(items.map(i=>[i.id,i]));
    return cfg.ids.map(id=>byId.get(id)).filter(i=>i&&(region==='all'||i.region===region)
      &&(!season||i.windows.includes(season))).slice(0,3);
  }
  function cards(doc) {
    return Array.from(doc.querySelectorAll('.wf-story')).map(el=>({
      id:el.id,el,region:el.dataset.region,windows:(el.dataset.window||'').split(',').filter(Boolean)
    }));
  }
  function n(doc,tag,text,cls) {
    const e=doc.createElement(tag);
    if(cls)e.className=cls;
    if(text!=null)e.textContent=String(text);
    return e;
  }
  function a(doc,parent,text,url,external) {
    const link=n(doc,'a',text);
    link.href=url;
    if(external){link.target='_blank';link.rel='noopener noreferrer';}
    parent.append(link);return link;
  }
  function sourceLink(el) {
    const links=[...el.querySelectorAll('.wf-links a[href]')];
    const official=links.find(link=>{
      try {
        const url=new URL(link.href);
        const host=url.hostname.replace(/^www\./,'');
        return url.protocol==='https:'&&['nps.gov','michigan.gov','lrd.usace.army.mil'].includes(host);
      }catch(_){return false;}
    });
    if(official)return {href:official.href,label:'Park / agency details'};
    try{
      const u=new URL(el.dataset.source||'');
      if(u.protocol==='https:')return {href:u.href,label:'Destination information'};
    }catch(_){}
    return null;
  }
  function planText(el,cls) {
    const p=el.querySelector('.'+cls);
    if(!p)return 'See the full field guide below.';
    const clone=p.cloneNode(true),lead=clone.querySelector('strong');
    if(lead)lead.remove();
    const text=clone.textContent.replace(/\s+/g,' ').trim();
    return text.length>305?text.slice(0,302).replace(/\s+\S*$/,'')+'…':text;
  }
  function render(doc,form,result,notice,ms=Date.now()) {
    const kind=form.elements.namedItem('kind').value;
    const region=form.elements.namedItem('region').value;
    const when=form.elements.namedItem('when').value;
    const originInput=form.elements.namedItem('origin');
    const origin=originInput.value.trim();
    if(!validOrigin(origin)){
      originInput.setAttribute('aria-invalid','true');
      notice.dataset.state='error';
      notice.textContent='Enter a Michigan town or ZIP using 2–60 letters, numbers or ordinary punctuation, or leave the field blank.';
      return;
    }
    originInput.removeAttribute('aria-invalid');notice.dataset.state='';
    const picks=shortlist(cards(doc),{kind,region,when},ms);
    const date=weekendInfo(ms);
    result.replaceChildren();
    if(!picks.length){
      result.append(n(doc,'p',when==='upcoming'&&date.window==='outside'
        ? 'This date falls outside the guide’s usual November–March winter season. Choose the full winter season to plan another trip.'
        : 'No documented base town fits those choices. Widen the region or change the activity; no substitute destination is invented.'));
      notice.textContent='No matching weekend bases in this guide.';
      return;
    }
    notice.textContent=(when==='upcoming'?'For '+date.label+' in Michigan: ':'For a winter weekend: ')+
      picks.length+' editorial '+(picks.length===1?'choice':'choices')+
      '. Confirm current snow, operator status and winter road access independently.';
    const config=MODES[kind];
    picks.forEach((item,index)=>{
      const el=item.el,c=n(doc,'article',null,'wkd-desk-choice');
      c.append(n(doc,'span',config.label+' · choice '+(index+1),'wkd-desk-kicker'));
      c.append(n(doc,'h3',el.querySelector('h3')?.textContent?.trim()||'Winter base town'));
      const sat=n(doc,'p');sat.append(n(doc,'strong','Saturday idea: '),doc.createTextNode(planText(el,'wkd-day-box')));c.append(sat);
      const alt=n(doc,'p');alt.append(n(doc,'strong','If the weather changes: '),doc.createTextNode(planText(el,'wkd-backup-box')));c.append(alt);
      const caution=el.querySelector('.wf-access')?.textContent?.replace(/\s+/g,' ').trim().replace(/^Field note before you go:\s*/,'');
      if(caution)c.append(n(doc,'p','Winter access: '+(caution.length>300?caution.slice(0,297)+'…':caution),'wkd-desk-caution'));
      const links=n(doc,'div',null,'wkd-desk-links');
      a(doc,links,'Full 2-day guide','#'+item.id).addEventListener('click',()=>doc.getElementById('wf-reset')?.click());
      const src=sourceLink(el);
      if(src)a(doc,links,src.label,src.href,true);
      const baseMap=[...el.querySelectorAll('.wf-links a[href]')].find(link=>{
        try { const url=new URL(link.href); return url.hostname==='www.google.com'&&url.pathname==='/maps/search/'; }
        catch(_){ return false; }
      });
      if(baseMap)a(doc,links,'View base town (not winter parking)',baseMap.href,true);
      // NPS-listed address is a real winter-access reference, not a trailhead.
      if(item.id==='stop-1')a(doc,links,'NPS Munising Falls address (confirm access)',
        'https://www.google.com/maps/dir/?api=1&destination=1505%20Sand%20Point%20Road%2C%20Munising%2C%20MI%2049862',true);
      a(doc,links,config.title,config.tool);
      if(kind==='xc')a(doc,links,'Nordic snow signals','https://xcski.chrisizworski.com/',true);
      if(kind==='ships')a(doc,links,'Winter layups','/great-lakes-freighter-winter-layup/');
      if(['snowshoe','xc','downhill'].includes(kind))a(doc,links,
        origin?'Snow depth from '+origin:'Modeled snow depth',depthUrl(origin));
      c.append(links);result.append(c);
    });
  }
  function mount(doc) {
    const form=doc.getElementById('wkd-desk-form'),result=doc.getElementById('wkd-desk-results'),notice=doc.getElementById('wkd-desk-feedback');
    if(!form||!result||!notice||doc.querySelectorAll('.wf-story').length!==12)return;
    form.hidden=false;
    form.addEventListener('submit',e=>{e.preventDefault();render(doc,form,result,notice);});
    render(doc,form,result,notice);
  }
  return {MODES,weekendInfo,validOrigin,depthUrl,shortlist,mount};
});