(function(root){
  "use strict";
  const BASE="https://chrisizworski.com";
  const rates={
    sheplers:{name:"Shepler's Ferry",adult:39,kid:27,bike:21,militaryAdult:24,militaryKid:16,dayPark:15,nightPark:25,feePerPaidTicket:2,minutes:60,book:"https://www.sheplersferry.com/ticket-options/",schedule:"https://www.sheplersferry.com/",park:"https://www.sheplersferry.com/mackinaw-city-directions/"},
    arnold:{name:"Arnold Fast Ferry",adult:37,kid:25,bike:19,militaryAdult:24,militaryKid:16,dayPark:10,nightPark:20,feePerPaidTicket:null,minutes:45,book:"https://www.arnoldtransitcompany.com/tickets/",schedule:"https://www.arnoldtransitcompany.com/summer-schedule/",park:"https://www.arnoldtransitcompany.com/summer-parking/"},
    classic:{name:"Arnold Classic Ferry",adult:26,kid:19,bike:19,militaryAdult:24,militaryKid:16,dayPark:15,nightPark:25,feePerPaidTicket:null,minutes:45,book:"https://www.arnoldtransitcompany.com/tickets/",schedule:"https://www.arnoldtransitcompany.com/summer-schedule/",park:"https://www.arnoldtransitcompany.com/summer-parking/"}
  };
  function whole(n,min,max){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.floor(n))):min;}
  function compare(input){
    const date=String(input.date||"");
    const adults=whole(input.adults,1,30),kids=whole(input.kids,0,30),infants=whole(input.infants,0,30),age4=whole(input.age4,0,30),bikes=whole(input.bikes,0,30);
    const nights=input.trip==="overnight"?whole(input.nights,1,14):0;
    const parking=input.parking!=="none";
    const eligible=!!input.military;
    const start="2026-04-21",end="2026-10-31",classicStart="2026-05-23",classicEnd="2026-09-06";
    const futureDate=(()=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return "";const d=new Date(date+"T12:00:00");if(Number.isNaN(d.getTime()))return "";d.setDate(d.getDate()+nights);const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day;})();
    if(!date||!futureDate)return {status:"invalid",message:"Choose a valid trip date."};
    if(date<start||date>end||futureDate>end){
      return {status:"season",message:date>"2026-12-31"?"2027 fares and scheduled departures have not been verified. Please use the operator's current booking and schedule pages.":date> end?"The published 2026 summer fast-ferry season ends October 31. Arnold lists winter service from the St. Ignace Classic Dock, but the winter timetable and fares must be checked directly.":"These published fares cover trips entirely inside the 2026 April 21–October 31 fast-ferry season. Confirm the exact off-season crossing with the operator.",options:[]};
    }
    const options=[];
    for(const port of ["mackinaw","stignace"]){
      for(const id of ["sheplers","arnold","classic"]){
        if(id==="classic"&&(port!=="stignace"||date<classicStart||futureDate>classicEnd))continue;
        const r=rates[id];
        const title=port==="mackinaw"?"Mackinaw City":"St. Ignace";
        const dock=id==="sheplers"?(port==="mackinaw"?"556 E. Central Avenue, Mackinaw City, MI 49701":"601 N. State Street, St. Ignace, MI 49781"):id==="classic"?"99 N. State Street, St. Ignace, MI 49781":port==="mackinaw"?"801 S. Huron Street, Mackinaw City, MI 49701":"587 N. State Street, St. Ignace, MI 49781";
        const parkAddress=!parking?null:id==="sheplers"?(port==="mackinaw"?(nights?"199 Wendell Street, Mackinaw City, MI 49701":"311 S. Nicolet Street, Mackinaw City, MI 49701"):(nights?"736 N. State Street, St. Ignace, MI 49781":"601 N. State Street, St. Ignace, MI 49781")):null;
        const adultCost=(eligible?r.militaryAdult:r.adult)*adults;
        const childRate=eligible?r.militaryKid:r.kid;
        const passenger=adultCost+childRate*kids+(id==="sheplers"?0:childRate*age4);
        // Conflicting Classic rate pages and age-four eligibility require bounded estimates.
        const passengerMin=adultCost+(id==="classic"?0:childRate*kids);
        const priceUncertain=(id==="classic"&&kids>0)||(id!=="sheplers"&&age4>0);
        const bikeCost=bikes*r.bike;
        const parkCost=parking?(nights?r.nightPark*nights:r.dayPark):0;
        const subtotal=passenger+bikeCost+parkCost;
        const minSubtotal=passengerMin+bikeCost+parkCost;
        const fees=r.feePerPaidTicket===null?null:r.feePerPaidTicket*(adults+kids+infants+age4);
        const total=subtotal+(fees||0);
        const natural=input.origin==="lower"&&port==="mackinaw"||input.origin==="upper"&&port==="stignace"||input.origin==="either";
        options.push({id,port,title,dock,parkAddress,r,passenger,passengerMin,priceUncertain,bikeCost,parkCost,subtotal,minSubtotal,fees,total,natural,infants,age4,adults,kids,bikes,nights,parking,eligible});
      }
    }
    const priority=input.priority||"balanced";
    options.sort((a,b)=>{
      if(priority==="classic"&&(a.id==="classic")!==(b.id==="classic"))return a.id==="classic"?-1:1;
      if(priority!=="price"&&a.natural!==b.natural)return a.natural?-1:1;
      return a.total-b.total||a.r.minutes-b.r.minutes;
    });
    return {status:"ok",options:options,infants,hasUnknownFees:options.some(o=>o.fees===null)};
  }
  root.MackinacFerryPrice=compare;
  if(typeof document==="undefined")return;
  const form=document.getElementById("ferry-form"),results=document.getElementById("ferry-results");
  if(!form||!results)return;
  const el=id=>document.getElementById(id);
  const dollar=n=>"$"+n.toLocaleString("en-US");
  const maps=address=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(address);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function input(){
    return {date:el("ferry-date").value,origin:el("ferry-origin").value,trip:el("ferry-trip").value,nights:el("ferry-nights").value,adults:el("ferry-adults").value,kids:el("ferry-kids").value,infants:el("ferry-infants").value,age4:el("ferry-age4").value,bikes:el("ferry-bikes").value,parking:el("ferry-parking").value,priority:el("ferry-priority").value,military:el("ferry-military").checked,pets:el("ferry-pets").checked};
  }
  function stat(text){return '<div class="ferry-flag">'+text+"</div>";}
  function row(label,value){return '<div class="ferry-cost-row"><span>'+label+"</span><strong>"+value+"</strong></div>";}
  function card(o,index,pets){
    const opt=escape(o.r.name),dock=escape(o.dock);
    const park=o.parking
      ?o.parkAddress
        ?'<p><strong>Drive to your parking lot:</strong> '+escape(o.parkAddress)+' <a href="'+maps(o.parkAddress)+'" target="_blank" rel="noopener">Directions ↗</a>. Complimentary shuttle to the dock; follow operator signs.</p>'
        :'<p><strong>Where to park:</strong> Use '+escape(o.r.name)+' standard parking via its <a href="'+o.r.park+'" target="_blank" rel="noopener">official lot map ↗</a>. Do not assume the ferry-dock address is the entrance to your parking lot.</p>'
      :'<p><strong>Parking:</strong> No parking added.</p>';
    const fees=o.fees===null
      ?row("Booking fee","Extra · confirm at checkout")
      :row("Published booking fee estimate",dollar(o.fees)+(o.infants?"*":""));
    const priceLabel=o.priceUncertain?"Possible 2026 fare range":o.fees===null?"Base subtotal":"Estimated total";
    const displayPrice=o.priceUncertain?(dollar(o.minSubtotal+(o.fees||0))+"–"+dollar(o.total)):dollar(o.total);
    const proof=o.eligible?"<p class=\"ferry-verify\">Military pricing assumes every paid passenger qualifies. Bring military ID; purchase at the operator's ticket booth. Arnold's discount eligibility for non-service members needs confirmation.</p>":"";
    const infant=o.infants?'<p class="ferry-verify">'+o.infants+' child(ren) ages 0–4: $0 fare. Obtain required free boarding ticket(s). Shepler’s per-ticket fee treatment for free tickets must be confirmed.</p>':"";
    return '<article class="ferry-option'+(index===0?' best':'')+'"><div class="ferry-option-top"><div><div class="ferry-option-kicker">'+(index===0?'Recommended option':'Alternative')+' · '+escape(o.title)+'</div><h3>'+opt+'</h3><p>'+ (o.id==="classic"?"Historic-feeling boat · about 30–40 minutes": "Fast crossing · approximately 20 minutes")+'</p></div><div class="ferry-total"><span>'+priceLabel+'</span><strong>'+displayPrice+'</strong>'+(o.fees===null?'<small>plus unknown booking fee</small>':'<small>2026 round trip + parking</small>')+'</div></div><div class="ferry-costs">'
      +row(o.adults+' adults/teens + '+o.kids+' kids 5–12 + '+o.age4+' age four',o.priceUncertain?dollar(o.passengerMin)+"–"+dollar(o.passenger):dollar(o.passenger))
      +(o.bikes?row(o.bikes+' standard bike(s)',dollar(o.bikeCost)):"")
      +(o.parking?row(o.nights?'Parking, '+o.nights+' night(s)':'Standard day parking',dollar(o.parkCost)):"")
      +fees+'</div><div class="ferry-route"><p><strong>Ferry check-in:</strong> '+dock+' <a href="'+maps(o.dock)+'" target="_blank" rel="noopener">Dock directions ↗</a></p>'
      +park+'<p><strong>Arrive:</strong> allow at least '+o.r.minutes+' minutes before your target departure. '+(o.id==="sheplers"?"Shepler's tickets may be purchased online; parking is paid on arrival.":"Arnold tickets can be bought online; military fares require an in-person purchase.")+'</p>'
      +(pets?'<p><strong>Pet:</strong> '+(o.id==="sheplers"?"Leashed pets travel free; keep them at your feet.":"Confirm the current pet and carrier rules with Arnold before travel.")+'</p>':"")
      +infant+proof+'</div><div class="ferry-actions"><a class="ferry-buy" href="'+o.r.book+'" target="_blank" rel="noopener">Buy on official site ↗</a><a href="'+o.r.schedule+'" target="_blank" rel="noopener">Check departure + return times ↗</a><a href="'+o.r.park+'" target="_blank" rel="noopener">Parking details ↗</a></div></article>';
  }
  function render(){
    const val=input();
    el("ferry-nights-label").hidden=val.trip!=="overnight";
    const data=compare(val);
    if(data.status!=="ok"){
      results.innerHTML='<div class="ferry-alert"><h3>Check operating dates before booking</h3><p>'+escape(data.message)+'</p><a href="https://www.arnoldtransitcompany.com/ferry-schedule/" target="_blank" rel="noopener">Arnold current schedules ↗</a> · <a href="https://www.sheplersferry.com/" target="_blank" rel="noopener">Shepler\'s current information ↗</a></div>';
      return;
    }
    const top=data.options.slice(0,3);
    const extra=data.options.slice(3);
    results.innerHTML='<div class="ferry-summary"><h3>Your ferry comparison</h3><p>Ranked '+(val.priority==="price"?"by published base cost":val.priority==="classic"?"for the classic boat experience, then by gateway and cost":"for the mainland gateway on your side of the bridge, then by cost")+'. Prices are for a round trip; the return must be checked for your date. No departure is reserved here.</p></div>'
      +'<div class="ferry-options">'+top.map((o,i)=>card(o,i,val.pets)).join("")+'</div>'
      +(extra.length?'<details class="ferry-more"><summary>Show '+extra.length+' more ferry and port alternatives</summary><div class="ferry-options">'+extra.map((o,i)=>card(o,i+3,val.pets)).join("")+'</div></details>':"")
      +'<p class="ferry-disclaimer">*The estimate includes Shepler’s $2 fee for all required boarding tickets, including free young-child tickets. Arnold posts “all tickets subject to booking fee” without a flat amount. Prices exclude Mackinac Bridge tolls, lodging, transportation to the port, Island bike rental and any applicable nonstandard luggage charges. Overnight parking is estimated by billed nights; confirm cutoff times. Standard ferry tickets do not guarantee a seat on a specific departure.</p>';
    try{if(typeof root.gtag==="function")root.gtag("event","mackinac_ferry_quote",{event_category:"mackinac_ferry",traveler_count:Number(val.adults)+Number(val.kids)+Number(val.infants)+Number(val.age4),has_kids:Number(val.kids)+Number(val.infants)+Number(val.age4)>0,has_bikes:Number(val.bikes)>0,has_military_rate:val.military});}catch(e){}
  }
  form.addEventListener("submit",function(e){e.preventDefault();render();results.scrollIntoView({behavior:"smooth",block:"start"});});
  form.addEventListener("change",render);
  const existing=(()=>{try{return JSON.parse(localStorage.getItem("mackinac-trip-plan-v1")||"{}").plan||null;}catch(e){return null}})();
  if(existing){
    if(/^\d{4}-\d{2}-\d{2}$/.test(existing.trip_date||""))el("ferry-date").value=existing.trip_date;
    if(Number.isFinite(Number(existing.adults))&&Number(existing.adults)>=1)el("ferry-adults").value=existing.adults;
    if(Number.isFinite(Number(existing.children))&&Number(existing.children)>=0)el("ferry-kids").value=existing.children;
    if(existing.trip==="overnight"){el("ferry-trip").value="overnight";el("ferry-nights").value=whole(existing.nights,1,14);}
    const from=String(existing.origin_text||"").toLowerCase();
    if(/marquette|sault|st. ignace|saint ignace|iron mountain|escanaba/.test(from))el("ferry-origin").value="upper";
  }
  render();
})(typeof window!=="undefined"?window:globalThis);
