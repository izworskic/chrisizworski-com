(()=>{
  "use strict";

  if(location.pathname!=="/mackinac-island/" && location.pathname!=="/mackinac-island") return;

  const PROFILE_API="/api/mackinac-profile";
  const ORIGIN_API="/api/mackinac-origin";
  const PLAN_API="/api/mackinac-island";
  const PROFILE_KEY="mackinac-trip-profile-v1";
  const PLAN_KEY="mackinac-trip-plan-v1";
  const DRAFT_KEY="mackinac-human-draft-v2";

  const visionOptions=[
    ["icons","The Mackinac things we would regret missing"],
    ["relaxed","A beautiful trip that never feels rushed"],
    ["biking","Bikes, shoreline and time away from downtown"],
    ["history","Fort Mackinac and the Island's history"],
    ["food-shopping","Food, drinks, fudge, shopping and downtown energy"],
    ["special","Make this trip feel special"],
    ["kids","Keep the kids engaged without overpacking the day"],
    ["scenery","Scenery, lake views and photos"]
  ];
  const lossOptions=[
    ["rushed","Feeling rushed"],
    ["crowds","Too much time in crowds"],
    ["waiting","Waiting in lines"],
    ["walking","Too much walking or climbing"],
    ["missing","Missing something important"],
    ["weather","Weather wrecking the plan"],
    ["spending","Spending money where it adds little"],
    ["flexible","Nothing in particular — we are flexible"]
  ];
  const partyOptions=[
    ["solo","Just me"],
    ["couple","Two adults"],
    ["family-young","Family with younger kids"],
    ["family-teens","Family with teens"],
    ["adults-friends","Adults / friends"],
    ["multigenerational","Multigenerational group"],
    ["large-group","Large group"]
  ];
  const durationOptions=[
    ["day","Day trip","One ferry over and back the same day."],
    ["one-night","One night","Use the quiet evening and next morning."],
    ["two-night","2 nights","One arrival day, one full day, one return day."],
    ["three-night","3 nights","More room for a full Island rhythm."],
    ["four-plus","4+ nights","Choose the exact number once you select this."],
    ["unsure","Not sure yet","Build the shape first; decide the length after."]
  ];
  const labels={
    party:Object.fromEntries(partyOptions),
    duration:Object.fromEntries(durationOptions.map(x=>[x[0],x[1]])),
    vision:Object.fromEntries(visionOptions),
    loss:Object.fromEntries(lossOptions)
  };

  const defaults={
    step:0,
    tripDuration:"",
    nightCount:4,
    dateMode:"",
    tripDate:"",
    originMode:"",
    nearbySide:"",
    originText:"",
    originResolved:null,
    earliestLeave:"",
    party:"",
    walking:"",
    visions:[],
    loss:"",
    profile:null,
    route:null,
    tunings:[]
  };

  const readDraft=()=>{
    try{
      const parsed=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");
      return parsed&&typeof parsed==="object"?{...defaults,...parsed,originResolved:null,route:null}: {...defaults};
    }catch{return {...defaults};}
  };
  const state=readDraft();

  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const track=(name,params={})=>{try{if(typeof window.gtag==="function")window.gtag("event",name,params);}catch{}};
  const clean=s=>String(s||"").trim().replace(/\s+/g," ").slice(0,100);
  const detroitToday=()=>{
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const g=t=>parts.find(p=>p.type===t)?.value||"";
    return g("year")+"-"+g("month")+"-"+g("day");
  };
  const dateLabel=value=>{
    if(!value)return "Date still flexible";
    const d=new Date(value+"T12:00:00");
    return Number.isNaN(d.getTime())?value:d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  };
  const driveLabel=m=>{
    const n=Math.max(0,Math.round(Number(m)||0)),h=Math.floor(n/60),min=n%60;
    return h?(h+" hr"+(min?" "+min+" min":"")):(min+" min");
  };
  const saveDraft=()=>{
    try{
      const safe={...state,originResolved:null,profile:null,route:null};
      localStorage.setItem(DRAFT_KEY,JSON.stringify(safe));
    }catch{}
  };
  const saveProfile=profile=>{
    try{localStorage.setItem(PROFILE_KEY,JSON.stringify({answers:profile.answers||buildAnswers(),profile,saved_at:Date.now()}));}catch{}
  };
  const partyCounts=()=>{
    const map={
      solo:[1,0],couple:[2,0],"family-young":[2,2],"family-teens":[2,2],
      "adults-friends":[3,0],multigenerational:[4,2],"large-group":[6,0]
    };
    return map[state.party]||[2,0];
  };
  const nights=()=>state.tripDuration==="one-night"?1:state.tripDuration==="two-night"?2:state.tripDuration==="three-night"?3:state.tripDuration==="four-plus"?Math.max(4,Math.min(7,Number(state.nightCount)||4)):1;
  const tripMode=()=>state.tripDuration==="day"?"day-trip":state.tripDuration==="unsure"?"":"overnight";
  const personaList=()=>{
    const p=new Set();
    if(tripMode()==="day-trip")p.add("day-trip");
    else if(tripMode()==="overnight")p.add("overnight");
    if(["family-young","family-teens","multigenerational"].includes(state.party))p.add("kids");
    if(state.visions.includes("biking"))p.add("biking");
    if(state.visions.includes("scenery"))p.add("photography");
    if(state.visions.includes("icons")||state.loss==="missing")p.add("first-visit");
    return [...p];
  };
  const buildAnswers=()=>({
    trip_duration:state.tripDuration==="two-night"||state.tripDuration==="three-night"?"two-three":state.tripDuration||"unsure",
    party:state.party||"adults-friends",
    trip_vision:[...state.visions],
    trip_loss:state.loss||"flexible",
    walking_tolerance:state.walking||null
  });
  const savedPlan=()=>{
    const [adults,children]=partyCounts();
    return {
      trip_date:state.dateMode==="flexible"?"":state.tripDate,
      origin_text:state.originMode==="from-home"?(state.originResolved?.origin?.label||clean(state.originText)):(state.originMode==="nearby"?(state.nearbySide==="mackinaw"?"Mackinaw City area":state.nearbySide==="st-ignace"?"St. Ignace area":"Straits area; either port works"):""),
      depart_at:"",
      depart_not_before:state.earliestLeave||"",
      trip:tripMode(),
      nights:nights(),
      adults,
      children,
      bikes:state.visions.includes("biking")?"rent":"none",
      pace:state.walking==="high"?"active":state.walking==="low"?"easy":"balanced",
      mobility:state.walking==="low"?"limited":"standard",
      dinner:"none",
      return_by:"",
      event_start:"",
      personas:personaList(),
      interests:[
        ...(state.visions.includes("biking")?["biking"]:[]),
        ...(state.visions.includes("history")?["history"]:[]),
        ...(state.visions.includes("food-shopping")?["food","shopping"]:[]),
        ...(state.visions.includes("scenery")?["scenery","photography"]:[])
      ],
      must_do:[],
      intake:buildAnswers(),
      tuning:[...state.tunings]
    };
  };
  const savePlan=()=>{
    try{localStorage.setItem(PLAN_KEY,JSON.stringify({plan:savedPlan(),saved_at:Date.now()}));}catch{}
  };

  const main=document.querySelector("main");
  if(!main)return;
  document.body.classList.add("mackinac-human-v2");

  const shell=document.createElement("section");
  shell.className="human-planner-shell";
  shell.id="trip-intake";
  shell.setAttribute("aria-label","Mackinac Island trip planner");
  main.prepend(shell);

  function progressHtml(active){
    const names=["Trip shape","Getting there","People + movement","What matters"];
    return '<div class="human-progress" aria-label="Trip builder progress">'+names.map((name,i)=>{
      const cls=i<active?" done":i===active?" active":"";
      return '<div class="human-progress-step'+cls+'"><b>'+(i<active?"✓":i+1)+'</b><span>'+name+'</span></div>';
    }).join("")+"</div>";
  }

  function baseCard(content,active=state.step){
    shell.innerHTML=
      '<div class="human-planner-top">'+
        '<div><span class="human-planner-kicker">Mackinac Island trip planner</span><h1>Build a Mackinac trip that actually fits.</h1><p>Tell us the few things that truly change a Mackinac visit. We’ll solve the mainland drive, ferry timing and Island sequence around your trip.</p></div>'+
        '<div class="human-principle"><strong>You do not need to know the ferry logistics yet.</strong><br>Leave time is optional. Give us a real constraint if you have one; otherwise we calculate a useful departure for you.</div>'+
      '</div>'+
      '<div class="human-planner-card">'+progressHtml(active)+content+'</div>';
  }

  function stage0(){
    const today=detroitToday();
    baseCard(
      '<div class="human-stage">'+
        '<div class="human-stage-head"><div><span class="human-planner-kicker">1 · Trip shape</span><h2>What kind of Mackinac trip are you trying to have?</h2><p>Trip length and date change almost every downstream decision. Start there.</p></div><div class="human-stage-note">Nothing here commits you. You can change it later without rebuilding the whole trip.</div></div>'+
        '<div class="human-question"><span class="human-question-label">How long?</span><div class="human-choice-grid">'+durationOptions.map(([v,l,s])=>'<button type="button" class="human-choice'+(state.tripDuration===v?" selected":"")+'" data-set="tripDuration" data-value="'+v+'" aria-pressed="'+String(state.tripDuration===v)+'">'+esc(l)+'<small>'+esc(s)+'</small></button>').join("")+'</div>'+(state.tripDuration==="four-plus"?'<label class="human-field" style="margin-top:12px"><span>How many nights?</span><input id="humanNightCount" type="number" min="4" max="7" inputmode="numeric" value="'+esc(state.nightCount)+'"></label>':"")+'</div>'+
        '<div class="human-question"><span class="human-question-label">When?</span><div class="human-choice-grid">'+
          '<button type="button" class="human-choice'+(state.dateMode==="today"?" selected":"")+'" data-set="dateMode" data-value="today" aria-pressed="'+String(state.dateMode==="today")+'">Today<small>Use what is still realistically reachable.</small></button>'+
          '<button type="button" class="human-choice'+(state.dateMode==="date"?" selected":"")+'" data-set="dateMode" data-value="date" aria-pressed="'+String(state.dateMode==="date")+'">I have a date<small>Use the published schedule and date-specific conditions.</small></button>'+
          '<button type="button" class="human-choice'+(state.dateMode==="flexible"?" selected":"")+'" data-set="dateMode" data-value="flexible" aria-pressed="'+String(state.dateMode==="flexible")+'">Still deciding<small>Build the trip shape without pretending a live ferry is known.</small></button>'+
        '</div>'+
        (state.dateMode==="date"?'<label class="human-field" style="margin-top:12px"><span>Trip date</span><input id="humanTripDate" type="date" min="'+today+'" value="'+esc(state.tripDate)+'"></label>':"")+
        '<div class="human-stage-actions"><span class="human-error" id="humanStageError"></span><button class="human-btn primary" type="button" data-action="next">Next: getting there</button></div>'+
      '</div>',0
    );
  }

  function stage1(){
    baseCard(
      '<div class="human-stage">'+
        '<div class="human-stage-head"><div><span class="human-planner-kicker">2 · Getting there</span><h2>Where does your Mackinac day really start?</h2><p>The right ferry port depends on the whole journey. We compare Mackinaw City and St. Ignace after we know where you are coming from.</p></div><div class="human-stage-note">If you are already in the Straits, say so. If you do not know yet, the planner will stop short of inventing a port.</div></div>'+
        '<div class="human-question"><span class="human-question-label">Starting point</span><div class="human-choice-grid">'+
          '<button type="button" class="human-choice'+(state.originMode==="from-home"?" selected":"")+'" data-set="originMode" data-value="from-home" aria-pressed="'+String(state.originMode==="from-home")+'">I am driving in<small>Compare both ferry ports from my real starting point.</small></button>'+
          '<button type="button" class="human-choice'+(state.originMode==="nearby"?" selected":"")+'" data-set="originMode" data-value="nearby" aria-pressed="'+String(state.originMode==="nearby")+'">Already near the Straits<small>Skip the long mainland drive.</small></button>'+
          '<button type="button" class="human-choice'+(state.originMode==="later"?" selected":"")+'" data-set="originMode" data-value="later" aria-pressed="'+String(state.originMode==="later")+'">I will decide later<small>Keep planning, but do not fake ferry reachability.</small></button>'+
        '</div></div>'+
        (state.originMode==="from-home"?'<div class="human-question"><div class="human-field-grid"><label class="human-field"><span>Starting city, state/province or ZIP/postal code</span><input id="humanOrigin" type="search" autocomplete="off" value="'+esc(state.originText)+'" placeholder="Bay City, MI"></label><label class="human-field"><span>I already know when I’m leaving <em style="font-weight:500;color:#6f817d">(optional)</em></span><input id="humanEarliestLeave" type="time" value="'+esc(state.earliestLeave)+'"></label></div><p class="human-question-help">Leave this blank if you want the planner to tell you when to leave. Add a time only when you already have a real departure-time constraint.</p><div class="human-origin-status'+(state.originResolved?" good":"")+'" id="humanOriginStatus">'+originStatusText()+'</div></div>':
          state.originMode==="nearby"?'<div class="human-question"><span class="human-question-label">Which side are you on?</span><div class="human-choice-grid"><button type="button" class="human-choice'+(state.nearbySide==="mackinaw"?" selected":"")+'" data-set="nearbySide" data-value="mackinaw" aria-pressed="'+String(state.nearbySide==="mackinaw")+'">Mackinaw City side<small>Lower Peninsula side of the bridge.</small></button><button type="button" class="human-choice'+(state.nearbySide==="st-ignace"?" selected":"")+'" data-set="nearbySide" data-value="st-ignace" aria-pressed="'+String(state.nearbySide==="st-ignace")+'">St. Ignace side<small>Upper Peninsula side of the bridge.</small></button><button type="button" class="human-choice'+(state.nearbySide==="either"?" selected":"")+'" data-set="nearbySide" data-value="either" aria-pressed="'+String(state.nearbySide==="either")+'">Either port works<small>I am close enough that the ferry schedule can decide.</small></button></div></div>':
          state.originMode==="later"?'<div class="human-origin-status">We can still build your Mackinac style and decision order. Exact ferry timing stays locked until you add a starting point.</div>':"")+
        '<div class="human-stage-actions"><button class="human-btn" type="button" data-action="back">Back</button><div style="display:flex;gap:10px;align-items:center"><span class="human-error" id="humanStageError"></span><button class="human-btn primary" type="button" data-action="next">Next: who is going</button></div></div>'+
      '</div>',1
    );
  }

  function originStatusText(){
    if(state.originResolved){
      const routes=state.originResolved.routes||[];
      const mc=routes.find(x=>x.port==="Mackinaw City");
      const si=routes.find(x=>x.port==="St. Ignace");
      return esc(state.originResolved.origin?.label||state.originText)+" → Mackinaw City "+(mc?driveLabel(mc.drive_minutes):"—")+" · St. Ignace "+(si?driveLabel(si.drive_minutes):"—")+". We will still choose the ferry from the whole trip, not drive time alone.";
    }
    return "We will resolve this when you continue, then compare both mainland ports.";
  }

  function stage2(){
    baseCard(
      '<div class="human-stage">'+
        '<div class="human-stage-head"><div><span class="human-planner-kicker">3 · People + movement</span><h2>Who is this plan responsible for?</h2><p>Mackinac is car-free, and the interior is hillier than many first-time visitors expect. Party and walking comfort belong in the core logic, not in an accessibility footnote.</p></div><div class="human-stage-note">Walking comfort changes route shape. It does not remove experiences automatically.</div></div>'+
        '<div class="human-question"><span class="human-question-label">Who is going?</span><div class="human-choice-grid">'+partyOptions.map(([v,l])=>'<button type="button" class="human-choice'+(state.party===v?" selected":"")+'" data-set="party" data-value="'+v+'" aria-pressed="'+String(state.party===v)+'">'+esc(l)+'</button>').join("")+'</div></div>'+
        '<div class="human-question"><span class="human-question-label">How should we treat walking and hills?</span><div class="human-choice-grid">'+
          '<button type="button" class="human-choice'+(state.walking==="low"?" selected":"")+'" data-set="walking" data-value="low" aria-pressed="'+String(state.walking==="low")+'">Keep walking limited<small>Reduce steep approaches and unnecessary backtracking.</small></button>'+
          '<button type="button" class="human-choice'+(state.walking==="moderate"?" selected":"")+'" data-set="walking" data-value="moderate" aria-pressed="'+String(state.walking==="moderate")+'">Normal sightseeing is fine<small>Walking is okay, but it should still make sense.</small></button>'+
          '<button type="button" class="human-choice'+(state.walking==="high"?" selected":"")+'" data-set="walking" data-value="high" aria-pressed="'+String(state.walking==="high")+'">We like being active<small>Longer walks, bikes and hills can be part of the fun.</small></button>'+
        '</div></div>'+
        '<div class="human-stage-actions"><button class="human-btn" type="button" data-action="back">Back</button><div style="display:flex;gap:10px;align-items:center"><span class="human-error" id="humanStageError"></span><button class="human-btn primary" type="button" data-action="next">Next: what matters</button></div></div>'+
      '</div>',2
    );
  }

  function stage3(){
    baseCard(
      '<div class="human-stage">'+
        '<div class="human-stage-head"><div><span class="human-planner-kicker">4 · What matters</span><h2>What should this trip feel like?</h2><p>Pick the two things worth protecting, then tell us the one failure mode you most want to avoid.</p></div><div class="human-stage-note">This is where JEV is useful: ranking bounded choices after the deterministic travel facts are known.</div></div>'+
        '<div class="human-question"><span class="human-question-label">Protect up to two priorities</span><p class="human-question-help">The planner will remove lower-value stops before it sacrifices these.</p><div class="human-choice-grid two">'+visionOptions.map(([v,l])=>'<button type="button" class="human-choice'+(state.visions.includes(v)?" selected":"")+'" data-vision="'+v+'" aria-pressed="'+String(state.visions.includes(v))+'">'+esc(l)+'</button>').join("")+'</div></div>'+
        '<div class="human-question"><span class="human-question-label">What would make the trip feel like a miss?</span><div class="human-choice-grid two">'+lossOptions.map(([v,l])=>'<button type="button" class="human-choice'+(state.loss===v?" selected":"")+'" data-set="loss" data-value="'+v+'" aria-pressed="'+String(state.loss===v)+'">'+esc(l)+'</button>').join("")+'</div></div>'+
        '<div class="human-stage-actions"><button class="human-btn" type="button" data-action="back">Back</button><div style="display:flex;gap:10px;align-items:center"><span class="human-error" id="humanStageError"></span><button class="human-btn primary" type="button" data-action="build">Build my Mackinac trip</button></div></div>'+
      '</div>',3
    );
  }

  function renderStage(){
    state.step=Math.max(0,Math.min(3,Number(state.step)||0));
    [stage0,stage1,stage2,stage3][state.step]();
    saveDraft();
  }

  function setError(message){
    const el=shell.querySelector("#humanStageError");
    if(el)el.textContent=message||"";
  }

  async function resolveOrigin(){
    if(state.originMode!=="from-home")return true;
    const q=clean(state.originText);
    if(!q){setError("Add your starting city, or choose another starting-point option.");return false;}
    const status=shell.querySelector("#humanOriginStatus");
    if(status){status.textContent="Comparing drive time to both ferry ports…";status.className="human-origin-status loading";}
    try{
      const r=await fetch(ORIGIN_API+"?q="+encodeURIComponent(q),{headers:{accept:"application/json"}});
      const j=await r.json();
      if(!r.ok)throw new Error(j.detail||j.error||"Starting point could not be resolved");
      state.originResolved=j;
      state.originText=j.origin?.label||q;
      if(status){status.innerHTML=originStatusText();status.className="human-origin-status good";}
      track("mackinac_human_origin_resolved",{preferred_port:j.preferred_port||"unknown"});
      return true;
    }catch(e){
      state.originResolved=null;
      if(status){status.textContent="Could not resolve that starting point. Try city + state/province or a ZIP/postal code.";status.className="human-origin-status bad";}
      setError("Starting point needs a clearer location.");
      return false;
    }
  }

  function validateStep(){
    if(state.step===0){
      if(!state.tripDuration)return "Choose the trip length that is closest to what you are planning.";
      if(!state.dateMode)return "Tell us whether the date is fixed or still flexible.";
      if(state.dateMode==="date"&&!state.tripDate)return "Choose the trip date.";
    }
    if(state.step===1){
      if(!state.originMode)return "Choose where the trip starts.";
      if(state.originMode==="from-home"&&!clean(state.originText))return "Add the city you are driving from.";
    }
    if(state.step===2){
      if(!state.party)return "Choose who is going.";
      if(!state.walking)return "Choose the walking level that fits the group.";
    }
    if(state.step===3){
      if(!state.visions.length)return "Pick at least one thing worth protecting.";
      if(!state.loss)return "Choose the problem you most want the planner to avoid.";
    }
    return "";
  }

  async function classify(){
    const r=await fetch(PROFILE_API,{
      method:"POST",
      headers:{"content-type":"application/json",accept:"application/json"},
      body:JSON.stringify({answers:buildAnswers()})
    });
    const j=await r.json();
    if(!r.ok||!j.profile)throw new Error(j.detail||j.error||"Trip profile unavailable");
    state.profile=j.profile;
    saveProfile(j.profile);
    return j.profile;
  }

  function routeParams(){
    const [adults,children]=partyCounts();
    const p=new URLSearchParams();
    p.set("personas",personaList().join(","));
    p.set("trip",tripMode());
    p.set("nights",String(nights()));
    p.set("adults",String(adults));
    p.set("children",String(children));
    p.set("bikes",state.visions.includes("biking")?"rent":"none");
    p.set("pace",state.walking==="high"?"active":state.walking==="low"?"easy":"balanced");
    p.set("mobility",state.walking==="low"?"limited":"standard");
    p.set("origin",state.originMode==="nearby"?"nearby":state.originResolved?.preferred_port==="St. Ignace"?"upper":"lower");
    p.set("intake_trip_duration",state.tripDuration);
    p.set("intake_party",state.party);
    p.set("intake_trip_vision",state.visions.join(","));
    p.set("intake_trip_loss",state.loss);
    p.set("intake_walking_tolerance",state.walking);
    if(state.dateMode!=="flexible"&&state.tripDate)p.set("trip_date",state.tripDate);
    if(state.earliestLeave)p.set("depart_not_before",state.earliestLeave);
    if(state.tunings.length)p.set("tune",state.tunings.join(","));
    if(state.originResolved){
      p.set("origin_name",state.originResolved.origin?.label||state.originText);
      p.set("origin_drive_minutes",String(state.originResolved.drive_minutes));
      p.set("origin_preferred_port",state.originResolved.preferred_port);
      const mc=(state.originResolved.routes||[]).find(x=>x.port==="Mackinaw City");
      const si=(state.originResolved.routes||[]).find(x=>x.port==="St. Ignace");
      if(Number.isFinite(Number(mc?.drive_minutes)))p.set("origin_mackinaw_minutes",String(mc.drive_minutes));
      if(Number.isFinite(Number(si?.drive_minutes)))p.set("origin_st_ignace_minutes",String(si.drive_minutes));
    }
    return p;
  }

  async function buildRoute(){
    const r=await fetch(PLAN_API+"?"+routeParams().toString(),{headers:{accept:"application/json"}});
    const j=await r.json();
    if(!r.ok)throw new Error(j.detail||j.error||"Trip timing unavailable");
    state.route=j;
    savePlan();
    return j;
  }

  function loading(){
    shell.innerHTML=
      '<div class="human-planner-card"><div class="human-loading"><div class="human-loading-ring" aria-hidden="true"></div><h2>Building the trip from the outside in</h2><p>Trip style first. Then mainland travel, ferry feasibility, weather and Island sequence.</p></div></div>';
  }

  function planMeta(){
    const bits=[];
    bits.push(labels.duration[state.tripDuration]||"Mackinac trip");
    bits.push(state.dateMode==="flexible"?"Date flexible":dateLabel(state.tripDate));
    bits.push(labels.party[state.party]||"");
    bits.push(state.walking==="low"?"Limited walking":state.walking==="high"?"Active movement":"Normal walking");
    return bits.filter(Boolean);
  }

  function nextCards(){
    const cards=[
      ["/mackinac-island/ferry-planner/","Ferries","Lock the crossing","See the port and ferry decision with the saved trip already applied."],
      ["/mackinac-island/things-to-do/","Explore","Shape the Island day","Keep the anchors that fit your pace, movement and priorities."],
      ["/mackinac-island/dining/","Eat","Place meals where they help","Avoid burning the best Island window on unnecessary backtracking."]
    ];
    if(tripMode()==="overnight")cards.splice(1,0,["/mackinac-island/where-to-stay/","Stay","Choose the right part of the Island","Use the overnight to reduce transitions and protect the experience you want."]);
    else cards.push(["/mackinac-island/events/","Events","Check fixed-time anchors","Fit event timing before it collides with the ferry plan."]);
    return cards.slice(0,4);
  }

  function humanTripTitle(){
    if(state.tripDuration==="day")return "Your Mackinac day trip";
    if(state.tripDuration==="one-night")return "Your one-night Mackinac plan";
    if(state.tripDuration==="two-three")return "Your 2–3 night Mackinac plan";
    if(state.tripDuration==="four-plus")return "Your longer Mackinac stay";
    return "Your Mackinac trip";
  }

  function frameworkResult(){
    const profile=state.profile||{};
    const portCopy=state.originResolved?(()=>{
      const routes=state.originResolved.routes||[];
      const mc=routes.find(x=>x.port==="Mackinaw City");
      const si=routes.find(x=>x.port==="St. Ignace");
      return "From "+esc(state.originResolved.origin?.label||state.originText)+", current routing is about "+(mc?driveLabel(mc.drive_minutes):"—")+" to Mackinaw City and "+(si?driveLabel(si.drive_minutes):"—")+" to St. Ignace. That is useful context, but the date-specific ferry schedule still decides the actual port.";
    })():"We are deliberately not choosing a ferry port yet. Add the missing date or starting point when you are ready, and the planner will calculate it.";
    shell.innerHTML=
      '<div class="human-planner-card human-result">'+
        '<div class="human-result-hero"><span class="human-planner-kicker">Your trip shape is ready</span><h2>'+esc(humanTripTitle())+'</h2><p>'+esc(profile.primary?.summary||"Your answers are saved. We have enough to shape the experience without pretending exact ferry timing is known.")+'</p><div class="human-result-meta">'+planMeta().map(x=>"<span>"+esc(x)+"</span>").join("")+'</div></div>'+
        '<div class="human-result-body">'+
          '<div class="human-flex-plan"><h3>We are stopping at the right boundary.</h3><p>'+portCopy+'</p></div>'+
          '<div class="human-section-title"><h3>Your planning order</h3><p>Only the next useful decisions</p></div>'+
          '<div class="human-itinerary">'+
            '<div class="human-itinerary-card"><time>1</time><strong>'+esc(state.dateMode==="flexible"?"Lock the Island date":"Add the starting point")+'</strong><p>'+esc(state.dateMode==="flexible"?"The date unlocks real ferry schedules, operating-season limits, weather and event pressure.":"The starting point lets the planner compare both ferry ports by the whole journey.")+'</p></div>'+
            '<div class="human-itinerary-card"><time>2</time><strong>Choose the crossing from reality</strong><p>Drive time, dock buffer and schedule determine the port. The map alone does not.</p></div>'+
            '<div class="human-itinerary-card"><time>3</time><strong>Protect '+esc(labels.vision[state.visions[0]]||"your main priority")+'</strong><p>Build the Island sequence around the experience you care about before filling the gaps.</p></div>'+
            '<div class="human-itinerary-card"><time>4</time><strong>Remove friction before adding stops</strong><p>The planner will reduce rushing, hills, crowd exposure or low-value transitions based on your answers.</p></div>'+
          '</div>'+
          '<div class="human-section-title"><h3>Continue from the same trip</h3><p>Your answers are saved across the Mackinac pages</p></div>'+
          '<div class="human-next-grid">'+nextCards().map(x=>'<a class="human-next-card" href="'+x[0]+'"><span>'+esc(x[1])+'</span><strong>'+esc(x[2])+'</strong><small>'+esc(x[3])+'</small></a>').join("")+'</div>'+
          '<div class="human-result-actions"><button class="human-btn primary" type="button" data-action="edit">Edit trip answers</button><button class="human-btn" type="button" data-action="reset">Start over</button></div>'+
          '<p class="human-truth-note">Exact ferry, weather, attraction and timing claims remain locked until the planner has the inputs required to verify them.</p>'+
        '</div>'+
      '</div>';
    track("mackinac_human_framework_shown",{profile:profile.primary?.id||"unknown",date_mode:state.dateMode,origin_mode:state.originMode});
  }

  function exactResult(){
    const d=state.route||{},profile=state.profile||{};
    const plan=d.ferry?.recommended_outbound||null;
    const journey=d.journey||{};
    if(!plan){
      shell.innerHTML=
        '<div class="human-planner-card human-result"><div class="human-result-hero"><span class="human-planner-kicker">This trip needs a recheck</span><h2>We are not going to invent a ferry.</h2><p>'+esc((d.decision?.hurting||[])[0]||d.planning_reason||"No complete trip combination is verified from the current inputs.")+'</p><div class="human-result-meta">'+planMeta().map(x=>"<span>"+esc(x)+"</span>").join("")+'</div></div><div class="human-result-body"><div class="human-result-actions"><button class="human-btn primary" type="button" data-action="edit">Change trip inputs</button><a class="human-btn" href="/mackinac-island/ferry-planner/">Open ferry details</a></div></div></div>';
      return;
    }
    const leave=d.leave_home?.time||journey.leave_time||(state.originMode==="nearby"?"Already nearby":"Calculated from the ferry");
    const port=journey.ferry_port||plan.origin_port||"Mainland port";
    const ferry=journey.ferry_departure||plan.departure_time||"—";
    const arrival=journey.island_arrival||plan.arrival_time||"—";
    const activities=(d.itinerary||[]).filter(x=>!["mainland-drive","mainland-dock","ferry-out","ferry-home"].includes(x.stop_id)&&!/Head to the ferry dock/i.test(x.label||"")).slice(0,6);
    const why=[...(d.decision?.why_arrival||[]).slice(0,3),d.itinerary_reason].filter(Boolean).slice(0,4);
    const hurting=(d.decision?.hurting||[]).slice(0,2);
    const returnPlan=d.ferry?.return_plan||{};
    const returnText=tripMode()==="overnight"
      ? (returnPlan.mode==="flexible"?"Return day stays flexible until you give the planner a deadline.":returnPlan.reason||"Return-day schedule is handled separately from arrival day.")
      : (d.ferry?.recommended_return?("Recommended return: "+d.ferry.recommended_return.departure_time+". "+(d.ferry.return_reason||"")):(d.ferry?.return_reason||"Return timing needs a recheck."));
    const readiness=d.decision?.confidence==="LOW"?"Plan built with degraded live inputs":"Your trip is ready to use";
    shell.innerHTML=
      '<div class="human-planner-card human-result">'+
        '<div class="human-result-hero"><span class="human-planner-kicker">'+esc(readiness)+'</span><h2>'+esc(humanTripTitle())+'</h2><p>'+esc(d.itinerary_summary||d.decision?.primary_reason||profile.primary?.summary||"The plan is built from your trip and the available verified inputs.")+'</p><div class="human-result-meta">'+planMeta().map(x=>"<span>"+esc(x)+"</span>").join("")+'</div></div>'+
        '<div class="human-result-body">'+
          '<div class="human-first-move"><div class="human-first-move-head"><span>Your first move</span><strong>'+esc(port)+'</strong></div><div class="human-journey">'+
            '<div class="human-journey-step"><span>Leave</span><strong>'+esc(leave)+'</strong><small>'+(state.earliestLeave?"Your leave-time constraint is respected.":"Calculated for the selected ferry; you did not have to guess it.")+'</small></div>'+
            '<div class="human-journey-step"><span>Be at the dock</span><strong>'+esc(journey.dock_ready_time||"Allow check-in time")+'</strong><small>'+esc(port)+'</small></div>'+
            '<div class="human-journey-step"><span>Ferry</span><strong>'+esc(ferry)+'</strong><small>'+esc(plan.operator||"Published schedule")+'</small></div>'+
            '<div class="human-journey-step"><span>On the Island</span><strong>'+esc(arrival)+'</strong><small>This is when the Island day actually starts.</small></div>'+
          '</div></div>'+
          '<div class="human-flex-plan"><h3>'+(tripMode()==="overnight"?"Your return is a different decision":"Protect the trip home")+'</h3><p>'+esc(returnText)+'</p></div>'+
          (hurting.length?'<div class="human-flex-plan"><h3>Watch this</h3><p>'+hurting.map(esc).join(" · ")+'</p></div>':"")+
          '<div class="human-section-title"><h3>Your Island sequence</h3><p>Fewer anchors, in a usable order</p></div>'+
          '<div class="human-itinerary">'+(activities.length?activities.map(x=>'<div class="human-itinerary-card"><time>'+esc(x.time||"")+'</time><strong>'+esc(x.label||"")+'</strong><p>'+esc(x.detail||x.movement||"")+'</p></div>').join(""):'<div class="human-itinerary-card"><strong>Keep the day open</strong><p>The verified ferry plan is stronger than the current attraction detail. Use Explore to choose the Island anchors.</p></div>')+'</div>'+
          '<div class="human-section-title"><h3>Why this plan</h3><p>Human-readable reasons, not an unexplained score</p></div>'+
          '<div class="human-why">'+why.map(x=>"<div>"+esc(x)+"</div>").join("")+'</div>'+
          '<div class="human-section-title"><h3>Adjust without starting over</h3><p>These change the route; they do not erase the trip</p></div>'+
          '<div class="human-adjust-row">'+[
            ["relaxed","More relaxed"],["less-walking","Less walking"],["outdoors","More outdoors"],["better-dinner","Better dinner"],["less-downtown","Less downtown"],["history","More history"]
          ].map(([v,l])=>'<button type="button" class="'+(state.tunings.includes(v)?"active":"")+'" data-tune="'+v+'">'+esc(l)+'</button>').join("")+'</div>'+
          '<div class="human-section-title"><h3>What to decide next</h3><p>The same saved trip follows you</p></div>'+
          '<div class="human-next-grid">'+nextCards().map(x=>'<a class="human-next-card" href="'+x[0]+'"><span>'+esc(x[1])+'</span><strong>'+esc(x[2])+'</strong><small>'+esc(x[3])+'</small></a>').join("")+'</div>'+
          '<div class="human-result-actions"><button class="human-btn primary" type="button" data-action="edit">Edit trip answers</button><button class="human-btn" type="button" data-action="details">Show full live detail</button><button class="human-btn" type="button" data-action="reset">Start over</button></div>'+
          '<p class="human-truth-note">'+esc(d.ferry?.truth||"Published schedules, route feasibility and weather stay deterministic; JEV only ranks bounded planning choices.")+'</p>'+
        '</div>'+
      '</div>';
    track("mackinac_human_plan_shown",{profile:profile.primary?.id||"unknown",trip:tripMode(),port:port,jev:d.decision?.engine||"unknown"});
  }

  async function build(){
    const err=validateStep();
    if(err){setError(err);return;}
    loading();
    try{
      if(state.dateMode==="today")state.tripDate=detroitToday();
      if(state.originMode==="from-home"&&!state.originResolved){
        const ok=await resolveOrigin();
        if(!ok){state.step=1;stage1();setError("Starting point needs a clearer location.");return;}
      }
      await classify();
      savePlan();
      if(state.tripDuration==="unsure"||state.dateMode==="flexible"||state.originMode==="later"){
        frameworkResult();
        return;
      }
      await buildRoute();
      exactResult();
    }catch(e){
      shell.innerHTML=
        '<div class="human-planner-card human-result"><div class="human-result-hero"><span class="human-planner-kicker">Planner needs a recheck</span><h2>We stopped instead of guessing.</h2><p>'+esc(String(e?.message||e))+'</p></div><div class="human-result-body"><div class="human-result-actions"><button class="human-btn primary" type="button" data-action="edit">Return to my answers</button></div></div></div>';
      track("mackinac_human_plan_error",{message:String(e?.message||e).slice(0,90)});
    }
  }

  async function rerun(){
    loading();
    try{
      await buildRoute();
      exactResult();
    }catch(e){
      shell.innerHTML='<div class="human-planner-card human-result"><div class="human-result-hero"><h2>That adjustment could not be applied.</h2><p>'+esc(String(e?.message||e))+'</p></div><div class="human-result-body"><button class="human-btn primary" type="button" data-action="build">Rebuild trip</button></div></div>';
    }
  }

  function reset(){
    try{
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(PLAN_KEY);
    }catch{}
    Object.assign(state,{...defaults});
    document.body.classList.remove("mackinac-human-details");
    renderStage();
    track("mackinac_human_reset",{});
  }

  shell.addEventListener("click",async e=>{
    const set=e.target.closest("[data-set]");
    if(set){
      const key=set.dataset.set,value=set.dataset.value;
      state[key]=value;
      if(key==="dateMode"){
        if(value==="today")state.tripDate=detroitToday();
        if(value==="flexible")state.tripDate="";
      }
      if(key==="originMode"&&value!=="from-home")state.originResolved=null;
      saveDraft();
      renderStage();
      return;
    }
    const vision=e.target.closest("[data-vision]");
    if(vision){
      const value=vision.dataset.vision;
      const current=new Set(state.visions);
      if(current.has(value))current.delete(value);
      else if(current.size<2)current.add(value);
      state.visions=[...current];
      saveDraft();
      stage3();
      return;
    }
    const tune=e.target.closest("[data-tune]");
    if(tune){
      const value=tune.dataset.tune;
      const current=new Set(state.tunings);
      current.has(value)?current.delete(value):current.add(value);
      state.tunings=[...current];
      saveDraft();savePlan();
      track("mackinac_human_tune",{tune:value,active:current.has(value)});
      await rerun();
      return;
    }
    const action=e.target.closest("[data-action]")?.dataset.action;
    if(!action)return;
    if(action==="back"){state.step=Math.max(0,state.step-1);renderStage();return;}
    if(action==="next"){
      const err=validateStep();if(err){setError(err);return;}
      if(state.step===1&&state.originMode==="from-home"){
        const ok=await resolveOrigin();if(!ok)return;
      }
      state.step=Math.min(3,state.step+1);renderStage();return;
    }
    if(action==="build"){await build();return;}
    if(action==="edit"){state.step=0;document.body.classList.remove("mackinac-human-details");renderStage();return;}
    if(action==="details"){
      document.body.classList.toggle("mackinac-human-details");
      const btn=e.target.closest("[data-action=details]");
      if(btn)btn.textContent=document.body.classList.contains("mackinac-human-details")?"Hide full live detail":"Show full live detail";
      track("mackinac_human_details_toggle",{open:document.body.classList.contains("mackinac-human-details")});
      return;
    }
    if(action==="reset"){reset();}
  });

  shell.addEventListener("input",e=>{
    if(e.target.id==="humanTripDate")state.tripDate=e.target.value;
    if(e.target.id==="humanOrigin"){state.originText=e.target.value;state.originResolved=null;}
    if(e.target.id==="humanEarliestLeave")state.earliestLeave=e.target.value;
    saveDraft();
  });

  const restoredProfile=(()=>{
    try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"null")?.profile||null;}catch{return null;}
  })();
  const restoredPlan=(()=>{
    try{return JSON.parse(localStorage.getItem(PLAN_KEY)||"null")?.plan||null;}catch{return null;}
  })();

  function hydrateFromSavedTrip(){
    if(!(restoredProfile?.complete&&restoredPlan))return false;
    const a=restoredProfile.answers||restoredPlan.intake||{};
    if(!state.tripDuration){
      state.tripDuration=a.trip_duration||(
        restoredPlan.trip==="day-trip"?"day":
        restoredPlan.trip==="overnight"?(Number(restoredPlan.nights)>=4?"four-plus":Number(restoredPlan.nights)>=2?"two-three":"one-night"):""
      );
    }
    if(!state.dateMode){
      state.dateMode=restoredPlan.trip_date?(restoredPlan.trip_date===detroitToday()?"today":"date"):"flexible";
    }
    if(!state.tripDate&&restoredPlan.trip_date)state.tripDate=restoredPlan.trip_date;
    if(!state.originMode){
      if(restoredPlan.origin_text==="Already near the Straits")state.originMode="nearby";
      else if(clean(restoredPlan.origin_text)){state.originMode="from-home";state.originText=restoredPlan.origin_text;}
      else state.originMode="later";
    }
    if(!state.originText&&state.originMode==="from-home")state.originText=restoredPlan.origin_text||"";
    if(!state.earliestLeave&&restoredPlan.depart_not_before)state.earliestLeave=restoredPlan.depart_not_before;
    if(!state.party)state.party=a.party||(
      Number(restoredPlan.children)>0?"family-young":
      Number(restoredPlan.adults)===1?"solo":
      Number(restoredPlan.adults)===2?"couple":"adults-friends"
    );
    if(!state.walking)state.walking=a.walking_tolerance||(
      restoredPlan.mobility==="limited"?"low":
      restoredPlan.pace==="active"?"high":"moderate"
    );
    if(!state.visions.length&&Array.isArray(a.trip_vision))state.visions=[...a.trip_vision].slice(0,2);
    if(!state.loss)state.loss=a.trip_loss||"flexible";
    if(!state.tunings.length&&Array.isArray(restoredPlan.tuning))state.tunings=[...restoredPlan.tuning];
    state.profile=restoredProfile;
    saveDraft();
    return Boolean(state.tripDuration&&state.dateMode&&state.originMode&&state.party&&state.walking&&state.visions.length&&state.loss);
  }

  async function boot(){
    const draftLooksComplete=Boolean(
      state.tripDuration&&state.dateMode&&state.originMode&&state.party&&state.walking&&state.visions.length&&state.loss
    )||hydrateFromSavedTrip();
    if(restoredProfile?.complete&&restoredPlan&&draftLooksComplete){
      state.profile=restoredProfile;
      if(state.dateMode==="today")state.tripDate=detroitToday();
      if(state.tripDuration==="unsure"||state.dateMode==="flexible"||state.originMode==="later"){
        frameworkResult();
        track("mackinac_human_planner_loaded",{version:"v2",restored:true,mode:"framework"});
        return;
      }
      loading();
      try{
        if(state.originMode==="from-home"){
          const ok=await resolveOrigin();
          if(!ok)throw new Error("Starting point needs a clearer location.");
        }
        await buildRoute();
        exactResult();
        track("mackinac_human_planner_loaded",{version:"v2",restored:true,mode:"plan"});
        return;
      }catch{
        state.step=0;
      }
    }
    renderStage();
    track("mackinac_human_planner_loaded",{version:"v2",restored:false});
  }

  boot();
})();
