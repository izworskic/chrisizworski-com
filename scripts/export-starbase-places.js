#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const model=require('../lib/starbase-viewing');
const destination=path.join(__dirname,'../public/starbase-rocket-launch-viewing/places.json');
const payload={schemaVersion:1,sourceOfTruth:'lib/starbase-viewing.js',
  sourceCheckedDate:model.sourceDate,
  geometryDisclosure:'Points are source-referenced place features, NOT verified entrance, parking or precise viewing locations; pad location is added only when source mission GPS is valid.',
  sites:model.SITES.map(site=>({
    id:site.id,name:site.name,lat:site.lat,lon:site.lon,kind:site.kind,
    coordinateRole:site.coordinateRole,geographicSource:site.geographicSource,
    operator:site.operator,accessSource:site.accessSource,
    viewingSource:site.viewingSource,accessNote:site.accessNote,
    bestFor:site.bestFor,scene:site.scene,tradeoff:site.tradeoff,
    profiles:[...site.profiles]
  }))};
const wanted=JSON.stringify(payload,null,2)+'\n';
if(process.argv.includes('--check')){
  if(!fs.existsSync(destination)||fs.readFileSync(destination,'utf8')!==wanted){
    console.error('Starbase places manifest differs from source model: node scripts/export-starbase-places.js');
    process.exit(1);
  }
  console.log('PASS: Starbase public map references match source inventory.');
}else{
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.writeFileSync(destination,wanted);
 console.log('Starbase places exported from source inventory.');
}
