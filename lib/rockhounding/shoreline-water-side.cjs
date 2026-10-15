'use strict';
// Geographic evidence gate: shore-side mapped water != beach surf calibration.
// GLAHF NHD polygon (2013 era), OpenStreetMap beach footprints (research only),
// NOAA GLWU model cells (forecast grid). No source alone grants collecting rights.
const snapshot=require('../../data/rockhounding/grand-marais-glahf-water-side-2026-10-15.json');
const pilot=require('../../data/rockhounding/grand-marais-wave-pilot.json');
const ID='grand-marais-glahf-water-side-v1';
const REQUIRED={
 'grand-marais-agate':{
  water:['agate_north_450m','agate_north_900m','agate_500m_wave_candidate',
    'agate_2p5km_north_candidate'],
  land:['agate_south_350m','agate_south_650m','agate_2p5km_south_nearest']
 },
 'grand-marais-harbor':{
  water:['bayshore_east_750m','bayshore_east_1100m','bayshore_500m_wave_candidate'],
  land:['bayshore_west_500m','bayshore_west_850m','bayshore_north_500m',
    'bayshore_south_500m']
 }
};
const MODEL_CELLS={
 'agate-500m-open-north':{siteId:'grand-marais-agate',pointId:'agate_500m_wave_candidate',
  lat:46.68,lon:-85.984978,grid:'500m-greatlakes'},
 'agate-2p5km-open-north':{siteId:'grand-marais-agate',pointId:'agate_2p5km_north_candidate',
  lat:46.688341,lon:-85.976613,grid:'2p5km'},
 'agate-2p5km-geographic-nearest':{siteId:'grand-marais-agate',pointId:'agate_2p5km_south_nearest',
  lat:46.667276,lon:-85.978659,grid:'2p5km'},
 'bayshore-500m-nearby':{siteId:'grand-marais-harbor',pointId:'bayshore_500m_wave_candidate',
  lat:46.673,lon:-85.974978,grid:'500m-greatlakes'}
};
function validateSnapshot(data=snapshot){
 if(!data||data.schemaVersion!==ID||data.status!=='RESEARCH_GIS_WATER_SIDE_ONLY'||
   !data.source?.url?.startsWith('https://services.arcgis.com/cJ9YHowT8TU7DUyn/')||
   !data.source?.derivationVintage?.includes('2013')||
   data.gates?.shorelineBearingSurveyed!==false||
   data.gates?.hydrodynamicOpenLakeFetchVerified!==false||
   data.gates?.harborBreakwaterShelterQuantified!==false||
   data.gates?.gisSnapshotPermitsSurfForecast!==false||
   data.canRecommendVisit!==false||data.canInferCollectingPermission!==false||
   !Array.isArray(data.sampledLocations)||data.sampledLocations.length!==14)
   throw Error('Untrustworthy or prematurely promoted historical GLAHF research evidence');
 const observed=new Map();
 for(const p of data.sampledLocations){
  if(!p.id||observed.has(p.id)||!['WATER','LAND'].includes(p.gisClass)||
    p.expectedResearchClass!==p.gisClass||
    !Number.isFinite(p.coordinate?.lat)||!Number.isFinite(p.coordinate?.lon)||
    !(p.coordinate.lat>46.64&&p.coordinate.lat<46.71)||
    !(p.coordinate.lon>-86.05&&p.coordinate.lon<-85.91))
   throw Error('Invalid, duplicated or contradictory GIS waterpoint observation');
  observed.set(p.id,p);
 }
 for(const [site,classes] of Object.entries(REQUIRED)){
  for(const [category,ids] of [['WATER',classes.water],['LAND',classes.land]]){
   for(const id of ids){
    const p=observed.get(id);
    if(!p||p.gisClass!==category||p.siteId!==site)
      throw Error('Missing independent official '+category+' shoreline test: '+id);
   }
  }
 }
 if(observed.size!==Object.values(REQUIRED).reduce((s,c)=>s+c.water.length+c.land.length,0))
  throw Error('Unexpected GIS study footprint');
 for(const c of Object.values(MODEL_CELLS)){
  const p=observed.get(c.pointId);
  if(!p||p.siteId!==c.siteId||Math.abs(p.coordinate.lat-c.lat)>0.000001||
    Math.abs(p.coordinate.lon-c.lon)>0.000001)
   throw Error('Model cell shifted relative to independently sampled official GIS');
 }
 return observed;
}
function classifyResearchCell(key,{evidence=snapshot}={}){
 const obs=validateSnapshot(evidence);
 const c=MODEL_CELLS[key];
 if(!c)return {status:'UNLISTED_GRID_CELL',researchCellAllowed:false,
  canPublishWaveHeight:false,canPublishSafeConditions:false};
 const point=obs.get(c.pointId);
 const researchCellAllowed=c.siteId==='grand-marais-agate'&&
   ['agate-500m-open-north','agate-2p5km-open-north'].includes(key)&&point.gisClass==='WATER';
 return {siteId:c.siteId,modelGrid:c.grid,lat:c.lat,lon:c.lon,
  pointId:point.id,historicGISWaterClass:point.gisClass,
  status:researchCellAllowed?'HISTORIC_NORTH_WATER_SIDE_RESEARCH_CANDIDATE':
    point.gisClass==='LAND'?'GIS_LAND_MODEL_MASK_CONFLICT':
    'HARBOR_SHELTER_NOT_MODELED',
  researchCellAllowed,shoreNormalKnown:false,connectedLakeWaveFetchValidated:false,
  breakwaterShelterQuantified:false,canPublishWaveHeight:false,
  canPublishSafeConditions:false,canClaimNewlyExposedRocks:false};
}
function siteGeometryGate(siteId,{evidence=snapshot}={}){
 validateSnapshot(evidence);
 const site=pilot.pilotSites.find(x=>x.id===siteId);
 if(!site)throw Error('Unknown Grand Marais study site');
 const isAgate=siteId==='grand-marais-agate';
 return {siteId,geographicSideSupported:true,
  evidenceClass:'HISTORIC_GLAHF_WATER_POLYGON_AND_OSM_SITE_FOOTPRINT',
  dominantStudyWaterSide:isAgate?'NORTH_CANDIDATE':'EAST_HARBOR_CANDIDATE',
  exactShorelineOutwardBearingDeg:null,
  shorelineGeometryStatus:'HISTORIC_TRANSECT_SUPPORTED_BUT_NOT_SURVEYED',
  projectedOpenWaterCell:isAgate?'agate-500m-open-north':null,
  northernCellSourceReview:isAgate?'WATER_CELL_PASSES_GLAHF_GIS_ONLY':'NOT_APPLICABLE',
  shelteredHarborWaveAttenuationFactor:null,
  riverMouthBathymetryReviewed:false,
  safeShoreStatus:'NOT_VERIFIED',
  legalCollectingPermissionStatus:'UNVERIFIED',
  canUnblockPostStormResearch:false,
  canPublishVisitWindow:false,canClaimNewStones:false};
}
module.exports={REQUIRED,MODEL_CELLS,validateSnapshot,classifyResearchCell,siteGeometryGate};
