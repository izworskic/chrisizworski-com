(function(){
 'use strict';
 var drawer=document.getElementById('plant-now'),field=document.getElementById('garden-find'),wrap=document.getElementById('garden-find-wrap'),status=document.getElementById('garden-find-status');
 function openLinkedPlanner(){if(location.hash==='#plant-now'&&drawer)drawer.open=true}
 openLinkedPlanner();window.addEventListener('hashchange',openLinkedPlanner);
 Array.prototype.forEach.call(document.querySelectorAll('a[href="#plant-now"]'),function(link){link.addEventListener('click',function(){if(drawer)drawer.open=true})});
 // Garden jobs this month: the month-tagged jobs list lives inside the planner;
 // surface the ones that fit this month under the search box.
 (function(){try{
  var box=document.querySelector('[data-garden-month]'),list=box&&box.querySelector('[data-garden-month-list]');
  if(!list)return;
  var month=Number(new Intl.DateTimeFormat('en-US',{month:'numeric',timeZone:'America/Detroit'}).format(new Date()));
  var name=new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'America/Detroit'}).format(new Date());
  function fits(spec){return String(spec||'').split(',').some(function(r){var p=r.split('-').map(Number),a=p[0],b=p.length>1?p[1]:p[0];if(!a||!b)return false;return a<=b?month>=a&&month<=b:month>=a||month<=b;});}
  var shown=0;
  Array.prototype.forEach.call(document.querySelectorAll('#pnJobs li[data-months]'),function(li){
   if(shown>=5||!fits(li.getAttribute('data-months')))return;
   if(typeof li.cloneNode!=='function')return;
   var item=li.cloneNode(true);item.removeAttribute('data-months');list.appendChild(item);shown++;
  });
  if(!shown)return;
  var h=box.querySelector('h2');if(h)h.textContent='Garden jobs for '+name;
  box.hidden=false;
 }catch(e){/* never block the planner below */}})();
 if(!field||!wrap||!status)return;
 var categories=Array.prototype.slice.call(document.querySelectorAll('[data-garden-category]'));
 wrap.hidden=false;
 if(window.HubSearch)return; // shared hub search ranks and filters these results
 field.addEventListener('input',function(){
  var terms=field.value.toLowerCase().trim().split(/\s+/).filter(Boolean),count=0;
  categories.forEach(function(section){var shown=0;Array.prototype.forEach.call(section.querySelectorAll('[data-garden-result]'),function(link){var hay=(link.textContent+' '+(link.getAttribute('data-terms')||'')).toLowerCase();var match=terms.every(function(term){return hay.indexOf(term)!==-1});link.hidden=!match;if(match){shown++;count++}});section.hidden=shown===0});
  status.textContent=terms.length?count+' featured '+(count===1?'tool':'tools')+' found. Browse all garden guides below for more.':'';
 });
})();
