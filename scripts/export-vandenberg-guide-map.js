#!/usr/bin/env node
'use strict';
/**
 * Deterministic static map manifest from the SAME six source-controlled venue
 * records used by the California live decision engine. No duplicate hand-
 * maintained geometry and no flight/forecast data in the editorial guide.
 *
 * Usage:
 *   node scripts/export-vandenberg-guide-map.js --write
 *   node scripts/export-vandenberg-guide-map.js --check
 */
const fs = require('node:fs');
const path = require('node:path');
const {SITES} = require('../lib/vandenberg-viewing');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'public/vandenberg-rocket-launch-viewing/places.json');
const ANCHORS=Object.freeze({
  'ocean-park':'coast',
  'surf-station':'surf-beach',
  'hancock':'hancock',
  'riverbend':'riverbend',
  'beattie':'city-parks',
  'ryon':'ryon'
});
function build(){
  const ids=new Set();
  const places=SITES.map((s)=>{
    if(ids.has(s.id)||!ANCHORS[s.id])throw new Error('Unreviewed or duplicated venue: '+s.id);
    ids.add(s.id);
    if(!Number.isFinite(s.lat)||!Number.isFinite(s.lon)||
       s.lat<34.55||s.lat>34.8||s.lon< -120.7||s.lon> -120.35)
      throw new Error('Invalid Lompoc location: '+s.id);
    return {
      id:s.id,name:s.name,lat:s.lat,lon:s.lon,
      kind:s.kind,pinLabel:s.pinLabel,scene:s.scene,
      accessNote:s.accessNote,osm:s.osm,source:s.source,
      accessSource:s.accessSource,
      articleAnchor:ANCHORS[s.id]
    };
  });
  if(places.length!==6)throw new Error('Review guide inventory and article before changing site count');
  return {schemaVersion:1,sourceOfTruth:'lib/vandenberg-viewing.js',
    geometryDisclosure:'OpenStreetMap feature centers, NOT parking entrances, public-access clearance, launch-pad locations, lines of sight or driving directions',
    places};
}
const expected=JSON.stringify(build(),null,2)+'\n';
if(process.argv.includes('--check')){
  if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==expected){
    console.error('Vandenberg guide map out of sync. Run node scripts/export-vandenberg-guide-map.js --write');
    process.exitCode=1;
  }else console.log('PASS: guide map manifest matches all six authoritative Lompoc venue records');
}else if(process.argv.includes('--write')){
  fs.writeFileSync(output,expected,'utf8');
  console.log('Wrote '+output);
}else{
  console.error('Pass --check or --write');
  process.exitCode=2;
}
