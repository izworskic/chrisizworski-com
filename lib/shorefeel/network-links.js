'use strict';
// The shared navigation layer connects beach-area air comfort to source-dated
// NOAA water evidence. It deliberately NEVER treats lakewide or offshore
// surface water as beach water or infers an on-sand air temperature adjustment.
const ROOT='/great-lakes-water-temperature/';
const PILOTS=Object.freeze({
  'bay-city-state-park':Object.freeze({
    href:'/lake-huron-water-temperature/saginaw-bay/',
    label:'Explore Saginaw Bay shoreline water evidence',
    note:'Nearby NOAA satellite water pixels and a separate shoreline-weather analysis; not a thermometer on the sand.'
  }),
  'grand-haven-state-park':Object.freeze({
    href:'/lake-michigan-water-temperature/grand-haven/',
    label:'Explore Grand Haven water conditions and the 48-hour outlook',
    note:'NOAA nearshore water evidence and model uncertainty; not a measured swimming-area temperature.'
  })
});
function waterEvidenceLink(beach){
  if(!beach||typeof beach.slug!=='string'||typeof beach.lake!=='string')throw Error('Missing named shoreline and lake');
  if(PILOTS[beach.slug])return PILOTS[beach.slug];
  // Michigan's Beach Report says "Lake Michigan", while the US/Ontario
  // ShoreFeel catalogs store "Michigan". Both represent the same lake.
  const lake=beach.lake.replace(/^Lake\s+/i,'').trim();
  if(lake==='Michigan')return {
    href:'/lake-michigan-water-temperature/',
    label:'See Lake Michigan water-temperature evidence',
    note:'NOAA lakewide water analysis; it does not give the temperature at this beach.'
  };
  if(!['Superior','Huron','Erie','Ontario'].includes(lake))throw Error('Unsupported Great Lake: '+beach.lake);
  return {
    href:ROOT,
    label:'Compare Lake '+lake+' with all five Great Lakes',
    note:'NOAA lakewide surface-water averages, not this beach’s swimming-water temperature.'
  };
}
module.exports={waterEvidenceLink,PILOTS};
