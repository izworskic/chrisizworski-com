(function(){
 'use strict';
 var drawer=document.getElementById('plant-now'),field=document.getElementById('garden-find'),wrap=document.getElementById('garden-find-wrap'),status=document.getElementById('garden-find-status');
 function openLinkedPlanner(){if(location.hash==='#plant-now'&&drawer)drawer.open=true}
 openLinkedPlanner();window.addEventListener('hashchange',openLinkedPlanner);
 Array.prototype.forEach.call(document.querySelectorAll('a[href="#plant-now"]'),function(link){link.addEventListener('click',function(){if(drawer)drawer.open=true})});
 if(!field||!wrap||!status)return;
 var categories=Array.prototype.slice.call(document.querySelectorAll('[data-garden-category]'));
 wrap.hidden=false;
 field.addEventListener('input',function(){
  var terms=field.value.toLowerCase().trim().split(/\s+/).filter(Boolean),count=0;
  categories.forEach(function(section){var shown=0;Array.prototype.forEach.call(section.querySelectorAll('[data-garden-result]'),function(link){var hay=(link.textContent+' '+(link.getAttribute('data-terms')||'')).toLowerCase();var match=terms.every(function(term){return hay.indexOf(term)!==-1});link.hidden=!match;if(match){shown++;count++}});section.hidden=shown===0});
  status.textContent=terms.length?count+' featured '+(count===1?'tool':'tools')+' found. Browse all garden guides below for more.':'';
 });
})();
