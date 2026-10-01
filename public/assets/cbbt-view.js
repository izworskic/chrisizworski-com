(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;}else{root.CBBTView=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function clean(value){return value==null?'':String(value).trim();}
  function restrictionLabel(level){return ({NONE:'No official wind restriction',ADVISORY:'Advisory',LEVEL_1:'Level 1',LEVEL_2:'Level 2',LEVEL_3:'Level 3',OTHER:'Other official restriction',UNKNOWN:'Not confirmed'})[level]||clean(level)||'Not confirmed';}
  function statusView(status){
    var state=status&&status.state||'UNKNOWN';var level=status&&status.restrictionLevel||'UNKNOWN';var official=clean(status&&status.officialText);
    if(state==='OPEN')return{tone:'open',word:'OPEN',headline:'CBBT reports the crossing open.',copy:'No official CBBT wind restriction is currently identified.',restriction:restrictionLabel(level),official:official||'Official CBBT status available.'};
    if(state==='OPEN_WITH_RESTRICTIONS')return{tone:'caution',word:'OPEN',headline:'CBBT reports the crossing open with restrictions.',copy:'Check your vehicle below. The official restriction may prohibit some configurations.',restriction:restrictionLabel(level),official:official||'An official CBBT restriction is active.'};
    if(state==='CLOSED')return{tone:'closed',word:'CLOSED',headline:'CBBT reports the crossing closed.',copy:'Do not rely on weather observations to infer that the facility has reopened.',restriction:restrictionLabel(level),official:official||'Official CBBT closure reported.'};
    if(state==='OFFICIAL_STATUS_CONFLICT')return{tone:'unknown',word:'VERIFY',headline:'CBBT status is being updated.',copy:'Official CBBT sources currently disagree. Verify current conditions with CBBT before relying on the crossing.',restriction:'Official sources disagree',official:official||'Conflicting official CBBT states are being reported.'};
    return{tone:'unknown',word:'UNKNOWN',headline:'Current CBBT status unavailable.',copy:'We cannot confirm the current operational state from official CBBT information. Weather may still be shown separately.',restriction:'Not confirmed',official:'Official CBBT status could not be confirmed.'};
  }
  function reasonText(reason){var map={HEIGHT_EXCEEDS_13_FT_6_IN_CLEARANCE:'This configuration exceeds the CBBT facility clearance limit.',PROPANE_VALVE_MUST_BE_CLOSED:'CBBT requires the propane valve to be closed for this configuration.',PROPANE_VALVE_STATUS_REQUIRED:'Tell us whether the propane valve is closed to finish the check.',CYCLISTS_MAY_NOT_PEDAL_ACROSS_SHUTTLE_REQUIRED:'Bicycles require the CBBT shuttle service rather than riding across.',MANUAL_REVIEW_REQUIRED_FOR_SPECIAL_VEHICLE:'This special vehicle needs manual confirmation from CBBT.',OFFICIAL_STATUS_UNRESOLVED:'The current official CBBT status is not resolved, so this vehicle cannot be evaluated reliably.',CBBT_CLOSED_TO_ALL_TRAFFIC:'CBBT currently reports the facility closed to all traffic.',LEVEL_2_ALLOWED_VEHICLE_LIST_EXCLUDES_CONFIGURATION:'The current official Level 2 restriction excludes this vehicle configuration.',LEVEL_2_REQUIRES_NO_EXTERIOR_CARGO_OR_TOWING:'The current official Level 2 restriction excludes this exterior-cargo or towing configuration.',LEVEL_2_EXCLUDES_HIGH_PROFILE_OR_CONVERSION_VANS:'The current official Level 2 restriction excludes this high-profile van configuration.',LEVEL_2_VAN_PROFILE_REQUIRED:'Tell us whether this van is high-profile to finish the check.',LEVEL_2_ALLOWED_VEHICLE_CONFIGURATION:'This configuration is included in the vehicle types CBBT currently allows at Level 2.',LEVEL_1_PROHIBITED_VEHICLE_CLASS:'The current official Level 1 restriction prohibits this vehicle class.',LEVEL_1_EXTERIOR_CARGO_RESTRICTED:'The current official Level 1 restriction prohibits this exterior-cargo configuration.',LEVEL_1_SIX_WHEEL_TRUCK_RESTRICTED:'The current official Level 1 restriction prohibits this six-wheel truck configuration.',LEVEL_1_TOWED_CONFIGURATION_RESTRICTED:'The current official Level 1 restriction prohibits this towed configuration.',LEVEL_1_TRACTOR_TRAILER_PAYLOAD_REQUIRED:'Payload is required to determine whether this commercial configuration may cross at Level 1.',LEVEL_1_TRACTOR_TRAILER_PAYLOAD_UNDER_15000_LB:'The current official Level 1 restriction prohibits this low-payload commercial configuration.',LEVEL_1_RULES_ALLOW_CONFIGURATION:'This configuration is allowed under the current official Level 1 rules.',ADVISORY_DOES_NOT_PROHIBIT_THIS_CONFIGURATION:'The current CBBT advisory does not prohibit this selected configuration.',NO_OFFICIAL_WIND_RESTRICTION_IDENTIFIED:'No official CBBT wind restriction currently prohibits this selected configuration.',UNSUPPORTED_OFFICIAL_RESTRICTION_STATE:'The current restriction cannot be evaluated automatically.'};return map[reason]||'CBBT could not produce a deterministic result for this configuration.';}
  function vehicleView(result,label){label=label||'Selected vehicle';if(!result||result.state==='NOT_EVALUATED')return{tone:'unknown',icon:'?',title:'Vehicle not evaluated',copy:'Choose a vehicle to check the current CBBT restriction.'};if(result.decision==='ALLOWED')return{tone:'allowed',icon:'✓',title:label+' is allowed under the current CBBT restriction.',copy:reasonText(result.reason)};if(result.decision==='RESTRICTED')return{tone:'restricted',icon:'×',title:label+' cannot cross under the current CBBT restriction.',copy:reasonText(result.reason)};return{tone:'unknown',icon:'?',title:'We cannot determine this configuration automatically.',copy:reasonText(result.reason)};}
  function freshnessText(freshness,prefix){prefix=prefix||'Updated';if(!freshness||freshness.state==='unavailable'||freshness.ageMinutes==null)return prefix+' time unavailable';var age=Math.max(0,Number(freshness.ageMinutes)||0);if(freshness.state==='stale')return 'Delayed · last available '+age+' min ago';if(freshness.state==='aging')return 'Last updated '+age+' min ago';return age<=0?prefix+' just now':prefix+' '+age+' min ago';}
  function tollView(result){if(!result||result.state==='NOT_EVALUATED')return{tone:'unknown',label:'Not estimated',amount:null,copy:'Add trip details to estimate the toll.'};if(result.state==='ESTIMATED')return{tone:'ok',label:'Estimated CBBT toll',amount:Number(result.amount),copy:'Calculated by the backend using official CBBT class logic and the assumptions shown below.'};if(result.state==='ESTIMATE_REQUIRES_APPROVAL')return{tone:'caution',label:'Estimate requires CBBT approval',amount:Number(result.amount),copy:'This configuration requires prior approval; the returned amount may not be the complete trip cost.'};var reasons={TOLL_CLASS_UNRESOLVED:'The CBBT toll class could not be resolved from these details. Add vehicle class information or check the official toll schedule.',INVALID_TRAVEL_TIME:'The travel time could not be interpreted.',CLASS_75_REQUIRES_EZPASS_AND_29_PRIOR_TRIPS_IN_720_HOURS:'This discount class requires additional E-ZPass trip history.'};return{tone:'unknown',label:'Toll not resolved',amount:null,copy:reasons[result.reason]||'The backend could not determine a toll from these inputs.'};}
  return{statusView:statusView,vehicleView:vehicleView,freshnessText:freshnessText,tollView:tollView,restrictionLabel:restrictionLabel,reasonText:reasonText};
});

