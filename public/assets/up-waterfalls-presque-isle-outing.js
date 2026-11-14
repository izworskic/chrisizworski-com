/* Presque Isle: one park arrival and three geographic falls, not three drives. */
(function(){
  'use strict';
  const PRESETS=Object.freeze({
    overlook:Object.freeze(['nawadaha-falls']),
    circuit:Object.freeze(['nawadaha-falls','manido-falls','manabezho-falls'])
  });
  const VALID_ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  function seasonalAdvisory(value){
    if(!value)return {winter:false,valid:true,dated:false,note:'No visit date selected. Road access and trail conditions have not been checked.'};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return {winter:false,valid:false,dated:true,note:'Choose a valid trip date.'};
    const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
    if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return {winter:false,valid:false,dated:true,note:'Choose a valid trip date.'};
    const winter=m===12||m<=3;
    return {winter,valid:true,dated:true,note:winter
      ?'Conservative winter gorge-walk hold: County Road 519 may provide access, but the river trails, stairs and ice have not been verified safe.'
      :'County Road 519 is the published park approach. Road, parking, trail-repair and viewpoint conditions still need a current check.'};
  }
  function assess(key,cards,selected,date){
    const ids=PRESETS[key],advice=seasonalAdvisory(date);
    if(!ids)return {ok:false,reason:'Unknown waterfall experience.',missing:[]};
    if(!advice.valid)return {ok:false,reason:advice.note,missing:[]};
    if(key==='circuit'&&!advice.dated)return {ok:false,reason:'Choose a visit date above before preparing the longer gorge circuit. The trail may be restricted.',missing:[]};
    if(key==='circuit'&&advice.winter)return {ok:false,reason:advice.note+' This is a precaution, not a legal closure of the scenic area.',missing:[]};
    if(!cards||typeof cards.get!=='function')return {ok:false,reason:'Waterfall profiles have not loaded.',missing:[]};
    const picked=new Set(selected||[]);
    const missing=ids.filter(id=>!picked.has(id));
    for(const id of ids){
      const card=cards.get(id);
      if(!VALID_ID.test(id)||!card||card.dataset.arrivalVerified!=='verified'||
        ['closed','research'].includes(card.dataset.status)||!card.querySelector?.('.save')){
        return {ok:false,reason:'A waterfall is missing its documented visitor approach; nothing was saved.',missing:[]};
      }
    }
    if(picked.size+missing.length>6)return {ok:false,reason:'Your six-stop day sheet is full. Remove some stops first; nothing was changed.',missing:[]};
    return {ok:true,reason:advice.note,missing};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={PRESETS,seasonalAdvisory,assess};
  if(typeof document==='undefined')return;
  const section=document.getElementById('presque-isle-outing');
  const feedback=section?.querySelector('#presque-isle-feedback');
  if(!section||!feedback)return;
  const input=document.getElementById('visit-date');
  const cards=new Map([...document.querySelectorAll('[data-fall][data-id]')].map(card=>[card.dataset.id,card]));
  const currentIds=()=>[...cards.entries()].filter(([,card])=>card.querySelector('.save')?.getAttribute('aria-pressed')==='true').map(([id])=>id);
  function setFeedback(message){feedback.textContent=message;}
  function refresh(){
    const advice=seasonalAdvisory(input?.value||'');
    const note=section.querySelector('#presque-isle-season');
    if(note)note.textContent=advice.note;
  }
  section.querySelectorAll('[data-presque-preset]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.presquePreset;
    const selected=currentIds(),original=assess(key,cards,selected,input?.value||'');
    const result=window.SharedItineraryEngine?.vetoApproved?.(original,{ids:PRESETS[key],cards,selected,date:input?.value||'',season:key==='circuit'?1:0})||original;
    if(!result.ok){window.UPWaterfallMetrics?.plan(key,'blocked',0);setFeedback(result.reason);feedback.focus();return;}
    for(const id of result.missing)cards.get(id).querySelector('.save').click();
    window.UPWaterfallMetrics?.plan(key,result.missing.length?'added':'already_saved',result.missing.length);
    const sheet=document.getElementById('upfall-day-sheet'),opener=document.getElementById('open-day-sheet');
    if(sheet?.hidden&&opener)opener.click();
    setFeedback((key==='circuit'
      ?'Three named waterfalls saved as ONE possible Presque Isle river outing, NOT three separate vehicle stops. The full loop is not verified open; check trail repairs and current signs.'
      :'Nawadaha saved as the shorter Presque Isle viewpoint option. Check the signed gravel route behind the DNR contact booth.')+
      ' '+result.reason);
    document.getElementById('shortlist')?.scrollIntoView({block:'start',behavior:'smooth'});
  }));
  input?.addEventListener('change',refresh);
  refresh();
})();