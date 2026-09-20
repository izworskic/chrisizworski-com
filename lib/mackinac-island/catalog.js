"use strict";

const SOURCE={
  stay:"https://www.mackinacisland.org/stay/",
  resorts:"https://www.mackinacisland.org/stay/resorts/",
  historic:"https://www.mackinacisland.org/blog/post/mackinac-islands-most-historic-hotels/",
  offPath:"https://www.mackinacisland.org/blog/post/mackinac-island-places-to-stay-off-the-beaten-path/",
  pools:"https://www.mackinacisland.org/blog/post/swimming-pools-on-mackinac-island/",
  pets:"https://www.mackinacisland.org/blog/post/a-dog-friendly-trip-to-mackinac-island/",
  dining:"https://www.mackinacisland.org/dining/",
  lunchDinner:"https://www.mackinacisland.org/blog/post/where-to-eat-lunch-dinner-on-mackinac-island/",
  outdoorDining:"https://www.mackinacisland.org/blog/post/outdoor-dining-on-mackinac-island/",
  dietary:"https://www.mackinacisland.org/blog/post/vegetarian-options-on-mackinac-island-special-dietary-restaurant-options/",
  luxury:"https://www.mackinacisland.org/blog/post/luxury-travel-on-mackinac-island/",
  season:"https://www.mackinacisland.org/season-updates/",
  mackinaw:"https://mackinawcity.com/things-to-do/",
  mackinawArea:"https://mackinawcity.com/area-info/",
  stIgnace:"https://stignace.com/attractions/"
};

const LODGING=Object.freeze([
  {id:"grand-hotel",name:"Grand Hotel",district:"Grand Hotel",type:"full-service resort",fit:{special_occasion:1,iconic_priority:1,food:.82,history:.8,photography:.72,kids_priority:.55,outdoors:.5,budget_sensitivity:.08,crowd_avoidance:.42},traits:["iconic","historic","full-service","pool","hot tub","on-site dining"],note:"Best fit when the hotel itself is meant to be a major part of the Mackinac experience.",source_url:SOURCE.resorts,detail_source:SOURCE.luxury,closing_2026:"2026-10-26"},
  {id:"mission-point",name:"Mission Point Resort",district:"Mission District",type:"full-service resort",fit:{special_occasion:.68,iconic_priority:.48,food:.72,history:.35,photography:.78,kids_priority:.9,outdoors:.86,budget_sensitivity:.22,crowd_avoidance:.68},traits:["resort","Great Lawn","pool","hot tub","pet-friendly rooms","east of downtown","on-site dining"],note:"Strong fit for families and outdoor-oriented stays that value lawn, lake and resort amenities outside the downtown core.",source_url:SOURCE.resorts,detail_source:SOURCE.pets,closing_2026:"2026-10-25"},
  {id:"inn-at-stonecliffe",name:"The Inn at Stonecliffe",district:"Stonecliffe",type:"historic inn / resort-style stay",fit:{special_occasion:.86,iconic_priority:.48,food:.72,history:.68,photography:.96,kids_priority:.42,outdoors:.7,budget_sensitivity:.14,crowd_avoidance:1},traits:["quiet","west side","historic mansion","pool","sunset","about 2 miles from downtown"],note:"Best fit when quiet, sunset and a destination-style stay matter more than walking out the door into downtown.",source_url:SOURCE.offPath,detail_source:SOURCE.pools,closing_2026:null},
  {id:"hotel-iroquois",name:"Hotel Iroquois",district:"West end of downtown",type:"historic waterfront hotel",fit:{special_occasion:.9,iconic_priority:.65,food:.92,history:.82,photography:.92,kids_priority:.28,outdoors:.52,budget_sensitivity:.15,crowd_avoidance:.65},traits:["Historic Hotels of America","waterfront","gardens","Carriage House dining","near Windermere Point"],note:"A strong special-occasion fit for visitors who want waterfront character and fine dining while staying close to downtown.",source_url:SOURCE.historic,detail_source:SOURCE.luxury,closing_2026:null},
  {id:"island-house",name:"Island House Hotel",district:"Harbor / east edge of downtown",type:"historic waterfront hotel",fit:{special_occasion:.65,iconic_priority:.72,food:.72,history:.9,photography:.82,kids_priority:.65,outdoors:.58,budget_sensitivity:.28,crowd_avoidance:.5},traits:["historic","harbor views","pool","indoor + outdoor hot tubs","1852 Grill Room"],note:"Balances historic Mackinac character, harbor access and family-friendly amenities near downtown.",source_url:SOURCE.historic,detail_source:SOURCE.pools,closing_2026:null},
  {id:"lake-view",name:"Lake View Hotel",district:"Downtown",type:"historic downtown hotel",fit:{special_occasion:.42,iconic_priority:.55,food:.62,history:.56,photography:.4,kids_priority:.72,outdoors:.38,budget_sensitivity:.45,crowd_avoidance:.25},traits:["downtown","pool","hot tub","near dining and shops"],note:"A practical fit when downtown convenience and a pool matter more than getting away from the activity.",source_url:SOURCE.stay,detail_source:SOURCE.pools,closing_2026:null},
  {id:"sunset-condos",name:"Sunset Condominiums",district:"Stonecliffe",type:"condominium",fit:{special_occasion:.5,iconic_priority:.25,food:.25,history:.3,photography:.92,kids_priority:.75,outdoors:.62,budget_sensitivity:.58,crowd_avoidance:1},traits:["quiet","full kitchens","fireplaces","balconies","sunset views","larger-party flexibility"],note:"Useful for longer stays, groups and visitors who value space, kitchens and quiet west-side evenings.",source_url:SOURCE.offPath,detail_source:SOURCE.stay,closing_2026:null}
]);

