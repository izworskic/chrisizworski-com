// Build-time, source-auditable town discovery. Never infer live trail conditions.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { haversineMiles, routeJunctions } from './routing.mjs';
import { planningFor } from './planning.mjs';
const require = createRequire(import.meta.url);
const { roster } = require('./local-reports.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const stations = JSON.parse(fs.readFileSync(path.join(root, 'data/michigan-snow-climatology.json'), 'utf8')).stations;
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache = new Map();
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const km = (a,b) => haversineMiles(a,b)*1.609344;
const directory = { name:'MISORVA club report directory', url:'https://misorva.org/trail-report/', scope:'A town-specific club report has not been verified for this trail location.' };
function sourceFor(region, name) {
  const choices = [...(roster(region.key) || []), ...planningFor(region.key).reports];
  return choices.find(r => r.name === name) || directory;
}
function lineParts(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates];
  return geometry?.type === 'MultiLineString' ? geometry.coordinates : [];
}
function distanceToSegmentKm(point, a, b) {
  // Equirectangular segment projection for a local 5 km neighborhood.
  const meanLat = (point[1]+a[1]+b[1])/3*Math.PI/180;
  const scale = Math.cos(meanLat);
  const ax=(a[0]-point[0])*scale,ay=a[1]-point[1],bx=(b[0]-point[0])*scale,by=b[1]-point[1];
  const vx=bx-ax,vy=by-ay;
  const t=Math.max(0,Math.min(1,-(ax*vx+ay*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(ax+vx*t,ay+vy*t)*111.195;
}
function distanceToFeatureKm(point, feature) {
  let best=Infinity;
  for (const line of lineParts(feature.geometry)) for(let i=1;i<line.length;i++) best=Math.min(best,distanceToSegmentKm(point,line[i-1],line[i]));
  return best;
}
export function townsForRegion(key) {
  if(cache.has(key))return cache.get(key);
  const source=JSON.parse(fs.readFileSync(path.join(root,'data/snowmobile-town-proximity',key+'.json'),'utf8'));
  if(source.region!==key)throw Error('Town source region mismatch: '+key);
  const rows=source.towns.map(row=>{
    const point=[row.lon,row.lat];
    if(!row.proxy?.seed||!row.proxy?.suggestion||!row.proxy?.source?.includes('Google autocomplete')||
       row.dnr?.radiusKm!==5||!row.dnr?.query?.includes('gisagoegle.state.mi.us')||
       !row.dnr?.query?.includes('distance=5000')||row.dnr?.hitCount!==row.dnr?.features?.length||!row.dnr?.features?.length){
      throw Error('Unverified autocomplete or DNR proximity for '+key+': '+row.name);
    }
    const close=row.dnr.features.map(f=>({feature:f,distanceKm:distanceToFeatureKm(point,f)}))
      .filter(f=>f.distanceKm<=5.05).sort((a,b)=>a.distanceKm-b.distanceKm);
    if(!close.length)throw Error('No DNR line within 5 km for '+key+': '+row.name);
    const trailNumbers=[...new Set(close.map(x=>x.feature.code).filter(code=>/^(UP|LP)\s*\d+$/i.test(code||'')))].slice(0,8);
    const graph=routeJunctions({type:'FeatureCollection',features:close.map(x=>({
      type:'Feature',properties:{id:String(x.feature.id),trailNetwork:x.feature.code},geometry:x.feature.geometry
    }))});
    const nearest=graph.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],
      label:f.properties.label,distanceKm:km(point,f.geometry.coordinates)})).sort((a,b)=>a.distanceKm-b.distanceKm)[0];
    if(!nearest||nearest.distanceKm>5.05)throw Error('No mapped endpoint near '+key+': '+row.name);
    const station=stations.map(s=>({...s,distanceKm:km(point,[s.lon,s.lat])})).sort((a,b)=>a.distanceKm-b.distanceKm)[0];
    if(!station)throw Error('No NWS snowfall reference station for '+key);
    return {name:row.name,id:'trail-conditions-near-'+slug(row.name),lat:row.lat,lon:row.lon,
      proximityKm:close[0].distanceKm,trailNumbers,nearest,station:{id:station.id,name:station.name,distanceKm:station.distanceKm},
      reportClub:row.reportClub||null,proxy:row.proxy,reportDirectory:row.reportClub===null};
  });
  if(!rows.length)throw Error('No demand-proxy towns passed DNR check for '+key);
  cache.set(key, rows);
  return rows;
}
export function townSectionsFor(region) {
  const towns=townsForRegion(region.key);
  return '<section class="panel snow-town-guide" aria-labelledby="snow-town-guide-title">' +
    '<div class="eyebrow">Local trail evidence · source-checked Nov. 23, 2026</div>' +
    '<h2 id="snow-town-guide-title">Trail conditions near towns in '+escapeHtml(region.shortLabel)+'</h2>' +
    '<p>These towns appeared in Google autocomplete (a demand proxy, not search volume) and each has a Michigan DNR designated trail within 5 km. The named trails and mapped endpoints are not a grooming report or a verified place to park. Choose the dated local club report for surface conditions; DNR closures always take precedence.</p>' +
    '<div class="snow-town-grid">' + towns.map(t=>{
      const report=sourceFor(region,t.reportClub);
      const trailLabel=t.trailNumbers.length?t.trailNumbers.join(', '):'unnumbered designated segments';
      const reportName=t.reportClub?'The linked '+report.name+' report covers only its stated club area':'No verified town-specific club report was found among this region’s existing links';
      const kmStation=t.station.distanceKm.toFixed(1);
      return '<article class="snow-town-card" data-town-evidence data-town-club="'+escapeHtml(t.reportClub||'')+'">' +
        '<h3 id="'+escapeHtml(t.id)+'">Trail conditions near '+escapeHtml(t.name)+'</h3>'+
        '<p>Michigan DNR lines within 5 km of '+escapeHtml(t.name)+' include '+escapeHtml(trailLabel)+'. The nearest mapped trail endpoint/junction is about '+t.nearest.distanceKm.toFixed(1)+' km from the town reference point; this is <strong>not a verified trailhead or parking location</strong>.</p>'+
        '<p>'+escapeHtml(reportName)+'. The closest reference gauge used by <a href="/michigan-snow-totals/">Michigan Snow Totals</a> is '+escapeHtml(t.station.name)+' ('+escapeHtml(kmStation)+' km); observed snowfall there cannot establish trail base or grooming.</p>'+
        '<p class="snow-town-links"><a href="'+escapeHtml(report.url)+'" target="_blank" rel="noopener" data-source-name="'+escapeHtml(report.name)+'">'+escapeHtml(t.reportClub?'Read '+report.name+' report':'Find the responsible club report')+'</a>' +
        '<a href="#map" data-town-junction-lat="'+t.nearest.lat.toFixed(5)+'" data-town-junction-lon="'+t.nearest.lon.toFixed(5)+'">See nearby DNR trail on map</a></p>' +
        '<p class="snow-town-live" role="status" data-town-live>Live club evidence not yet checked. Verify the original report date and current DNR closures before riding.</p>' +
        '</article>';
    }).join('')+'</div></section>';
}
