const AREA_ORDER = ["Bodie Island", "Hatteras Island", "Ocracoke Island"];

const RAMP_REGISTRY = [
  { id:"2", area:"Bodie Island", near:"Oregon Inlet", priority:true, seasonal:false, lat:35.82930, lon:-75.55300, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"4", area:"Bodie Island", near:"Oregon Inlet", priority:true, seasonal:false, lat:35.79605, lon:-75.54603, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"23", area:"Hatteras Island", near:"Salvo", priority:false, seasonal:true, lat:35.53232, lon:-75.47291, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"25", area:"Hatteras Island", near:"Salvo", priority:true, seasonal:false, boardwalk:true, lat:null, lon:null, coordinate_source:null },
  { id:"27", area:"Hatteras Island", near:"Salvo", priority:true, seasonal:false, lat:35.46973, lon:-75.48314, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"30", area:"Hatteras Island", near:"Salvo", priority:false, seasonal:false, lat:35.43861, lon:-75.48586, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"32", area:"Hatteras Island", near:"Avon", priority:false, seasonal:false, lat:35.408001, lon:-75.488374, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"34", area:"Hatteras Island", near:"Avon", priority:false, seasonal:true, lat:35.37768, lon:-75.49596, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"38", area:"Hatteras Island", near:"Avon", priority:false, seasonal:false, lat:35.32081, lon:-75.50876, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11", boardwalk:false },
  { id:"43", area:"Hatteras Island", near:"Buxton / Cape Point", priority:true, seasonal:false, lat:35.23550, lon:-75.52740, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"44", area:"Hatteras Island", near:"Buxton / Cape Point", priority:true, seasonal:false, lat:35.25299, lon:-75.52369, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"48", area:"Hatteras Island", near:"Frisco / South Beach", priority:true, seasonal:false, lat:null, lon:null, coordinate_source:null },
  { id:"49", area:"Hatteras Island", near:"Frisco", priority:true, seasonal:false, lat:35.23454, lon:-75.60893, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"55", area:"Hatteras Island", near:"Hatteras Village", priority:false, seasonal:false, boardwalk:true, lat:35.20596, lon:-75.70382, coordinate_source:"OBX Beach Driving ramp guide, verified 2026-09-11" },
  { id:"59", area:"Ocracoke Island", near:"North Ocracoke", priority:false, seasonal:false, lat:null, lon:null, coordinate_source:null },
  { id:"63", area:"Ocracoke Island", near:"North Ocracoke", priority:false, seasonal:false, lat:null, lon:null, coordinate_source:null },
  { id:"67", area:"Ocracoke Island", near:"Ocracoke / Pony Pens", priority:false, seasonal:false, lat:null, lon:null, coordinate_source:null },
  { id:"68", area:"Ocracoke Island", near:"Ocracoke", priority:false, seasonal:true, lat:null, lon:null, coordinate_source:null },
  { id:"70", area:"Ocracoke Island", near:"South Point", priority:true, seasonal:false, lat:null, lon:null, coordinate_source:null },
  { id:"72", area:"Ocracoke Island", near:"South Point", priority:true, seasonal:false, lat:null, lon:null, coordinate_source:null },
];

const TIDE_STATIONS = {
  "Bodie Island": { id:"8652587", name:"Oregon Inlet Marina, NC", note:"Official NOAA tide prediction used as local timing context." },
  "Hatteras Island": { id:"8654400", name:"Cape Hatteras Fishing Pier, NC", note:"Official NOAA harmonic tide prediction used as local timing context." },
  "Ocracoke Island": { id:"8654769", name:"Ocracoke, Pamlico Sound, NC", note:"Official NOAA prediction is sound-side context; do not treat its height as ocean-beach water depth." },
};

function decodeHtml(value="") {
  return value
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&ndash;|&#8211;/gi,"–")
    .replace(/&mdash;|&#8212;/gi,"—")
    .replace(/&rsquo;|&#8217;/gi,"’")
    .replace(/&deg;/gi,"°");
}

function htmlToLines(html="") {
  return decodeHtml(String(html))
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<\/(?:p|div|li|h1|h2|h3|h4|tr|td|th|section)>/gi,"\n")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .split(/\n+/)
    .map(line=>line.replace(/\s+/g," ").trim())
    .filter(Boolean);
}

function mileageFrom(text="") {
  const match = String(text).match(/for\s+([0-9]+(?:\.[0-9]+)?)\s+miles?/i);
  return match ? Number(match[1]) : null;
}

function normalizeDirection(direction) {
  const text = `${direction.status_raw||""} ${direction.hours||""} ${direction.notes||""}`.toLowerCase();
  let state = "unknown";
  if (/closed|no public access/.test(text)) state = "closed";
  else if (/pedestrian/.test(text) && !/orv/.test(text)) state = /seasonal/.test(text) ? "seasonal_pedestrian_only" : "pedestrian_only";
  else if (/orv/.test(text) && mileageFrom(text) != null) state = "orv_open_limited";
  else if (/orv/.test(text) || (/\bopen\b/.test(direction.status_raw||"") && /orv/.test(direction.hours||""))) state = "orv_open";
  else if (/pedestrian/.test(text)) state = "pedestrian_only";
  return { ...direction, state, mileage: mileageFrom(`${direction.status_raw||""} ${direction.notes||""}`) };
}

function parseNpsStatus(html) {
  const lines = htmlToLines(html);
  let area = null;
  let ramp = null;
  let lastDirection = null;
  const ramps = [];
  let officialUpdated = null;

  for (let i=0;i<lines.length;i++) {
    const line = lines[i];
    if (line === "Bodie Island" || line === "Hatteras Island" || line === "Ocracoke Island") {
      area = line;
      continue;
    }
    if (line === "Updated" && lines[i+1]) {
      officialUpdated = lines[i+1];
      continue;
    }
    const inlineUpdate = line.match(/^Updated\s+(.+)/i);
    if (inlineUpdate && !officialUpdated) officialUpdated = inlineUpdate[1];

    const rampMatch = line.match(/^Ramp\s+(\d+)\b(.*)$/i);
    if (rampMatch) {
      ramp = { id:rampMatch[1], area, label:`Ramp ${rampMatch[1]}`, header:line, directions:[] };
      ramps.push(ramp);
      lastDirection = null;
      continue;
    }
    if (!ramp) continue;
    const directionMatch = line.match(/^(North|South|East|West):\s*(.*)$/i);
    if (directionMatch) {
      lastDirection = { direction:directionMatch[1][0].toUpperCase()+directionMatch[1].slice(1).toLowerCase(), status_raw:directionMatch[2]||"", hours:"", notes:"" };
      ramp.directions.push(lastDirection);
      continue;
    }
    if (/^Hours:/i.test(line) && lastDirection) {
      lastDirection.hours = line.replace(/^Hours:\s*/i,"");
      continue;
    }
    if (/^Notes:/i.test(line) && lastDirection) {
      lastDirection.notes = line.replace(/^Notes:\s*/i,"");
      continue;
    }
    if (lastDirection && lastDirection.notes && !/^Ramp\s+/i.test(line) && !AREA_ORDER.includes(line)) {
      if (!/^(Beach Access|Mileage Summary|Seashore Mileage)/i.test(line)) lastDirection.notes += ` ${line}`;
    }
  }

  const enriched = ramps.map(item=>{
    const registry = RAMP_REGISTRY.find(r=>r.id===item.id) || {};
    const directions = item.directions.map(normalizeDirection);
    return { ...registry, ...item, area:item.area || registry.area || null, near:registry.near||null, directions };
  });

  const valid = enriched.filter(r=>r.directions.length>0 && r.area);
  const quality = valid.length >= 15 && AREA_ORDER.every(a=>valid.some(r=>r.area===a)) ? "high" : valid.length >= 8 ? "partial" : "failed";
  return { official_updated:officialUpdated, ramps:valid, parser_quality:quality, parsed_count:valid.length };
}

function localMinutes(now=new Date(), timeZone="America/New_York") {
  const parts = new Intl.DateTimeFormat("en-US",{timeZone,hour:"numeric",minute:"2-digit",hour12:false}).formatToParts(now);
  const hour = Number(parts.find(p=>p.type==="hour")?.value||0);
  const minute = Number(parts.find(p=>p.type==="minute")?.value||0);
  return hour*60+minute;
}

function parseClock(hour, minute, marker) {
  let h=Number(hour); const m=Number(minute||0); const pm=/p/i.test(marker);
  if (h===12) h=0; if (pm) h+=12; return h*60+m;
}

function openNowFromHours(hours="", now=new Date()) {
  if (!hours) return null;
  if (/24\s*hours/i.test(hours)) return true;
  const m = hours.match(/from\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
  if (!m) return null;
  const current=localMinutes(now); const start=parseClock(m[1],m[2],m[3]); const end=parseClock(m[4],m[5],m[6]);
  return current>=start && current<end;
}

function rampAccessSummary(ramp, now=new Date()) {
  const dirs = ramp.directions.map(d=>({ ...d, open_now:openNowFromHours(d.hours,now) }));
  const orv = dirs.filter(d=>["orv_open","orv_open_limited"].includes(d.state));
  const usableNow = orv.filter(d=>d.open_now!==false);
  const ped = dirs.filter(d=>["pedestrian_only","seasonal_pedestrian_only","orv_open","orv_open_limited"].includes(d.state));
  const knownMileage = usableNow.map(d=>d.mileage).filter(Number.isFinite);
  let public_state = "unknown";
  if (orv.length && usableNow.length) public_state = usableNow.length === dirs.length && !usableNow.some(d=>d.state==="orv_open_limited") ? "open" : "limited";
  else if (orv.length && !usableNow.length) public_state = "hours_closed";
  else if (ped.length) public_state = "pedestrian_only";
  else if (dirs.every(d=>d.state==="closed")) public_state = "closed";
  return { ...ramp, directions:dirs, orv_direction_count:orv.length, orv_open_now_count:usableNow.length, pedestrian_direction_count:ped.length, known_open_miles:knownMileage.reduce((a,b)=>a+b,0)||null, public_state };
}

function tideConvenience(tide, now=new Date()) {
  if (!tide?.events?.length) return { score:8, label:"Tide timing unavailable", next_low:null, next_high:null };
  const future=tide.events.filter(e=>new Date(e.time).getTime()>now.getTime());
  const low=future.find(e=>e.type==="L")||null; const high=future.find(e=>e.type==="H")||null;
  let score=10, label="Check tide timing";
  if (low) {
    const hours=(new Date(low.time)-now)/36e5;
    if (hours>=0 && hours<=4) { score=20; label=`Lower water approaches in ${Math.max(1,Math.round(hours))} hr`; }
    else if (hours<=7) { score=16; label="Lower water later today"; }
    else { score=12; label="Lower water is not imminent"; }
  }
  return { score, label, next_low:low, next_high:high };
}

function scoreRamp(ramp, context={}) {
  const now=context.now||new Date(); const access=rampAccessSummary(ramp,now);
  if (!["open","limited"].includes(access.public_state)) return { eligible:false, score:null, reasons:[access.public_state], access };
  const openDirs=access.orv_open_now_count;
  let accessScore = openDirs>=2 ? 35 : 27;
  if (access.known_open_miles!=null && access.known_open_miles<0.35) accessScore-=7;
  else if (access.known_open_miles!=null && access.known_open_miles>=1) accessScore+=Math.min(3,access.known_open_miles);
  accessScore=Math.max(0,Math.min(35,accessScore));
  const tide=tideConvenience(context.tide,now);
  let weatherScore=15; const wind=Number(context.weather?.wind_mph);
  if (Number.isFinite(wind)) weatherScore = wind>=30?3:wind>=22?7:wind>=15?11:15;
  if (context.weather?.thunderstorm === "high") weatherScore=Math.min(weatherScore,4);
  let coastalScore=10; const surf=Number(context.surf?.height_max_ft);
  if (Number.isFinite(surf)) coastalScore=surf>=8?2:surf>=6?5:surf>=4?7:10;
  const freshness=context.nps_quality==="high"?10:context.nps_quality==="partial"?5:0;
  const reachability = context.transport?.status==="disrupted" ? 0 : context.transport?.status==="verified" ? 10 : 5;
  const score=Math.round(accessScore+tide.score+weatherScore+coastalScore+freshness+reachability);
  return { eligible:true, score, access, tide, components:{access:accessScore,tide:tide.score,weather:weatherScore,coastal:coastalScore,freshness,reachability} };
}

function rankRamps(ramps, contextByArea={}, now=new Date()) {
  return ramps.map(ramp=>{
    const context={...(contextByArea[ramp.area]||{}),now};
    return { ramp, result:scoreRamp(ramp,context) };
  }).filter(x=>x.result.eligible).sort((a,b)=>b.result.score-a.result.score || Number(a.ramp.id)-Number(b.ramp.id));
}

module.exports={AREA_ORDER,RAMP_REGISTRY,TIDE_STATIONS,htmlToLines,parseNpsStatus,normalizeDirection,openNowFromHours,rampAccessSummary,tideConvenience,scoreRamp,rankRamps};
