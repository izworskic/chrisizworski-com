/* JOURNEY_ATLAS_V1 v1.0.0 — progressive, local, no geolocation or live-access inference */
(function(root){
  'use strict';
  function tokens(value){return String(value||'').split(/\s+/).filter(Boolean);}
  function choose(experiences, filters){
    var region=filters.region||'all', interest=filters.interest||'all', time=filters.time||'all';
    return experiences.filter(function(item){
      return (region==='all'||item.region===region) &&
        (interest==='all'||tokens(item.interests).includes(interest)) &&
        (time==='all'||tokens(item.times).includes(time));
    }).sort(function(a,b){return a.order-b.order;});
  }
  function init(section){
    if(section.dataset.jaReady==='true') return;
    section.dataset.jaReady='true';
    var select=function(name){return section.querySelector('[data-ja-'+name+']');};
    var region=select('region'), interest=select('interest'), time=select('time');
    var cards=Array.from(section.querySelectorAll('[data-ja-place]'));
    var result=select('result'), more=select('more'), empty=select('empty'), reset=select('reset');
    if(!region||!interest||!time||!result||!more||!empty||!reset) return;
    var expanded=false, limit=3;
    var records=cards.map(function(card,index){return {
      element:card,region:card.dataset.jaRegion,interests:card.dataset.jaInterests,
      times:card.dataset.jaTimes,order:Number(card.dataset.jaOrder||index)
    };});
    function apply(){
      var picks=choose(records,{region:region.value,interest:interest.value,time:time.value});
      var visible=expanded?picks:picks.slice(0,limit);
      cards.forEach(function(card){card.hidden=!visible.some(function(item){return item.element===card;});});
      result.textContent=picks.length===0?'No matching experiences. Try another shore, interest or time budget.':
        'Showing '+visible.length+' of '+picks.length+' matching experiences. These are editorial suggestions, not current access clearance.';
      empty.hidden=picks.length!==0;
      more.hidden=expanded||picks.length<=limit;
      more.textContent='Show all '+picks.length+' matches';
    }
    [region,interest,time].forEach(function(control){control.addEventListener('change',function(){expanded=false;apply();});});
    more.addEventListener('click',function(){expanded=true;apply();more.focus();});
    reset.addEventListener('click',function(){
      region.value='all';interest.value='all';time.value='all';expanded=false;apply();region.focus();
    });
    section.querySelectorAll('[data-ja-add-stop]').forEach(function(button){
      button.addEventListener('click',function(){
        var id=button.dataset.jaAddStop;
        var original=document.querySelector('.stop-card#stop-'+id+' .add-btn[data-id="'+id+'"]');
        var status=section.querySelector('[data-ja-trip-status]');
        if(!original){if(status)status.textContent='Use the linked stop in the Circle Tour to add it to your plan.';return;}
        if(original.getAttribute('aria-pressed')==='true'){
          if(status)status.textContent='This stop is already in your trip.';
          return;
        }
        original.click();
        if(status)status.textContent=original.getAttribute('aria-pressed')==='true'?
          'Stop added to your Circle Tour plan. Open My Trip to review.':
          'Open the linked Circle Tour stop to add it to your plan.';
      });
    });
    apply();
  }
  var api=Object.freeze({version:'1.0.0',choose:choose});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root&&typeof root==='object')root.JourneyAtlasV1=api;
  if(typeof document!=='undefined'){
    var start=function(){document.querySelectorAll('[data-journey-atlas]').forEach(init);};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
})(typeof window!=='undefined'?window:undefined);
