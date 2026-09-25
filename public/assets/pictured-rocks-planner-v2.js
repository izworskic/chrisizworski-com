(function(){
'use strict';
const $=(s,root=document)=>root.querySelector(s),form=$('#tripForm'),result=$('#result'),engine=window.PicturedRocksPlannerEngine;
function val(name){return form.elements[name].value;}
function chosen(){return {time:val('time'),base:val('base'),walk:val('walk'),party:val('party'),priority:val('priority'),water:val('water')};}
function sequence(ids,start='8:00 AM'){let minute=start==='1:00 PM'?13*60:8*60;return ids.map(id=>{const p=engine.PLACES[id],h=Math.floor(minute/60),m=minute%60,ap=h>=12?'PM':'AM',hh=((h+11)%12)+1,time=`${hh}:${String(m).padStart(2,'0')} ${ap}`;minute+=p.mins+30;return {...p,time,id};});}
function render(a){const p=engine.plan(a);$('#resultTitle').textContent=p.title;$('#resultSummary').textContent=p.summary;$('#fitBadge').textContent=a.time==='two'?'2-day fit':a.time==='day'?'full-day fit':'short-trip fit';$('#skipText').textContent=p.skip;$('#fallbackText').textContent=p.fallback;const hs=$('#hardStop');hs.hidden=!p.hard;hs.textContent=p.hard;const steps=sequence(p.ids,p.start);$('#timeline').innerHTML=steps.map((s,i)=>`<article class="stop"><div class="stop-time">${a.time==='two'&&i===0?'Day 1':s.time}</div><div><h3>${s.title}</h3><p>${s.why}</p><div class="meta">${s.effort} · allow about ${Math.round(s.mins/15)*15} min</div></div></article>`).join('');result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'start'});try{localStorage.setItem('pictured-rocks-plan-v2',JSON.stringify(a));}catch(e){}}
form.addEventListener('submit',e=>{e.preventDefault();render(chosen());});
$('#resetBtn').addEventListener('click',()=>{form.reset();result.hidden=true;try{localStorage.removeItem('pictured-rocks-plan-v2');}catch(e){}});
$('#printBtn').addEventListener('click',()=>window.print());
document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;if(p==='one-day')form.elements.time.value='day';if(p==='dog'){form.elements.time.value='day';form.elements.party.value='dog';form.elements.water.value='land';}if(p==='land'){form.elements.time.value='day';form.elements.water.value='land';}if(p==='two')form.elements.time.value='two';render(chosen());}));
try{const saved=JSON.parse(localStorage.getItem('pictured-rocks-plan-v2')||'null');if(saved){Object.entries(saved).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v;});}}catch(e){}
})();