const DINING=Object.freeze([
  {id:"carriage-house",name:"Carriage House",district:"West end of downtown",style:"fine dining",price_band:"$$$",fit:{food:1,special_occasion:1,photography:.88,crowd_avoidance:.55,budget_sensitivity:.08,kids_priority:.22,history:.55},traits:["waterfront","outdoor seating","live piano","Hotel Iroquois"],meal:["lunch","dinner"],note:"A special-occasion waterfront meal that fits a slower or romantic Mackinac plan.",source_url:SOURCE.luxury,season_status:"check"},
  {id:"woods",name:"Woods Restaurant",district:"Island interior",style:"Bavarian-inspired fine dining",price_band:"$$$",fit:{food:.95,special_occasion:.95,photography:.48,crowd_avoidance:.9,budget_sensitivity:.06,kids_priority:.35,history:.45},traits:["interior","live piano","duckpin bowling","destination meal"],meal:["dinner"],note:"Best when dinner itself is an experience and the trip can absorb travel away from downtown.",source_url:SOURCE.lunchDinner,closing_2026:"2026-10-24"},
  {id:"1852-grill-room",name:"1852 Grill Room",district:"Harbor",style:"fine dining",price_band:"$$$",fit:{food:.92,special_occasion:.82,photography:.84,crowd_avoidance:.55,budget_sensitivity:.12,kids_priority:.35,history:.66},traits:["harbor views","fresh fish","Island House Hotel"],meal:["dinner"],note:"Strong when you want an elevated meal with harbor views without going deep into the Island interior.",source_url:SOURCE.luxury,season_status:"check"},
  {id:"pink-pony",name:"Pink Pony",district:"Downtown waterfront",style:"lively bar & grill",price_band:"$$$",fit:{food:.7,special_occasion:.45,photography:.65,crowd_avoidance:.15,budget_sensitivity:.28,kids_priority:.35,shopping:.82},traits:["downtown","waterfront","live entertainment","social"],meal:["lunch","dinner","drinks"],note:"Fits visitors who want downtown energy, waterfront atmosphere and nightlife rather than a quiet meal.",source_url:SOURCE.lunchDinner,closing_2026:"2026-10-25"},
  {id:"fort-tea-room",name:"Fort Mackinac Tea Room",district:"Fort Mackinac",style:"scenic lunch",price_band:"$$",fit:{food:.62,special_occasion:.52,photography:.94,crowd_avoidance:.48,budget_sensitivity:.42,kids_priority:.55,history:1},traits:["fort","harbor overlook","lunch","pairs with history itinerary"],meal:["lunch"],note:"The cleanest meal pairing for a history-first day because it avoids leaving the Fort area for lunch.",source_url:SOURCE.outdoorDining,closing_2026:"2026-10-25"},
  {id:"great-turtle",name:"Great Turtle Brewery & Distillery",district:"Downtown",style:"brewpub",price_band:"$$",fit:{food:.68,special_occasion:.35,photography:.25,crowd_avoidance:.22,budget_sensitivity:.48,kids_priority:.45,shopping:.68},traits:["downtown","craft brewery","casual"],meal:["lunch","dinner","drinks"],note:"A flexible downtown stop when the plan values casual food and drinks over a destination meal.",source_url:SOURCE.lunchDinner,season_status:"check"},
  {id:"douds-picnic",name:"Doud’s Market & Deli",district:"Downtown / Marquette Park",style:"grab-and-go",price_band:"$",fit:{food:.4,special_occasion:.08,photography:.48,crowd_avoidance:.72,budget_sensitivity:1,kids_priority:.82,outdoors:.82},traits:["grab-and-go","picnic","flexible timing","year-round market"],meal:["breakfast","lunch","snacks"],note:"Useful when saving time, feeding kids or turning lunch into a picnic matters more than a sit-down restaurant.",source_url:SOURCE.season,season_status:"year-round"},
  {id:"mighty-mac",name:"Mighty Mac Hamburgers",district:"Downtown",style:"quick casual",price_band:"$",fit:{food:.42,special_occasion:.05,photography:.12,crowd_avoidance:.35,budget_sensitivity:.9,kids_priority:.9,shopping:.55},traits:["quick bite","downtown","casual"],meal:["lunch","dinner"],note:"A practical option when the plan needs a fast, kid-friendly or value-oriented downtown meal.",source_url:SOURCE.lunchDinner,season_status:"check"}
]);

