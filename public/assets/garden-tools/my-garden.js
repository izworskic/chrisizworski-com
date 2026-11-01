/* A visitor's saved list, interpreted by the existing Michigan crop engine. */
(function(root){
'use strict';
function mount(o){
 var K=o.kit,E=o.engine, get=function(id){return document.getElementById(id)}, key='michiganGardenCropsV1', packetKey='michiganGardenPacketV1', packets={}, chosen=[], station=null, day=null, conditions={}, dateISO=null;
 try{var raw=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(raw)) chosen=raw.filter(function(id,i){return typeof id==='string'&&raw.indexOf(id)===i&&E.CROPS.some(function(c){return c.id===id})})}catch(e){}
 try{var saved=JSON.parse(localStorage.getItem(packetKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved)) packets=saved}catch(e){}
 var picker=get('gardenPick');
 picker.replaceChildren.apply(picker,[K.h('option',{value:''},'Choose a plant')].concat(E.CROPS.slice().sort(function(a,b){return a.name.localeCompare(b.name)}).map(function(c){return K.h('option',{value:c.id},c.name)})));
 function store(){try{localStorage.setItem(key,JSON.stringify(chosen));localStorage.setItem(packetKey,JSON.stringify(packets))}catch(e){}}
 function update(){
  var container=get('gardenPlan'),count=get('gardenCount'),ahead=get('gardenAhead');ahead.hidden=true;ahead.replaceChildren();count.textContent=chosen.length?chosen.length+' plant'+(chosen.length===1?'':'s')+' in your garden':'Your garden is empty';
  if(!chosen.length){container.replaceChildren(K.h('p',{class:'garden-empty'},'Start with something you love to grow. Choose a plant above and add it to your garden.'));return;}
  if(!station){container.replaceChildren(K.h('p',null,'Choose a Michigan town to see your garden plan.'));return;}
  var result=E.gardenPlan(station,chosen.map(function(id){return Number.isInteger(packets[id])?{cropId:id,maturityDays:packets[id],bufferDays:14}:id}),{dateISO:dateISO,conditions:conditions});
  if(!result.ok){container.replaceChildren(K.h('p',null,'We could not build this plan. Check your location and date.'));return;}
  var rows=result.crops;
  // Only show references that have not passed; date windows include their closing day.
  var future=result.timeline.filter(function(w){return (w.toISO||w.fromISO)>=dateISO});
  function dateText(iso){var d=new Date(iso+'T12:00:00Z');return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d)}
  if(future.length){
   var labels={indoor:'Start indoors',harden:'Harden off',transplant:'Consider planting out',sow:'Consider sowing',fall_reference:'Fall planning reference'};
   var names={};rows.forEach(function(x){names[x.cropId]=x.crop.name});
   var list=K.h('ol',{class:'garden-ahead-list'},future.slice(0,8).map(function(w){
    var start=dateText(w.fromISO),when=w.toISO?start+' – '+dateText(w.toISO):start;
    var condition=w.kind==='fall_reference'?'Packet-based estimate, not a last safe date.':w.kind==='sow'?'Check the forecast and soil at planting depth.':w.kind==='transplant'?'Check the forecast; frost is still possible.':'A planning window based on the station’s spring reference.';
    return K.h('li',null,K.h('span',{class:'garden-ahead-date'},when),K.h('span',{class:'garden-ahead-action'},K.h('strong',null,labels[w.kind]+': '+names[w.cropId]),K.h('small',null,condition)));
   }));
   ahead.replaceChildren(K.h('p',{class:'gy-kicker'},'Your garden, looking ahead'),K.h('h4',null,'A few dates for your notebook'),K.h('p',null,'Use these as a place to start. Your garden and the forecast get the final say.'),list,future.length>8?K.h('p',{class:'garden-ahead-more'},'Showing the next 8 of '+future.length+' planning references.'):null);
   ahead.hidden=false;
  }
  container.replaceChildren.apply(container,rows.map(function(entry){
   var r=entry.current;
   var windows=result.timeline.filter(function(w){return w.cropId===r.crop.id&&w.kind==='indoor'}), next=windows.length?'Seed starting reference: '+dateText(windows[0].fromISO)+' to '+dateText(windows[0].toISO)+'.':null;
   var packetInput=K.h('input',{type:'number',min:'1',max:'365',inputmode:'numeric',value:Number.isInteger(packets[r.crop.id])?packets[r.crop.id]:'','aria-label':'Packet days to maturity for '+r.crop.name});
   var packetMessage=K.h('span',{'aria-live':'polite',class:'garden-packet-message'});
   var save=K.h('button',{type:'button',class:'garden-save'},'Save days');
   save.addEventListener('click',function(){var raw=packetInput.value.trim(),value=Number(raw);if(raw!==''&&(!Number.isInteger(value)||value<1||value>365)){packetMessage.textContent='Enter 1 to 365 days, or leave blank.';return;}if(raw==='')delete packets[r.crop.id];else packets[r.crop.id]=value;store();update();});
   var b=K.h('button',{type:'button',class:'garden-remove','aria-label':'Remove '+r.crop.name+' from my garden'},'Remove');b.addEventListener('click',function(){chosen=chosen.filter(function(id){return id!==r.crop.id});delete packets[r.crop.id];store();update()});
   return K.h('article',{class:'garden-plant'},K.h('div',{class:'garden-plant-head'},K.h('h4',null,r.crop.name),b),K.h('strong',{class:'garden-status'},r.status),K.h('p',null,r.detail),next?K.h('p',{class:'garden-next'},next):null,K.h('div',{class:'garden-packet'},K.h('label',null,'Packet days to maturity ',packetInput),save,packetMessage),entry.fallPlan?(entry.fallPlan.ok?K.h('p',{class:'garden-next'},'Fall planning reference: '+dateText(entry.fallPlan.planningDate)+' (packet '+entry.fallPlan.maturityDays+' days plus 14-day buffer). Historical frost, not a deadline or harvest forecast.'+(entry.fallPlan.planningDate<dateISO?' That planning reference has already passed.':'')):K.h('p',{class:'garden-next'},entry.fallPlan.reason==='fall_frost_unavailable'?'No sourced fall frost date for this station; no fall date calculated.':entry.fallPlan.reason==='overwinter_crop'?'Garlic is planted in fall for a following-season harvest; a fall-harvest countdown does not apply.':entry.fallPlan.reason==='fall_sowing_unverified'?'Fall sowing guidance is not verified for this plant, so no fall planting date is calculated.':'Check the packet days to calculate a fall reference.')):null);
  }));
 }
 get('gardenAdd').addEventListener('click',function(){var id=picker.value,raw=get('gardenDays').value,days=Number(raw);get('gardenError').textContent='';if(!id){get('gardenError').textContent='Choose a plant first.';return;}if(chosen.indexOf(id)>=0){get('gardenError').textContent='That plant is already in your garden.';return;}if(raw!==''&&(!Number.isInteger(days)||days<1||days>365)){get('gardenError').textContent='Enter 1 to 365 days, or leave days blank.';return;}if(raw!=='')packets[id]=days;chosen.push(id);store();picker.value='';get('gardenDays').value='';update()});
 update();return {render:function(st,d,cond,iso){station=st;day=d;conditions=cond;dateISO=iso;update()}};
}
root.MyGarden={mount:mount};
})(typeof window!=='undefined'?window:globalThis);
