const NHD='https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query';
const BBOX='-86.35,44.02,-84.68,44.95';
const NAMES=['Manistee River','Pine River','Bear Creek','Little Manistee River'];
const PAGE_SIZE=350;
const MAX_PAGES_PER_WATERWAY=12;
const FETCH_TIMEOUT_MS=7000;

// Keep the original queryUrl() behavior for existing tests and source metadata.
// For actual retrieval, page through smaller queries per named waterway.
function queryUrl(name=null,offset=null){
  if(name!==null&&!NAMES.includes(name))throw new Error('Unknown Manistee waterway');
  if(offset!==null&&(!Number.isSafeInteger(offset)||offset<0))throw new Error('Invalid USGS offset');
  const url=new URL(NHD);
  const names=name===null?NAMES:[name];
  url.searchParams.set('where',names.map(n=>"gnis_name='"+n.replaceAll("'","''")+"'").join(' OR '));
  url.searchParams.set('geometry',BBOX);
  url.searchParams.set('geometryType','esriGeometryEnvelope');
  url.searchParams.set('inSR','4326');
  url.searchParams.set('spatialRel','esriSpatialRelIntersects');
  url.searchParams.set('outFields',offset===null?'gnis_name,reachcode,fcode':'OBJECTID,gnis_name,reachcode,fcode');
  url.searchParams.set('returnGeometry','true');
  url.searchParams.set('outSR','4326');
  url.searchParams.set('f','geojson');
  if(offset!==null){
    url.searchParams.set('resultOffset',String(offset));
    url.searchParams.set('resultRecordCount',String(PAGE_SIZE));
    url.searchParams.set('orderByFields','OBJECTID ASC');
  }
  return url.toString();
}
function property(properties={},lower,alias){
  return properties[lower]??properties[alias]??null;
}
function cleanGeoJson(payload){
  const features=(payload?.features||[]).filter(f=>{
    const name=property(f?.properties,'gnis_name','GNIS_NAME');
    return f?.geometry&&NAMES.includes(name);
  });
  return {
    type:'FeatureCollection',
    features:features.map(f=>{
      const name=property(f.properties,'gnis_name','GNIS_NAME');
      return {
        type:'Feature',
        geometry:f.geometry,
        properties:{
          name,
          reachCode:property(f.properties,'reachcode','REACHCODE'),
          fCode:property(f.properties,'fcode','FCode'),
          objectId:property(f.properties,'objectid','OBJECTID')??f.id??null,
          role:name==='Manistee River'?'mainstem':(name==='Little Manistee River'?'companion':'tributary')
        }
      };
    })
  };
}
async function requestGeoJson(url,options={}){
  const request=options.fetcher||fetch;
  let lastError;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await request(url,{
        headers:{
          accept:'application/geo+json, application/json',
          'user-agent':'ChrisIzworskiManisteeFieldMap/1.1 (https://chrisizworski.com/manistee-river-map/)'
        },
        signal:AbortSignal.timeout(options.timeoutMs||FETCH_TIMEOUT_MS)
      });
      if(!response.ok)throw new Error('USGS NHD HTTP '+response.status);
      const payload=await response.json();
      if(payload?.error || !Array.isArray(payload?.features))
        throw new Error('USGS NHD returned an invalid feature collection');
      return payload;
    }catch(error){
      lastError=error;
      if(attempt===0)await new Promise(resolve=>setTimeout(resolve,200));
    }
  }
  throw new Error('USGS NHD source unavailable: '+String(lastError?.message||lastError));
}
async function fetchNamedWaterway(name,options={}){
  if(!NAMES.includes(name))throw new Error('Unknown Manistee waterway');
  const features=[];
  const keys=new Set();
  for(let page=0;page<MAX_PAGES_PER_WATERWAY;page++){
    const payload=await requestGeoJson(queryUrl(name,page*PAGE_SIZE),options);
    const raw=payload.features;
    const normalized=cleanGeoJson(payload).features;
    if(raw.length!==normalized.length || normalized.some(f=>f.properties.name!==name))
      throw new Error('USGS NHD returned mismatched named geometry');
    for(const feature of normalized){
      if(!['LineString','MultiLineString'].includes(feature.geometry?.type))
        throw new Error('USGS NHD returned non-line geometry');
      const id=feature.properties.objectId;
      if(id===null)throw new Error('USGS NHD pagination missing object identity');
      const key=String(id);
      if(keys.has(key))continue;
      keys.add(key);
      features.push(feature);
    }
    // ArcGIS can omit exceededTransferLimit even when a full page was sent.
    const more=Boolean(payload.exceededTransferLimit)||raw.length===PAGE_SIZE;
    if(!more){
      if(!features.length)throw new Error('USGS NHD returned no '+name+' flowlines');
      return features;
    }
  }
  throw new Error('USGS NHD page cap exceeded for '+name+'; no partial geometry may be returned');
}
async function fetchHydrography(options={}){
  // Two concurrent named requests limit pressure on the official service.
  const groups=[];
  for(let i=0;i<NAMES.length;i+=2){
    const batch=await Promise.all(NAMES.slice(i,i+2).map(name=>fetchNamedWaterway(name,options)));
    groups.push(...batch);
  }
  const features=groups.flat();
  if(features.length<20)throw new Error('USGS NHD named flowline coverage unexpectedly small');
  return {
    source:'USGS The National Map - National Hydrography Dataset',
    source_url:'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6',
    fetched_at:new Date().toISOString(),
    bbox:BBOX.split(',').map(Number),
    retrieval:'source-named-paginated',
    complete:true,
    type:'FeatureCollection',
    features
  };
}
module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }
  if(req.method==='HEAD'){
    res.setHeader('Cache-Control','public, s-maxage=3600');
    return res.status(200).end();
  }
  try{
    const payload=await fetchHydrography();
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(payload);
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'USGS hydrography unavailable',detail:String(error?.message||error)});
  }
};
module.exports.fetchHydrography=fetchHydrography;
module.exports._test={queryUrl,cleanGeoJson,property,NAMES,BBOX,PAGE_SIZE,MAX_PAGES_PER_WATERWAY,fetchNamedWaterway,requestGeoJson};
