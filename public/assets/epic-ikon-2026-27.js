/* 2026/27 Epic / Ikon pass policy decision engine.
 * Versioned, curated US + Whistler roster; NO live resort/booking API.
 * Sources: https://www.epicpass.com/info/peak-restricted-dates.aspx
 * https://www.whistler.com/skiing/lift-tickets/passes/
 * https://www.ikonpass.com/en/compare-passes
 * https://www.ikonpass.com/en/how-to-use-your-ikon-pass
 * Rules verified 2026-10-12. Never infer reservation inventory or opening status.
 */
(function(root,factory){const value=factory(); if(typeof module==="object"&&module.exports)module.exports=value;root.PassDecoder=value;})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const RELEASE="2026-10-12", SEASON="2026/27";
 const EPIC_URL="https://www.epicpass.com/info/peak-restricted-dates.aspx";
 const EPIC_ACCESS="https://www.whistler.com/skiing/lift-tickets/passes/";
 const IKON_URL="https://www.ikonpass.com/en/compare-passes";
 const IKON_HELP="https://www.ikonpass.com/en/how-to-use-your-ikon-pass";
 const PASS_NAMES={epic:"Epic Pass",epicLocal:"Epic Local Pass",epicDay:"Epic Day Pass — all resorts",ikon:"Ikon Pass",ikonBase:"Ikon Base Pass",ikonSession:"Ikon Session Pass"};
 const dates=(s)=>new Set(s.split(" ").filter(Boolean));
 const epicBlackouts=dates("2026-11-27 2026-11-28 2026-12-26 2026-12-27 2026-12-28 2026-12-29 2026-12-30 2026-12-31 2027-01-16 2027-02-13 2027-02-14");
 const ikonBlackouts=dates("2026-12-26 2026-12-27 2026-12-28 2026-12-29 2026-12-30 2027-01-16 2027-01-17 2027-02-13 2027-02-14");
 // Ikon f/b: U=unlimited, integer=shared/specific-days-per-destination, X=not included.
 // Session uses a single global 2-4 day bank and is limited to confirmed destinations.
 // All values apply ONLY to named curated locations, not to every mountain globally.
 const resorts=[];
 function add(name,region,brand,detail={}){const id=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");resorts.push(Object.freeze({id,name,region,brand,...detail}));}
 [
 ["Vail","CO"],["Beaver Creek","CO"],["Whistler Blackcomb","BC"],["Breckenridge","CO"],["Keystone","CO"],["Crested Butte","CO"],["Park City","UT"],["Heavenly","CA/NV"],["Northstar","CA"],["Kirkwood","CA"],["Stevens Pass","WA"],["Stowe","VT"],["Okemo","VT"],["Mount Snow","VT"],["Hunter Mountain","NY"],["Mount Sunapee","NH"],["Attitash","NH"],["Wildcat","NH"],["Crotched","NH"],["Liberty Mountain","PA"],["Roundtop","PA"],["Whitetail","PA"],["Jack Frost","PA"],["Big Boulder","PA"],["Seven Springs","PA"],["Hidden Valley Pennsylvania","PA"],["Laurel Mountain","PA"],["Mt. Brighton","MI"],["Afton Alps","MN"],["Wilmot Mountain","WI"],["Alpine Valley","OH"],["Boston Mills","OH"],["Brandywine","OH"],["Mad River Mountain","OH"],["Hidden Valley Missouri","MO"],["Snow Creek","MO"],["Paoli Peaks","IN"]
 ].forEach(([n,r])=>add(n,r,"epic",{
   epicLocalLimit:["Vail","Beaver Creek","Whistler Blackcomb"].includes(n)?10:n==="Stowe"?10:null,
   epicLocalGroup:["Vail","Beaver Creek","Whistler Blackcomb"].includes(n)?"epic-local-premium":n==="Stowe"?"epic-local-stowe":null,
   epicLocalRestricted:["Vail","Beaver Creek","Whistler Blackcomb","Park City","Heavenly","Northstar","Kirkwood","Stowe"].includes(n)
 }));
 // Ikon confirmed US roster: f/b denotes access to this mountain (not ownership).
 [
 ["Arapahoe Basin","CO","U","U",true],["Big Bear Mountain Resort","CA","U","U",true],
 ["Copper Mountain","CO","U","U",true],["Eldora","CO","U","U",true],
 ["June Mountain","CA","U","U",true],["Mammoth Mountain","CA","U","U",true],
 ["Palisades Tahoe","CA","U","U",true],["Snowshoe","WV","U","U",true],
 ["Snow Valley","CA","U","U",true],["Solitude","UT","U","U",true],
 ["Stratton","VT","U","U",true],["Sugarbush","VT","U","U",true],
 ["Winter Park","CO","U","U",true],["Crystal Mountain","WA","U",5,true],
 ["Schweitzer","ID","U",5,true],["Steamboat","CO","U",5,true],
 ["Alyeska","AK",7,5,true],["Big Sky","MT",7,5,true],
 ["Brighton","UT",7,5,true],["Taos Ski Valley","NM",7,5,true],
 ["Blue Mountain Pennsylvania","PA",7,5,true],["Boyne Mountain","MI",7,5,true],
 ["Camelback","PA",7,5,true],["Granite Peak","WI",7,5,true],
 ["Killington","VT",7,5,true],["Pico Mountain","VT",7,5,true],
 ["Loon Mountain","NH",7,5,true],["Lutsen Mountains","MN",7,5,true],
 ["Mount Bachelor","OR",7,5,true],["Sierra-at-Tahoe","CA",7,5,true],
 ["Snowriver","MI",7,5,true],["Sugarloaf","ME",7,5,true],
 ["Sunday River","ME",7,5,true],["The Highlands","MI",7,5,true],
 ["Summit at Snoqualmie","WA",7,5,true],
 ["Snowbird","UT",7,5,false],["Alta","UT",7,"X",false],
 ["Snowmass","CO",7,5,false],["Aspen Mountain","CO",7,"X",false],
 ["Aspen Highlands","CO",7,"X",false],["Buttermilk","CO",7,"X",false],
 ["Deer Valley","UT",7,"X",false],["Jackson Hole","WY",7,"X",false],
 ["Snowbasin","UT",7,"X",false],["Sun Valley","ID",7,"X",false]
 ].forEach(([n,r,f,b,s])=>add(n,r,"ikon",{
   ikonFull:f,ikonBase:b,ikonSession:s,
   group:["Alta","Snowbird"].includes(n)?"alta-snowbird":
    ["Snowmass","Aspen Mountain","Aspen Highlands","Buttermilk"].includes(n)?"aspen-snowmass":
    ["Killington","Pico Mountain"].includes(n)?"killington-pico":null,
   reservation:["Deer Valley","Jackson Hole","Loon Mountain"].includes(n),
   note:n==="Snowmass"?"Ikon Base access is Snowmass-only, not all Aspen Snowmass mountains.":
        n==="Big Sky"?"Big Sky tram access is not included.":null
 }));
 const byId=Object.fromEntries(resorts.map(r=>[r.id,r]));
 const result=(status,title,explanation,extra={})=>({status,title,explanation,release:RELEASE,season:SEASON, ...extra});
 const isoValid=(str)=>typeof str==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(str)&&!Number.isNaN(Date.parse(str+"T12:00:00Z"))&&new Date(str+"T12:00:00Z").toISOString().slice(0,10)===str;
 const isCount=(v)=>v!==""&&v!==null&&v!==undefined&&Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=366;
 function evaluate(input){
   const p=input&&input.pass,r=byId[input&&input.resort],date=input&&input.date;
   if(!PASS_NAMES[p]||!r||!isoValid(date))return result("UNKNOWN","Choose a pass, resort and valid date.","The decision needs a supported pass, destination and date.");
   if(date<"2026-11-01"||date>"2027-05-31")return result("UNKNOWN","Outside the current Northern Hemisphere winter scope.","This calculator covers Nov 2026–May 2027, not shoulder-season or Southern Hemisphere access.");
   const sourceUrl=p.startsWith("epic")?EPIC_URL:IKON_URL;
   if((p.startsWith("epic")&&r.brand!=="epic")||(p.startsWith("ikon")&&r.brand!=="ikon"))
     return result("NO","Not included in this pass network.",r.name+" is not included in the modeled "+(p.startsWith("epic")?"Epic":"Ikon")+" destination network.",{sourceUrl});
   const caveats=["Pass-rule eligibility is not a lift, road, weather or reservation availability report. Check the resort before traveling."];
   let limit=null,group=r.id,blackout=false;
   if(p==="epic"){
     // Owned US/Whistler venues only; foreign / partner packages intentionally omitted.
   }else if(p==="epicLocal"){
     limit=r.epicLocalLimit;group=r.epicLocalGroup||r.id;
     blackout=!!r.epicLocalRestricted&&epicBlackouts.has(date);
   }else if(p==="epicDay"){
     const total=input.epicDayTotal;
     if(!isCount(total)||Number(total)<1||Number(total)>7)
       return result("UNKNOWN","Enter the Epic Day Pass days purchased.","An Epic Day Pass can contain 1–7 total days; enter the purchased amount.",{sourceUrl});
     if(input.epicPeak!=="yes"&&input.epicPeak!=="no")
       return result("UNKNOWN","Choose whether your Epic Day Pass includes peak dates.","An Epic Day Pass can be purchased with or without holiday access.",{sourceUrl});
     limit=Number(total);group="epic-day-total";blackout=input.epicPeak==="no"&&epicBlackouts.has(date);
   }else{
     limit=p==="ikon"?r.ikonFull:p==="ikonBase"?r.ikonBase:r.ikonSession?Number(input.sessionTotal):"X";
     group=r.group||r.id;
     if(limit==="X")return result("NO","This pass does not cover this destination.",r.name+" is excluded from the selected Ikon pass product for 2026–27.",{sourceUrl});
     if(p==="ikonSession"){
       if(!isCount(input.sessionTotal)||Number(input.sessionTotal)<2||Number(input.sessionTotal)>4)
         return result("UNKNOWN","Select your Ikon Session Pass size.","Session Passes provide 2, 3 or 4 total days across participating destinations.",{sourceUrl});
       group="ikon-session-total";
     }else if(p==="ikonBase"&&r.name==="Snowbird"){group="snowbird-base";}
     if(p==="ikonBase"||p==="ikonSession")blackout=ikonBlackouts.has(date);
   }
   if(blackout)return result("NO","Restricted on this date.",PASS_NAMES[p]+" has a published blackout restriction at "+r.name+" on "+date+".",{sourceUrl,reason:"blackout"});
   const limited=limit!==null&&limit!=="U"&&Number.isFinite(Number(limit));
   if(limited){
      const used=input.usedDays;
      if(!isCount(used))return result("CHECK","How many applicable days have you used?","The pass rules allow up to "+limit+" days in the "+(group==="epic-local-premium"?"combined Vail / Beaver Creek / Whistler pool":group==="alta-snowbird"?"shared Alta / Snowbird pool":group==="aspen-snowmass"?"shared Aspen Snowmass pool":group==="killington-pico"?"shared Killington / Pico pool":group==="ikon-session-total"?"total Session Pass pool":group==="epic-day-total"?"total Epic Day Pass pool":"resort allowance")+". Enter used days to confirm a remaining day.",{limit,group,sourceUrl,reason:"usage-unknown"});
      if(Number(used)>=Number(limit))
        return result("NO","Your reported day allowance is exhausted.","You've used "+used+" of "+limit+" permitted days for this allowance. A separate lift ticket or different pass may be needed.",{limit,group,sourceUrl,reason:"exhausted"});
      caveats.push((Number(limit)-Number(used))+" reported day(s) remain in the relevant allowance before this visit.");
   }
   if(r.reservation){
     if(input.reservationMade!=="yes")
       return result("ACTION","Reservation required before skiing.",r.name+" requires an Ikon lift reservation for 2026–27. Pass-rule access alone does not secure a reservation.",{sourceUrl:IKON_HELP,reason:"reservation",caveats});
     caveats.push("Reservation is self-reported; we cannot confirm its existence or validity.");
   }
   if(r.note)caveats.push(r.note);
   return result("YES","Pass rules permit this visit.",PASS_NAMES[p]+" includes "+r.name+" on "+date+" under the published 2026–27 rules"+(limited?", subject to your entered days used":"")+".",{limit,group,sourceUrl,caveats,reason:"rules-eligible"});
 }
 function compare(input){
   return Object.keys(PASS_NAMES).map(pass=>{const own=pass===input.pass;const scenario=own?{...input,pass}:{...input,pass,usedDays:undefined,reservationMade:"unknown",epicDayTotal:undefined,epicPeak:undefined,sessionTotal:undefined};return {pass,name:PASS_NAMES[pass],...evaluate(scenario)};});
 }
 function nextDate(input,maxDays=30){
   if(!isoValid(input.date))return null;
   const base=new Date(input.date+"T12:00:00Z").getTime();
   for(let i=1;i<=maxDays;i++){
     const date=new Date(base+i*86400000).toISOString().slice(0,10);
     const x=evaluate({...input,date});
     if(x.status==="YES"||x.status==="ACTION"||x.status==="CHECK")return {date,...x};
   }
   return null;
 }
 return Object.freeze({RELEASE,SEASON,PASS_NAMES,EPIC_URL,IKON_URL,IKON_HELP,resorts:Object.freeze(resorts),byId,evaluate,compare,nextDate,epicBlackouts,ikonBlackouts});
});