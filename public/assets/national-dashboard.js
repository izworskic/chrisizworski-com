(function(){
  const N=()=>window.NationalTools;

  async function getJson(url){
    try{
      const response=await fetch(url);
      const data=typeof N().readJsonResponse==="function"
        ? await N().readJsonResponse(response,"Outdoor data source unavailable")
        : await response.json();
      return {ok:true,data:data};
    }catch(error){
      return {ok:false,error:String(error&&error.message||error)};
    }
  }
  function formatClock(value,timeZone){
    if(typeof N().fmtInZone==="function")return N().fmtInZone(value,timeZone,{hour:"numeric",minute:"2-digit"});
    if(!value)return "Unknown";
    const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);
    try{return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",timeZone:timeZone||undefined})}catch(_){return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}
  }
  function statusClass(level){
    if(["hard-freeze","freeze","cloudy","danger","major","moderate","minor"].includes(level))return "danger";
    if(["watch","strong","action","high","very-high"].includes(level))return "warn";
    return "";
  }
  function sourceFootnote(result){
    const sources=result&&result.sources||[];
    const stale=sources.filter(function(s){return s&&s.stale===true}).length;
    const available=sources.filter(function(s){return s&&s.available!==false}).length;
    return {available:available,total:sources.length,stale:stale};
  }
  function auroraCard(result,loc){
    if(!result.ok)return {id:"aurora",priority:5,kicker:"Tonight",title:"Aurora data unavailable",detail:result.error,level:"",href:N().withQuery("/national-tools/aurora/",loc),facts:[]};
    const d=result.data,w=d.local_signal&&d.local_signal.best_dark_window;
    const level=d.verdict&&d.verdict.level||"";
    const priority=level==="strong"?95:level==="cloudy"?80:level==="watch"?70:20;
    const facts=[];
    if(w)facts.push("Best dark-weather window "+formatClock(w.start_time,d.location&&d.location.timeZone||loc.timeZone)+"–"+formatClock(w.end_time,d.location&&d.location.timeZone||loc.timeZone)+" · "+w.average_cloud_percent+"% cloud");
    if(d.geomagnetic&&d.geomagnetic.peak_24h_kp!=null)facts.push("Peak 24h Kp "+d.geomagnetic.peak_24h_kp+" · context only");
    const src=sourceFootnote(d);
    return {id:"aurora",priority:priority,kicker:"Tonight",title:d.verdict&&d.verdict.label||"Aurora outlook",detail:d.verdict&&d.verdict.detail||"Local aurora context is available.",level:level,href:N().withQuery("/national-tools/aurora/",loc),facts:facts,source:src.available+"/"+(src.total||src.available)+" sources available"+(src.stale?" · "+src.stale+" stale":"")};
  }
  function riverCard(result,loc){
    if(!result.ok)return {id:"rivers",priority:4,kicker:"Water",title:"River data unavailable",detail:result.error,level:"",href:N().withQuery("/national-tools/rivers/",loc),facts:[]};
    const d=result.data,g=d.gauges&&d.gauges[0];
    if(!g)return {id:"rivers",priority:10,kicker:"Water",title:"No active streamflow gauge found nearby",detail:"Try the river tool with another nearby town or river access.",level:"",href:N().withQuery("/national-tools/rivers/",loc),facts:[]};
    const priority=30,level="";
    const flow=g.discharge_cfs==null?"flow unavailable":Math.round(g.discharge_cfs).toLocaleString()+" cfs";
    const facts=[flow+" · "+(g.trend_label||"trend unavailable")];
    if(g.trend_percent_24h!=null)facts.push("Flow change "+(g.trend_percent_24h>0?"+":"")+g.trend_percent_24h+"% in 24h");
    const water=g.sensors&&g.sensors.water_temperature;if(water&&water.value!=null)facts.push("Water "+Number(water.value).toFixed(1)+"°F");
    const turbidity=g.sensors&&g.sensors.turbidity;if(turbidity&&turbidity.value!=null)facts.push("Turbidity "+Number(turbidity.value).toFixed(1)+(turbidity.unit?" "+turbidity.unit:""));
    return {id:"rivers",priority:priority,kicker:"River intelligence",title:g.name,detail:"Current USGS observations · "+(g.trend_label||"trend unavailable"),level:level,href:N().withQuery("/national-tools/rivers/",loc),facts:facts.slice(0,5),source:"USGS reading "+(g.age_minutes==null?"age unknown":g.age_minutes+" min old")+" · open tool for historical and NOAA/NWS context"};
  }
  function coastalCard(result,loc){
    if(!result.ok)return null;
    const d=result.data||{};
    if(!d.coastal_available)return null;
    const decision=d.decision||{},day=d.official_beach_forecast&&d.official_beach_forecast.day1,obs=d.nearby_observation,tide=d.tide_context;
    const code=day&&day.rip_swim_risk_code||"unavailable";
    const priority=code==="high"?97:code==="moderate"?83:code==="low"?38:decision.level==="observation-only"?30:24;
    const level=code==="high"?"danger":code==="moderate"?"warn":"";
    const facts=[];
    if(day&&day.rip_swim_risk)facts.push("Official risk: "+day.rip_swim_risk+(day.site_name?" · "+day.site_name:""));
    if(day&&day.surf)facts.push("Surf "+day.surf);
    if(obs&&obs.wave_height_ft!=null)facts.push("Nearby observed waves "+Number(obs.wave_height_ft).toFixed(1)+" ft · station "+obs.station.distance_miles+" mi away");
    if(obs&&obs.wind_mph!=null)facts.push("Nearby wind "+Number(obs.wind_mph).toFixed(1)+" mph");
    if(obs&&obs.water_temperature_f!=null)facts.push("Water "+Number(obs.water_temperature_f).toFixed(1)+"°F");
    const next=tide&&tide.predictions&&tide.predictions[0];
    if(next)facts.push("Next tide "+next.type+" · "+formatClock(next.time,loc.timeZone));
    const src=sourceFootnote(d);
    return {id:"coastal",priority:priority,kicker:"Coast & beaches",title:decision.headline||"Coastal conditions",detail:decision.detail||"Official beach risk with separate observation and tide context.",level:level,href:N().withQuery("/national-tools/coastal/",loc),facts:facts.slice(0,5),source:src.available+"/"+(src.total||3)+" coastal source families available"+(src.stale?" · "+src.stale+" stale":"")};
  }
  function snowCard(result,loc){
    if(!result.ok)return null;
    const d=result.data||{};
    if(!d.snow_relevant)return null;
    const v=d.decision||{},f=d.forecast_48h||{},n=d.nohrsc||{},s=d.snotel||{};
    const priority=v.level==="melt-pressure-high"?78:v.level==="melt-pressure-moderate"?62:v.level==="freeze-thaw"?56:v.level==="snow-possible"?52:v.level==="accumulation-supportive"?50:d.pack_available?34:22;
    const level=v.level==="melt-pressure-high"?"warn":"";
    const facts=[];
    if(n.depth)facts.push("NOHRSC depth "+n.depth.value+" "+(n.depth.unit||"in")+" · "+n.depth.distance_miles+" mi away");
    if(n.swe)facts.push("NOHRSC SWE "+n.swe.value+" "+(n.swe.unit||"in")+" · "+n.swe.distance_miles+" mi away");
    if(s.station&&s.snow_depth)facts.push("SNOTEL depth "+s.snow_depth.value+" "+s.snow_depth.unit+" · "+s.station.distance_miles+" mi away");
    if(f.max_temperature_f!=null)facts.push("48h high "+f.max_temperature_f+"°F · "+(f.above_freezing_hours||0)+" hr above freezing");
    if(f.snow_signal_hours)facts.push(f.snow_signal_hours+" forecast snow-signal hours");
    const src=sourceFootnote(d);
    return {id:"snow",priority:priority,kicker:"Snowpack & melt",title:v.headline||"Snowpack context",detail:v.detail||"Measured pack with separate 48-hour weather context.",level:level,href:N().withQuery("/national-tools/snow/",loc),facts:facts.slice(0,5),source:src.available+"/"+(src.total||3)+" snow source families available"+(src.stale?" · "+src.stale+" stale":"")};
  }
  function frostCard(result,loc){
    if(!result.ok)return {id:"frost",priority:5,kicker:"Freeze risk",title:"Frost data unavailable",detail:result.error,level:"",href:N().withQuery("/national-tools/frost/",loc),facts:[]};
    const d=result.data,v=d.freeze_verdict||{},c=d.climate_normals,w=d.current_forecast;
    const priority=v.level==="hard-freeze"?98:v.level==="freeze"?90:25;
    const level=v.level==="hard-freeze"||v.level==="freeze"?"danger":"";
    const facts=[];
    if(w&&w.min_7d_f!=null)facts.push("7-day low "+Math.round(w.min_7d_f)+"°F"+(w.min_7d_at?" · "+formatClock(w.min_7d_at,d.location&&d.location.timeZone||loc.timeZone):""));
    if(c&&c.dates&&c.dates.fall_50&&c.dates.fall_50.mmdd)facts.push("Median first 32°F freeze "+c.dates.fall_50.mmdd.replace("-","/"));
    if(c&&c.dates&&c.dates.spring_10&&c.dates.spring_10.mmdd)facts.push("Cautious spring 10% date "+c.dates.spring_10.mmdd.replace("-","/"));
    return {id:"frost",priority:priority,kicker:"Freeze risk",title:v.label||"Freeze outlook",detail:c?"NOAA station "+(c.distance_miles==null?"distance unknown":c.distance_miles.toFixed(1)+" mi away")+" · "+c.confidence+" station confidence":"Historical climatology unavailable",level:level,href:N().withQuery("/national-tools/frost/",loc),facts:facts,source:w&&w.updated_at?"NWS updated "+N().fmtDate(w.updated_at):"NWS update time unavailable"};
  }
  function anchor(mmdd){
    if(!mmdd)return null;
    const parts=mmdd.split("-").map(Number),now=new Date();
    return new Date(now.getFullYear(),parts[0]-1,parts[1],12);
  }
  function addDays(date,days){
    if(!date||days==null)return null;
    const d=new Date(date);d.setDate(d.getDate()+Number(days));return d;
  }
  function plantingCard(frostResult,cropResult,loc){
    const href=N().withQuery("/national-tools/planting/",loc);
    if(!frostResult.ok||!cropResult.ok)return {id:"planting",priority:8,kicker:"Garden",title:"Planting calendar partially unavailable",detail:"Open the planting tool for the available frost and crop guidance.",level:"",href:href,facts:[]};
    const frost=frostResult.data,crops=cropResult.data&&cropResult.data.crops||[],climate=frost.climate_normals;
    const mmdd=climate&&climate.dates&&(climate.dates.spring_10&&climate.dates.spring_10.mmdd||climate.dates.spring_50&&climate.dates.spring_50.mmdd),base=anchor(mmdd);
    if(!base)return {id:"planting",priority:8,kicker:"Garden",title:"Planting anchor unavailable",detail:"A usable NOAA freeze-probability station was not found.",level:"",href:href,facts:[]};
    const today=new Date();today.setHours(12,0,0,0);const actions=[];
    crops.forEach(function(crop){
      const setout=crop.setout_offset_days==null?null:addDays(base,crop.setout_offset_days);
      const indoor=setout&&crop.indoor_weeks!=null?addDays(setout,-7*crop.indoor_weeks):null;
      const direct=crop.direct_sow_offset_days==null?null:addDays(base,crop.direct_sow_offset_days);
      [["Start "+crop.name+" indoors",indoor],["Direct sow "+crop.name,direct],["Set out "+crop.name,setout]].forEach(function(pair){
        const label=pair[0],date=pair[1];if(!date)return;
        const diff=Math.round((today-date)/86400000);if(Math.abs(diff)<=7)actions.push({label:label,diff:diff,crop:crop});
      });
    });
    const freeze=frost.freeze_verdict&&frost.freeze_verdict.level,held=freeze==="freeze"||freeze==="hard-freeze";
    const usable=actions.filter(function(a){return !(held&&a.crop.season==="warm")}).slice(0,3);
    let title,detail,priority=20,level="";
    if(held){title="Freeze forecast constrains warm-season planting";detail=usable.length?usable.map(function(a){return a.label}).join(" · "):"Use the crop calendar for cool-season timing.";priority=82;level="danger"}
    else if(usable.length){title=usable[0].label+" now";detail=usable.slice(1).map(function(a){return a.label}).join(" · ")||"More crop windows are available in the full calendar.";priority=48}
    else{title="No primary spring action lands this week";detail="Use the full calendar for crop-by-crop timing; this ruleset does not infer unsourced fall succession windows.";priority=12}
    return {id:"planting",priority:priority,kicker:"Garden",title:title,detail:detail,level:level,href:href,facts:[crops.length+" sourced crop rules","NOAA "+(climate&&climate.confidence||"unknown")+" station confidence"],source:"NOAA + Cooperative Extension rules"};
  }
  function fallCard(result,loc){
    if(!result.ok)return {id:"fall",priority:4,kicker:"Season",title:"Fall timing unavailable",detail:result.error,level:"",href:N().withQuery("/national-tools/fall-color/",loc),facts:[]};
    const d=result.data,t=d.timing_context||{},w=d.typical_window;
    let priority=15,level="";
    if(/Inside/i.test(t.stage||"")){priority=72;level="warn"}
    else if(/Approaching/i.test(t.stage||""))priority=48;
    else if(/beyond/i.test(t.stage||""))priority=30;
    const facts=[];
    if(w)facts.push("Historical window "+w.start_date.slice(5).replace("-","/")+"–"+w.end_date.slice(5).replace("-","/"));
    if(d.current_weather_context&&d.current_weather_context.min_7d_f!=null)facts.push("7-day low "+d.current_weather_context.min_7d_f+"°F · weather shown separately");
    return {id:"fall",priority:priority,kicker:"Fall timing · beta",title:t.stage||"Historical fall timing",detail:t.trip_read||d.disclaimer,level:level,href:N().withQuery("/national-tools/fall-color/",loc),facts:facts,source:"USA-NPN historical satellite phenology + separate NWS weather"};
  }
  function cardHtml(card){
    const cls=statusClass(card.level||"");
    return '<article class="desk-card" data-tool="'+N().esc(card.id)+'">'+
      '<div class="desk-card-top"><span class="tool-kicker">'+N().esc(card.kicker)+'</span><span class="signal-dot '+cls+'" aria-hidden="true"></span></div>'+
      '<h3>'+N().esc(card.title)+'</h3><p>'+N().esc(card.detail||"")+'</p>'+
      (card.facts&&card.facts.length?'<ul class="desk-facts">'+card.facts.map(function(f){return '<li>'+N().esc(f)+'</li>'}).join("")+'</ul>':"")+
      (card.source?'<p class="source-line">'+N().esc(card.source)+'</p>':"")+
      '<a class="desk-open" href="'+N().esc(card.href)+'">Open '+N().esc(card.id==="fall"?"fall color":card.id)+' tool →</a></article>';
  }
  function renderSaved(root,onPick){
    const places=N().savedPlaces();
    if(!root)return;
    if(!places.length){root.innerHTML='<span class="small">No saved places yet.</span>';return}
    root.innerHTML=places.map(function(p){return '<button type="button" class="place-chip" data-place="'+N().esc(N().locationKey(p))+'">'+N().esc(N().label(p))+'</button>'}).join("");
    root.querySelectorAll("[data-place]").forEach(function(button){
      button.addEventListener("click",function(){
        const loc=places.find(function(p){return N().locationKey(p)===button.dataset.place});
        if(loc)onPick(loc);
      });
    });
  }
  async function load(loc,options){
    options=options||{};
    const root=options.root,status=options.status,saveButton=options.saveButton,savedRoot=options.savedRoot,onPick=options.onPick;
    const measure=options.measure!==false;
    if(status)status.textContent="Loading outdoor signals for "+N().label(loc)+"…";
    if(root){root.hidden=false;root.classList.add("loading")}
    const lat=encodeURIComponent(loc.latitude),lon=encodeURIComponent(loc.longitude);
    const results=await Promise.all([
      getJson("/api/national-aurora?lat="+lat+"&lon="+lon),
      getJson("/api/national-rivers?lat="+lat+"&lon="+lon),
      getJson("/api/national-frost?lat="+lat+"&lon="+lon),
      getJson("/api/national-fall-color?lat="+lat+"&lon="+lon),
      getJson("/data/national-planting-crops.json"),
      getJson("/api/national-coastal?lat="+lat+"&lon="+lon),
      getJson("/api/national-snow?lat="+lat+"&lon="+lon+(loc.stateCode?"&state="+encodeURIComponent(loc.stateCode):""))
    ]);
    const aurora=results[0],rivers=results[1],frost=results[2],fall=results[3],crops=results[4],coastal=results[5],snow=results[6];
    const cards=[auroraCard(aurora,loc),riverCard(rivers,loc),coastalCard(coastal,loc),snowCard(snow,loc),frostCard(frost,loc),plantingCard(frost,crops,loc),fallCard(fall,loc)].filter(Boolean).sort(function(a,b){return b.priority-a.priority});
    const ok=results.filter(function(x){return x.ok}).length;
    if(measure&&typeof N().track==="function")N().track("National Desk Loaded",{inputs_available:ok,inputs_total:7,coastal_visible:cards.some(function(card){return card.id==="coastal"}),snow_visible:cards.some(function(card){return card.id==="snow"})});
    if(root){
      root.classList.remove("loading");
      const title=root.querySelector("[data-desk-title]"),grid=root.querySelector("[data-desk-grid]"),health=root.querySelector("[data-desk-health]");
      if(title)title.textContent="Today near "+N().label(loc);
      if(grid)grid.innerHTML=cards.map(cardHtml).join("");
      if(health)health.textContent=ok+"/7 platform inputs responded · five core cards plus coastal and snow when relevant coverage exists · ordered by decision urgency, not marketing priority";
    }
    if(status)status.textContent=N().label(loc);
    if(saveButton){
      const already=N().savedPlaces().some(function(p){return N().locationKey(p)===N().locationKey(loc)});
      saveButton.textContent=already?"Saved place":"Save this place";saveButton.disabled=already;
      saveButton.onclick=function(){N().savePlace(loc);saveButton.textContent="Saved place";saveButton.disabled=true;renderSaved(savedRoot,onPick||function(){})};
    }
    return {cards:cards,results:{aurora:aurora,rivers:rivers,coastal:coastal,snow:snow,frost:frost,fall:fall,crops:crops}};
  }
  async function compare(left,right){
    const pair=await Promise.all([
      load(left,{measure:false}),
      load(right,{measure:false})
    ]);
    if(typeof N().track==="function")N().track("National Places Compared",{signals:Math.max(pair[0].cards.length,pair[1].cards.length)});
    return {
      left:{location:left,cards:pair[0].cards,results:pair[0].results},
      right:{location:right,cards:pair[1].cards,results:pair[1].results}
    };
  }
  window.NationalDashboard={load:load,renderSaved:renderSaved,compare:compare};
})();