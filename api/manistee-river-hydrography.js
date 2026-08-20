const NHD='https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query';
const BBOX='-86.35,44.02,-84.68,44.95';
const NAMES=['Manistee River','Pine River','Bear Creek','Little Manistee River'];

function queryUrl(){
  const url=new URL(NHD);
  url.searchParams.set('where',NAMES.map(n=>`gnis_name='${n.replaceAll("'","''")}'`).join(' OR '));
  url.searchParams.set('geometry',BBOX);
  url.searchParams.set('geometryType','esriGeometryEnvelope');
  url.searchParams.set('inSR','4326');
  url.searchParams.set('spatialRel','esriSpatialRelIntersects');
  url.searchParams.set('outFields','gnis_name,reachcode,fcode');
  url.searchParams.set('returnGeometry','true');
  url.searchParams.set('outSR','4326');
  url.searchParams.set('f','geojson');
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

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }
  try{
    const response=await fetch(queryUrl(),{headers:{accept:'application/geo+json, application/json','user-agent':'ChrisIzworskiManisteeFieldMap/1.0 (https://chrisizworski.com/manistee-river-map/)'},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error(`USGS NHD returned ${response.status}`);
    const payload=await response.json();
    const geojson=cleanGeoJson(payload);
    if(!geojson.features.length)throw new Error('USGS NHD returned no named Manistee-basin flowlines');
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({
      source:'USGS The National Map — National Hydrography Dataset',
      source_url:'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6',
      fetched_at:new Date().toISOString(),
      bbox:BBOX.split(',').map(Number),
      ...geojson
    });
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'USGS hydrography unavailable',detail:String(error?.message||error)});
  }
};

module.exports._test={queryUrl,cleanGeoJson,property,NAMES,BBOX};
