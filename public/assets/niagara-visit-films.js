/* Opt-in documentary films. No video scripts or embeds load until a human clicks. */
(function(){
 'use strict';
 var allowed={'F1D0AUIfKJk':true,'hmQwm0drhGU':true,'l6fu2huqWNE':true};
 document.addEventListener('click',function(event){
  var el=event.target.closest&&event.target.closest('[data-niagara-clip]');
  if(!el)return;
  var id=el.getAttribute('data-niagara-clip');
  if(!allowed[id])return;
  var iframe=document.createElement('iframe');
  iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
  iframe.title=el.getAttribute('aria-label')||'Niagara Falls visitor film';
  iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; web-share');
  iframe.setAttribute('allowfullscreen','');
  iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
  iframe.setAttribute('loading','lazy');
  el.replaceWith(iframe);
  try{if(typeof window.gtag==='function')window.gtag('event','niagara_experience_video_play',{video_id:id});}catch(_){}
 });
})();
