'use strict';
// Official USA-NPN Pheno Forecast point reader. Do not substitute generic AGDD
// or independently reconstructed Daymet thermal accumulation for these layers.
const BASE='https://geoserver.usanpn.org/geoserver';
const SOURCE='https://www.usanpn.org/data/maps/forecasts/Japanese_beetle';
const LAYERS=Object.freeze({adult:'gdd:japanese_beetle_adult',egg:'gdd:japanese_beetle_egg_hatch'});
const HOSTS=Object.freeze(['beans','berries','grapes','roses']);
const MODEL='USA-NPN Japanese beetle Pheno Forecast, DDRP single-triangle 50°F/92°F, Jan 1; adult 873 and egg 1543 °F degree-days';
const asOfMI=(now=new Date())=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const v=Object.fromEntries(p.map(x=>[x.type,x.value]));
 return [v.year,v.month,v.day].join('-');
};
function yearDays(year){return new Date(Date.UTC(year,1,29)).getUTCMonth()===1?366:365;}
function validMI(lat,lon){
 return typeof lat==='number'&&typeof lon==='number'&&Number.isFinite(lat)&&Number.isFinite(lon)
 &&lat>=41.4&&lat<=48.7&&lon>=-90.7&&lon<=-81.9;
}
function ageDays(date,reference){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{4}-\d{2}-\d{2}$/.test(reference))return Infinity;
 const a=Date.parse(date+'T12:00:00Z'),b=Date.parse(reference+'T12:00:00Z');
 return Number.isFinite(a)&&Number.isFinite(b)?Math.round((b-a)/86400000):Infinity;
}
function dayOfYear(date){
 const y=Number(date.slice(0,4));return Math.round((Date.parse(date+'T12:00:00Z')-Date.UTC(y,0,1,12))/86400000)+1;
}
function modelDate(year,doy){
 if(!Number.isInteger(year)||!Number.isFinite(doy)||doy<1||doy>yearDays(year)+.49)throw Error('INVALID_MODEL_DAY');
 const nearest=Math.round(doy);
 if(nearest<1||nearest>yearDays(year))throw Error('INVALID_MODEL_DAY');
 return new Date(Date.UTC(year,0,nearest)).toISOString().slice(0,10);
}
function coverageURL(layer){
 if(!Object.values(LAYERS).includes(layer))throw Error('UNKNOWN_LAYER');
 const u=new URL(BASE+'/wcs');
 for(const [k,v] of Object.entries({service:'WCS',version:'1.0.0',request:'DescribeCoverage',coverage:layer}))u.searchParams.set(k,v);
 return u.href;
}
function featureURL(layer,lat,lon,date){
 if(!Object.values(LAYERS).includes(layer)||!validMI(lat,lon)||!/^20\d{2}-\d{2}-\d{2}$/.test(date))throw Error('INVALID_POINT_QUERY');
 const bbox=[lon-.005,lat-.005,lon+.005,lat+.005].map(v=>v.toFixed(4)).join(',');
 const u=new URL(BASE+'/gdd/wms');
 for(const [k,v] of Object.entries({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetFeatureInfo',
  LAYERS:layer,QUERY_LAYERS:layer,STYLES:'',SRS:'EPSG:4326',BBOX:bbox,WIDTH:'101',HEIGHT:'101',
  X:'50',Y:'50',INFO_FORMAT:'application/json',TIME:date,FEATURE_COUNT:'1'}))u.searchParams.set(k,v);
 return u.href;
}
function parseCoverage(xml,layer,nowDate){
 if(!Object.values(LAYERS).includes(layer)||typeof xml!=='string'||xml.length<500||xml.length>150000)throw Error('COVERAGE_INVALID');
 if(!xml.includes('<wcs:CoverageDescription')||!xml.includes('<wcs:name>'+layer+'</wcs:name>'))throw Error('COVERAGE_LAYER_UNVERIFIED');
 const section=xml.match(/<wcs:temporalDomain>([\s\S]*?)<\/wcs:temporalDomain>/);
 if(!section)throw Error('COVERAGE_DATES_MISSING');
 const dates=[...section[1].matchAll(/<gml:timePosition>(20\d\d-\d\d-\d\d)T[^<]*<\/gml:timePosition>/g)].map(m=>m[1]);
 if(dates.length<2)throw Error('COVERAGE_DATES_MISSING');
 const unique=[...new Set(dates)].sort();
 const actual=unique.filter(d=>d<=nowDate).at(-1);
 // The temporal axis is source coverage, not publication/issuance time.
 // Only recent exact dates may be used. Never use last season as 'current'.
 if(!actual||actual.slice(0,4)!==nowDate.slice(0,4)||ageDays(actual,nowDate)<0||ageDays(actual,nowDate)>2)throw Error('COVERAGE_STALE_SEASON');
 return {layer,requestedDate:nowDate,date:actual,lagDays:ageDays(actual,nowDate),
  latestAvailableDate:unique.at(-1),sourceDateVerified:true,
  note:'Exact layer date is listed in USA-NPN WCS temporal coverage. This does not verify provider publication time or biological presence.'};
}
function parsePixel(data,layer,year){
 if(!data||data.type!=='FeatureCollection'||data.numberReturned!==1||!Array.isArray(data.features)||data.features.length!==1)throw Error('FEATURE_INFO_INVALID');
 const row=data.features[0];
 if(!row||typeof row.properties?.GRAY_INDEX!=='number')throw Error('FEATURE_INFO_MISSING_PIXEL');
 const n=row.properties.GRAY_INDEX;
 if(!Number.isFinite(n)||n<1||n>yearDays(year)+.49)throw Error('FEATURE_INFO_NO_DATA');
 return {layer,dayOfYear:n,approximateDate:modelDate(year,n),unit:'modeled day-of-year of life-stage thermal threshold',
  datePrecision:'Approximate date rounded from the provider raster; spatial pixel is not a property-level pest observation'};
}
function decision({nowDate,crop,adult,egg,sourceDate}){
 if(!HOSTS.includes(crop))return {status:'NOT_APPLICABLE',verdict:'Not a main host crop in this pilot',action:'Continue crop-specific scouting instead of treating the Japanese beetle model as a universal garden alert.'};
 const year=Number(sourceDate.slice(0,4)),currentDay=dayOfYear(nowDate);
 const month=Number(nowDate.slice(5,7));
 if(month>=11||month<=2)return {status:'OFF_SEASON',verdict:'Past-season model record',action:'No current adult-emergence claim. Review past model stages and plan next summer’s leaf checks.'};
 const diff=adult.dayOfYear-currentDay;
 if(diff>6)return {status:'PREPARE',verdict:'Outside the verified six-day scouting window',action:'Prepare to inspect susceptible foliage later in the season. The preliminary model date is not a verified near-term event.'};
 if(diff>=-1)return {status:'SCOUT',verdict:'Model indicates an adult threshold near this week',action:hostAction(crop)+' The model does not confirm beetles at your plants.'};
 const eggDiff=egg.dayOfYear-currentDay;
 if(eggDiff>=0&&eggDiff<=6)return {status:'EGG_WINDOW',verdict:'Model indicates egg hatch is near this week',action:'Egg hatch is modeled chiefly in turf and soil, not as a new adult-beetle sighting. Continue checking susceptible leaves for adults and inspect lawns only where actual grub damage warrants it; the model alone does not justify treatment.'};
 return {status:'THRESHOLD_PASSED',verdict:'Adult heat threshold modeled earlier this season',action:hostAction(crop)+' A threshold passed earlier does not prove insects are active now.'};
}
function hostAction(crop){
 const actions={
  beans:'Examine both surfaces of bean leaves for metallic green-and-copper adults and skeletonized feeding.',
  grapes:'Inspect grape leaves for lacy feeding damage and look directly for adult beetles.',
  berries:'Check berry foliage and blossoms for beetles and skeletonized leaves.',
  roses:'Inspect rose flowers and upper leaves for adult beetles and lacy feeding damage.'
 };return actions[crop];
}
async function readSource(layer,fetcher){
 const url=coverageURL(layer);
 const res=await fetcher(url,{headers:{accept:'application/xml','user-agent':'GardenPestForecast/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)'},redirect:'error',signal:AbortSignal.timeout(6500)});
 if(!res.ok)throw Error('COVERAGE_PROVIDER_UNAVAILABLE');
 return res.text();
}
async function fetchPilot(site,crop='roses',fetcher=fetch,now=new Date()){
 const nowDate=asOfMI(now);
 if(!validMI(site?.lat,site?.lon))throw Error('INVALID_REFERENCE_POINT');
 const [adultXml,eggXml]=await Promise.all(Object.values(LAYERS).map(layer=>readSource(layer,fetcher)));
 const aCoverage=parseCoverage(adultXml,LAYERS.adult,nowDate),eCoverage=parseCoverage(eggXml,LAYERS.egg,nowDate);
 if(aCoverage.date!==eCoverage.date)throw Error('LAYER_DATES_DISAGREE');
 const sourceDate=aCoverage.date,year=Number(sourceDate.slice(0,4));
 const layerNames=[LAYERS.adult,LAYERS.egg];
 const urls=layerNames.map(layer=>featureURL(layer,site.lat,site.lon,sourceDate));
 const responses=await Promise.all(urls.map(url=>fetcher(url,{headers:{accept:'application/json','user-agent':'GardenPestForecast/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)'},redirect:'error',signal:AbortSignal.timeout(6500)})));
 if(responses.some(r=>!r.ok))throw Error('PIXEL_PROVIDER_UNAVAILABLE');
 const json=await Promise.all(responses.map(r=>r.json()));
 const adult=parsePixel(json[0],LAYERS.adult,year),egg=parsePixel(json[1],LAYERS.egg,year);
 if(egg.dayOfYear<adult.dayOfYear)throw Error('BIOLOGICAL_STAGE_ORDER_INVALID');
 const verdict=decision({nowDate,crop,adult,egg,sourceDate});
 return {schema:'japanese-beetle-forecast-truth-v1',status:'OFFICIAL_MODEL_AVAILABLE',sourceKind:'OFFICIAL_SPECIES_SPECIFIC_GRIDDED_MODEL',
  sourceDate,checkedAt:now.toISOString(),year,crop,model:MODEL,modelSource:SOURCE,
  source:{provider:'USA National Phenology Network',coverageUrl:coverageURL(LAYERS.adult),
   adultFeatureUrl:urls[0],eggFeatureUrl:urls[1],layerIds:LAYERS,
   coverageDate:aCoverage.date,latestSourceTimeDimension:aCoverage.latestAvailableDate,
   timeDimensionAgeDays:aCoverage.lagDays,
   caveat:'USA-NPN official species-specific forecast raster. Temporal coverage date is not a verified issuance timestamp.'},
  location:{name:site.name,kind:site.kind||'named-city',zip:site.zip||null,
   coordinateMeaning:site.coordinateMeaning||'Representative named-city point, not your exact garden',
   spatialMeaning:'Coarse gridded USA-NPN model pixel; do not equate with a garden observation.'},
  stages:{adult,egg},verdict,
  regionalObservations:'UNVERIFIED',userObservation:'NOT_RECORDED',
  hardCaveat:'Forecasted growing-degree-day event timing is NOT a confirmed pest sighting, abundance, injury, pesticide threshold, or treatment recommendation.',
  forecastHorizon:'Operational provider short-term guidance is only six days. Longer dates represent provisional model projections, not validated short-term forecasts.'};
}
module.exports={BASE,SOURCE,LAYERS,HOSTS,MODEL,asOfMI,yearDays,validMI,ageDays,dayOfYear,modelDate,coverageURL,
 featureURL,parseCoverage,parsePixel,decision,hostAction,fetchPilot};
