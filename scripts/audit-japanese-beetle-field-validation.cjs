'use strict';
// Exploratory retrospective cross-check across 10 Michigan reference areas and
// two archived USA-NPN raster seasons. This is NOT a biological accuracy study.
// The October raster includes retrospective weather; iNaturalist records are
// opportunistic, not effort-controlled first-emergence field surveys.
const fs=require('node:fs'),path=require('node:path');
const E=require('../lib/japanese-beetle-field-evidence.cjs');
const F=require('../lib/japanese-beetle-forecast.cjs');
const {LOCATIONS}=require('../lib/maple-sap-engine.cjs');
const IDS=['detroit','kalamazoo','grand-rapids','lansing','flint','bay-city','west-branch','traverse-city','escanaba','marquette'];
const YEARS=[2025,2026];
const SOURCE_DATES={2025:'2025-10-15',2026:'2026-10-15'};
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
async function sourceText(url,fetcher=fetch){
 const r=await fetcher(url,{headers:{accept:'application/xml,application/json','user-agent':'GardenPestFieldValidation/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)'},redirect:'error',signal:AbortSignal.timeout(11000)});
 if(!r.ok)throw Error('SOURCE_HTTP_'+r.status);
 return r;
}
async function evaluate({fetcher=fetch,now=new Date(),sleep=pause}={}){
 const sites=IDS.map(id=>LOCATIONS.find(x=>x.id===id));
 if(sites.some(x=>!x)||new Set(sites.map(x=>x.id)).size!==10)throw Error('SITE_SET_INVALID');
 const metadata=await (await sourceText(F.coverageURL(F.LAYERS.adult),fetcher)).text();
 const rows=[];
 for(const year of YEARS){
  const sourceDate=SOURCE_DATES[year];
  // Ensure this historical time slice genuinely exists. WMS sometimes silently
  // selects the nearest time unless the WCS temporal axis was checked first.
  if(!metadata.includes('<gml:timePosition>'+sourceDate+'T'))throw Error('MODEL_ARCHIVE_DATE_NOT_VERIFIED_'+year);
  for(const site of sites){
   const base={site:site.name,siteId:site.id,year,referenceCoordinate:{lat:site.lat,lon:site.lon},
    modelRasterTime:sourceDate,searchRadiusKm:E.RADIUS_KM,
    status:'UNAVAILABLE',modelAdultDate:null,firstQualifyingSighting:null,dayOffset:null,relation:'NOT_COMPARABLE'};
   try{
    const rasterURL=F.featureURL(F.LAYERS.adult,site.lat,site.lon,sourceDate);
    const model=F.parsePixel(await (await sourceText(rasterURL,fetcher)).json(),F.LAYERS.adult,year);
    base.modelAdultDate=model.approximateDate;
   }catch(err){base.issue='MODEL_PIXEL_UNAVAILABLE';rows.push(base);await sleep(1050);continue;}
   await sleep(1050); // iNaturalist recommends ~1 request/second per application.
   try{
    const observed=await E.fetchEvidence(site,year,{fetcher,now});
    const ev=observed.observationalEvidence;
    base.sourceResults=ev.sourceResults;base.inspectedResults=ev.inspectedResults;
    base.qualifyingRecords=ev.qualifyingRecords;base.limitedSearch=ev.limitedSearch;
    base.firstQualifyingSighting=ev.firstObservationDate;
    base.exampleUrls=ev.examples.map(x=>x.url).slice(0,3);
    const comparison=ev.firstObservationDate?E.comparison(ev.firstObservationDate,base.modelAdultDate):null;
    base.status=ev.firstObservationDate?'OPPORTUNISTIC_PRESENCE_CROSS_CHECK':'NO_COMPARABLE_SIGHTINGS';
    base.dayOffset=comparison?.dayOffset??null;
    base.relation=comparison?.status||'NOT_COMPARABLE';
   }catch(err){base.issue='OBSERVATION_SOURCE_UNAVAILABLE';base.status='UNAVAILABLE'}
   rows.push(base);
   await sleep(1050);
  }
 }
 const count=k=>rows.filter(x=>x.status===k).length;
 return {schema:'japanese-beetle-retrospective-field-cross-check-v1',status:'EXPLORATORY_NOT_MODEL_ACCURACY',
  checkedAt:now.toISOString(),dataYears:YEARS,sites:IDS,count:rows.length,
  summary:{pairedOpportunisticRecords:count('OPPORTUNISTIC_PRESENCE_CROSS_CHECK'),
   noComparableSightings:count('NO_COMPARABLE_SIGHTINGS'),unavailable:count('UNAVAILABLE'),
   earlierDatedRecords:rows.filter(x=>x.relation==='SIGHTING_BEFORE_MODEL').length,
   laterDatedRecords:rows.filter(x=>x.relation==='SIGHTING_AFTER_MODEL').length,
   sameDateRecords:rows.filter(x=>x.relation==='SAME_CALENDAR_DAY').length},
  methodology:'October 15 archived USA-NPN Japanese beetle adult gridded modeled day-of-year compared with earliest eligible dated, georeferenced iNaturalist research-grade adult photo record within 25 km in the same calendar year. No source-independent absence records, sampling effort, model forecast-issuance backtests, or biological onset ground truth; not a statistical accuracy measure.',
  sourceIds:{official:'https://www.usanpn.org/data/maps/forecasts/Japanese_beetle',observed:'https://www.inaturalist.org/observations?taxon_id=67760&place_id=29'},
  benchmark:{referenceSites:10,seasonsWithVerifiedArchivedSource:2,targetSeasons:3,empiricalForecastAccuracyEstablished:false,
   gate:'FAIL: no systematic non-detection and repeated trap/phenophase series. Model forecast skill cannot be inferred from opportunistic iNaturalist records.'},
  records:rows};
}
if(require.main===module)evaluate().then(out=>{
 const dest=path.join(process.cwd(),'artifacts','japanese-beetle-field-validation');
 fs.mkdirSync(dest,{recursive:true});
 fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({status:out.status,summary:out.summary,rows:out.count,artifact:path.join(dest,'report.json')},null,2));
 if(out.summary.unavailable>0)process.exitCode=1;
}).catch(err=>{console.error('SCIENTIFIC_CROSS_CHECK_FAILED',String(err?.message||err));process.exitCode=1;});
module.exports={evaluate,IDS,YEARS,SOURCE_DATES};
