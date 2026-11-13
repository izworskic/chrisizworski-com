/*
 * Export a successfully computed DNR trail-centerline route as a standard
 * GPX 1.1 TRACK with separate mapped-junction waypoints. Planning data only:
 * GPX is NOT an offline basemap, live closure feed, legal-access permit,
 * road-to-trail connector, or turn-by-turn snowmobile navigation.
 *
 * Pure validation/serialization, same code in browser and Node tests.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SnowmobileRouteExport=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const DNR_URL='https://www.michigan.gov/dnr/things-to-do/snowmobiling/where';
const MAX_VERTICES=100000;
const MAX_STOPS=12;
function esc(s){
 return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}
function inMichigan(lon,lat){
 return Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=-91&&lon<=-82&&lat>=41&&lat<=49;
}
function point(p){
 const lat=Number(p?.lat),lon=Number(p?.lng??p?.lon);
 if(!inMichigan(lon,lat))return null;
 return {lat,lon,label:String(p?.label||'Mapped DNR junction').slice(0,130)};
}
function validate(route,stops){
 if(!route?.routable)return {ok:false,reason:'No complete DNR route has been calculated.'};
 if(route?.geometry?.type!=='LineString'||!Array.isArray(route.geometry.coordinates))return {ok:false,reason:'Mapped DNR track geometry is unavailable.'};
 const coords=route.geometry.coordinates;
 if(coords.length<2||coords.length>MAX_VERTICES||!coords.every(c=>Array.isArray(c)&&c.length===2&&inMichigan(c[0],c[1])))return {ok:false,reason:'DNR track geometry is missing, too large, or contains invalid coordinates.'};
 if(!Number.isFinite(route.distanceMiles)||route.distanceMiles<=0||route.distanceMiles>2000)return {ok:false,reason:'Route distance is invalid.'};
 if(!Array.isArray(route.segments)||!route.segments.length)return {ok:false,reason:'Segment evidence is unavailable.'};
 if(route.segments.some(s=>/\bCLOSED\b/i.test(String(s?.band||s?.legalState||s?.status||''))))return {ok:false,reason:'A known closed trail segment was found in the route. Export blocked.'};
 if(!Array.isArray(stops)||stops.length<2||stops.length>MAX_STOPS)return {ok:false,reason:'Choose 2–12 mapped DNR junctions.'};
 const checked=stops.map(point);
 if(checked.some(p=>!p))return {ok:false,reason:'A selected trail junction has invalid coordinates.'};
 if(Number.isInteger(route.stopCount)&&route.stopCount!==checked.length)return {ok:false,reason:'Route and selected stops no longer agree.'};
 return {ok:true,coords,stops:checked};
}
function stamp(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT/.test(value))return null;
 const d=new Date(value);
 return Number.isFinite(d.getTime())?d.toISOString():null;
}
function fileName(region,generatedAt){
 const key=String(region||'michigan').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'michigan';
 return 'michigan-snowmobile-'+key+'-'+(stamp(generatedAt)||new Date().toISOString()).slice(0,10)+'.gpx';
}
function notes({closureVerified,seasonActive}){
 return [
  'PLANNING TRACK ONLY — NOT A RIDE RECOMMENDATION OR LEGAL ACCESS AUTHORIZATION.',
  'Geometry is the computed path along mapped Michigan DNR designated snowmobile trail centerlines.',
  'Selected stops are mapped DNR trail junctions, NOT parking lots or verified trail entrances.',
  closureVerified===true?'Official DNR closure source was checked when this route was computed; conditions or restrictions may change.':'Current official DNR closure source was NOT verified when this route was computed.',
  seasonActive===true?'Within designated season dates, which do not guarantee rideable trail conditions.':'Outside designated riding season when planned; do not ride based on this file.',
  'Verify current closures, trail signs, road crossings, permits and local groomer conditions before riding.',
  'A GPX track is not an offline basemap. Download maps separately in a compatible GPS app.',
  'Official DNR map: '+DNR_URL
 ].join(' ');
}
function createGpx({route,stops,region,generatedAt,closureVerified=false,seasonActive=false}){
 const validated=validate(route,stops);
 if(!validated.ok)throw new Error(validated.reason);
 const name='Michigan Snowmobile DNR trail plan — '+String(region||'Michigan').replace(/[^\w -]/g,' ').slice(0,90);
 const description=notes({closureVerified,seasonActive});
 const time=stamp(generatedAt);
 const track=validated.coords.map(([lon,lat])=>'<trkpt lat="'+lat.toFixed(6)+'" lon="'+lon.toFixed(6)+'"/>').join('\n');
 const waypoints=validated.stops.map((p,i)=>'<wpt lat="'+p.lat.toFixed(6)+'" lon="'+p.lon.toFixed(6)+'"><name>Stop '+(i+1)+': '+esc(p.label)+'</name><desc>Selected mapped DNR trail junction. NOT a parking location or confirmed physical entrance.</desc></wpt>').join('\n');
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<gpx version="1.1" creator="ChrisIzworski.com Michigan Snowmobile Planner" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n'+
 '<metadata><name>'+esc(name)+'</name><desc>'+esc(description)+'</desc>'+
 '<link href="'+esc(DNR_URL)+'"><text>Michigan DNR official snowmobile map</text></link>'+
 (time?'<time>'+time+'</time>':'')+'</metadata>\n'+
 waypoints+'\n<trk><name>'+esc(name)+'</name><desc>'+esc(description)+'</desc><type>Snowmobile trail planning</type><trkseg>\n'+track+'\n</trkseg></trk>\n</gpx>\n';
 return {xml,filename:fileName(region,generatedAt),vertexCount:validated.coords.length,stopCount:validated.stops.length};
}
function summary({route,stops,region,generatedAt,closureVerified=false,seasonActive=false}){
 const validated=validate(route,stops);
 if(!validated.ok)throw new Error(validated.reason);
 const lines=['Michigan snowmobile trail plan: '+String(region||'Michigan').replace(/[\r\n]/g,' ').slice(0,90),
  'Distance: '+route.distanceMiles.toFixed(2)+' miles on mapped DNR trail centerlines',
  'Trail junction stops: '+validated.stops.map((p,i)=>(i+1)+'. '+p.label+' ('+p.lat.toFixed(5)+', '+p.lon.toFixed(5)+')').join(' | '),
  'Route computed from DNR trail data: '+(stamp(generatedAt)||'source time not available'),
  notes({closureVerified,seasonActive}),
  'Planner: https://chrisizworski.com/snowmobile/regions/'+encodeURIComponent(String(region||'').replace(/[^a-z0-9-]/g,''))+'.html'];
 return lines.join('\n');
}
return Object.freeze({DNR_URL,validate,createGpx,summary,fileName});
});
