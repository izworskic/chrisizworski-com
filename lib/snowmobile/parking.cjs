/* Michigan DNR field-asset parking inventory, not geocoded assumptions.
 * Official source: DNRReferenceAssetsOPENDATA/FeatureServer/6
 * DNR descriptions explicitly identify snowmobile trail parking. Sites are
 * never presumed plowed, open, trailer-capable or legally connected to trails.
 */
'use strict';
const SOURCE_LAYER='https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/6';
const WHERE="DESCRIP LIKE '%snowmobile%' OR COMMENTS LIKE '%snowmobile%'";
const PUBLIC_OWNERS=new Set(['State','Federal','County','Municipal']);
const FIELDS='OBJECTID,DESCRIP,COMMENTS,ASSETTYPE,ASSETDETAILTYPE,OWNEDBY,ADMINBY,FUNCTION_,last_edited_date';
function sourceUrl(){
  const args={where:WHERE,outFields:FIELDS,returnGeometry:'true',outSR:'4326',resultRecordCount:'400',f:'geojson'};
  return SOURCE_LAYER+'/query?'+Object.entries(args).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
}
function normalizeParking(feature){
  if(feature?.geometry?.type!=='Point')return null;
  const a=feature.properties||{},pos=feature.geometry.coordinates||[];
  const [lon,lat]=pos,description=String(a.DESCRIP||'').trim(),comments=String(a.COMMENTS||'').trim();
  const id=Number(a.OBJECTID),owner=String(a.OWNEDBY||''),type=String(a.ASSETDETAILTYPE||'');
  if(!Number.isInteger(id)||id<=0||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41||lat>49||lon< -91||lon> -82)return null;
  if(!PUBLIC_OWNERS.has(owner))return null; // private or unknown property is not a public start point
  if(!/Trail Access-(Motorized|Both)/i.test(type))return null;
  if(!/snowmobile\s+parking/i.test(comments)&&!/snowmobile\s+trail/i.test(description))return null;
  if(!/parking lot/i.test(String(a.ASSETTYPE||'')))return null;
  const text=description||'DNR-listed snowmobile parking';
  const edited=Number(a.last_edited_date);
  return {id,lat,lon,name:text.slice(0,160),directionsNote:comments.slice(0,250),
    owner,assetType:type,sourceEditedAt:Number.isFinite(edited)&&edited>0?new Date(edited).toISOString():null};
}
function normalizeFeed(data){
  if(!Array.isArray(data?.features)||data?.properties?.exceededTransferLimit||data?.error)throw Error('DNR parking feed was incomplete');
  const seen=new Set(),sites=[];
  for(const feature of data.features){
    const site=normalizeParking(feature);
    if(site&&!seen.has(site.id)){seen.add(site.id);sites.push(site);}
  }
  sites.sort((a,b)=>a.id-b.id);
  return {sites,sourceRecords:data.features.length,rejectedRecords:data.features.length-sites.length,
    sourceLayer:SOURCE_LAYER,sourceDetail:'DNR managed parking-lot layer; explicitly snowmobile-designated public-owner assets'};
}
module.exports={SOURCE_LAYER,sourceUrl,normalizeParking,normalizeFeed};
