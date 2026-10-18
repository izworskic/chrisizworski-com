/* Bald eagle flight interpretation — first-party educational diagram.
 * Inspired by the Woodcock Sky Dance tool's labeled trajectory and stage cards.
 * Illustrative trajectories, NOT actual footage, verified sightings or forecasts.
 * No sound is fabricated. Cornell and Smithsonian disagree on cartwheel context.
 */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.EagleFlightGuide=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const STAGES=[
  {id:"soar",number:"01",short:"Soar",name:"Soaring and circling",category:"One eagle or several",
   path:"M75 230 C130 260 170 204 138 164 C105 118 160 71 228 87 C305 105 293 199 227 200 C171 204 178 110 271 91 C347 73 410 115 447 83 C477 53 506 55 554 73",
   second:null,seconds:9,
   watch:"One eagle holds its broad wings almost level, circles upward, or glides for long stretches without flapping.",
   meaning:"Usually travel, hunting, or riding rising air. Soaring by itself is not a courtship signal.",
   tip:"Scan high above rivers, lakes and ridgelines. Eagles often use daytime thermals for efficient travel.",
   caution:"A bird circling overhead does not prove there is a nest nearby."},
  {id:"pair",number:"02",short:"Pair",name:"Two birds flying together",category:"Two eagles",
   path:"M72 239 C131 234 150 176 211 161 C267 147 277 84 332 83 C386 81 397 158 450 153 C510 149 517 95 564 84",
   second:"M70 276 C139 257 163 205 225 195 C279 187 291 124 344 117 C403 111 426 188 479 181 C520 175 535 123 571 116",
   seconds:8,
   watch:"Two eagles soar together, track one another, circle or make coordinated turns.",
   meaning:"Pair-flight displays can reinforce a bond in the breeding period. Two birds flying together are not automatically a breeding pair.",
   tip:"Watch the sky above broad public river overlooks during the local territorial and breeding period.",
   caution:"Without prolonged observation, do not identify the pair's sex, nesting status or motivation."},
  {id:"chase",number:"03",short:"Chase",name:"Aerial chase and steep dive",category:"Two interacting eagles",
   path:"M65 120 C175 55 217 85 282 112 C335 135 355 176 402 239 C436 278 482 179 561 105",
   second:"M65 158 C166 84 228 118 284 151 C327 184 343 212 395 265 C453 303 491 211 558 144",
   seconds:7,
   watch:"One eagle follows another in rapid turns, steep dives or sudden rolls.",
   meaning:"Such flights can occur in pair interactions or territorial encounters. Speed and pursuit alone cannot distinguish courtship from aggression.",
   tip:"Look across unobstructed sky; follow the birds with your eyes before raising binoculars.",
   caution:"Do not call every chase a courtship display."},
  {id:"cartwheel",number:"04",short:"Cartwheel",name:"Talon-locked cartwheel",category:"Two grappling eagles",
   path:"M301 61 C317 94 286 117 302 152 C322 192 284 218 306 251 C324 270 310 295 318 304",
   second:null,seconds:6,
   watch:"Two eagles may clasp talons, rotate and tumble downward before releasing. They can occasionally fail to separate safely.",
   meaning:"Its interpretation is not settled from appearance alone. Cornell describes cartwheels in courtship; the Smithsonian emphasizes territorial combat. Both contexts are discussed by field observers.",
   tip:"The descent is brief and may happen high above a broad river or forest opening. Observe from a public viewpoint without approaching the birds.",
   caution:"Talon contact does not prove mating or tell you whether the birds are an established pair."}
 ];
 const QUIZ=[
  {ask:"One bird circles slowly, wings held out, barely flapping. What is the clearest description?",answer:"soar",why:"This is soaring. From the movement alone you cannot infer courtship or a nearby nest."},
  {ask:"Two eagles lock feet, spin downward, then break apart. What did you observe?",answer:"cartwheel",why:"A cartwheel. You can name the behavior, but courtship versus territorial conflict remains uncertain."},
  {ask:"Two eagles fly in broad, coordinated arcs without touching. What can you confidently report?",answer:"pair",why:"Paired or coordinated flight. The birds' sex and breeding status cannot be determined from the flight alone."},
  {ask:"One eagle rapidly follows another through steep changes in direction. What is visible?",answer:"chase",why:"An aerial chase. Pursuit may be territorial or part of a pair interaction; avoid assigning intent."}
 ];
 const get=id=>document.getElementById(id);
 const ns="http://www.w3.org/2000/svg";
 function init(){
  const section=get("flight-experience"),scene=get("eagle-flight-scene"),route=get("eagle-flight-route"),routeB=get("eagle-flight-route-b"),a=get("eagle-bird-a"),b=get("eagle-bird-b");
  if(!section||!scene||!route||!routeB||!a||!b)return false;
  const tabs=[...section.querySelectorAll("[data-flight-stage]")];
  const play=get("eagle-flight-play"),restart=get("eagle-flight-replay");
  const reduced=typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index=0,playing=false,progress=0,startTime=0,frame=0;
  function place(node,path,t,tilt=0){
   if(!path||typeof path.getTotalLength!=="function")return;
   const len=path.getTotalLength();
   if(!len)return;
   const q=path.getPointAtLength(len*Math.max(0,Math.min(1,t)));
   const future=path.getPointAtLength(len*Math.min(1,t+.009));
   const heading=Math.atan2(future.y-q.y,future.x-q.x)*180/Math.PI;
   node.setAttribute("transform","translate("+q.x.toFixed(1)+" "+q.y.toFixed(1)+") rotate("+Math.max(-45,Math.min(45,heading*.35+tilt)).toFixed(1)+")");
  }
  function display(t){
   const s=STAGES[index];
   place(a,route,t,0);
   if(s.id==="cartwheel"){
    const p=route.getPointAtLength(Math.max(.001,t)*route.getTotalLength());
    const angle=(t*1080).toFixed(1);
    a.setAttribute("transform","translate("+(p.x-10).toFixed(1)+" "+p.y.toFixed(1)+") rotate("+angle+") scale(.95)");
    b.setAttribute("transform","translate("+(p.x+10).toFixed(1)+" "+p.y.toFixed(1)+") rotate("+(Number(angle)+180)+") scale(.95)");
   }else if(s.second){place(b,routeB,Math.max(0,Math.min(1,t)),2)}
   get("eagle-flight-progress").style.width=Math.round(t*100)+"%";
  }
  function stop(){
   playing=false;if(frame&&typeof cancelAnimationFrame==="function")cancelAnimationFrame(frame);frame=0;
   play.textContent=reduced?"Motion reduced — show scene":progress>=1?"Play again":"Play flight";play.setAttribute("aria-pressed","false");
  }
  function tick(now){
   if(!playing)return;
   const s=STAGES[index];
   progress=Math.min(1,(now-startTime)/(s.seconds*1000));
   display(progress);
   if(progress>=1){stop();return}
   frame=requestAnimationFrame(tick);
  }
  function start(){
   if(reduced){progress=0.48;display(progress);play.textContent="Static diagram (reduced motion)";return}
   if(playing){stop();return}
   if(progress>=1)progress=0;
   startTime=performance.now()-progress*STAGES[index].seconds*1000;
   playing=true;play.textContent="Pause flight";play.setAttribute("aria-pressed","true");
   frame=requestAnimationFrame(tick);
  }
  function choose(id){
   const next=STAGES.findIndex(s=>s.id===id);if(next<0)return;
   stop();index=next;progress=0;const s=STAGES[index];
   route.setAttribute("d",s.path);
   routeB.setAttribute("d",s.second||"");
   b.setAttribute("visibility",s.second||s.id==="cartwheel"?"visible":"hidden");
   get("eagle-flight-name").textContent=s.name;
   get("eagle-flight-label").textContent=s.category;
   get("eagle-flight-watch").textContent=s.watch;
   get("eagle-flight-meaning").textContent=s.meaning;
   get("eagle-flight-where").textContent=s.tip;
   get("eagle-flight-caution").textContent=s.caution;
   tabs.forEach(button=>{const active=button.dataset.flightStage===s.id;button.setAttribute("aria-pressed",String(active));button.classList.toggle("active",active)});
   play.textContent=reduced?"Show still diagram":"Play flight";
   scene.setAttribute("aria-label","Illustrated flight path: "+s.name+". "+s.watch+" Not footage or a documented observation.");
   display(reduced ? 0.48 : 0);
  }
  tabs.forEach(tab=>tab.addEventListener("click",()=>{choose(tab.dataset.flightStage); if(!reduced)start()}));
  play.addEventListener("click",start);
  restart.addEventListener("click",()=>{choose(STAGES[index].id);if(!reduced)start()});
  if(typeof document.addEventListener==="function")document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
  // The tab labels are direct behavior categories, NOT consecutive stages in one courtship ritual.
  choose("soar");
  const question=get("eagle-flight-quiz-question"),feedback=get("eagle-flight-quiz-feedback"),next=get("eagle-flight-quiz-next");
  const answers=[...section.querySelectorAll("[data-flight-answer]")];
  let q=0,score=0,answered=false;
  function showQuiz(){
   const item=QUIZ[q];answered=false;question.textContent=item.ask;feedback.textContent="";
   textQuiz();
  }
  function textQuiz(){
   get("eagle-flight-quiz-progress").textContent="Example "+(q+1)+" of "+QUIZ.length+" · "+score+" identified";
   next.hidden=true;answers.forEach(x=>{x.disabled=false;x.classList.remove("right","wrong");x.setAttribute("aria-pressed","false")});
  }
  answers.forEach(x=>x.addEventListener("click",()=>{
   if(answered)return;answered=true;const item=QUIZ[q],correct=x.dataset.flightAnswer===item.answer;
   if(correct)score++;
   answers.forEach(opt=>{opt.disabled=true;if(opt.dataset.flightAnswer===item.answer)opt.classList.add("right")});
   x.setAttribute("aria-pressed","true");if(!correct)x.classList.add("wrong");
   feedback.textContent=(correct?"Correct. ":"The behavior is "+STAGES.find(s=>s.id===item.answer).name+". ")+item.why;
   get("eagle-flight-quiz-progress").textContent="Example "+(q+1)+" of "+QUIZ.length+" · "+score+" identified";
   next.hidden=false;next.textContent=q===QUIZ.length-1?"Try the field quiz again":"Next example →";
   // Teach the observed behavior without making unsupported claims about motivations.
   choose(item.answer);
  }));
  next.addEventListener("click",()=>{if(q===QUIZ.length-1){q=0;score=0}else q++;showQuiz()});
  showQuiz();
  return true;
 }
 if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
 }
 return {STAGES,QUIZ,init};
});