(function(){
  'use strict';
  if(typeof document==='undefined')return;

  var RADAR_SOURCES=[
    'https://radar.weather.gov/ridge/standard/KAKQ_loop.gif',
    'https://radar.weather.gov/ridge/standard/KAKQ_0.gif',
    '/api/cbbt-media?asset=radar'
  ];
  var CAMERA_API='/api/cbbt-cameras';
  var CAMERA_REFRESH_MS=30000;
  var CAMERA_DATA_REFRESH_MS=300000;
  var radarIndex=0;

  function byId(id){return document.getElementById(id);}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function cacheBust(url,intervalMs){var stamp=Math.floor(Date.now()/(intervalMs||60000));return url+(url.indexOf('?')===-1?'?':'&')+'cb='+stamp;}

  function initRadar(){
    var image=byId('radarImage');
    var fallback=byId('radarFallback');
    if(!image)return;
    function load(index){
      radarIndex=index;
      var source=RADAR_SOURCES[index];
      if(!source){image.hidden=true;if(fallback)fallback.hidden=false;return;}
      image.src=cacheBust(source,120000);
    }
    image.onload=function(){image.hidden=false;if(fallback)fallback.hidden=true;image.dataset.mediaSource=RADAR_SOURCES[radarIndex];};
    image.onerror=function(){
      var next=radarIndex+1;
      if(next<RADAR_SOURCES.length){load(next);return;}
      image.hidden=true;if(fallback)fallback.hidden=false;
    };
    load(0);
    window.setInterval(function(){load(0);},300000);
  }

  function injectCameraStyles(){
    if(byId('cbbtLiveMediaStyles'))return;
    var style=document.createElement('style');
    style.id='cbbtLiveMediaStyles';
    style.textContent='.cbbt-camera-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.cbbt-camera-card{border:1px solid rgba(13,59,79,.16);border-radius:14px;overflow:hidden;background:#fff}.cbbt-camera-frame{position:relative;aspect-ratio:16/9;background:#dce8ec;overflow:hidden}.cbbt-camera-frame img{display:block;width:100%;height:100%;object-fit:cover}.cbbt-camera-live{position:absolute;left:9px;top:9px;padding:4px 7px;border-radius:999px;background:rgba(5,27,36,.86);color:#fff;font-size:.72rem;font-weight:800;letter-spacing:.04em}.cbbt-camera-copy{padding:11px 12px 12px;display:grid;gap:4px}.cbbt-camera-copy strong{font-size:.98rem;line-height:1.25}.cbbt-camera-copy span{font-size:.82rem;color:#52646d}.cbbt-camera-copy a{font-size:.82rem;font-weight:700}.cbbt-camera-source{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;margin-top:12px}.cbbt-camera-source p{margin:0;max-width:68ch}.cbbt-camera-loading{padding:16px;border:1px dashed rgba(13,59,79,.24);border-radius:12px;color:#52646d}.cbbt-camera-error{padding:16px;border-radius:12px;background:#f4f7f8;color:#33454d}@media(max-width:700px){.cbbt-camera-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function cameraSection(){
    var existing=byId('cbbtCameraSection');
    if(existing)return existing;
    var radarHeading=byId('radarHeading');
    var radarCard=radarHeading&&radarHeading.closest('.section-card');
    if(!radarCard)return null;
    var section=document.createElement('section');
    section.className='section-card';
    section.id='cbbtCameraSection';
    section.setAttribute('aria-labelledby','cbbtCameraHeading');
    section.innerHTML='<div class="section-heading"><div><p class="eyebrow">Visual traffic check</p><h2 id="cbbtCameraHeading">Live CBBT approach cameras</h2></div><span class="context-chip">VDOT 511</span></div><div id="cbbtCameraGrid" class="cbbt-camera-grid" aria-live="polite"><p class="cbbt-camera-loading">Loading nearby VDOT traffic cameras…</p></div><div class="cbbt-camera-source"><p>Camera imagery is traffic context only. CBBT remains the authority for whether the bridge-tunnel is open, restricted or closed.</p><a href="https://511.vdot.virginia.gov/" target="_blank" rel="noopener">Open Virginia 511 ↗</a></div>';
    radarCard.insertAdjacentElement('afterend',section);
    return section;
  }

  function cameraCard(camera){
    var route=[camera.route,camera.direction].filter(Boolean).join(' · ');
    var detail=[camera.area,route,camera.distanceMiles!=null?camera.distanceMiles+' mi from corridor anchor':null].filter(Boolean).join(' · ');
    return '<article class="cbbt-camera-card"><div class="cbbt-camera-frame"><img loading="lazy" decoding="async" data-camera-src="'+escapeHtml(camera.imageUrl)+'" src="'+escapeHtml(cacheBust(camera.imageUrl,CAMERA_REFRESH_MS))+'" alt="Current VDOT traffic camera image: '+escapeHtml(camera.name)+'"><span class="cbbt-camera-live">LIVE IMAGE · 30 SEC</span></div><div class="cbbt-camera-copy"><strong>'+escapeHtml(camera.name)+'</strong><span>'+escapeHtml(detail)+'</span>'+(camera.streamUrl?'<a href="'+escapeHtml(camera.streamUrl)+'" target="_blank" rel="noopener">Open VDOT live stream ↗</a>':'')+'</div></article>';
  }

  function refreshCameraImages(){
    document.querySelectorAll('#cbbtCameraGrid img[data-camera-src]').forEach(function(image){
      var base=image.getAttribute('data-camera-src');
      if(base)image.src=cacheBust(base,CAMERA_REFRESH_MS);
    });
  }

  async function loadCameras(){
    var section=cameraSection();
    var grid=byId('cbbtCameraGrid');
    if(!section||!grid)return;
    try{
      var response=await fetch(CAMERA_API,{headers:{accept:'application/json'},cache:'no-store'});
      if(!response.ok)throw new Error('camera API '+response.status);
      var payload=await response.json();
      var cameras=payload&&Array.isArray(payload.cameras)?payload.cameras:[];
      if(!cameras.length)throw new Error('no nearby cameras');
      grid.innerHTML=cameras.map(cameraCard).join('');
      var staticGrid=document.querySelector('.experience-grid');
      if(staticGrid){staticGrid.hidden=true;staticGrid.setAttribute('aria-hidden','true');}
      refreshCameraImages();
    }catch(error){
      grid.innerHTML='<div class="cbbt-camera-error"><strong>Live camera images are temporarily unavailable.</strong><br><span>Use Virginia 511 for the current camera map. The official CBBT status above is independent of this camera layer.</span></div>';
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    injectCameraStyles();
    initRadar();
    cameraSection();
    loadCameras();
    window.setInterval(refreshCameraImages,CAMERA_REFRESH_MS);
    window.setInterval(loadCameras,CAMERA_DATA_REFRESH_MS);
  });
})();
