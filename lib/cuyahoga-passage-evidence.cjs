'use strict';
// Adapt the already committed NOAA archive and existing chart-reference study.
// Raw nationwide files are not fetched, stored or served by this script.
function buildReport(history,catalog,odot,analyzeCoastPilotStudy,engine){
 if(history?.schemaVersion!==1||history.observationKind!=='NOAA_HISTORICAL_BROADCAST_FIXES'||history.timezone!=='UTC'||
    history.publisherUrl!=='https://coast.noaa.gov/accessais/'||!Array.isArray(history.voyages))throw Error('Expected reviewed historical NOAA export');
 const ids=new Set(),days=new Set(),voyages=[];
 for(const v of history.voyages){
  const expected='https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-'+v.date+'.csv.zst';
  if(!v.id||ids.has(v.id)||days.has(v.date+'|'+v.mmsi)||!/^\d{9}$/.test(v.mmsi)||
     !/^[a-f0-9]{64}$/.test(v.originalArchiveSha256)||v.originalNationwideNoaaArchive!==expected||
     !Array.isArray(v.fixes)||!v.fixes.length||v.fixes.some(p=>!p.seen.startsWith(v.date+'T')))throw Error('Invalid archive provenance or duplicated vessel-day');
  ids.add(v.id);days.add(v.date+'|'+v.mmsi);
  // Check conflict before the existing bracket builder's deduplication.
  engine.trackSegments(v.fixes);
  const raw=analyzeCoastPilotStudy({schemaVersion:1,observationKind:'historical',source:history.dataset,
   tracks:[{mmsi:v.mmsi,vesselNames:[v.name],points:v.fixes}]},catalog,odot);
  const analysis=engine.analyzePassage(v.fixes,raw.vessels[0].bridgeReferenceEvents);
  voyages.push({id:v.id,date:v.date,mmsi:v.mmsi,name:v.name,archive:expected,originalArchiveSha256:v.originalArchiveSha256,analysis});
 }
 return {schemaVersion:1,kind:'HISTORICAL_VESSEL_PASSAGE_EVIDENCE_NOT_ETA',source:history.dataset,
  sourceUrl:history.publisherUrl,chartSourceUrl:catalog.sourceUrl,
  scope:'Cuyahoga, three selected 2025 vessel-days, not representative traffic or complete transits',
  policies:{maxGapSeconds:engine.MAX_GAP_SECONDS,maxChordKnots:engine.MAX_CHORD_KNOTS,
   lowDisplacementRadiusMeters:75,minLowDisplacementSeconds:600},
  voyages,summary:engine.summarize(voyages)};
}
module.exports={buildReport};
