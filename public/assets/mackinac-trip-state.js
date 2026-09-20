(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.MackinacTripState=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION="v1";
  const MAX_HASH=1800;
  const ENUMS={
    trip:new Set(["day-trip","overnight"]),
    bikes:new Set(["none","rent","bring"]),
    pace:new Set(["easy","balanced","active"]),
    mobility:new Set(["standard","limited"]),
    dinner:new Set(["none","casual","sit-down"]),
    duration:new Set(["day","one-night","two-three","four-plus","unsure"]),
    party:new Set(["solo","couple","family-young","family-teens","adults-friends","multigenerational","large-group"]),
    loss:new Set(["waiting","missing","walking","rushed","spending","crowds","weather","flexible"]),
    lodging:new Set(["downtown","quiet","resort","iconic"]),
    walk:new Set(["low","moderate","high"]),
    bikeStyle:new Set(["shoreline","mixed","hills"]),
    budget:new Set(["save","balanced","convenience"]),
    kidsAges:new Set(["under-6","6-12","teens","mixed"]),
    regional:new Set(["island-only","maybe","regional"]),
    weatherFlex:new Set(["fixed","shift-hours","shift-day"]),
    tuning:new Set(["relaxed","less-walking","outdoors","better-dinner","less-downtown","history"])
  };
  function cleanText(v,max=100){return String(v||"").trim().replace(/\s+/g," ").slice(0,max);}
  function cleanDate(v){const s=String(v||"");return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:"";}
  function cleanTime(v){const s=String(v||"");return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)?s:"";}
  function cleanInt(v,min,max,def=""){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>=min&&n<=max?String(n):def;}
  function cleanEnum(v,key){const s=String(v||"");return ENUMS[key]?.has(s)?s:"";}
  function cleanList(v,maxItems=8,maxLen=24){
    const src=Array.isArray(v)?v:String(v||"").split(",");
    return [...new Set(src.map(x=>cleanText(x,maxLen)).filter(Boolean))].slice(0,maxItems);
  }
  function sanitize(input={}){
    const intake=input.intake&&typeof input.intake==="object"?input.intake:{};
    return {
      trip_date:cleanDate(input.trip_date),
      origin_text:cleanText(input.origin_text,100),
      depart_at:cleanTime(input.depart_at),
      trip:cleanEnum(input.trip,"trip")||"day-trip",
      nights:cleanInt(input.nights,1,7,"1"),
      adults:cleanInt(input.adults,1,12,"2"),
      children:cleanInt(input.children,0,8,"0"),
      bikes:cleanEnum(input.bikes,"bikes")||"none",
      pace:cleanEnum(input.pace,"pace")||"balanced",
      mobility:cleanEnum(input.mobility,"mobility")||"standard",
      dinner:cleanEnum(input.dinner,"dinner")||"none",
      return_by:cleanText(input.return_by,12),
      event_start:cleanText(input.event_start,12),
      personas:cleanList(input.personas,5,24),
      interests:cleanList(input.interests,9,24),
      must_do:cleanList(input.must_do,6,24),
      tuning:cleanList(input.tuning,4,24).filter(x=>ENUMS.tuning.has(x)),
      intake:{
        trip_duration:cleanEnum(intake.trip_duration,"duration"),
        party:cleanEnum(intake.party,"party"),
        trip_vision:cleanList(intake.trip_vision,2,30),
        trip_loss:cleanEnum(intake.trip_loss,"loss"),
        lodging_style:cleanEnum(intake.lodging_style,"lodging"),
        walking_tolerance:cleanEnum(intake.walking_tolerance,"walk"),
        bike_style:cleanEnum(intake.bike_style,"bikeStyle"),
        budget_tradeoff:cleanEnum(intake.budget_tradeoff,"budget"),
        kids_ages:cleanEnum(intake.kids_ages,"kidsAges"),
        regional_interest:cleanEnum(intake.regional_interest,"regional"),
        weather_flexibility:cleanEnum(intake.weather_flexibility,"weatherFlex")
      }
    };
  }
  function encode(input={}){
    const x=sanitize(input),p=new URLSearchParams();
    p.set("plan",VERSION);
    const set=(k,v)=>{if(v!==""&&v!=null)p.set(k,String(v));};
    set("date",x.trip_date);set("from",x.origin_text);set("leave",x.depart_at);set("trip",x.trip);
    set("n",x.nights);set("a",x.adults);set("c",x.children);set("bikes",x.bikes);set("pace",x.pace);set("walk",x.mobility);set("dinner",x.dinner);
    set("back",x.return_by);set("event",x.event_start);
    if(x.personas.length)set("personas",x.personas.join(","));
    if(x.interests.length)set("likes",x.interests.join(","));
    if(x.must_do.length)set("must",x.must_do.join(","));
    if(x.tuning.length)set("tune",x.tuning.join(","));
    const q=x.intake;
    set("duration",q.trip_duration);set("party",q.party);
    if(q.trip_vision.length)set("vision",q.trip_vision.join(","));
    set("loss",q.trip_loss);set("lodging",q.lodging_style);set("walktol",q.walking_tolerance);
    set("bikestyle",q.bike_style);set("budget",q.budget_tradeoff);set("kids",q.kids_ages);set("regional",q.regional_interest);set("wxflex",q.weather_flexibility);
    const hash="#"+p.toString();
    return hash.length<=MAX_HASH?hash:"#plan="+VERSION;
  }
  function decode(hash=""){
    const raw=String(hash||"").replace(/^#/,"");
    if(!raw||raw.length>MAX_HASH)return null;
    const p=new URLSearchParams(raw);
    if(p.get("plan")!==VERSION)return null;
    return sanitize({
      trip_date:p.get("date"),origin_text:p.get("from"),depart_at:p.get("leave"),trip:p.get("trip"),
      nights:p.get("n"),adults:p.get("a"),children:p.get("c"),bikes:p.get("bikes"),pace:p.get("pace"),mobility:p.get("walk"),dinner:p.get("dinner"),
      return_by:p.get("back"),event_start:p.get("event"),personas:p.get("personas"),interests:p.get("likes"),must_do:p.get("must"),tuning:p.get("tune"),
      intake:{trip_duration:p.get("duration"),party:p.get("party"),trip_vision:p.get("vision"),trip_loss:p.get("loss"),lodging_style:p.get("lodging"),walking_tolerance:p.get("walktol"),bike_style:p.get("bikestyle"),budget_tradeoff:p.get("budget"),kids_ages:p.get("kids"),regional_interest:p.get("regional"),weather_flexibility:p.get("wxflex")}
    });
  }
  return{VERSION,MAX_HASH,sanitize,encode,decode};
});
