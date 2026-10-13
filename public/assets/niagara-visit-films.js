/* One intentional documentary film player; no images/embeds until selected. */
(function(){
 'use strict';
 var films=Object.freeze({
  F1D0AUIfKJk:{name:'Boat · Into the mist',credit:'Explore Niagara · visitor footage'},
  hmQwm0drhGU:{name:'Cave of the Winds',credit:'Independent visitor footage'},
  l6fu2huqWNE:{name:'Journey Behind the Falls',credit:'Niagara Parks · official footage'}
 });
 document.addEventListener('click',function(event){
  var el=event.target.closest&&event.target.closest('[data-niagara-clip]');
  if(!el)return;
  var id=el.getAttribute('data-niagara-clip'),film=films[id],stage=document.getElementById('niagara-film-stage');
  if(!film||!stage)return;
  document.querySelectorAll('[data-niagara-clip]').forEach(function(button){
   var selected=button===el;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));
  });
  var iframe=document.createElement('iframe');
  iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
  iframe.title=film.name+' · '+film.credit;
  iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
  iframe.setAttribute('allowfullscreen','');
  iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
  stage.replaceChildren(iframe);
  try{if(typeof window.gtag==='function')window.gtag('event','niagara_experience_video_play',{video_id:id});}catch(_){}
 });
})();
