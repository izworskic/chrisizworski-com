const NHD='https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query';
const BBOX='-86.35,44.02,-84.68,44.95';
const NAMES=['Manistee River','Pine River','Bear Creek','Little Manistee River'];

const PAGE_SIZE=400;
const MAX_PAGES=8;

function queryUrl(options={}){
  const name=options.name;
  if(name!==undefined&&!NAMES.includes(name))throw new Error('Unsupported river name');
  const url=new URL(NHD);
  url.searchParams.set('where',(name?[name]:NAMES).map(n=>`gnis_name='${n.replaceAll("'","''")}'`).join(' OR '));
  url.searchParams.set('geometry',BBOX);
  url.searchParams.set('geometryType','esriGeometryEnvelope');
  url.searchParams.set('inSR','4326');
  url.searchParams.set('spatialRel','esriSpatialRelIntersects');
  url.searchParams.set('outFields','gnis_name,reachcode,fcode');
  url.searchParams.set('returnGeometry','true');
  url.searchParams.set('outSR','4326');
  url.searchParams.set('f','geojson');
  if(options.page!==undefined){
    if(!Number.isInteger(options.page)||options.page<0||options.page>=MAX_PAGES)
      throw new Error('Invalid river page');
    url.searchParams.set('orderByFields','OBJECTID');
    url.searchParams.set('resultOffset',String(options.page*PAGE_SIZE));
    url.searchParams.set('resultRecordCount',String(PAGE_SIZE));
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
          role:name==='Manistee River'?'mainstem':(name==='Little Manistee River'?'companion':'tributary')
        }
      };
    })
  };
}

async function fetchNhdPage(url,fetcher=fetch){
  const response=await fetcher(url,{headers:{
    accept:'application/geo+json, application/json',
    'user-agent':'ChrisIzworskiManisteeFieldMap/1.0 (https://chrisizworski.com/manistee-river-map/)'
  },signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`USGS NHD returned ${response.status}`);
  const payload=await response.json();
  if(payload?.error||!Array.isArray(payload?.features))
    throw new Error('USGS NHD response is invalid or unavailable');
  if(payload.exceededTransferLimit===true)
    throw new Error('USGS NHD response incomplete: transfer limit exceeded');
  return payload;
}
async function fetchPagesForName(name,fetcher=fetch){
  if(!NAMES.includes(name))throw new Error('Unsupported river name');
  const features=[];
  for(let page=0;page<MAX_PAGES;page++){
    const payload=await fetchNhdPage(queryUrl({name,page}),fetcher);
    const subset=cleanGeoJson(payload).features.filter(f=>f.properties.name===name);
    features.push(...subset);
    if(subset.length!==payload.features.length)throw new Error('Unexpected river feature in source page');
    if(payload.features.length<PAGE_SIZE)return features;
  }
  throw new Error('USGS NHD river page limit reached: incomplete data');
}
function report(features,names,mode){
  if(!features.length)throw new Error('USGS NHD returned no named Manistee-basin flowlines');
  return {
    source:'USGS The National Map, National Hydrography Dataset',
    source_url:'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6',
    fetched_at:new Date().toISOString(),
    bbox:BBOX.split(',').map(Number),
    sourceCompleteness:'complete-retrieved-set',
    retrievalMode:mode,
    requestedWaterways:names,
    type:'FeatureCollection',
    features,
  };
}
async function fetchHydrography(options={}){
  const fetcher=options.fetcher||fetch;
  if(options.name){
    const features=await fetchPagesForName(options.name,fetcher);
    return report(features,[options.name],'paged-single-waterway');
  }
  try{
    const payload=await fetchNhdPage(queryUrl(),fetcher);
    // A result at the service's advertised 2000-record cap is not evidence of completeness.
    if(payload.features.length>=2000)throw new Error('USGS NHD unpaged response may be truncated');
    return report(cleanGeoJson(payload).features,NAMES,'original-complete-query');
  }catch(primaryError){
    // Retry from the same official NHD layer using page-bounded named-waterway queries.
    // Never fall back to straight-line geometry or a different unvalidated GIS source.
    const groups=await Promise.all(NAMES.map(name=>fetchPagesForName(name,fetcher)));
    return report(groups.flat(),NAMES,'paged-official-recovery');
  }
}

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
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
module.exports._test={queryUrl,cleanGeoJson,property,NAMES,BBOX,PAGE_SIZE,MAX_PAGES,fetchNhdPage,fetchPagesForName};
