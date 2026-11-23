/* Cuyahoga bend explainer: intentionally separate from live and NOAA AIS logic.
 * The guide is illustrative SVG geometry, not an observed vessel track.
 */
(() => {
 'use strict';
 const svg=document.getElementById('bend-diagram');
 const guide=document.getElementById('bend-guide');
 const ship=document.getElementById('bend-ship');
 const slider=document.getElementById('bend-position');
 const play=document.getElementById('bend-play');
 const reset=document.getElementById('bend-reset');
 const title=document.getElementById('bend-stage-name');
 const explanation=document.getElementById('bend-stage-explanation');
 const note=document.getElementById('bend-motion-note');
 const steps=[...document.querySelectorAll('[data-bend-step]')];
 if(!svg||!guide||!ship||!slider||!play||!reset||!title||!explanation||!note||steps.length!==3)return;
 if(typeof guide.getTotalLength!=='function'||typeof guide.getPointAtLength!=='function')return;
 let length;
 try{length=guide.getTotalLength();}catch{return;}
 if(!Number.isFinite(length)||length<=0)return;
 const media=window.matchMedia('(prefers-reduced-motion: reduce)');
 const scenes=[
  {at:12,title:'The bow begins to change direction.',text:'The forward end starts following the curve while the stern is still coming from the approach. The whole ship does not turn at once.'},
  {at:50,title:'Mind both ends of the ship.',text:'As the bow comes around, the stern still occupies a different part of the channel. The crew has to manage the clearance of a long, rigid hull in a winding waterway.'},
  {at:88,title:'The stern is still finishing the turn.',text:'Even after the bow points down the next stretch, the rest of the hull must follow through. Real maneuvers depend on the vessel, crew, current and available equipment.'}
 ];
 let raf=0;
 let startTime=0;
 let startValue=12;
 let progress=12;
 let announced=-1;
 const stageFor=value=>value<34?0:value<68?1:2;
 const inRange=v=>Math.max(0,Math.min(100,Number.isFinite(v)?v:12));
 function render(value){
  progress=inRange(value);
  slider.value=String(Math.round(progress));
  // Only the middle 74% of the drawn centerline is used so the schematic vessel stays in frame.
  const d=length*(.13+.74*progress/100);
  const before=guide.getPointAtLength(Math.max(0,d-3));
  const after=guide.getPointAtLength(Math.min(length,d+3));
  const here=guide.getPointAtLength(d);
  const heading=Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI;
  ship.setAttribute('transform','translate('+here.x.toFixed(2)+' '+here.y.toFixed(2)+') rotate('+heading.toFixed(2)+')');
  const stage=stageFor(progress);
  steps.forEach((button,index)=>button.setAttribute('aria-pressed',String(index===stage)));
  if(stage!==announced){
   title.textContent=scenes[stage].title;
   explanation.textContent=scenes[stage].text;
   announced=stage;
  }
 }
 function stop(){
  if(raf)cancelAnimationFrame(raf);
  raf=0;startTime=0;play.textContent='Play the turn';
  play.setAttribute('aria-pressed','false');
 }
 function setPosition(value){
  stop();
  render(value);
 }
 steps.forEach((button,index)=>{
  button.disabled=false;
  button.addEventListener('click',()=>setPosition(scenes[index].at));
 });
 slider.disabled=false;
 slider.addEventListener('input',()=>setPosition(Number(slider.value)));
 reset.disabled=false;
 reset.addEventListener('click',()=>setPosition(scenes[0].at));
 function animate(time){
  if(media.matches||document.hidden){stop();return;}
  if(!startTime)startTime=time;
  const completed=Math.min(1,(time-startTime)/8500);
  render(startValue+(100-startValue)*completed);
  if(completed>=1){stop();return;}
  raf=requestAnimationFrame(animate);
 }
 play.addEventListener('click',()=>{
  if(media.matches)return;
  if(raf){stop();return;}
  if(progress>=99)render(scenes[0].at);
  startValue=progress;startTime=0;raf=requestAnimationFrame(animate);
  play.textContent='Pause the turn';
  play.setAttribute('aria-pressed','true');
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 function syncMotion(){
  if(media.matches)stop();
  play.disabled=media.matches;
  note.textContent=media.matches
   ? 'Animation is off for your reduced-motion preference. Select any of the three moments or use the slider. This model is not an AIS replay or measured channel.'
   : 'The moving ship is a teaching model, not NOAA AIS replay. Shapes, channel width, steering actions, and timing are not measured.';
 }
 if(typeof media.addEventListener==='function')media.addEventListener('change',syncMotion);
 syncMotion();
 render(scenes[0].at);
})();
