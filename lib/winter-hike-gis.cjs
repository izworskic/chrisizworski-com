'use strict';
/** ArcGIS trail-identity and closure preflight. No geometry is proven in this module.
 * Layer 0 temporary closures may share a RecreationSearchTrailID with a differently
 * named layer 6 snowshoe segment. An ID match is NOT a spatial closure join.
 */
const norm = text=>String(text||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const attrs = row=>row && typeof row.attributes==='object' ? row.attributes : (row||{});
function assess(dest, {closures=[],snowshoe=[]}={}) {
 if(!dest?.id || !dest?.name)return {
  identityConflict:true,closure:{active:false,matchesDestination:false,geometryVerified:false},
  reason:'Destination identity missing'};
 const name=norm(dest.name);
 const hits = group=>group.filter(x=>String(attrs(x).RecreationSearchTrailID||'')===String(dest.id));
 const closeHits=hits(closures),shoeHits=hits(snowshoe);
 const identityConflict=[...closeHits,...shoeHits].some(x=>norm(attrs(x).TrailNamePrimary)!==name);
 // Only official closure layer 0 supplies closure candidates. Name+ID matching is
 // necessary but not sufficient: a geometry/manager check must still be performed.
 const possible=closeHits.filter(x=> {
  const a=attrs(x),s=String(a.OpenClosedStatusNonmotor||'');
  return norm(a.TrailNamePrimary)===name && /clos|unsafe|repair/i.test(s)
     && String(a.TrailUseCategory||'').toLowerCase()!=='motorized';
 });
 return {
  identityConflict,
  closure:{active:possible.length>0,matchesDestination:possible.length>0,geometryVerified:false},
  matchedClosureSegments:possible.map(x=>attrs(x).OBJECTID).filter(Number.isInteger),
  source:'Michigan DNR DNRTrailsOPENDATA MapServer (layer 0 and layer 6)',
  reason: identityConflict
    ? 'A source segment uses this DNR recreation ID but has a different trail name; manually reconcile identity and geometry'
    : possible.length
      ? 'Same DNR ID and trail name occur in a temporary closure; validate overlapping trail geometry and segment extent'
      : 'No matching closure record in supplied sample; this does not establish an open trail'
 };
}
module.exports={assess,norm};
