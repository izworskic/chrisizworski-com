"use strict";

const TUNINGS=Object.freeze([
  {id:"relaxed",label:"More relaxed"},
  {id:"less-walking",label:"Less walking"},
  {id:"outdoors",label:"More outdoors"},
  {id:"better-dinner",label:"Better dinner"},
  {id:"less-downtown",label:"Less downtown"},
  {id:"history",label:"More history"}
]);
const IDS=new Set(TUNINGS.map(x=>x.id));
function clean(list){
  const src=Array.isArray(list)?list:String(list||"").split(",");
  return [...new Set(src.map(x=>String(x||"").trim()).filter(x=>IDS.has(x)))].slice(0,4);
}
function addUnique(list,value){return [...new Set([...(list||[]),value])];}
function applyProfile(profile={},tunings=[]){
  const t=new Set(clean(tunings));
  const p={...profile,interests:[...(profile.interests||[])],must_do:[...(profile.must_do||[])],tunings:[...t]};
  if(t.has("relaxed"))p.pace="easy";
  if(t.has("less-walking"))p.mobility="limited";
  if(t.has("outdoors"))p.interests=addUnique(p.interests,"scenery");
  if(t.has("better-dinner")){p.dinner="sit-down";p.interests=addUnique(p.interests,"food");}
  if(t.has("history")){p.interests=addUnique(p.interests,"history");p.must_do=addUnique(p.must_do,"fort");}
  if(t.has("less-downtown"))p.interests=p.interests.filter(x=>x!=="shopping");
  return p;
}
function cap(n){return Math.max(0,Math.min(1,Math.round(Number(n)*100)/100));}
function applyVisitor(visitor={},tunings=[]){
  const t=new Set(clean(tunings)),v={...(visitor.vector||{})};
  const add=(key,n)=>{v[key]=cap((Number(v[key])||0)+n);};
  if(t.has("relaxed")){add("pace",-.25);add("schedule_flexibility",.16);add("crowd_avoidance",.08);}
  if(t.has("less-walking")){v.walking_tolerance=.08;add("pace",-.1);}
  if(t.has("outdoors")){add("outdoors",.3);add("photography",.12);add("shopping",-.08);}
  if(t.has("better-dinner")){add("food",.3);add("special_occasion",.12);add("budget_sensitivity",-.08);}
  if(t.has("less-downtown")){add("crowd_avoidance",.2);add("shopping",-.28);add("outdoors",.12);}
  if(t.has("history")){add("history",.34);add("iconic_priority",.14);}
  return {...visitor,vector:v,tunings:[...t],tuning_note:t.size?"Trip preferences adjusted after the initial profile. Base trip facts and logistics are unchanged.":null};
}
module.exports={TUNINGS,clean,applyProfile,applyVisitor};
