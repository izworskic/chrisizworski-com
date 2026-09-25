"use strict";

const handler=require("../lib/blue-ridge-parkway/engine.js");
const pointToPoint=require("../lib/blue-ridge-parkway/point-to-point.js");

function round(value,digits=1){const n=Number(value);return Number.isFinite(n)?Math.round(n*10**digits)/10**digits:null;}

function alternativeReason(selected,alt,input={}){
  if(!selected||!alt)return"";
  const available=Number(input.hours);
  if(alt.blocked)return"Why it lost: an official road closure overlaps this route, so it is not eligible.";
  if(Number.isFinite(available)&&Number(alt.durationHours)>available+.3)return`Why it lost: the modeled outing is ${alt.durationHours} hours, which does not fit your ${available}-hour window.`;
  if(selected.tripMode==="point-to-point"){
    const selectedStops=(selected.stops||[]).length,altStops=(alt.stops||[]).length;
    if(altStops>selectedStops)return"Why it lost: it spends more of the fixed corridor on optional stops and leaves less arrival-time margin.";
    if(altStops<selectedStops)return"Why it lost: it protects more time, but gives up stops that better match the interests you selected.";
    return"Why it lost: the selected stop mix ranked higher for the same fixed start, finish, road status and weather window.";
  }
  if((alt.cautions||[]).length&&!(selected.cautions||[]).length)return"Why it lost: this route has an official road or construction caution while the selected route does not.";
  if(alt.weather?.ok===false&&selected.weather?.ok===true)return"Why it lost: the selected route has a usable route-specific NWS forecast while this alternative does not.";
  if(alt.viewOutlook?.tone==="poor"&&selected.viewOutlook?.tone!=="poor")return"Why it lost: its forecast-derived view outlook is more limited than the selected route.";
  const delta=round(Number(alt.durationHours)-Number(selected.durationHours),1);
  if(Number.isFinite(delta)&&delta>.2)return`Why it lost: it uses about ${delta} more hours than the selected route without winning the road, weather and interest checks.`;
  if(alt.direction!==selected.direction)return"Why it lost: the selected Parkway direction fit the current time, conditions and interests better.";
  return"Why it lost: the selected route ranked higher after the road, time, mountain-weather and interest checks.";
}

function enrichPayload(payload){
  if(!payload||payload.ok!==true)return payload;
  const selected=payload.selected||null;
  if(selected&&Array.isArray(payload.alternatives))payload.alternatives=payload.alternatives.map(alt=>({...alt,whyNotSelected:alternativeReason(selected,alt,payload.input||{})}));
  const sources=Array.isArray(payload.sources)?payload.sources:[],nws=sources.find(source=>source?.name==="National Weather Service");
  if(nws){const weather=selected?.weather,available=weather?.ok===true;nws.status=available?"live":"unavailable";nws.url=available&&weather?.source?weather.source:"https://www.weather.gov/";nws.updated=available&&weather?.updatedAt?weather.updatedAt:null;nws.note=available?"Hourly forecast loaded for representative high terrain on the selected route.":"The selected route's NWS hourly forecast could not be loaded. No gateway-city forecast was substituted.";}
  return payload;
}

module.exports=async function blueRidgeParkway(req,res){
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  const originalJson=res.json.bind(res);res.json=payload=>originalJson(enrichPayload(payload));
  const start=String(req?.query?.gateway||""),finish=String(req?.query?.finish||"return");
  return finish&&finish!=="return"&&finish!==start?pointToPoint(req,res):handler(req,res);
};

module.exports._test={alternativeReason,enrichPayload};
