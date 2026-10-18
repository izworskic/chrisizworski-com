/* Winter Eagle Watching — source-owned by izworskic/chrisizworski-com.
   Weather context is not an eagle observation or a measurement of river ice. */
(function(){
"use strict";
const spots=[
{id:"detroit",name:"Detroit River Refuge Gateway",city:"Trenton",state:"MI",lat:42.1105,lon:-83.1847,type:"resident",water:"The broad Detroit River supports resident eagles, but ice and feeding locations can change quickly.",look:"Use the public fishing pier and river overlooks; scan opposite-shore trees and passing birds.",access:"5437 W Jefferson Avenue. Outdoor refuge grounds are generally accessible during daylight; check the operator for exceptions.",source:"https://www.fws.gov/refuge/detroit-river/visit-us",map:"https://www.google.com/maps/search/?api=1&query=5437+W+Jefferson+Ave+Trenton+MI"},
{id:"prairie",name:"Prairie du Sac Eagle Overlook",city:"Prairie du Sac",state:"WI",lat:43.2896,lon:-89.7215,type:"winter",water:"Wisconsin River tailwater below the Prairie du Sac dam offers a winter feeding area where open water persists.",look:"Use the dedicated public overlook at 490 Water Street; scan the water and tall riverside trees.",access:"490 Water Street, Prairie du Sac. Verify winter event hours and any current access restrictions.",source:"https://dnr.wisconsin.gov/newsroom/release/116966",map:"https://www.google.com/maps/search/?api=1&query=490+Water+St+Prairie+du+Sac+WI"},
{id:"red-wing",name:"Colvill Park",city:"Red Wing",state:"MN",lat:44.5595,lon:-92.5160,type:"winter",water:"Open reaches of the Upper Mississippi support winter eagle activity. The National Eagle Center publishes dated counts at this location.",look:"Scan the Mississippi channel from public park overlooks and watch high perches without approaching birds.",access:"Use published park access; winter parking and paths may change.",source:"https://www.nationaleaglecenter.org/eagle-count/",map:"https://www.google.com/maps/search/?api=1&query=Colvill+Park+Red+Wing+MN"},
{id:"wabasha",name:"Wabasha Riverfront",city:"Wabasha",state:"MN",lat:44.3836,lon:-92.0313,type:"winter",water:"Wabasha and nearby Mississippi reaches are covered by the National Eagle Center's winter count program.",look:"Observe from public riverfront access; bring a spotting scope for distant river traffic and perches.",access:"Check public riverfront access before travel. National Eagle Center visitor hours differ from shore access.",source:"https://www.nationaleaglecenter.org/eagle-count/",map:"https://www.google.com/maps/search/?api=1&query=Wabasha+Minnesota+riverfront"},
{id:"fulton",name:"Lock & Dam 13",city:"Fulton",state:"IL",lat:41.9001,lon:-90.1566,type:"winter",count:"ld13",water:"Turbulence below Mississippi River locks can maintain feeding water during winter freeze periods.",look:"Watch from public, signed riverfront approaches outside operational or restricted areas.",access:"Public access varies by facility; obey all dam and shoreline closures.",source:"https://www.mvr.usace.army.mil/mississippiriver/eagle-watching/",map:"https://www.google.com/maps/search/?api=1&query=Lock+and+Dam+13+Fulton+Illinois"},
{id:"pleasant",name:"Lock & Dam 14",city:"Pleasant Valley",state:"IA",lat:41.5632,lon:-90.4041,type:"winter",count:"ld14",water:"Turbulent open water below the Mississippi River structure creates a winter feeding opportunity.",look:"Use designated public viewing areas near the dam; do not enter operations property.",access:"Confirm permitted viewing locations and any riverfront restrictions before arrival.",source:"https://www.mvr.usace.army.mil/mississippiriver/eagle-watching/",map:"https://www.google.com/maps/search/?api=1&query=Lock+and+Dam+14+Pleasant+Valley+Iowa"},
{id:"starved",name:"Starved Rock / Illinois Waterway",city:"Utica",state:"IL",lat:41.3187,lon:-88.9708,type:"winter",count:"starved",water:"The Illinois River lock-and-dam tailwater is a documented winter eagle-watching destination.",look:"Use the signed public visitor center and wildlife observation areas; scan across river from a distance.",access:"Visitor center and viewing-area hours may vary. Check the Corps page before departure.",source:"https://www.mvr.usace.army.mil/illinoiswaterway/",map:"https://www.google.com/maps/search/?api=1&query=Illinois+Waterway+Visitor+Center+Ottawa+IL"},
{id:"riverlands",name:"Riverlands Migratory Bird Sanctuary",city:"West Alton",state:"MO",lat:38.8812,lon:-90.1866,type:"winter",water:"Mississippi River backwaters and nearby open channels can support winter raptor viewing.",look:"Look from designated public observation areas, especially open-water edges and distant tree lines.",access:"Some refuge units or roads can close; check USACE Riverlands guidance and current conditions.",source:"https://www.mvs.usace.army.mil/Missions/Recreation/Riverlands-Migratory-Bird-Sanctuary/",map:"https://www.google.com/maps/search/?api=1&query=Riverlands+Migratory+Bird+Sanctuary"},
{id:"clarksville",name:"Clarksville Riverfront · Lock & Dam 24",city:"Clarksville",state:"MO",lat:39.3696,lon:-90.9020,type:"winter",water:"The Mississippi River near Lock and Dam 24 is a known winter eagle-watching corridor.",look:"Stay on the public riverfront and scan moving water and mature trees from a safe distance.",access:"Check flood, road and riverfront access restrictions with the operator before driving.",source:"https://www.mvs.usace.army.mil/Missions/Recreation/",map:"https://www.google.com/maps/search/?api=1&query=Clarksville+Missouri+riverfront"}
];
const el=id=>document.getElementById(id), month=new Date().getMonth()+1, inWinter=[12,1,2,3].includes(month);
let selected=spots.find(s=>location.hash==="#"+s.id)||spots[0],map,markers=[],forecastController=null,fetchToken=0;
let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem("eagle-saved-v1")||"[]"))}catch{}
const text=(id,value)=>{const x=el(id);if(x)x.textContent=value};
const fmtDate=v=>{if(!v)return "Date unavailable";const d=new Date(v);return isNaN(d)?"Date unavailable":d.toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"America/Chicago"})};
function seasonLabel(s){return s.type==="resident"?"Year-round resident habitat":inWinter?"Within typical winter watching season":"Outside typical winter gathering season"}
function renderList(){
 const state=el("state-filter").value,kind=el("type-filter").value,savedOnly=el("saved-filter").checked;
 const matches=spots.filter(s=>(state==="all"||s.state===state)&&(kind==="all"||s.type===kind)&&(!savedOnly||saved.has(s.id)));
 const list=el("spot-list");list.replaceChildren();
 matches.forEach(s=>{const i=spots.indexOf(s)+1,b=document.createElement("button");b.type="button";b.className="spot"+(s.id===selected.id?" active":"");b.setAttribute("aria-pressed",String(s.id===selected.id));
 const n=document.createElement("span");n.className="number";n.textContent=String(i).padStart(2,"0");
 const c=document.createElement("span");const title=document.createElement("strong");title.textContent=s.name;const where=document.createElement("small");where.textContent=s.city+", "+s.state;const kind=document.createElement("span");kind.className="viewing-kind";kind.textContent=s.type==="winter"?"Documented winter gathering area":"Resident viewing";c.append(title,where,kind);b.append(n,c);
 b.addEventListener("click",()=>pick(s));list.append(b)});
 text("spot-count",matches.length+" viewing locations");el("no-spots").hidden=matches.length>0;
 markers.forEach(({marker,spot})=>{if(marker)marker.setOpacity(matches.includes(spot)?1:.28)});
}
function initMap(){
 const holder=el("map");
 if(!window.L){holder.innerHTML='<p class="fallback">Interactive map unavailable. Use the location list and directions links to plan your visit.</p>';return}
 map=L.map("map",{scrollWheelZoom:false}).setView([41.1,-90.3],5);
 L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'}).addTo(map);
 spots.forEach((s,i)=>{const icon=L.divIcon({html:'<span class="pin '+(s.id===selected.id?"chosen":"")+'">'+(i+1)+'</span>',className:"",iconSize:[27,27],iconAnchor:[13,13]});
 const marker=L.marker([s.lat,s.lon],{icon}).addTo(map);marker.bindTooltip(s.name+" · "+s.state);marker.on("click",()=>pick(s));markers.push({spot:s,marker})});
}
function markerUpdate(){
 for(const {marker,spot} of markers){const n=spots.indexOf(spot)+1;marker.setIcon(L.divIcon({html:'<span class="pin '+(spot.id===selected.id?"chosen":"")+'">'+n+'</span>',className:"",iconSize:[27,27],iconAnchor:[13,13]}))}
 if(map)map.panTo([selected.lat,selected.lon],{animate:false});
}
function pick(s){
 selected=s;history.replaceState(null,"","#"+s.id);renderList();markerUpdate();
 text("selected-place",s.name);text("selected-city",s.city+", "+s.state);text("season-pill",seasonLabel(s));el("season-pill").className="status"+(inWinter?"":" muted");
 text("why-water",s.water);text("where-look",s.look);text("access-note",s.access);
 el("directions").href=s.map;el("operator-link").href=s.source;
 const report=el("count-source");
 if(s.count){report.href="https://www.mvr.usace.army.mil/"+(s.count==="starved"?"illinoiswaterway":"mississippiriver")+"/eagle-watching/";report.textContent="Open the original Corps count report ↗"}
 else if(["red-wing","wabasha"].includes(s.id)){report.href="https://www.nationaleaglecenter.org/eagle-count/";report.textContent="Open National Eagle Center regional count history ↗"}
 else {report.href=s.source;report.textContent="Open viewing-site operator guidance (no local count) ↗"}
 text("open-water","Unconfirmed");text("eagle-present","Unconfirmed");
 el("saved-toggle").textContent=saved.has(s.id)?"Saved ✓":"Save spot";
 loadWeather(s);loadCount(s);
}
async function getJson(url,signal){
 const r=await fetch(url,{headers:{Accept:"application/geo+json, application/json"},signal,cache:"no-store"});
 if(!r.ok)throw new Error("Source returned "+r.status);
 return r.json();
}
function drawChart(hours){
 const svg=el("temperature-chart");svg.replaceChildren();const values=hours.slice(0,48).map(p=>Number(p.temperature));
 if(values.length<3||values.some(v=>!Number.isFinite(v))){text("chart-label","Hourly temperature chart unavailable");return}
 const min=Math.min(10,Math.floor(Math.min(...values)/10)*10),max=Math.max(40,Math.ceil(Math.max(...values)/10)*10),range=Math.max(10,max-min),w=600,h=165;
 const ns="http://www.w3.org/2000/svg",node=(tag,attrs,label)=>{const x=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,v));if(label!=null)x.textContent=label;svg.append(x);return x};
 svg.setAttribute("viewBox","0 0 "+w+" "+h);svg.setAttribute("role","img");svg.setAttribute("aria-label","Hourly National Weather Service temperature forecast; dashed freezing line at 32 degrees Fahrenheit");
 [min,32,max].filter(v=>v>=min&&v<=max).forEach(v=>{const y=145-(v-min)/range*118;node("line",{x1:35,y1:y,x2:590,y2:y,stroke:v===32?"#b07b34":"#dfe7de","stroke-dasharray":v===32?"5 5":"none"});node("text",{x:3,y:y+4,"font-size":11,fill:"#5c7568"},v+"°")});
 const path=values.map((v,i)=>{const x=37+i/(values.length-1)*549,y=145-(v-min)/range*118;return (i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1)}).join(" ");
 node("path",{d:path,fill:"none",stroke:"#317457","stroke-width":3,"stroke-linecap":"round"});
 for(const j of [0,12,24,36,47]){const p=hours[j];if(p){const x=37+j/47*549;node("text",{x:x,y:161,"text-anchor":"middle","font-size":10,fill:"#607468"},new Date(p.startTime).toLocaleString("en-US",{weekday:"short",hour:"numeric",timeZone:undefined}))}}
 text("chart-label","Next "+values.length+" forecast hours · air temperature, not water temperature");
}
async function loadWeather(s){
 if(forecastController)forecastController.abort();forecastController=new AbortController();const signal=forecastController.signal;const token=++fetchToken;
 text("weather-status","Loading live NWS forecast for "+s.city+"…");text("weather-updated","");el("temperature-chart").replaceChildren();el("weather-steps").replaceChildren();
 ["air-now","air-low","air-wind"].forEach(id=>text(id,"—"));
 try{
  const point=await getJson("https://api.weather.gov/points/"+s.lat.toFixed(4)+","+s.lon.toFixed(4),signal);
  const hourlyUrl=point.properties&&point.properties.forecastHourly;
  if(!hourlyUrl||!/^https:\/\/api\.weather\.gov\//.test(hourlyUrl))throw new Error("No supported NWS hourly grid");
  const data=await getJson(hourlyUrl,signal);
  if(token!==fetchToken)return;
  const hours=(data.properties&&data.properties.periods||[]).filter(p=>Number.isFinite(Number(p.temperature))&&p.startTime);
  if(!hours.length)throw new Error("No hourly values published");
  const next=hours.slice(0,48),temps=next.map(x=>Number(x.temperature)),cold=next.filter(x=>Number(x.temperature)<=32).length;
  text("air-now",Math.round(Number(hours[0].temperature))+"°F");
  text("air-low",Math.min(...temps)+"°F");
  text("air-wind",(hours[0].windSpeed||"Not supplied")+" "+(hours[0].windDirection||""));
  const forceWinter=(inWinter||[11,4].includes(month));
  const verdict=!forceWinter?"Outside main winter aggregation window. Resident eagles can still be seen.":cold===0?"No freezing hours in the next 48-hour air forecast; flowing-water access may still matter.":cold>=32?"Extended freezing air forecast may concentrate fishing opportunities at remaining open water.":"Some freezing hours forecast; verify whether open-water pockets actually exist.";
  text("weather-status",verdict);
  const issued=data.properties.updated||data.properties.generatedAt||null;
  text("weather-updated","NWS forecast updated: "+(issued?new Date(issued).toLocaleString():"unknown")+" · Retrieved: "+new Date().toLocaleTimeString()+". Neither confirms river ice.");
  drawChart(next);
  const four=[0,12,24,36];const grid=el("weather-steps");
  four.forEach(i=>{const p=next[i];if(!p)return;const box=document.createElement("div"),a=document.createElement("strong"),b=document.createElement("small");a.textContent=Math.round(p.temperature)+"°F";b.textContent=new Date(p.startTime).toLocaleString("en-US",{weekday:"short",hour:"numeric"});box.append(a,b);grid.append(box)});
 }catch(e){if(e.name==="AbortError"||token!==fetchToken)return;text("weather-status","Live NWS forecast unavailable. No weather-driven eagle or open-water assessment can be made.");text("weather-updated","Check the National Weather Service before traveling.");text("chart-label","No live chart available");}
}
async function loadCount(s){
 const field=el("count-live");field.replaceChildren();
 const p=document.createElement("p");field.append(p);
 if(!s.count){p.textContent="No live count is published for this exact viewing site by the connected source. The operator may publish dated observations; check the linked report.";return}
 p.textContent="Checking the U.S. Army Corps of Engineers' dated winter count table…";
 try{
  const r=await fetch("/api/winter-eagle-counts?site="+encodeURIComponent(s.count),{headers:{Accept:"application/json"}});
  if(!r.ok)throw Error("unavailable");const data=await r.json();
  if(selected.id!==s.id)return;
  if(!data.available||!data.count){p.textContent="No verified dated count could be read for this site. View the original Corps report instead.";return}
  const d=data.count;p.textContent="Latest published count: "+d.adults+" adults + "+d.juveniles+" immatures = "+(d.adults+d.juveniles)+" eagles, observed "+d.date+". Historical observation — not a current sighting.";
  if(data.stale){const q=document.createElement("p");q.textContent="This observation is older than 14 days. Do not use it as evidence of activity today.";field.append(q)}
 }catch{if(selected.id===s.id)p.textContent="Published counts are temporarily unavailable. Use the source link; no count is assumed."}
}
el("state-filter").addEventListener("change",renderList);el("type-filter").addEventListener("change",renderList);el("saved-filter").addEventListener("change",renderList);
el("saved-toggle").addEventListener("click",()=>{if(saved.has(selected.id))saved.delete(selected.id);else saved.add(selected.id);try{localStorage.setItem("eagle-saved-v1",JSON.stringify([...saved]))}catch{}renderList();el("saved-toggle").textContent=saved.has(selected.id)?"Saved ✓":"Save spot"});
el("refresh-weather").addEventListener("click",()=>loadWeather(selected));
el("copy-link").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);el("copy-link").textContent="Copied";setTimeout(()=>text("copy-link","Copy spot link"),1800)}catch{el("copy-link").textContent="Copy URL from address bar"}});
el("nearest").addEventListener("click",()=>{if(!navigator.geolocation){text("location-help","Location not supported in this browser.");return}
 navigator.geolocation.getCurrentPosition(({coords})=>{const rad=d=>d*Math.PI/180;const dist=s=>{const a=Math.sin(rad(s.lat-coords.latitude)/2)**2+Math.cos(rad(coords.latitude))*Math.cos(rad(s.lat))*Math.sin(rad(s.lon-coords.longitude)/2)**2;return 3959*2*Math.asin(Math.min(1,Math.sqrt(a)))};const closest=[...spots].sort((a,b)=>dist(a)-dist(b))[0];el("state-filter").value="all";el("type-filter").value="all";el("saved-filter").checked=false;pick(closest);text("location-help","Closest listed spot: "+Math.round(dist(closest))+" straight-line miles. Location is not stored or sent to our server.")},()=>text("location-help","Location not available; you can still select a spot manually."),{timeout:7000})});
initMap();pick(selected);
})();
