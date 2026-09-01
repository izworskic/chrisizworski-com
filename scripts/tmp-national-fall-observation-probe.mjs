const endpoint = "https://services.usanpn.org/npn_portal/observations/getObservations.json";
const points = [
  ["Bay City MI",43.594,-83.889],
  ["Burlington VT",44.476,-73.212],
  ["Boulder CO",40.015,-105.270]
];
const day = 86400000;
const end = new Date();
const iso = d => d.toISOString().slice(0,10);
const start21 = iso(new Date(end.getTime()-20*day));
const start90 = iso(new Date(end.getTime()-89*day));
function bounds(lat,lon,miles=75){
  const latDelta=miles/69;
  const lonDelta=miles/(69*Math.max(.2,Math.cos(lat*Math.PI/180)));
  return {south:lat-latDelta,west:lon-lonDelta,north:lat+latDelta,east:lon+lonDelta};
}
async function request(name,lat,lon,start){
  const b=bounds(lat,lon);
  const body=new URLSearchParams({
    request_src:"Chris Izworski National Fall Color live probe",
    climate_data:"0",
    start_date:start,
    end_date:iso(end),
    bottom_left_x1:b.south.toFixed(5),
    bottom_left_y1:b.west.toFixed(5),
    upper_right_x2:b.north.toFixed(5),
    upper_right_y2:b.east.toFixed(5),
    "phenophase_id[1]":"498",
    "additional_field[1]":"Site_Name",
    "additional_field[2]":"Common_Name",
    "additional_field[3]":"Observed_Status_Conflict_Flag"
  });
  const res=await fetch(endpoint,{
    method:"POST",
    headers:{
      accept:"application/json",
      "content-type":"application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent":"ChrisIzworskiNationalFallObservationProbe/1.0"
    },
    body,
    signal:AbortSignal.timeout(15000)
  });
  const text=await res.text();
  if(!res.ok)throw new Error(name+" HTTP "+res.status+" "+text.slice(0,200));
  let data;
  try{data=JSON.parse(text)}catch{throw new Error(name+" non-JSON "+text.slice(0,300))}
  if(!Array.isArray(data))throw new Error(name+" response not array: "+JSON.stringify(data).slice(0,500));
  console.log(JSON.stringify({name,start,end:iso(end),count:data.length,keys:data[0]?Object.keys(data[0]).slice(0,30):[]},null,2));
  return data;
}
let recent=0,broad=0,sample=null;
for(const [name,lat,lon] of points){
  const rows21=await request(name,lat,lon,start21);
  recent+=rows21.length;
  if(!sample&&rows21[0])sample=rows21[0];
  if(!rows21.length){
    const rows90=await request(name+" 90d contract check",lat,lon,start90);
    broad+=rows90.length;
    if(!sample&&rows90[0])sample=rows90[0];
  }else broad+=rows21.length;
}
console.log("TOTAL_RECENT_21D="+recent);
console.log("TOTAL_SCHEMA_EVIDENCE="+broad);
if(!sample)throw new Error("USA-NPN returned no records in 21d or fallback 90d probes; request contract not proven");
const keys=Object.keys(sample).map(k=>k.toLowerCase().replace(/[^a-z0-9]/g,""));
const hasStatus=keys.some(k=>k.includes("phenophasestatus"));
const hasDate=keys.some(k=>k.includes("observationdate"));
const hasLat=keys.includes("latitude");
const hasLon=keys.includes("longitude");
if(!(hasStatus&&hasDate&&hasLat&&hasLon)){
  throw new Error("Sample record missing expected status/date/coordinate fields: "+JSON.stringify(Object.keys(sample)));
}
console.log("CONTRACT_OK=true");
