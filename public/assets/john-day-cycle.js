'use strict';
/* Deterministic explanatory SVG animation; no live operations or timing encoded. */
(()=>{
 const $=id=>document.getElementById(id),play=$('cyclePlay'),scrub=$('cycleProgress');
 if(!play)return;
 let t=0,playing=false,last=0,raf=null,ticking=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const clamp=x=>Math.max(0,Math.min(1,x));
 const lerp=(a,b,p)=>a+(b-a)*clamp(p);
 function draw(progress){
  t=clamp(progress);const up=$('passageDirection').value==='up';
  const enter=clamp(t/.18),lift=clamp((t-.30)/.40),exit=clamp((t-.82)/.18);
  const lower=320,upper=150,y=up?lerp(lower,upper,lift):lerp(upper,lower,lift);
  const x=up?(t<.18?lerp(60,425,enter):t>.82?lerp(425,810,exit):425):(t<.18?lerp(810,425,enter):t>.82?lerp(425,60,exit):425);
  $('cycleShip').setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+')'+(up?'':' translate(174 0) scale(-1 1)'));
  for(const id of ['cycleWater','cycleWave']){$(id).setAttribute('y',y);$(id).setAttribute('height',420-y)}
  const entryOpen=t<.18?1:t<.30?1-clamp((t-.18)/.12):0;
  const exitOpen=t<.70?0:clamp((t-.70)/.12);
  $('cycleLowerGate').setAttribute('y',190-(up?entryOpen:exitOpen)*145);
  $('cycleUpperGate').setAttribute('y',150-(up?exitOpen:entryOpen)*300);
  $('cycleWaterLabel').textContent=lift===0?(up?'Lower river level':'Upper reservoir level'):lift===1?(up?'Upper reservoir level':'Lower river level'):(up?'Water rises · the tow floats upward':'Water drains · the tow floats downward');
  $('cycleWaterLabel').setAttribute('y',Math.max(y+35,200));
  scrub.value=Math.round(t*1000);
  $('cycleLabel').textContent=Math.round(t*100)+'% · illustrative passage';
 }
 function stop(){playing=false;last=0;if(raf!==null)cancelAnimationFrame(raf);play.textContent='▶ Play lockage';play.setAttribute('aria-pressed','false')}
 function frame(now){
  if(!playing)return;if(last)t+=Math.min(100,now-last)/28000;last=now;
  ticking=true;window.johnDaySetPassage?.(t<.18?0:t<.24?1:t<.30?2:t<.82?3:4);ticking=false;draw(t);
  if(t>=1){stop();return}raf=requestAnimationFrame(frame);
 }
 window.johnDayRenderCycle=progress=>{if(!ticking)draw(progress)};
 play.addEventListener('click',()=>{
  if(playing){stop();return}
  if(reduced){window.johnDaySetPassage?.(Math.min(4,(t<.18?0:t<.30?1:t<.70?2:t<1?3:4)+1));$('cycleLabel').textContent='Reduced motion · step through with Next';return}
  if(t>=1)t=0;playing=true;play.textContent='Ⅱ Pause lockage';play.setAttribute('aria-pressed','true');last=0;raf=requestAnimationFrame(frame);
 });
 scrub.addEventListener('input',()=>{stop();const progress=Number(scrub.value)/1000;ticking=true;window.johnDaySetPassage?.(Math.min(4,Math.floor(progress*5)));ticking=false;draw(progress)});
 for(const id of ['passageBack','passageNext','passageReset'])$(id).addEventListener('click',stop);
 $('passageDirection').addEventListener('change',()=>{stop();draw(0)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 draw(0);
})();