const REGIONAL=Object.freeze([
  {id:"colonial-michilimackinac",name:"Colonial Michilimackinac",gateway:"Mackinaw City",type:"history",fit:{regional_exploration:.9,history:1,kids_priority:.75,outdoors:.5,photography:.58,iconic_priority:.78},note:"A high-value mainland extension for history-first visitors or families approaching through Mackinaw City.",source_url:SOURCE.mackinaw},
  {id:"headlands",name:"Headlands International Dark Sky Park",gateway:"Mackinaw City",type:"night sky / outdoors",fit:{regional_exploration:.92,history:.1,kids_priority:.48,outdoors:.88,photography:1,iconic_priority:.55},note:"Best for overnight regional trips that can use a clear evening on the mainland.",source_url:SOURCE.mackinawArea},
  {id:"icebreaker-mackinaw",name:"Icebreaker Mackinaw Maritime Museum",gateway:"Mackinaw City",type:"maritime history",fit:{regional_exploration:.8,history:.82,kids_priority:.72,outdoors:.2,photography:.42,iconic_priority:.55},note:"A compact maritime-history add-on near the Mackinaw City ferry gateway.",source_url:SOURCE.mackinaw},
  {id:"ojibwa-culture",name:"Museum of Ojibwa Culture / Marquette Mission Park",gateway:"St. Ignace",type:"culture / history",fit:{regional_exploration:.88,history:1,kids_priority:.58,outdoors:.35,photography:.48,iconic_priority:.52},note:"A meaningful history-and-culture stop when the trip naturally runs through St. Ignace.",source_url:SOURCE.stIgnace}
]);

function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)));}
function closeness(a,b){return 1-Math.abs(Number(a)-Number(b));}
function activeForDate(item,date){
  if(!date||!item.closing_2026)return true;
  if(!String(date).startsWith("2026-"))return true;
  return date<=item.closing_2026;
}
function seasonLabel(item,date){
  if(item.season_status==="year-round")return"Market listed year-round";
  if(item.closing_2026&&String(date||"").startsWith("2026-")){
    return date<=item.closing_2026?"Published 2026 closing: "+item.closing_2026:"Past published 2026 closing ("+item.closing_2026+")";
  }
  return"Seasonal status: verify for your date";
}
function fitScore(item,vector={}){
  const keys=Object.keys(item.fit||{});
  if(!keys.length)return 50;
  let total=0,weight=0;
  for(const key of keys){
    if(vector[key]==null)continue;
    const w=(key==="kids_priority"||key==="crowd_avoidance"||key==="budget_sensitivity")?1.25:1;
    total+=closeness(vector[key],item.fit[key])*w;weight+=w;
  }
  return Math.round(clamp(weight?total/weight*100:50,0,100));
}
function explain(item,vector={}){
  const reasons=[];
  if(vector.crowd_avoidance>=.72&&item.fit?.crowd_avoidance>=.7)reasons.push("quieter fit");
  if(vector.kids_priority>=.7&&item.fit?.kids_priority>=.7)reasons.push("family fit");
  if(vector.food>=.72&&item.fit?.food>=.75)reasons.push("food matters here");
  if(vector.special_occasion>=.68&&item.fit?.special_occasion>=.75)reasons.push("special-occasion fit");
  if(vector.photography>=.75&&item.fit?.photography>=.75)reasons.push("strong scenery");
  if(vector.history>=.75&&item.fit?.history>=.75)reasons.push("history fit");
  if(vector.budget_sensitivity>=.75&&item.fit?.budget_sensitivity>=.75)reasons.push("value-oriented");
  if(vector.regional_exploration>=.72&&item.fit?.regional_exploration>=.75)reasons.push("regional fit");
  return reasons.slice(0,2).join(" · ")||item.note;
}
function rank(items,vector,date,limit=4){
  return items.map(item=>({...item,fit_score:fitScore(item,vector),fit_reason:explain(item,vector),season_status_label:seasonLabel(item,date),season_eligible:activeForDate(item,date)}))
    .sort((a,b)=>(Number(b.season_eligible)-Number(a.season_eligible))||b.fit_score-a.fit_score||a.name.localeCompare(b.name)).slice(0,limit);
}
function recommendations(profile={},date){
  const vector=profile.vector||{};
  const duration=profile.answers?.trip_duration||null;
  const overnight=["one-night","two-three","four-plus"].includes(duration);
  return {
    lodging:{relevant:overnight,truth:"Fit ranking only. No room availability or live rate has been checked.",directory_url:SOURCE.stay,recommended:rank(LODGING,vector,date,4)},
    dining:{relevant:true,truth:"Fit ranking only. Hours, waits, reservations and table availability must be checked for the trip date.",directory_url:SOURCE.dining,recommended:rank(DINING,vector,date,5)},
    regional:{relevant:Number(vector.regional_exploration||0)>=.45,truth:"Regional suggestions are route ideas, not evidence that an attraction is open at the planned arrival time.",recommended:rank(REGIONAL,vector,date,4)}
  };
}

module.exports={SOURCE,LODGING,DINING,REGIONAL,recommendations,_test:{fitScore,rank,activeForDate,seasonLabel}};
