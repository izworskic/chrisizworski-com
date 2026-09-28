(function(){
'use strict';
function load(src,id,onload){
  if(document.getElementById(id)){if(onload)onload();return;}
  const script=document.createElement('script');
  script.id=id;
  script.src=src;
  script.defer=true;
  if(onload)script.addEventListener('load',onload,{once:true});
  document.body.appendChild(script);
}
load('/assets/pictured-rocks-visual-layer-core.js?v=20260928-1','picturedRocksVisualCore',()=>{
  load('/assets/pictured-rocks-fall-ranger.js?v=20260928-1','picturedRocksFallRanger');
});
})();