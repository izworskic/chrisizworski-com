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
  var RADAR_LINK='https://radar.weather.gov/station/KAKQ/standard';
  var CAMERA_REFRESH_MS=30000;
  var CAMERAS=[
    {id:'south',label:'Greenwell Rd',detail:'US-60 / Shore Dr and Greenwell Rd · near the CBBT South Toll Plaza',image:'/api/cbbt-media?asset=camera&slot=south'},
    {id:'north',label:'E Stratford Rd',detail:'US-60 / E Stratford Rd · near the CBBT south approach',image:'/api/cbbt-media?asset=camera&slot=north'}
  ];
  var selectedCamera='south';
  var refreshTimer=null;
  var opener=null;

  function byId(id){return document.getElementById(id);}
  function bust(url){return url+(url.indexOf('?')===-1?'?':'&')+'t='+Math.floor(Date.now()/30000);}
  function selected(){return CAMERAS.find(function(camera){return camera.id===selectedCamera;})||CAMERAS[0];}

  function injectStyles(){
    if(byId('cbbtMackinacMediaStyles'))return;
    var style=document.createElement('style');
    style.id='cbbtMackinacMediaStyles';
    style.textContent=[
      '.experience-grid{display:none!important}',
      '.cbbt-live-visuals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
      '.cbbt-live-card{display:grid;gap:8px;padding:16px;border:1px solid rgba(13,59,79,.16);border-radius:14px;background:#f8fbfb;text-decoration:none;color:inherit;text-align:left;font:inherit;cursor:pointer}',
      '.cbbt-live-card strong{font-size:1rem;color:#10232c}',
      '.cbbt-live-card span{font-size:.82rem;color:#52646d}',
      '.cbbt-live-label{display:inline-flex;width:max-content;border-radius:999px;padding:4px 7px;background:#e2eef2!important;color:#0d3b4f!important;font-size:.68rem!important;font-weight:850;letter-spacing:.05em}',
      '.camera-drawer[hidden]{display:none!important}',
      '.camera-drawer{position:fixed;inset:0;z-index:1000;background:rgba(5,22,30,.62);display:flex;align-items:flex-end;justify-content:center;padding:18px}',
      '.camera-dialog{width:min(920px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px 20px 14px 14px;box-shadow:0 24px 80px rgba(0,0,0,.28);padding:16px}',
      '.camera-dialog-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}',
      '.camera-dialog-head h2{margin:2px 0 0}',
      '.camera-close{border:1px solid #cfd9dd;background:#fff;border-radius:999px;min-width:44px;min-height:44px;font-weight:800;cursor:pointer}',
      '.camera-tabs{display:flex;gap:8px;overflow-x:auto;padding:12px 0 10px}',
      '.camera-tab{border:1px solid #cbd7db;background:#f5f8f8;color:#24424f;border-radius:999px;padding:8px 12px;min-height:42px;font-weight:750;cursor:pointer}',
      '.camera-tab[aria-selected=true]{background:#0d3b4f;color:#fff;border-color:#0d3b4f}',
      '.camera-frame{position:relative;aspect-ratio:16/9;border:1px solid #d9e1e4;border-radius:14px;overflow:hidden;background:#dfe8eb;display:grid;place-items:center}',
      '.camera-frame img{display:block;width:100%;height:100%;object-fit:cover}',
      '.camera-loading{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#52646d;background:#e8eff1}',
      '.camera-loading[hidden]{display:none}',
      '.camera-meta{display:grid;gap:3px;padding:10px 2px 0}',
      '.camera-meta span{font-size:.8rem;color:#52646d}',
      '.camera-actions{display:flex;justify-content:space-between;gap:14px;margin-top:10px;align-items:flex-start}',
      '.camera-actions p{margin:0;max-width:68ch;font-size:.78rem;color:#52646d}',
      '.camera-actions a{font-size:.78rem;font-weight:750;white-space:nowrap}',
      '@media(max-width:700px){.cbbt-live-visuals{grid-template-columns:1fr}.camera-drawer{padding:0}.camera-dialog{border-radius:20px 20px 0 0}.camera-frame{aspect-ratio:4/3}.camera-actions{display:grid}}'
    ].join('');
    document.head.appendChild(style);
  }

  function refreshRadar(){
    var image=byId('radarImage');
    if(!image)return;
    image.hidden=false;
    image.src=bust(RADAR_IMAGE);
    var fallback=byId('radarFallback');
    if(fallback)fallback.hidden=true;
    image.addEventListener('load',function(){image.hidden=false;if(fallback)fallback.hidden=true;},{once:false});
    image.addEventListener('error',function(){image.hidden=true;if(fallback)fallback.hidden=false;},{once:false});
    var link=byId('radarLink');
    if(link){link.href=RADAR_LINK;link.textContent='Open full NWS radar ↗';}
  }

  function ensureCameraDrawer(){
    if(byId('cbbtCameraDrawer'))return;
    var drawer=document.createElement('div');
    drawer.id='cbbtCameraDrawer';
    drawer.className='camera-drawer';
    drawer.hidden=true;
    drawer.innerHTML='<section class="camera-dialog" role="dialog" aria-modal="true" aria-labelledby="cbbtCameraHeading"><div class="camera-dialog-head"><div><p class="eyebrow">Virginia 511 · live still images</p><h2 id="cbbtCameraHeading">CBBT south-approach cameras</h2></div><button id="cbbtCameraClose" class="camera-close" type="button">Close</button></div><div class="camera-tabs" role="tablist" aria-label="Choose camera"><button class="camera-tab" data-camera="south" role="tab" aria-selected="true">Greenwell Rd</button><button class="camera-tab" data-camera="north" role="tab" aria-selected="false">E Stratford Rd</button></div><div class="camera-frame"><div class="camera-loading" id="cbbtCameraLoading">Loading Virginia 511 camera…</div><img id="cbbtCameraImage" alt="" width="1280" height="720"></div><div class="camera-meta"><strong id="cbbtCameraName">Greenwell Rd</strong><span id="cbbtCameraDetail">US-60 / Shore Dr and Greenwell Rd · near the CBBT South Toll Plaza</span></div><div class="camera-actions"><p><strong>Visual context only.</strong> These are nearby Virginia 511 approach cameras, not cameras on the bridge-tunnel span. Images do not determine whether CBBT is open, restricted or closed.</p><a href="https://511.vdot.virginia.gov/" target="_blank" rel="noopener">Open Virginia 511 ↗</a></div></section>';
    document.body.appendChild(drawer);
    byId('cbbtCameraClose').addEventListener('click',closeDrawer);
    drawer.addEventListener('click',function(event){if(event.target===drawer)closeDrawer();});
    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!drawer.hidden)closeDrawer();});
    drawer.querySelectorAll('.camera-tab').forEach(function(button){button.addEventListener('click',function(){selectedCamera=button.dataset.camera;refreshCamera();});});
    var image=byId('cbbtCameraImage');
    image.addEventListener('load',function(){var loading=byId('cbbtCameraLoading');if(loading)loading.hidden=true;image.hidden=false;});
    image.addEventListener('error',function(){var loading=byId('cbbtCameraLoading');if(loading){loading.hidden=false;loading.textContent='This Virginia 511 camera is temporarily unavailable. Try the other nearby camera.';}image.hidden=true;});
  }

  function refreshCamera(){
    var camera=selected();
    var image=byId('cbbtCameraImage');
    if(!image)return;
    var loading=byId('cbbtCameraLoading');
    if(loading){loading.hidden=false;loading.textContent='Loading Virginia 511 camera…';}
    image.hidden=false;
    image.alt='Current Virginia 511 traffic camera at '+camera.label+' near the CBBT south approach';
    image.src=bust(camera.image);
    var name=byId('cbbtCameraName');if(name)name.textContent=camera.label;
    var detail=byId('cbbtCameraDetail');if(detail)detail.textContent=camera.detail+' · refreshed automatically';
    document.querySelectorAll('#cbbtCameraDrawer .camera-tab').forEach(function(button){button.setAttribute('aria-selected',String(button.dataset.camera===camera.id));});
  }

  function openDrawer(event){
    ensureCameraDrawer();
    opener=(event&&event.currentTarget)||document.activeElement;
    var drawer=byId('cbbtCameraDrawer');
    drawer.hidden=false;
    document.body.style.overflow='hidden';
    refreshCamera();
    if(refreshTimer)clearInterval(refreshTimer);
    refreshTimer=setInterval(function(){if(!drawer.hidden)refreshCamera();},CAMERA_REFRESH_MS);
    byId('cbbtCameraClose').focus();
  }

  function closeDrawer(){
    var drawer=byId('cbbtCameraDrawer');if(!drawer)return;
    drawer.hidden=true;document.body.style.overflow='';
    if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null;}
    if(opener&&typeof opener.focus==='function')opener.focus();
  }

  function initVisualSection(){
    if(byId('cbbtLiveVisuals'))return;
    var radarHeading=byId('radarHeading');
    var radarCard=radarHeading&&radarHeading.closest('.section-card');
    if(!radarCard)return;
    var section=document.createElement('section');
    section.className='section-card';
    section.id='cbbtLiveVisuals';
    section.innerHTML='<div class="section-heading"><div><p class="eyebrow">Live visual checks</p><h2>CBBT cameras and weather</h2></div><span class="context-chip">Live sources</span></div><div class="cbbt-live-visuals"><button id="cbbtCameraLaunch" class="cbbt-live-card" type="button"><span class="cbbt-live-label">VIRGINIA 511 CAMERAS</span><strong>View nearby CBBT approach cameras</strong><span>Open two nearby Virginia 511 views around the CBBT South Toll Plaza.</span></button><a class="cbbt-live-card" href="https://tidesandcurrents.noaa.gov/stationhome.html?id=8638901" target="_blank" rel="noopener"><span class="cbbt-live-label">NOAA AT CBBT</span><strong>Bridge weather observation</strong><span>Wind, gust, direction and air temperature from the CBBT Chesapeake Channel station.</span></a></div>';
    radarCard.insertAdjacentElement('afterend',section);
    byId('cbbtCameraLaunch').addEventListener('click',openDrawer);
  }

  document.addEventListener('DOMContentLoaded',function(){
    injectStyles();
    refreshRadar();
    initVisualSection();
    ensureCameraDrawer();
    setInterval(refreshRadar,120000);
  });
})();
