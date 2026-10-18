/* Winter Eagle Watching — source-owned by izworskic/chrisizworski-com.
   Weather context is not an eagle observation or a measurement of river ice. */
(function(){
"use strict";
const spots=[
{id:"detroit",name:"Detroit River Refuge Gateway",city:"Trenton",state:"MI",lat:42.1105,lon:-83.1847,type:"resident",water:"The broad Detroit River supports resident eagles, but ice and feeding locations can change quickly.",look:"Use the public fishing pier and river overlooks; scan opposite-shore trees and passing birds.",access:"5437 W Jefferson Avenue. Outdoor refuge grounds are generally accessible during daylight; check the operator for exceptions.",source:"https://www.fws.gov/refuge/detroit-river/visit-us",map:"https://www.google.com/maps/search/?api=1&query=5437+W+Jefferson+Ave+Trenton+MI"},
{id:"shiawassee",name:"Shiawassee Refuge · Ferguson Bayou Trail",city:"Saginaw",state:"MI",lat:43.32515,lon:-84.0327,type:"habitat",water:"This protected wetland and river complex hosts bald eagles. Late-fall birds arrive to feed, but neither current ice nor a gathering is confirmed at this trail.",look:"Watch high above the wetlands and river corridors from public dikes, observation decks and permitted trails; never search for nests.",access:"6000 Bishop Road. Trails normally open sunrise to sunset but close during refuge hunting dates, flooding and other restrictions. Winter wildlife drive is CLOSED; do not plan on driving it.",source:"https://www.fws.gov/refuge/shiawassee/visit-us",map:"https://www.google.com/maps/search/?api=1&query=Ferguson+Bayou+Trail+6000+Bishop+Road+Saginaw+MI"},
{id:"croton",name:"Croton Dam · Muskegon River Public Access",city:"Croton",state:"MI",lat:43.435561,lon:-85.66678,type:"habitat",water:"A flowing tailwater below Croton Dam provides a plausible winter open-water search lead; no systematic eagle congregation counts are connected here.",look:"Observe the river from the barrier-free public fishing platform and signed shore access. Scan open water and distant trees without approaching wildlife.",access:"Charles Besemer Muskegon River Park / Croton Dam public shore-fishing access. Ice, snow and access conditions must be checked; dam releases and currents can be dangerous.",source:"https://www.michigan.gov/dnr/managing-resources/fisheries/units/c-michigan",map:"https://www.google.com/maps/search/?api=1&query=Croton+Dam+Charles+Besemer+Muskegon+River+Park+Michigan"},
{id:"soo-cfre",name:"St. Marys River · LSSU Freshwater Center",city:"Sault Ste. Marie",state:"MI",lat:46.4904,lon:-84.3546,type:"habitat",water:"Michigan Sea Grant documents bald eagles fishing in the St. Marys River near the Sault Ste. Marie powerhouse. Flowing channels and salmon can provide winter food; this is NOT a live eagle count.",look:"Scan the public St. Marys River corridor from the approved research-center deck during open hours. Look over open water without approaching roost or nesting areas.",access:"100 Salmon Run Way. LSSU lists limited Discovery Center winter hours (typically first and third Saturday, 10 a.m.–2 p.m. from November through May). Verify current hours; the second-floor deck is not unrestricted public access.",source:"https://www.lssu.edu/centers/cfre/overview/",map:"https://www.google.com/maps/search/?api=1&query=100+Salmon+Run+Way+Sault+Ste+Marie+MI"},
{id:"menominee",name:"Menominee River · Piers Gorge Overlook",city:"Norway",state:"MI",lat:45.7597,lon:-87.9390,type:"habitat",water:"Michigan DNR identifies bald eagles as common sightings in the Menominee River State Recreation Area, which includes swift rapids and river corridors. No winter gathering count is available for this overlook.",look:"Scan the rapids and distant pines from the official public hiking viewpoints; do not enter water or approach wildlife.",access:"Piers Gorge trail access is off Highway 8 and Piers Gorge Road. Winter trails can be icy, snowy and ungroomed. Confirm seasonal road and walking access before travel.",source:"https://www.michigan.gov/recsearch/parks/Menominee",map:"https://www.google.com/maps/search/?api=1&query=Piers+Gorge+Trail+Michigan"},
{id:"tippy",name:"Tippy Dam · Manistee River",city:"Brethren",state:"MI",lat:44.26841,lon:-85.93562,type:"habitat",water:"The public Manistee River tailwater supports salmon, steelhead and trout. It is a plausible food-and-open-water viewing lead, NOT an established eagle congregation with connected counts.",look:"Observe from signed public river access near the recreation area and scan trees above the tailwater without interfering with anglers.",access:"1500 Dilling Road. Michigan DNR lists year-round recreation and winter activities; park entry may require a Recreation Passport. River currents and snow conditions can be dangerous.",source:"https://www.michigan.gov/recsearch/parks/tippydam",map:"https://www.google.com/maps/search/?api=1&query=Tippy+Dam+Recreation+Area+Brethren+Michigan"},
{id:"ausable",name:"Au Sable River · Highbanks Overlook",city:"Oscoda",state:"MI",lat:44.43592,lon:-83.62381,type:"resident",water:"The Au Sable River supports bald eagles and cold-season foraging habitat. This public scenic overlook offers broad views, but distant eagles are not guaranteed on any day.",look:"Watch the sky and river from the Lumberman's Monument/Highbanks public overlooks, staying well away from nesting birds or riverbank hazards.",access:"5401 Monument Road. Grounds and nearby Highbanks Trail have winter opportunities; visitor-center buildings are seasonal. Trails, stairs and snow conditions may limit access.",source:"https://www.michigan.org/property/highbanks-river-trail",map:"https://www.google.com/maps/search/?api=1&query=Lumbermans+Monument+5401+Monument+Road+Oscoda+Michigan"},
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
let selected=spots.find(s=>location.hash==="#"+s.id)||spots[0],moveMapToSelected=()=>{},forecastController=null,fetchToken=0;
let plannerMode="gather",plannerMonth=month,plannerDays=[],plannerZone="America/Detroit";
let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem("eagle-saved-v1")||"[]"))}catch{}
const text=(id,value)=>{const x=el(id);if(x)x.textContent=value};
const fmtDate=v=>{if(!v)return "Date unavailable";const d=new Date(v);return isNaN(d)?"Date unavailable":d.toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"America/Chicago"})};
function seasonLabel(s){
 if(plannerMode==="display"){
  const reg=window.EaglePlanning?.regionForSpot(s);
  const stage=window.EaglePlanning?.seasonalStage("display",month,reg);
  return stage?.level>=3?"Within broad regional flight-display season":"Aerial display season varies · not a confirmed show site";
 }
 return s.type==="resident"?"Year-round resident habitat":inWinter?"Within typical winter watching season":"Outside typical winter gathering season";
}
function renderList(){
 const state=el("state-filter").value,kind=el("type-filter").value,region=el("region-filter").value,savedOnly=el("saved-filter").checked;
 const matches=spots.filter(s=>(state==="all"||s.state===state)&&(kind==="all"||s.type===kind)&&(region==="all"||window.EaglePlanning.regionForSpot(s)===region)&&(!savedOnly||saved.has(s.id)));
 const list=el("spot-list");list.replaceChildren();
 matches.forEach(s=>{const i=spots.indexOf(s)+1,b=document.createElement("button");b.type="button";b.className="spot"+(s.id===selected.id?" active":"");b.setAttribute("aria-pressed",String(s.id===selected.id));
 const n=document.createElement("span");n.className="number";n.textContent=String(i).padStart(2,"0");
 const c=document.createElement("span");const title=document.createElement("strong");title.textContent=s.name;const where=document.createElement("small");where.textContent=s.city+", "+s.state;const kind=document.createElement("span");kind.className="viewing-kind";kind.textContent=plannerMode==="display"?"Public sky-viewing lead · aerial activity unverified":s.type==="winter"?"Winter gathering corridor":s.type==="habitat"?"Habitat lead · not a confirmed gathering":"Resident eagle habitat";c.append(title,where,kind);b.append(n,c);
 b.addEventListener("click",()=>pick(s));list.append(b)});
 text("spot-count",matches.length+" viewing locations");el("no-spots").hidden=matches.length>0;
 // Native map buttons, not Leaflet markers: keep map/list filters synchronized.
 const visible=new Set(matches.map(s=>s.id));
 document.querySelectorAll("#map .native-pin").forEach(b=>{
   const shown=visible.has(b.dataset.spot);
   b.hidden=!shown;
   b.disabled=!shown;
   b.setAttribute("aria-hidden",String(!shown));
 });
}
function renderPurpose(){
 const s=selected,flight=plannerMode==="display",winter=s.type==="winter";
 ["gather","display"].forEach(mode=>{
  const b=el("finder-"+mode);if(!b)return;
  const active=(flight?"display":"gather")===mode;
  b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
 });
 const season=seasonLabel(s);
 text("season-pill",season);
 el("season-pill").className="status"+(flight||!inWinter?" muted":"");
 if(flight){
  text("finder-purpose","Aerial displays: select a public overlook with a broad view of sky and eagle habitat. No mapped site is a confirmed cartwheel location; no daily display prediction exists.");
  text("site-purpose-heading","An open-sky observation point — not a known cartwheel venue");
  text("site-purpose-text","From this public-access location, look above the water and treeline for birds soaring, circling together or interacting in flight during the regional breeding season. Their presence, pair status and displays here are not verified. Always check site hours, safety and closures.");
  text("where-look-label","Where to stand and scan the sky");
  text("week-lead","For aerial watching, compare forecast wind and precipitation at the selected overlook. Calmer, drier periods help people follow distant birds; they do not predict courtship or cartwheels.");
  text("weekly-key-primary","Bar = forecast hours without rain/snow in the published hourly descriptions");
  text("weekly-key-note","Weather affects visibility and comfort, not whether eagles will display.");
 }else{
  text("finder-purpose","Winter gatherings: compare publicly accessible river viewing areas, documented historical counts and freezing-air context. Open water and eagle presence still require verification.");
  text("site-purpose-heading",winter?"Documented winter eagle-watching corridor":s.type==="resident"?"Resident eagle viewing habitat":"Habitat lead · no confirmed gathering");
  text("site-purpose-text",winter?
    "This is a known winter-watching corridor, not proof of eagles here today. Look toward moving water, prey and distant perches. Where counts exist, check their original survey dates before traveling.":
    "This public location has eagle habitat or a feeding-water lead, but no verified current congregation. Scout open water and distant perches only from permitted access; do not infer a flock from freezing air.");
  text("where-look-label","Where to stand and scan the water");
  text("week-lead","For winter gatherings, compare subfreezing air forecasts and published eagle counts. River ice, available prey and current eagle numbers are not measured by this forecast.");
  text("weekly-key-primary","Bar = forecast hours at or below 32°F air temperature");
  text("weekly-key-note","Freezing air is context only—neither measured river ice nor eagle counts.");
 }
}
function renderPlanner(){
 const E=window.EaglePlanning;
 if(!E)return;
 const region=E.regionForSpot(selected),context=E.regionDetails(region);
 const display=plannerMode==="display",stage=E.seasonalStage(plannerMode,plannerMonth,region);
 renderPurpose();
 text("region-heading",context.label);
 text("region-context",context.note);
 ["gather","display"].forEach(m=>{const btn=el("mode-"+m);if(!btn)return;btn.classList.toggle("active",m===plannerMode);btn.setAttribute("aria-pressed",String(m===plannerMode))});
 text("season-mode-label",display?"AERIAL DISPLAYS / NOT A DAILY PREDICTION":"WINTER GATHERINGS / OPEN WATER");
 text("season-headline",display?"Look for flights and territorial displays—not just groups.":"Follow the open water and accessible prey.");
 text("season-explainer",display?
  "Around the breeding period, pairs may soar together and perform aerial maneuvers. Dramatic talon-locked cartwheels can be territorial aggression, not proof of mating. Watch from public corridors, never near mapped nest sites.":
  "When still water freezes, eagles can shift toward flowing tailwaters and ice edges, especially where fish or other food remains accessible. Cold air is a clue, not an observed congregation.");
 text("season-level",stage.label);text("season-month",stage.month+" · Regional seasonality only");
 text("behavior-guide",display?
 "Field cue: sustained circling, pair flights and energetic chases may be more visible during the breeding period. The weather can improve watching comfort, but cannot predict a cartwheel. Never approach a nest or follow eagles to one.":
 "Field cue: winter concentrations may gather at open water, below dams or around prey and safe roosts. In early spring they can shift toward retreating river ice edges. Check fresh dated counts where they exist.");
 const calendar=el("annual-calendar");calendar.replaceChildren();
 for(const m of E.calendar(plannerMode,region)){
  const b=document.createElement("button");b.type="button";b.className="season-month level-"+m.level+(m.index===plannerMonth?" chosen":"");
  b.setAttribute("aria-pressed",String(m.index===plannerMonth));b.setAttribute("aria-label",m.month+": "+m.label+"; select month");
  const name=document.createElement("strong");name.textContent=m.month;const line=document.createElement("span");line.className="month-intensity";
  line.setAttribute("aria-hidden","true");b.append(name,line);
  b.addEventListener("click",()=>{plannerMonth=m.index;renderPlanner()});calendar.append(b);
 }
 const assess=E.summary(plannerMode,month,plannerDays,region);
 const label=el("setup-label");label.className="status"+(plannerDays.length?"":" muted");
 text("setup-label",plannerDays.length?assess.headline:"Live NWS forecast not yet available");
 text("setup-explanation",plannerDays.length?assess.why:"Check the NWS outlook for the selected public viewing spot. Current wildlife presence and river ice remain unconfirmed.");
 text("planning-provenance",assess.evidence+" Forecast in selected location's local time. Seven-day rows describe weather, not wildlife counts.");
 const cards=el("weekly-day-cards");cards.replaceChildren();
 if(!plannerDays.length){
  const p=document.createElement("p");p.className="lead";p.textContent="Forecast days load when the National Weather Service returns local hourly data. No synthetic forecast is shown.";cards.append(p);return
 }
 for(const d of plannerDays){
  const card=document.createElement("article");card.className="planning-day";
  const title=document.createElement("strong");
  const stamp=new Date(d.date+"T12:00:00Z");
  title.textContent=stamp.toLocaleDateString("en-US",{timeZone:"UTC",weekday:"short",month:"short",day:"numeric"});
  const t=document.createElement("span");t.className="day-temp";t.textContent=d.low+"°–"+d.high+"°F";
  const descriptor=document.createElement("p");descriptor.textContent=display?d.comfort:d.condition;
  const bar=document.createElement("div");bar.className="freeze-track"+(display?" dry-bar":"");
  bar.title=display?"Forecast hours without named precipitation (based on short forecast descriptions)":d.coldHours+" of "+d.hours+" forecast air hours at or below 32°F";
  const filled=document.createElement("i");
  filled.style.width=(display?d.dryFraction:Math.round(100*d.coldHours/Math.max(1,d.hours)))+"%";bar.append(filled);
  const detail=document.createElement("small");
  detail.textContent=display?(d.wetHours+" forecast precipitation hrs · "+(d.windMph==null?"Wind unavailable":d.windMph+" mph avg wind")):
   d.coldHours+" freezing air hrs · "+(d.windMph==null?"Wind n/a":d.windMph+" mph avg wind");
  card.append(title,t,descriptor,bar,detail);cards.append(card);
 }
}
function switchMode(mode){plannerMode=mode==="display"?"display":"gather";plannerMonth=month;renderPlanner();renderList()}
function initMap(){
 const holder=el("map"),caption=el("map-provider");
 holder.replaceChildren();
 holder.classList.add("native-map");
 // First-party SVG with Natural Earth shapes; no CDN, external map tiles or API keys.
 // All markers are real, accessible HTML buttons aligned to Mercator coordinates.
 const canvas=document.createElement("div");
 canvas.className="native-map-canvas";
 const art=document.createElement("img");
 art.className="native-map-art";
 art.src="/winter-eagle-watching/midwest-vector-map.svg";
 art.alt="Geographic reference map of Midwest states, Great Lakes and Mississippi River";
 art.loading="eager";art.draggable=false;
 canvas.append(art);
 const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
 const latPercent=lat=>100*(merc(50)-merc(lat))/(merc(50)-merc(33.5));
 const lonPercent=lon=>100*(lon+101)/24;
 for(const [i,s] of spots.entries()){
   const b=document.createElement("button");
   b.type="button";b.className="native-pin";b.dataset.spot=s.id;
   b.textContent=String(i+1);
   b.style.left=lonPercent(s.lon).toFixed(3)+"%";
   b.style.top=latPercent(s.lat).toFixed(3)+"%";
   b.setAttribute("aria-label","View "+s.name+", "+s.state);
   b.title=s.name+" · "+s.state;
   b.addEventListener("click",()=>pick(s));
   canvas.append(b);
 }
 holder.append(canvas);
 const nav=document.createElement("div");nav.className="native-map-controls";
 const add=(label,symbol,fn)=>{const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",label);b.textContent=symbol;b.addEventListener("click",fn);nav.append(b);return b};
 let zoom=1,panX=0,panY=0;
 const apply=()=>{
   const maxX=holder.clientWidth*(zoom-1)/2, maxY=holder.clientHeight*(zoom-1)/2;
   panX=Math.max(-maxX,Math.min(maxX,panX));panY=Math.max(-maxY,Math.min(maxY,panY));
   canvas.style.transform="translate("+panX+"px,"+panY+"px) scale("+zoom+")";
   canvas.style.setProperty("--inverse-map-scale",String(1/zoom));
 };
 const changeZoom=next=>{
   const old=zoom;zoom=Math.max(1,Math.min(3,Math.round(next*10)/10));
   if(old!==zoom){panX*=zoom/old;panY*=zoom/old}
   apply();
 };
 add("Zoom in","+ ",()=>changeZoom(zoom+.5));
 add("Zoom out","−",()=>changeZoom(zoom-.5));
 add("Reset map view","⤢",()=>{zoom=1;panX=0;panY=0;apply()});
 holder.append(nav);
 // Immediate feedback matters: selected location is visible on the map itself.
 const glance=document.createElement("div");glance.className="native-map-glance";glance.setAttribute("aria-live","polite");
 const spotName=document.createElement("strong");const spotCity=document.createElement("span");
 const more=document.createElement("a");more.href="#location-details";more.textContent="See location details ↓";
 glance.append(spotName,spotCity,more);holder.append(glance);
 let dragging=false,atX=0,atY=0;
 holder.addEventListener("pointerdown",e=>{
   if(e.target.closest("button"))return;
   dragging=true;atX=e.clientX;atY=e.clientY;
   if(holder.setPointerCapture)holder.setPointerCapture(e.pointerId);
   holder.classList.add("dragging");
 });
 holder.addEventListener("pointermove",e=>{
   if(!dragging)return;
   panX+=e.clientX-atX;panY+=e.clientY-atY;atX=e.clientX;atY=e.clientY;
   apply();
 });
 const stop=()=>{dragging=false;holder.classList.remove("dragging")};
 holder.addEventListener("pointerup",stop);
 holder.addEventListener("pointercancel",stop);
 window.addEventListener("resize",apply);
 // Selecting a spot from the list makes that marker visible if zoomed.
 moveMapToSelected=()=>{
   spotName.textContent=selected.name;spotCity.textContent=selected.city+", "+selected.state;
   holder.querySelectorAll(".native-pin").forEach(b=>{b.classList.toggle("chosen",b.dataset.spot===selected.id);b.setAttribute("aria-pressed",String(b.dataset.spot===selected.id))});
   if(zoom>1){
     const sx=lonPercent(selected.lon)/100*holder.clientWidth;
     const sy=latPercent(selected.lat)/100*holder.clientHeight;
     panX=zoom*(holder.clientWidth/2-sx);
     panY=zoom*(holder.clientHeight/2-sy);
     apply();
   }
 };
 art.addEventListener("error",()=>{if(caption)caption.textContent="Reference map image unavailable. Numbered destination pins and the location list still work."});
 if(caption)caption.textContent="Drag to pan · +/− to zoom · tap numbered destinations. Map drawn from Natural Earth public-domain boundaries, with no API key or remote tiles.";
 apply();moveMapToSelected();
}
function markerUpdate(){moveMapToSelected();}

function pick(s){
 selected=s;history.replaceState(null,"","#"+s.id);renderList();markerUpdate();
 text("selected-place",s.name);text("selected-city",s.city+", "+s.state);
 const reg=window.EaglePlanning?.regionForSpot(s);
 text("selected-region",window.EaglePlanning?.regionDetails(reg).label||"Midwest");
 renderPurpose();
 text("why-water",s.water);text("where-look",s.look);text("access-note",s.access);
 el("directions").href=s.map;el("operator-link").href=s.source;
 const report=el("count-source");
 if(s.count){report.href="https://www.mvr.usace.army.mil/"+(s.count==="starved"?"illinoiswaterway":"mississippiriver")+"/eagle-watching/";report.textContent="Open the original Corps count report ↗"}
 else if(["red-wing","wabasha"].includes(s.id)){report.href="https://www.nationaleaglecenter.org/eagle-count/";report.textContent="Open National Eagle Center regional count history ↗"}
 else {report.href=s.source;report.textContent="Open viewing-site operator guidance (no local count) ↗"}
 text("open-water","Unconfirmed");text("eagle-present","Unconfirmed");
 plannerDays=[];renderPlanner();
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
  plannerZone=point.properties?.timeZone||"America/Detroit";plannerDays=window.EaglePlanning?window.EaglePlanning.summarizeHourly(hours,plannerZone):[];renderPlanner();
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
 }catch(e){if(e.name==="AbortError"||token!==fetchToken)return;plannerDays=[];renderPlanner();text("weather-status","Live NWS forecast unavailable. No weather-driven eagle or open-water assessment can be made.");text("weather-updated","Check the National Weather Service before traveling.");text("chart-label","No live chart available");}
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
el("region-filter").addEventListener("change",()=>{
 el("state-filter").value="all";
 const region=el("region-filter").value;
 const matches=spots.filter(s=>region==="all"||window.EaglePlanning.regionForSpot(s)===region);
 // Changing the region updates the *actual selected site*, and therefore
 // the seasonal lens and its NWS forecast, not just hidden map markers.
 if(matches.length&&!matches.some(s=>s.id===selected.id))pick(matches[0]);
 else renderList();
});
el("state-filter").addEventListener("change",renderList);el("type-filter").addEventListener("change",renderList);el("saved-filter").addEventListener("change",renderList);
el("saved-toggle").addEventListener("click",()=>{if(saved.has(selected.id))saved.delete(selected.id);else saved.add(selected.id);try{localStorage.setItem("eagle-saved-v1",JSON.stringify([...saved]))}catch{}renderList();el("saved-toggle").textContent=saved.has(selected.id)?"Saved ✓":"Save spot"});
el("refresh-weather").addEventListener("click",()=>loadWeather(selected));
el("copy-link").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);el("copy-link").textContent="Copied";setTimeout(()=>text("copy-link","Copy spot link"),1800)}catch{el("copy-link").textContent="Copy URL from address bar"}});
el("nearest").addEventListener("click",()=>{if(!navigator.geolocation){text("location-help","Location not supported in this browser.");return}
 navigator.geolocation.getCurrentPosition(({coords})=>{const rad=d=>d*Math.PI/180;const dist=s=>{const a=Math.sin(rad(s.lat-coords.latitude)/2)**2+Math.cos(rad(coords.latitude))*Math.cos(rad(s.lat))*Math.sin(rad(s.lon-coords.longitude)/2)**2;return 3959*2*Math.asin(Math.min(1,Math.sqrt(a)))};const closest=[...spots].sort((a,b)=>dist(a)-dist(b))[0];el("state-filter").value="all";el("region-filter").value="all";el("type-filter").value="all";el("saved-filter").checked=false;pick(closest);text("location-help","Closest listed spot: "+Math.round(dist(closest))+" straight-line miles. Location is not stored or sent to our server.")},()=>text("location-help","Location not available; you can still select a spot manually."),{timeout:7000})});
el("mode-gather").addEventListener("click",()=>switchMode("gather"));
el("mode-display").addEventListener("click",()=>switchMode("display"));
el("finder-gather").addEventListener("click",()=>switchMode("gather"));
el("finder-display").addEventListener("click",()=>switchMode("display"));
initMap();renderPlanner();pick(selected);
})();
