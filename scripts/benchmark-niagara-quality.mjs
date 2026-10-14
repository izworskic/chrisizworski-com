#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {evaluate}=require('../lib/niagara-falls/quality-loss-evaluate.js');
const result=evaluate();
console.log('NIAGARA COMPONENT LOSS GATES');
console.log('Automated release: '+result.automated_release_gate+'; measured '+result.measured+'; automated loss '+result.loss_score.toFixed(4));
console.log('Human/browser review: '+result.human_review_state+' ('+result.unreviewed+' unresolved). Automated PASS is NOT a premium UX sign-off.');
for(const x of result.domains)console.log(x.domain.padEnd(10)+' pass '+String(x.pass).padStart(2)+' / '+String(x.total).padStart(2)+'; fail '+x.fail+'; review '+x.review_required);
if(result.failures.length)for(const x of result.failures)console.error('FAIL '+x.id+' ['+x.severity+'] '+x.domain+': '+x.component);
if(process.argv.includes('--write')){
 const loc=path.join(process.cwd(),'artifacts/niagara-component-loss-report.json');
 fs.mkdirSync(path.dirname(loc),{recursive:true});
 fs.writeFileSync(loc,JSON.stringify(result,null,2)+'\n');
 console.log('Saved full report to '+loc);
}
if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
if(result.automated_release_gate==='FAIL'&&process.argv.includes('--check'))process.exitCode=1;
