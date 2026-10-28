import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSource,checkSources,visiblePageText,watchList} from '../scripts/check-apostle-sources.mjs';

const fixture=(content)=>'<html><head><title>Source</title></head><body>'+content+'</body></html>'+' '.repeat(950);
const html={
 'nps-devils-construction':fixture('Devils Island Marina Rehabilitation. Access to the marina on Devils Island will remain closed until construction is completed.'),
 'cruise-shuttle-products':fixture('Stockton Island Day Hiking. Stockton Island Overnight Camping. Oak Island Overnight Camping. Dates June 20 – August 30.'),
 'cruise-lighthouse-tours':fixture('Raspberry Island Lighthouse Tour. Michigan Island Lighthouse Tour.')
};
test('source monitor signals are correctly tied to actual public domains and known evidence',()=>{
 assert.equal(watchList.length,3);
 assert.ok(watchList.every(x=>x.url.startsWith('https://')&&x.signals.length>=2));
 assert.ok(watchList.some(x=>x.id==='nps-devils-construction'&&x.url.includes('nps.gov')));
 assert.ok(watchList.some(x=>x.id==='cruise-shuttle-products'&&x.url.includes('apostleisland.com')));
 for(const entry of watchList)assert.equal(assessSource(entry,html[entry.id]).state,'baseline-signals-present',entry.id);
});
test('HTML scripts and hidden source text cannot manufacture matching evidence',()=>{
 const entry=watchList[0];
 const hidden='<script>Devils Island Marina Rehabilitation. Access to the marina on Devils Island will remain closed until construction is completed.</script>';
 assert.equal(assessSource(entry,fixture(hidden)).state,'changed');
 assert.equal(visiblePageText('<style>x{display:none}</style><p>dock &amp; boat</p>'),'dock & boat');
});
test('changed source language produces a review finding, never inferred reopening',()=>{
 const entry=watchList[0];
 const result=assessSource(entry,fixture('Project completed. See the new landing information.'));
 assert.equal(result.state,'changed');
 assert.ok(result.missing.some(x=>x.includes('marina')));
 assert.ok(!JSON.stringify(result).includes('now open'));
});
test('unreachable official pages require review, rather than empty alerts or new season claims',async()=>{
 const fake=async(url)=>{
  if(url.includes('infrastructure-projects'))return {ok:true,text:async()=>html['nps-devils-construction']};
  if(url.includes('hiking-and-camping'))return {ok:true,text:async()=>html['cruise-shuttle-products']};
  throw Error('network unavailable');
 };
 const report=await checkSources(fake);
 assert.equal(report.overall,'needs-editorial-review');
 assert.equal(report.sources.filter(x=>x.state==='unavailable').length,1);
 assert.deepEqual(report.flagged,['cruise-lighthouse-tours']);
 assert.match(report.policy,/not mark conditions current/i);
});
test('baseline signal presence never counts as verified live access',async()=>{
 const fake=async(url)=>{
  const entry=watchList.find(x=>x.url===url);
  return {ok:true,text:async()=>html[entry.id]};
 };
 const report=await checkSources(fake);
 assert.equal(report.overall,'baseline-signals-present-not-live-verified');
 assert.deepEqual(report.flagged,[]);
});
