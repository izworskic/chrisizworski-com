/* A visitor's saved list, interpreted by the existing Michigan crop engine. */
(function(root){
'use strict';
function mount(o){
 var K=o.kit,E=o.engine, get=function(id){return document.getElementById(id)}, key='michiganGardenCropsV1', chosen=[], station=null, day=null, conditions={};
 try{var raw=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(raw)) chosen=raw.filter(function(id,i){return typeof id==='string'&&raw.indexOf(id)===i&&E.CROPS.some(function(c){return c.id===id})})}catch(e){}
 var picker=get('gardenPick');
 picker.replaceChildren.apply(picker,[K.h('option',{value:''},'Choose a plant')].concat(E.CROPS.slice().sort(function(a,b){return a.name.localeCompare(b.name)}).map(function(c){return K.h('option',{value:c.id},c.name)})));
 function store(){try{localStorage.setItem(key,JSON.stringify(chosen))}catch(e){}}
 function update(){
  var container=get('gardenPlan'),count=get('gardenCount');count.textContent=chosen.length?chosen.length+' plant'+(chosen.length===1?'':'s')+' in your garden':'Your garden is empty';
  if(!chosen.length){container.replaceChildren(K.h('p',{class:'garden-empty'},'Start with something you love to grow. Choose a plant above and add it to your garden.'));return;}
  if(!station){container.replaceChildren(K.h('p',null,'Choose a Michigan town to see your garden plan.'));return;}
  var rows=E.plan(station,day,conditions).crops.filter(function(r){return chosen.indexOf(r.crop.id)>=0});
  container.replaceChildren.apply(container,rows.map(function(r){
   var windows=r.windows.filter(function(w){return typeof w.from==='number'&&w.kind==='indoor'}), next=windows.length?'Seed starting reference: '+K.range(windows[0].from,windows[0].to)+'.':null;
   var b=K.h('button',{type:'button',class:'garden-remove','aria-label':'Remove '+r.crop.name+' from my garden'},'Remove');b.addEventListener('click',function(){chosen=chosen.filter(function(id){return id!==r.crop.id});store();update()});
   return K.h('article',{class:'garden-plant'},K.h('div',{class:'garden-plant-head'},K.h('h4',null,r.crop.name),b),K.h('strong',{class:'garden-status'},r.status),K.h('p',null,r.detail),next?K.h('p',{class:'garden-next'},next):null);
  }));
 }
 get('gardenAdd').addEventListener('click',function(){var id=picker.value;if(!id||chosen.indexOf(id)>=0)return;chosen.push(id);store();picker.value='';update()});
 update();return {render:function(st,d,cond){station=st;day=d;conditions=cond;update()}};
}
root.MyGarden={mount:mount};
})(typeof window!=='undefined'?window:globalThis);
