/**
 * Pukaskwa public GIS contract. Only these seven explicit Parks Canada open-data
 * points may enter the visitor map. No route line, cultural location, undisclosed
 * feature, inferred trailhead, or parking-entrance coordinate may enter by query.
 * Checked 2026-10-31 against Parks Canada Open Points (ArcGIS FeatureServer).
 */
export const APPROVED_POINTS = Object.freeze({
  'day-use-parking':1005,
  'visitor-centre':990,
  'park-kiosk':996,
  'horseshoe-beach':973,
  'middle-beach':988,
  'southern-headland-chair':985,
  'picnic-area':1003,
});
export const MAP_DATA_ROUTE = '/pukaskwa-national-park/access-points.json';
const MIN_LON=-86.31,MAX_LON=-86.28,MIN_LAT=48.585,MAX_LAT=48.598;
const geoDataset='https://open.canada.ca/data/en/dataset/cf5c266c-3a6a-4a3b-aed1-2ddd6e49d5e6';

export function verifyMapCatalog(catalog) {
  if (!catalog || catalog.schemaVersion!==1 || catalog.park!=='pukaskwa' ||
      !catalog.provenance?.dataset || catalog.provenance.dataset!==geoDataset ||
      catalog.safety?.noRoutes!==true || catalog.safety.noTrailheadWaypoints!==true ||
      catalog.safety.noDrivingDirectionsFromMappedPins!==true ||
      catalog.coordinatesOrder!=='longitude,latitude' ||
      !Array.isArray(catalog.points) ||
      catalog.points.length!==Object.keys(APPROVED_POINTS).length) {
    throw new Error('Invalid or incomplete public GIS source data');
  }
  const seen=new Set();
  for(const record of catalog.points){
    const pointId=record?.id;
    if(!pointId || seen.has(pointId) || !Object.hasOwn(APPROVED_POINTS,pointId) ||
       record.officialObjectId!==APPROVED_POINTS[pointId] ||
       !Number.isFinite(record.lon)||!Number.isFinite(record.lat)||
       !(record.lon>=MIN_LON && record.lon<=MAX_LON && record.lat>=MIN_LAT && record.lat<=MAX_LAT) ||
       !['parking','information','landmark'].includes(record.kind) ||
       record.mapLinkType!=='view-only' ||
       typeof record.name!=='string' || !record.name.trim() ||
       typeof record.description!=='string' || !record.description ||
       !record.url.startsWith('https://parks.canada.ca/')) {
      throw new Error('Unapproved Pukaskwa location or provenance: '+String(pointId));
    }
    seen.add(pointId);
  }
  if(!catalog.trailFocus || Object.keys(catalog.trailFocus).length!==8) {
    throw new Error('Missing visitor hike relationships');
  }
  for(const [trailId,pointId] of Object.entries(catalog.trailFocus)){
    if(!['boardwalk-beach','beach','southern-headland','manito-miikana','bimose-kinoomagewnan','hattie-cove-fire-walk','combination-hike','white-river-bridge'].includes(trailId) ||
       (pointId!==null && !seen.has(pointId))) throw new Error('Unapproved trail-to-public-point relationship');
    if(trailId==='white-river-bridge' && pointId!==null) throw new Error('Closed bridge must not create destination routing');
  }
  return catalog;
}

export function relatedPlace(catalog,trailId) {
  const pointId=catalog.trailFocus?.[trailId];
  return pointId?catalog.points.find(point=>point.id===pointId)||null:null;
}

export function mapLink(point) {
  if(!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(point.lat+','+point.lon);
}

export function placeInterpretation(point,trailId) {
  if(!point) return 'No trail route or mapped visitor location is available for this choice. Use the park’s official map and posted notices.';
  if(trailId==='southern-headland') return 'The mapped red-chair viewpoint is on Southern Headland Trail. It is not the trailhead or a shorter route. Walk from the signed Visitor Centre trail network after checking access.';
  if(trailId==='boardwalk-beach') return 'Horseshoe Beach is a mapped shoreline destination for Boardwalk Beach Trail. This pin is not a starting point or a guarantee that the boardwalk is passable.';
  if(trailId==='beach') return 'Middle Beach is a mapped destination along Beach Trail. Follow the park’s signed route, not a straight line from this point.';
  if(point.id==='day-use-parking') return 'The mapped Visitor Centre day-use parking area is the appropriate orientation point. Parks Canada has not released verified route geometry for this individual hike; use its official illustrated trail map.';
  return point.description;
}
