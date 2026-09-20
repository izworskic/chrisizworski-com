const DNR='https://services.arcgis.com/uHAHKfH1Z5ye1Oe0/ArcGIS/rest/services/Michigan_DNR_Designated_Snowmobile_Trails/FeatureServer/0/query';
const DNR_CLOSURES='https://services.arcgis.com/uHAHKfH1Z5ye1Oe0/ArcGIS/rest/services/DNR_Trail_Temporary_Closures/FeatureServer/0/query';
const MISORVA={
  grayling:'https://misorva.org/trail-reports/greater-grayling-snowmobile-assoc/',
  gaylord:'https://misorva.org/trail-reports/gaylord-area-snowmobile-trials-council/'
};
function cleanHtml(html=''){return String(html).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function parseClub(text,url,name){
  const condition=(text.match(/Trail Condition:\s*([^|]{2,40}?)(?=Last Groomed:|Reported On:|Groomer Report|$)/i)||[])[1]?.trim()||null;
  const groom=(text.match(/Last Groomed:\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i)||[])[1]||null;
  const reported=(text.match(/Reported On:\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\s*@\s*\d{1,2}:\d{2}(?:am|pm))/i)||[])[1]||null;
  return {name,url,condition,lastGroomedRaw:groom,reportedRaw:reported,reportText:text.slice(0,3800)};
}
export async function fetchClub(key){
  const url=MISORVA[key]; if(!url) return null;
  try{const r=await fetch(url,{headers:{'user-agent':'ChrisIzworskiSnowmobileConditions/1.0'}}); if(!r.ok)throw new Error(String(r.status)); return parseClub(cleanHtml(await r.text()),url,key==='grayling'?'Greater Grayling Snowmobile Association':'Gaylord Area Snowmobile Trails Council');}
  catch(error){return {name:key,url,error:String(error?.message||error)}}
}
const corridorParams=(outFields)=>new URLSearchParams({
  where:"1=1",geometry:"-84.86,44.55,-84.48,45.12",geometryType:"esriGeometryEnvelope",inSR:"4326",spatialRel:"esriSpatialRelIntersects",
  outFields,returnGeometry:"true",outSR:"4326",f:"geojson"
});
export async function fetchDnrCorridor(){
  const p=corridorParams("FID,Unique_ID,Status,Snowmobile,Snowmobi_1,Groom_Spon,Trail_Netw,Owner,Administra,Surface,Seasonal_R,Seasonal_1,Special_De,Special__1,On_Road,ROW,ROW_Commen,Miles,Comments,EditDate");
  const r=await fetch(`${DNR}?${p}`); if(!r.ok)throw new Error(`DNR trail ArcGIS ${r.status}`); return r.json();
}
export async function fetchDnrClosures(){
  const p=corridorParams("FID,DNRTrail,County,TrailUseCa,TrailNameP,PublicComm,OpenClosed,OpenClos_1,OpenClos_2,SegmentLen,SurfaceTyp,TrailOnRoa,Snowmobile,Snowmobi_1,Peninsula,created_da,last_edite");
  const r=await fetch(`${DNR_CLOSURES}?${p}`); if(!r.ok)throw new Error(`DNR closure ArcGIS ${r.status}`); return r.json();
}
async function nwsPoint(lat,lon){
  const p=await fetch(`https://api.weather.gov/points/${lat},${lon}`,{headers:{'user-agent':'chrisizworski.com snowmobile conditions'}});
  if(!p.ok)throw new Error(`NWS points ${p.status}`);
  const pj=await p.json(); const f=await fetch(pj.properties.forecast,{headers:{'user-agent':'chrisizworski.com snowmobile conditions'}});
  if(!f.ok)throw new Error(`NWS forecast ${f.status}`); return f.json();
}
function weatherSummary(json){
  const periods=json?.properties?.periods||[]; const next=periods.slice(0,4);
  const temps=next.map(p=>Number(p.temperature)).filter(Number.isFinite);
  const txt=next.map(p=>p.detailedForecast||'').join(' ');
  const snowMatches=[...txt.matchAll(/(?:snow accumulation|new snow accumulation)[^0-9]*(\d+(?:\.\d+)?)(?:\s*to\s*(\d+(?:\.\d+)?))?/gi)];
  const snowIn=snowMatches.reduce((n,m)=>n+Number(m[2]||m[1]||0),0);
  const rainIn=/rain|showers/i.test(txt)?0.1:0;
  return {maxTempF:temps.length?Math.max(...temps):null,minTempF:temps.length?Math.min(...temps):null,snowIn,rainIn,periods:next.map(p=>({name:p.name,isDaytime:p.isDaytime,temperature:p.temperature,windSpeed:p.windSpeed,shortForecast:p.shortForecast,startTime:p.startTime,endTime:p.endTime,detailedForecast:p.detailedForecast}))};
}
export async function fetchWeather(){
  const [grayling,gaylord]=await Promise.allSettled([nwsPoint(44.6614,-84.7148),nwsPoint(45.0275,-84.6748)]);
  return {grayling:grayling.status==='fulfilled'?weatherSummary(grayling.value):{error:String(grayling.reason)},gaylord:gaylord.status==='fulfilled'?weatherSummary(gaylord.value):{error:String(gaylord.reason)}};
}
