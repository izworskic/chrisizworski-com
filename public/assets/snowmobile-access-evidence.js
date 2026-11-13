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
const MAP_ROOT='https://www.michigandnr.com/Publications/PDFS/ForestsLandWater/SnowmobileTrailMaps/countymaps/snowmobile_';
const COUNTY_MAPS=Object.freeze({
  Crawford:{url:MAP_ROOT+'crawford.pdf',published:'2026-03-02'},
  Otsego:{url:MAP_ROOT+'otsego.pdf',published:'2026-03-02'},
  Lake:{url:MAP_ROOT+'lake.pdf',published:'2026-03-02'},
  Wexford:{url:MAP_ROOT+'wexford.pdf',published:'2026-03-02'},
  Chippewa:{url:MAP_ROOT+'chippewa.pdf',published:'2026-02-10'},
  Cheboygan:{url:MAP_ROOT+'cheboygan.pdf',published:'2026-03-02'},
  Alger:{url:MAP_ROOT+'alger.pdf',published:'2026-02-09'}
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
  702:{county:'Chippewa',trail:['UP510'],location:'North side of Bass Cove Road',check:['Bass Cove'],mapRef:'UP510[4]'},
  // Official county maps inspected 2026-11-13; explicit parking-legend entries.
  798:{county:'Chippewa',trail:['UP489'],location:'South Turkey Farm Road north of Glen Cove Road',check:['Turkey Farm','Glen Cove'],mapRef:'UP489[2]'},
  325:{county:'Alger',trail:['UP8','UP88'],location:'North side of Adams Trail east of H-58',check:['Adams Trail','H 58'],mapRef:'UP8, UP88[1]'},
  275:{county:'Cheboygan',trail:['LP7','LP9'],trailNameAlias:'North Central State Trail',location:'Mackinaw City east side of Nicolet Street near Mackinaw Crossings Drive',check:['Nicolet','Mackinaw Crossings'],mapRef:'LP7, LP9[1]'},
  1473:{county:'Cheboygan',trail:['LP7'],location:'Indian River east of South State Highway at White Road',check:['State Highway','White Road'],mapRef:'LP7[2]'},
  730:{county:'Lake',trail:['LP344W','LP344E'],location:'North side of West 16th Street east of South James Road',check:['16th Street','James'],mapRef:'LP344W, LP344E[2]'},
  84:{county:'Wexford',trail:['LP6'],location:'West side of US 131 Business Route, south of US-131',check:['US 131 BR','US 131'],mapRef:'LP6[1]'},
  795:{county:'Wexford',trail:['LP638','LP373'],location:'East side of Caberfae Road north of M-55',check:['Caberfae','M 55'],mapRef:'LP638, LP373[2]'},
  1059:{county:'Wexford',trail:['LP37'],location:'West side of 23 Road south of West 32.5 Road',check:['23 Road','32.5'],mapRef:'LP37[4]'}
});
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function codes(name){
 const txt=String(name||'').toUpperCase(),out=new Set();
 for(const m of txt.matchAll(/\b(LP|UP)\s*0*(\d{1,4})([EW]?)\b/g))out.add(m[1]+Number(m[2])+m[3]);
 return out;
}
// In addition to county-map references, a named public trailhead can be
// corroborated by the local owner/manager and destination bureau. It is NOT
// automatically a GPS-verified route edge, nor proof of current winter access.
const PUBLIC_STAGING=Object.freeze({
  242:{
    name:'Gaylord Gateway Trailhead',
    source:'https://cityofgaylord.com/wp-content/uploads/2024/02/City-of-Gaylord-Recreation-Plan.pdf',
    operator:'https://www.gaylordmichigan.net/pick-your-season/winter/snowmobile/',
    facilities:'Otsego County-managed DNR trailhead. City recreation plan documents car-and-trailer parking and year-round restrooms. Gaylord tourism identifies the downtown North Central State Trail trailhead on the north side of M-32.',
    verification:'Source-backed public staging description; current plowing, parking vacancy, permitted crossing and trailer capacity are not verified.'
  }
});
function publicStagingEvidence(site){
 const ref=PUBLIC_STAGING[site?.id];
 if(!ref)return null;
 if(!/gaylord gateway trailhead/i.test(site?.name||'')||!/parking\s*&\s*staging\s+in\s+winter/i.test(site?.directionsNote||'')){
   return {grade:'SOURCE_CONFLICT',reason:'DNR Gateway asset wording changed; public-operator corroboration requires rechecking',trailCodes:[],countyMap:null};
 }
 return {grade:'OPERATOR_PAIRED',reason:ref.verification,trailCodes:[],countyMap:null,
   operatorSource:ref.operator,publicSource:ref.source,locationNote:ref.facilities,
   facilityName:ref.name};
}
function verifySite(site){
 const staging=publicStagingEvidence(site);if(staging)return staging;
 const ev=SITES[site?.id];
 if(!ev)return {grade:'ASSET_ONLY',reason:'DNR parking asset only; no reviewed county-map parking entry paired to this record',trailCodes:[],countyMap:null};
 const map=COUNTY_MAPS[ev.county],nameCodes=codes(site.name),description=norm(site.directionsNote);
 const codeMatches=ev.trail.every(code=>nameCodes.has(code))||(ev.trailNameAlias&&norm(site.name).includes(norm(ev.trailNameAlias)));
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
return Object.freeze({COUNTY_MAPS,SITES,PUBLIC_STAGING,codes,verifySite,reconcile});
});
