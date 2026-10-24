/* Operator-owned YouTube players. No video requests before a visitor acts. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SeawayCameras=factory();})(typeof window==='object'?window:this,function(){
  'use strict';
  function embedURL(id){
    if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))throw new Error('Invalid camera video');
    return 'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&mute=1&rel=0';
  }
  function mount({root,feeds,document,onSelect=()=>{},onLocate=()=>{},onPlayback=()=>{}}){
    if(!root||!feeds?.length)return null;
    const byId=new Map(feeds.map(feed=>{embedURL(feed.youtubeId);return [feed.id,feed];}));
    const get=id=>root.querySelector('#'+id),player=get('seawayCameraPlayer'),load=get('loadSeawayCamera');
    let active=feeds[0],frame=null;
    function placeholder(){
      const box=document.createElement('div');box.className='seaway-camera-placeholder';
      const name=document.createElement('strong');name.textContent=active.name;
      const note=document.createElement('span');note.textContent='A window onto the upper river. Load the operator’s player when you’re ready.';
      box.append(name,note);player.replaceChildren(box);
    }
    function stop(message='Video unloaded. Choose a view or load this camera again.'){
      frame=null;placeholder();load.textContent='Load this camera';load.setAttribute('aria-pressed','false');
      get('seawayCameraStatus').textContent=message;
    }
    function start(){
      const next=document.createElement('iframe');
      next.src=embedURL(active.youtubeId);next.title=active.name+' — operator video player';next.loading='lazy';
      next.allow='autoplay; encrypted-media; picture-in-picture; web-share';next.allowFullscreen=true;
      next.referrerPolicy='strict-origin-when-cross-origin';frame=next;player.replaceChildren(next);
      load.textContent='Stop camera';load.setAttribute('aria-pressed','true');
      get('seawayCameraStatus').textContent='Operator player requested. Check its live indicator or playback notice; video can be delayed, offline or restricted.';
      onPlayback(active);
      // An iframe load is not proof that a live stream is playing. Source links
      // remain visible even if YouTube displays an unavailable/restricted notice.
    }
    function select(id,{load:shouldLoad=false,notify=true}={}){
      const feed=byId.get(id);if(!feed)return false;
      const changed=feed.id!==active.id;active=feed;
      get('seawayCameraTitle').textContent=feed.name;
      get('seawayCameraContext').textContent=feed.note+' Operator: '+feed.operator+'.';
      get('seawayCameraDirect').href=feed.directUrl;get('seawayCameraSource').href=feed.source;
      for(const button of root.querySelectorAll('[data-seaway-camera]'))button.setAttribute('aria-pressed',String(button.dataset.seawayCamera===id));
      if(shouldLoad)start();else if(changed||!frame)stop('Video stays unloaded until you choose a camera or press Load this camera.');
      if(notify)onSelect(feed);return true;
    }
    for(const button of root.querySelectorAll('[data-seaway-camera]'))button.addEventListener('click',()=>select(button.dataset.seawayCamera,{load:true}));
    load.addEventListener('click',()=>{if(frame)stop();else start();});
    get('locateSeawayCamera').addEventListener('click',()=>onLocate(active));
    select(active.id,{notify:false});
    return {select,stop,selected:()=>active,isLoaded:()=>Boolean(frame)};
  }
  return {embedURL,mount};
});
