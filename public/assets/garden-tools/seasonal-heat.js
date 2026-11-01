/* Shared Michigan garden seasonal heat viewer. No GPS. No inferred planting permission. */
(function(){
 'use strict';
 var place=document.getElementById('pnPlace');
 var button=document.getElementById('gardenThermalCheck');
 var output=document.getElementById('gardenThermalResults');
 if(!place||!button||!output)return;
 var requestNumber=0;
 function reset(){
  requestNumber++;
  button.disabled=false;
  output.textContent='Location changed. Check accumulated warmth for this place.';
 }
 window.gardenHeatInvalidate=reset;
 place.addEventListener('input',reset);
 function requestForPlace(value){
  var label=String(value||'').trim();
  if(/^(?:48|49)[0-9]{3}$/.test(label))return 'zip='+encodeURIComponent(label);
  if(/^[0-9]{5}$/.test(label))return null;
  var slug=label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return slug?'site='+encodeURIComponent(slug):null;
 }
 button.addEventListener('click',async function(){
  var value=place.value.trim(),q=requestForPlace(value),seq=++requestNumber;
  if(!q){output.textContent='Choose a supported Michigan town or five-digit Michigan ZIP above.';return;}
  button.disabled=true;output.textContent='Reading official seasonal warmth at this reference point…';
  try{
   var r=await fetch('/api/garden-seasonal-heat?'+q,{headers:{accept:'application/json'}});
   var d=await r.json();
   if(seq!==requestNumber||place.value.trim()!==value)return;
   if(!r.ok){
    output.textContent=r.status===400?'This town is not on the shared city list. Enter its five-digit Michigan ZIP above for a matched reference point.':
     'Official seasonal heat unavailable. The garden planner will not guess the comparison.';
    return;
   }
   if(d?.schema!=='seasonal-heat-v1'||d?.provider!=='USA National Phenology Network'||d?.status!=='AVAILABLE'
       ||!Number.isFinite(d.totalGdd50F)||!Number.isFinite(d?.comparison?.anomalyGdd50F))throw Error('UNVERIFIED_SEASON');
   var delta=d.comparison.anomalyGdd50F;
   var strong=document.createElement('strong');strong.textContent=Number(d.totalGdd50F).toFixed(1)+' °F·days since January 1';
   output.textContent='';output.appendChild(strong);
   output.appendChild(document.createTextNode(' · '+(delta>0?'+':'')+Number(delta).toFixed(1)+
    ' °F·days versus the 1991–2020 reference · Source date '+d.asOfDate+'. '+
    (delta>5?'More seasonal warmth than the reference.':delta< -5?'Less seasonal warmth than the reference.':'Near the reference.')+
    ' The frost date and actual soil conditions still control planting.'));
  }catch(e){if(seq===requestNumber)output.textContent='The seasonal source cannot be verified right now. No comparison has been assumed.';}
  finally{if(seq===requestNumber)button.disabled=false;}
 });
})();
