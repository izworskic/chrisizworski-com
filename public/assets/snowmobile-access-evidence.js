/* Curated cross-source reconciliation of Michigan DNR managed parking asset
 * OBJECTIDs with independently published DNR COUNTY snowmobile map parking
 * entries. This is NOT confirmation of a physically legal connection from
 * any lot to a designated snowmobile trail. The DNR's published pairing is
 * evidence of intended parking context, not today's access/parking condition.
 *
 * Evidence: DNR public snowmobile county maps (PDF; one map per county),
 * compared November 13, 2026 against official DNR parking FeatureServer/6
 * returned descriptions/road notes. These maps can be updated/withdrawn:
 * preserve publication dates and require re-reconciliation when changed.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SnowmobileAccessEvidence=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const MAP_ROOT='https://www2.dnr.state.mi.us/publications/pdfs/forestslandwater/_Archived/SnowmobileTrailMaps/countymaps/snowmobile_';
const COUNTY_MAPS=Object.freeze({
  Crawford:{url:MAP_ROOT+'crawford.pdf',published:'2026-03-02'},
  Otsego:{url:MAP_ROOT+'otsego.pdf',published:'2026-03-02'},
  Lake:{url:MAP_ROOT+'lake.pdf',published:'2026-03-02'},
  Wexford:{url:MAP_ROOT+'wexford.pdf',published:'2026-03-02'},
  Chippewa:{url:MAP_ROOT+'chippewa.pdf',published:'2026-08-25'}
});
// Notes below reflect the exact road/intersection descriptions printed in
// the official PDF Parking legend. Each entry must be rechecked if its DNR
// OBJECTID, published trail number, or location wording changes.
const SITES=Object.freeze({
  28:{county:'Crawford',trail:['LP7'],location:'Northwest of M-72 and South Blue Bear Trail',check:['M72','Blue Bear'],mapRef:'LP7[1]'},
  760:{county:'Crawford',trail:['LP7'],location:'North side of West County Road 612, west of Myrtle Street',check:['County Road 612','Myrtle'],mapRef:'LP7[2]'},
  489:{county:'Crawford',trail:['LP47'],location:'East side of South Wilcox Bridge Road, southeast of West Lewiston Grade Road',check:['Wilcox Bridge','Lewiston Grade'],mapRef:'LP47[3]'},
  883:{county:'Otsego',trail:['LP4','LP7'],location:'East side of South Otsego Avenue at Acorn Road',check:['Otsego Avenue','Acorn'],mapRef:'LP4, LP7[2]'},
  1440:{county:'Otsego',trail:['LP4'],location:'Southeast of Turtle Lake and Old State roads',check:['Turtle Lake','Old State'],mapRef:'LP4[3]'},
  412:{county:'Lake',trail:['LP35'],location:'Northeast of M-37 and West 3 Mile Road',check:['M-37','3 Mile'],mapRef:'LP35[1]'},
  81:{county:'Lake',trail:['LP35','LP36'],location:'South side of West 7 Mile Road, east of M-37',check:['7 mile','M-37'],mapRef:'LP35, LP36[3]'},
  1487:{county:'Lake',trail:['LP362','LP344E'],location:'West side of North Kings Highway, north of East F Avenue',check:['Kings Highway','F Avenue'],mapRef:'LP362, LP344E[4]'},
  6:{county:'Lake',trail:['LP30'],location:'Off 8th Street in Baldwin',check:['8th St','Baldwin'],mapRef:'LP30[5]'},
  88:{county:'Lake',trail:['LP35'],location:'Off US-10 between Mack and Sheppard roads',check:['Mack','Sheppard'],mapRef:'LP35[6]'},
  781:{county:'Wexford',trail:['LP35'],location:'Northwest of East 48.5 and South 33 roads',check:['48.5','33'],mapRef:'LP35[3]'},
  231:{county:'Chippewa',trail:['UP45'],location:'South side of M-123, west of North Beaver Road',check:['M-123','Beaver'],mapRef:'UP45[1]'},
  66:{county:'Chippewa',trail:['UP493'],location:'East side of Maxton Road, northeast of Maxton Cut Across Road',check:['Maxton Road','Maxton Cut Across'],mapRef:'UP493[3]'},
  702:{county:'Chippewa',trail:['UP510'],location:'North side of Bass Cove Road',check:['Bass Cove'],mapRef:'UP510[4]'}
});
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function codes(name){
 const txt=String(name||'').toUpperCase(),out=new Set();
 for(const m of txt.matchAll(/\b(LP|UP)\s*0*(\d{1,4})([EW]?)\b/g))out.add(m[1]+Number(m[2])+m[3]);
 return out;
}
function verifySite(site){
 const ev=SITES[site?.id];
 if(!ev)return {grade:'ASSET_ONLY',reason:'DNR parking asset only; no reviewed county-map parking entry paired to this record',trailCodes:[],countyMap:null};
 const map=COUNTY_MAPS[ev.county],nameCodes=codes(site.name),description=norm(site.directionsNote);
 const codeMatches=ev.trail.every(code=>nameCodes.has(code));
 const roadMatches=ev.check.every(token=>description.includes(norm(token)));
 if(!codeMatches||!roadMatches)return {
   grade:'SOURCE_CONFLICT',reason:'County-map pairing no longer agrees with the live DNR asset description; do not use as a verified staging location',
   trailCodes:[],countyMap:map?.url||null,published:map?.published||null};
 return {
   grade:'DNR_MAP_PAIRED',
   reason:'DNR county snowmobile map independently lists this parking location for the numbered trail. The lawful ground-level entrance, lot plowing and trailer capacity remain unverified.',
   trailCodes:ev.trail.slice(),county:ev.county,
   countyMap:map.url,published:map.published,mapRef:ev.mapRef,
   locationNote:ev.location
 };
}
function reconcile(sites){
 return (Array.isArray(sites)?sites:[]).map(site=>({...site,accessEvidence:verifySite(site)}));
}
return Object.freeze({COUNTY_MAPS,SITES,codes,verifySite,reconcile});
});
