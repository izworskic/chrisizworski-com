/* Rideau lock teaching sequence. Explanatory state changes, never operational instructions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RideauLockLab=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const stages=Object.freeze([
    Object.freeze({name:'Enter at the lower water level',text:'The lower gates open when the water inside the chamber matches the water below. A boat enters slowly under the direction of lock staff.',level:'low',lower:'open',upper:'closed',boatX:-70,boatY:0}),
    Object.freeze({name:'Close the gates behind the boat',text:'Both pairs of gates are closed, making the chamber ready to change level. Lock staff control the gates and valves; visitors never operate them.',level:'low',lower:'closed',upper:'closed',boatX:0,boatY:0}),
    Object.freeze({name:'Water rises using gravity',text:'With both gates shut, staff open the upper filling valves. Water flows in from the higher reach, raising the boat until both water surfaces match.',level:'high',lower:'closed',upper:'closed',boatX:0,boatY:-118}),
    Object.freeze({name:'The upper gates can open',text:'The chamber and upper reach are now at the same level. Staff can open the upper gates without a difference in water pressure across them.',level:'high',lower:'closed',upper:'open',boatX:0,boatY:-118}),
    Object.freeze({name:'The boat leaves the chamber',text:'The boat moves into the higher reach when directed by staff. To travel downhill, the process is reversed and water drains through lower gate valves.',level:'high',lower:'closed',upper:'open',boatX:260,boatY:-118})
  ]);
  function clampStage(value){return Number.isInteger(value)?Math.max(0,Math.min(stages.length-1,value)):0;}
  function model(value){const index=clampStage(value);return {index,total:stages.length,...stages[index],waterY:stages[index].level==='high'?128:246};}
  function isValid(){return stages.every((s,i)=>!(s.level==='high'&&s.lower==='open')&&(i!==2||(s.lower==='closed'&&s.upper==='closed')));}
  function mount(doc){
    const $=id=>doc.getElementById(id);
    if(!$('lock-lab-forward'))return;
    let index=0;
    const chapters=Array.from(doc.querySelectorAll('#lock-lab-chapters li'));
    function render(){
      const s=model(index);
      $('lock-lab-counter').textContent=String(s.index+1).padStart(2,'0')+' / 05';
      $('lock-lab-step-title').textContent=s.name;
      $('lock-lab-step-text').textContent=s.text;
      $('lock-lab-back').disabled=index===0;
      $('lock-lab-forward').disabled=index===stages.length-1;
      $('lock-lab-chamber-water').setAttribute('y',String(s.waterY));
      $('lock-lab-chamber-water').setAttribute('height',String(290-s.waterY));
      $('lock-lab-lower-gate').setAttribute('opacity',s.lower==='closed'?'1':'0');
      $('lock-lab-upper-gate').setAttribute('opacity',s.upper==='closed'?'1':'0');
      $('lock-lab-boat').setAttribute('transform','translate('+s.boatX+' '+s.boatY+')');
      chapters.forEach((li,i)=>{if(i===index)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    }
    $('lock-lab-forward').addEventListener('click',()=>{index=clampStage(index+1);render();});
    $('lock-lab-back').addEventListener('click',()=>{index=clampStage(index-1);render();});
    $('lock-lab-reset').addEventListener('click',()=>{index=0;render();});
    const approved=Object.freeze({'pqRibZT_9Ls':'Parks Canada: Historic lock passage (recorded)','rHE4291qpWQ':'Parks Canada: Constructing lock gates (recorded)'});
    doc.querySelectorAll('[data-rideau-film]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.getAttribute('data-rideau-film');
      if(!Object.prototype.hasOwnProperty.call(approved,id))return;
      const frame=doc.createElement('iframe');
      frame.title=approved[id];
      frame.src='https://www.youtube-nocookie.com/embed/'+id;
      frame.loading='lazy';
      frame.referrerPolicy='strict-origin-when-cross-origin';
      frame.allow='encrypted-media; picture-in-picture';
      frame.allowFullscreen=true;
      $('rideau-film-player').replaceChildren(frame);
      $('rideau-film-player').hidden=false;
    }));
    render();
  }
  if(typeof window==='object'&&window.document){
    if(window.document.readyState==='loading')window.document.addEventListener('DOMContentLoaded',()=>mount(window.document));
    else mount(window.document);
  }
  return Object.freeze({stages,model,clampStage,isValid,mount});
});
