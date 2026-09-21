const DNR='https://services.arcgis.com/uHAHKfH1Z5ye1Oe0/ArcGIS/rest/services/Michigan_DNR_Designated_Snowmobile_Trails/FeatureServer/0/query';
const DNR_OPEN='https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/15/query';
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
const OPEN_OUT_FIELDS="OBJECTID,GlobalID,DNRTrail,TrailApprovalStatus,OpenClosedStatusSnowmobile,Snowmobile,SnowmobileName,TrailNamePrimary,TrailGroomType,TrailGrooming,SurfaceType,TrailOnRoad,SegmentLengthMiles,PublicComments,TrailNetwork,County,SpecialRestrictionType,TrailOwnership,TrailAdministrator,last_edited_date";
export function normalizeOpenTrailFeature(feature){
  const p=feature?.properties||{};
  // TrailNetwork is frequently the DNR placeholder string "-1" (an unassigned
  // network id), which is truthy in JS and used to silently win over the
  // real human-readable trail name. Treat "-1" (and blank) as absent so the
  // map, popups and segment list show a real name like "LP 7" instead of
  // the literal string "-1".
  const rawNetwork=p.TrailNetwork!=null&&String(p.TrailNetwork).trim()!==''&&String(p.TrailNetwork).trim()!=='-1'?p.TrailNetwork:null;
  return {...feature,properties:{
    ...p,
    Unique_ID:p.GlobalID||String(p.OBJECTID||''),
    Status:p.TrailApprovalStatus||null,
    OpenClosedStatusSnowmobile:p.OpenClosedStatusSnowmobile||null,
    Groom_Spon:p.TrailGrooming||null,
    Trail_Netw:rawNetwork||p.TrailNamePrimary||p.SnowmobileName||null,
    Surface:p.SurfaceType||null,
    On_Road:p.TrailOnRoad||null,
    Miles:Number(p.SegmentLengthMiles)||null,
    Comments:p.PublicComments||null,
    EditDate:p.last_edited_date||null
  }};
}
async function queryOpenTrails(params){
  const r=await fetch(`${DNR_OPEN}?${params}`);
  if(!r.ok)throw new Error(`DNR open-data ArcGIS ${r.status}`);
  const json=await r.json();
  if(!Array.isArray(json?.features))throw new Error('DNR open-data query returned no feature array');
  return {...json,provider:'Michigan DNR DNRTrailsOPENDATA',features:json.features.map(normalizeOpenTrailFeature)};
}
async function fetchDnrOpenCorridor(){
  const json=await queryOpenTrails(corridorParams(OPEN_OUT_FIELDS));
  if(!json.features.length)throw new Error('DNR open-data corridor returned no features');
  return json;
}
export async function fetchDnrCorridor(){
  try{return await fetchDnrOpenCorridor();}
  catch(primaryError){
    const p=corridorParams("FID,Unique_ID,Status,Snowmobile,Snowmobi_1,Groom_Spon,Trail_Netw,Owner,Administra,Surface,Seasonal_R,Seasonal_1,Special_De,Special__1,On_Road,ROW,ROW_Commen,Miles,Comments,EditDate");
    const r=await fetch(`${DNR}?${p}`);if(!r.ok)throw new Error(`DNR trail sources failed: ${String(primaryError?.message||primaryError)}; fallback ${r.status}`);
    const json=await r.json();return {...json,provider:'Michigan DNR designated snowmobile trails fallback',primaryError:String(primaryError?.message||primaryError)};
  }
}
/*
 * Statewide region fetch: the DNR open-data layer's own County field is an
 * exact, official grouping, so counties are used directly in a WHERE clause
 * rather than an approximated bounding box. County string values are
 * matched verbatim, including the DNR's own "Charelvoix" spelling of
 * Charlevoix County (do not "fix" the spelling in the query string).
 */
export async function fetchDnrTrailsByCounty(counties=[]){
  const clause=counties.map((c)=>`'${String(c).replace(/'/g,"''")}'`).join(',');
  const params=new URLSearchParams({
    where:`County IN (${clause})`,outFields:OPEN_OUT_FIELDS,returnGeometry:'true',outSR:'4326',f:'geojson'
  });
  const json=await queryOpenTrails(params);
  if(!json.features.length)throw new Error(`DNR open-data returned no features for counties: ${counties.join(', ')}`);
  return json;
}
/*
 * Closures are matched to segments by trail name/number (see
 * engine.mjs closureForSegment), not by geometry, and Michigan's LP/UP trail
 * numbers are specific named corridors rather than a repeated generic
 * label. So one statewide closure pull is both simpler and more correct
 * than a per-region bounding box, which previously could miss a real
 * closure sitting just outside an arbitrary box.
 */
