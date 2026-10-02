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

  var RADAR_IMAGE='/api/cbbt-media?asset=radar';
  var RADAR_DIRECT='https://radar.weather.gov/ridge/standard/KAKQ_loop.gif';
  var RADAR_LINK='https://radar.weather.gov/station/KAKQ/standard';
  var CAMERA_REFRESH_MS=30000;
  var RADAR_REFRESH_MS=120000;
  var CAMERAS=[
    {id:'greenwell',label:'Greenwell Rd',detail:'US-60 / Shore Dr and Greenwell Rd · near the CBBT South Toll Plaza',image:'/api/cbbt-media?asset=camera&slot=south',direct:'https://snapshot.vdotcameras.com/thumbs/vabeachcam014.flv.png'},
    {id:'stratford',label:'E Stratford Rd',detail:'US-60 / E Stratford Rd · near the CBBT south approach',image:'/api/cbbt-media?asset=camera&slot=north',direct:'https://snapshot.vdotcameras.com/thumbs/vabeachcam013.flv.png'}
  ];
  var selectedCamera='greenwell';
  var cameraFallbackAttempt=false;

  function byId(id){return document.getElementById(id);}
  function bust(url,windowMs){return url+(url.indexOf('?')===-1?'?':'&')+'t='+Math.floor(Date.now()/(windowMs||30000));}
  function selected(){return CAMERAS.find(function(camera){return camera.id===selectedCamera;})||CAMERAS[0];}
  function timeLabel(){try{return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date());}catch(_error){return 'just now';}}

  function injectStyles(){
    if(byId('cbbtMackinacMediaStyles'))return;
    var style=document.createElement('style');
    style.id='cbbtMackinacMediaStyles';
    style.textContent=[
      '.cbbt-camera-section{overflow:hidden}',
      '.cbbt-camera-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}',
      '.cbbt-camera-tab{border:1px solid #cbd7db;background:#f5f8f8;color:#24424f;border-radius:999px;padding:9px 13px;min-height:42px;font:inherit;font-weight:750;cursor:pointer}',
      '.cbbt-camera-tab[aria-pressed=true]{background:#0d3b4f;color:#fff;border-color:#0d3b4f}',
      '.cbbt-camera-frame{position:relative;aspect-ratio:16/9;border:1px solid #d9e1e4;border-radius:14px;overflow:hidden;background:#dfe8eb;display:grid;place-items:center}',
      '.cbbt-camera-frame img{display:block;width:100%;height:100%;object-fit:cover}',
      '.cbbt-camera-loading{position:absolute;inset:0;z-index:2;display:grid;place-items:center;padding:24px;text-align:center;color:#52646d;background:#e8eff1}',
      '.cbbt-camera-loading[hidden]{display:none}',
      '.cbbt-camera-overlay{position:absolute;z-index:3;left:0;right:0;bottom:0;display:flex;justify-content:space-between;gap:12px;padding:9px 11px;background:linear-gradient(transparent,rgba(5,22,30,.78));color:#fff;font-size:.76rem;pointer-events:none}',
      '.cbbt-camera-live-dot{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:#75d6a7;vertical-align:1px}',
      '.cbbt-camera-meta{display:grid;gap:3px;margin-top:10px}',
      '.cbbt-camera-meta span,.cbbt-camera-note{font-size:.82rem;color:#52646d}',
      '.cbbt-camera-actions{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-top:10px}',
      '.cbbt-camera-actions p{margin:0;max-width:70ch}',
      '.cbbt-camera-actions a{font-size:.8rem;font-weight:750;white-space:nowrap}',
      '@media(max-width:700px){.cbbt-camera-frame{aspect-ratio:4/3}.cbbt-camera-actions{display:grid}.cbbt-camera-actions a{white-space:normal}}'
    ].join('');
    document.head.appendChild(style);
  }

  function initCameraSection(){
    if(byId('cbbtCameraSection'))return;
    var radarCard=document.querySelector('.radar-card');
    if(!radarCard||!radarCard.parentNode)return;
    var section=document.createElement('section');
    section.className='section-card cbbt-camera-section';
    section.id='cbbtCameraSection';
    section.setAttribute('aria-labelledby','cbbtCameraHeading');
    section.innerHTML=''
      +'<div class="section-heading"><div><p class="eyebrow">Current visual check</p><h2 id="cbbtCameraHeading">CBBT approach cameras</h2></div><span class="context-chip">Virginia 511</span></div>'
      +'<p class="cbbt-camera-note">Two nearby Virginia 511 still cameras on the south approach. They are visual context only and do not determine CBBT operating status.</p>'
      +'<div class="cbbt-camera-tabs" role="group" aria-label="Choose a CBBT approach camera">'
      +'<button class="cbbt-camera-tab" type="button" data-camera="greenwell" aria-pressed="true">Greenwell Rd</button>'
      +'<button class="cbbt-camera-tab" type="button" data-camera="stratford" aria-pressed="false">E Stratford Rd</button>'
      +'</div>'
      +'<div class="cbbt-camera-frame">'
      +'<div class="cbbt-camera-loading" id="cbbtCameraLoading">Loading the latest Virginia 511 image…</div>'
      +'<img id="cbbtCameraImage" alt="Current Virginia 511 camera near the CBBT south approach" width="1280" height="720" decoding="async" referrerpolicy="no-referrer">'
      +'<div class="cbbt-camera-overlay"><span><i class="cbbt-camera-live-dot" aria-hidden="true"></i>Latest still image</span><span id="cbbtCameraRefreshed">Refreshing…</span></div>'
      +'</div>'
      +'<div class="cbbt-camera-meta"><strong id="cbbtCameraName">Greenwell Rd</strong><span id="cbbtCameraDetail">US-60 / Shore Dr and Greenwell Rd · near the CBBT South Toll Plaza</span></div>'
      +'<div class="cbbt-camera-actions"><p class="cbbt-camera-note"><strong>Not bridge-span cameras.</strong> CBBT does not publish a public camera feed from the bridge-tunnel span. Use the official CBBT status above for the crossing decision.</p><a href="https://511.vdot.virginia.gov/" target="_blank" rel="noopener">Open Virginia 511 ↗</a></div>';
    radarCard.insertAdjacentElement('beforebegin',section);

    section.querySelectorAll('.cbbt-camera-tab').forEach(function(button){
      button.addEventListener('click',function(){selectedCamera=button.dataset.camera;refreshCamera();});
    });
    var image=byId('cbbtCameraImage');
    image.addEventListener('load',function(){
      var loading=byId('cbbtCameraLoading');
      if(loading)loading.hidden=true;
      image.hidden=false;
      var refreshed=byId('cbbtCameraRefreshed');
      if(refreshed)refreshed.textContent='Updated '+timeLabel();
    });
    image.addEventListener('error',function(){
      var camera=selected();
      if(!cameraFallbackAttempt){
        cameraFallbackAttempt=true;
        image.hidden=false;
        image.src=bust(camera.direct,CAMERA_REFRESH_MS);
        return;
      }
      var loading=byId('cbbtCameraLoading');
      if(loading){loading.hidden=false;loading.innerHTML='<span><strong>Camera image unavailable.</strong><br>Try the other view or open Virginia 511.</span>';}
      image.hidden=true;
      var refreshed=byId('cbbtCameraRefreshed');
      if(refreshed)refreshed.textContent='Unavailable';
    });
    refreshCamera();
  }

  function refreshCamera(){
    var camera=selected();
    var image=byId('cbbtCameraImage');
    if(!image)return;
    cameraFallbackAttempt=false;
    var loading=byId('cbbtCameraLoading');
    if(loading){loading.hidden=false;loading.textContent='Loading the latest Virginia 511 image…';}
    image.hidden=false;
    image.alt='Current Virginia 511 traffic camera at '+camera.label+' near the CBBT south approach';
    image.src=bust(camera.image,CAMERA_REFRESH_MS);
    var name=byId('cbbtCameraName');if(name)name.textContent=camera.label;
    var detail=byId('cbbtCameraDetail');if(detail)detail.textContent=camera.detail;
    document.querySelectorAll('#cbbtCameraSection .cbbt-camera-tab').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.camera===camera.id));});
  }

  function refreshRadar(useDirect){
    var image=byId('radarImage');
    if(!image)return;
    var fallback=byId('radarFallback');
    image.hidden=false;
    if(fallback)fallback.hidden=true;
    image.src=bust(useDirect?RADAR_DIRECT:RADAR_IMAGE,RADAR_REFRESH_MS);
    image.onerror=function(){
      if(!useDirect){refreshRadar(true);return;}
      image.hidden=true;
      if(fallback)fallback.hidden=false;
    };
    image.onload=function(){image.hidden=false;if(fallback)fallback.hidden=true;};
    var link=byId('radarLink');
    if(link){link.href=RADAR_LINK;link.textContent='Open interactive NWS radar ↗';}
  }

  document.addEventListener('DOMContentLoaded',function(){
    injectStyles();
    initCameraSection();
    refreshRadar(false);
    setInterval(refreshCamera,CAMERA_REFRESH_MS);
    setInterval(function(){refreshRadar(false);},RADAR_REFRESH_MS);
  });
})();
