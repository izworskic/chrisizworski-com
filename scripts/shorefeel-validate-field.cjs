#!/usr/bin/env node
'use strict';
// Offline only: node scripts/shorefeel-validate-field.cjs /path/to/paired-field.json
// The public API does not execute this script or accept submitted field samples.
const fs=require('node:fs');
const {fieldAudit}=require('../lib/shorefeel/field-validation.js');
const source=process.argv[2];
if(!source){
 process.stderr.write('Usage: node scripts/shorefeel-validate-field.cjs /path/to/paired-field.json\n');
 process.exitCode=2;
}else{
 try{
  const raw=JSON.parse(fs.readFileSync(source,'utf8'));
  const report=fieldAudit(raw);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.status==='invalid-ground-truth')process.exitCode=2;
 }catch(err){
  process.stderr.write('ShoreFeel field validation cannot load the dataset: '+err.message+'\n');
  process.exitCode=2;
 }
}