export async function fetchDnrClosures(){
  const params=new URLSearchParams({
    where:"1=1",outFields:"FID,DNRTrail,County,TrailUseCa,TrailNameP,PublicComm,OpenClosed,OpenClos_1,OpenClos_2,SegmentLen,SurfaceTyp,TrailOnRoa,Snowmobile,Snowmobi_1,Peninsula,created_da,last_edite",
    returnGeometry:'true',outSR:'4326',f:'geojson'
  });
  const r=await fetch(`${DNR_CLOSURES}?${params}`); if(!r.ok)throw new Error(`DNR closure ArcGIS ${r.status}`); return r.json();
}
async function nwsPoint(lat,lon){
  const headers={'user-agent':'chrisizworski.com snowmobile conditions'};
  const p=await fetch(`https://api.weather.gov/points/${lat},${lon}`,{headers});
  if(!p.ok)throw new Error(`NWS points ${p.status}`);
  const pj=await p.json();
  const [forecastR,hourlyR]=await Promise.allSettled([
    fetch(pj.properties.forecast,{headers}),
    fetch(pj.properties.forecastHourly,{headers})
  ]);
  if(forecastR.status==='rejected'||!forecastR.value?.ok)throw new Error(`NWS forecast ${forecastR.status==='fulfilled'?forecastR.value.status:'unavailable'}`);
  const forecast=await forecastR.value.json();
  let hourly=null;
  if(hourlyR.status==='fulfilled'&&hourlyR.value.ok)hourly=await hourlyR.value.json();
  return {forecast,hourly};
}
function weatherSummary(bundle){
  const json=bundle?.forecast||bundle;
  const props=json?.properties||{}; const periods=props.periods||[]; const next=periods.slice(0,6);
  const temps=next.map(p=>Number(p.temperature)).filter(Number.isFinite);
  const txt=next.map(p=>p.detailedForecast||'').join(' ');
  const snowMatches=[...txt.matchAll(/(?:snow accumulation|new snow accumulation)[^0-9]*(\d+(?:\.\d+)?)(?:\s*to\s*(\d+(?:\.\d+)?))?/gi)];
  const snowLowIn=snowMatches.length?snowMatches.reduce((n,m)=>n+Number(m[1]||0),0):null;
  const snowHighIn=snowMatches.length?snowMatches.reduce((n,m)=>n+Number(m[2]||m[1]||0),0):null;
  const snowIn=snowHighIn;
  const snowSignal=/snow|flurr/i.test(txt);
  const rainSignal=/rain|drizzle|showers/i.test(txt);
  const hourlyProps=bundle?.hourly?.properties||{};
  const hourly=(hourlyProps.periods||[]).slice(0,72).map(p=>({
    startTime:p.startTime,endTime:p.endTime,isDaytime:p.isDaytime,temperature:p.temperature,windSpeed:p.windSpeed,
    shortForecast:p.shortForecast,precipProbability:Number.isFinite(Number(p?.probabilityOfPrecipitation?.value))?Number(p.probabilityOfPrecipitation.value):null
  }));
  return {generatedAt:props.generatedAt||props.updateTime||hourlyProps.generatedAt||hourlyProps.updateTime||null,maxTempF:temps.length?Math.max(...temps):null,minTempF:temps.length?Math.min(...temps):null,snowIn,snowLowIn,snowHighIn,snowSignal,rainSignal,periods:next.map(p=>({name:p.name,isDaytime:p.isDaytime,temperature:p.temperature,windSpeed:p.windSpeed,shortForecast:p.shortForecast,startTime:p.startTime,endTime:p.endTime,detailedForecast:p.detailedForecast})),hourly};
}
export async function fetchWeatherFor(lat,lon){
  try{return weatherSummary(await nwsPoint(lat,lon));}
  catch(error){return {error:String(error?.message||error)};}
}
export async function fetchWeather(){
  const [grayling,gaylord]=await Promise.allSettled([nwsPoint(44.6614,-84.7148),nwsPoint(45.0275,-84.6748)]);
  return {grayling:grayling.status==='fulfilled'?weatherSummary(grayling.value):{error:String(grayling.reason)},gaylord:gaylord.status==='fulfilled'?weatherSummary(gaylord.value):{error:String(gaylord.reason)}};
}
/* Fetch weather for an arbitrary set of {key,lat,lon} hub points in parallel. */
export async function fetchWeatherForHubs(hubs=[]){
  const results=await Promise.all(hubs.map(async (h)=>[h.key,await fetchWeatherFor(h.lat,h.lon)]));
  return Object.fromEntries(results);
}
