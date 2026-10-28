#!/usr/bin/env node
/**
 * Apostle Islands official-source drift detection.
 * Advisory only: a successful HTTP request never certifies an open dock, running ferry,
 * safe crossing, campsite availability, or newly reviewed editorial content.
 * GitHub Action must raise a human review issue for changed/unreachable evidence.
 */
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const watchList=[
 {id:'nps-devils-construction',name:'NPS Devils Island dock rehabilitation',url:'https://www.nps.gov/apis/learn/infrastructure-projects.htm',signals:[
  {label:'Devils construction project',patterns:[/Devils? Island Marina Rehabilitation/i]},
  {label:'marina still closed',patterns:[/Marina.{0,150}remain closed until construction is completed/i,/Access to the marina on Devils Island will remain closed/i]},
 ]},
 {id:'cruise-shuttle-products',name:'Apostle Islands Cruises island shuttles',url:'https://www.apostleisland.com/hiking-and-camping-shuttles/',signals:[
  {label:'Stockton day hiking',patterns:[/Stockton Island Day Hiking/i]},
  {label:'Stockton camping',patterns:[/Stockton Island Overnight Camping/i]},
  {label:'Oak camping',patterns:[/Oak Island Overnight Camping/i]},
  {label:'published season dates',patterns:[/June\s*20.{0,70}August\s*30/i]}
 ]},
 {id:'cruise-lighthouse-tours',name:'Apostle Islands Cruises lighthouse tour menu',url:'https://www.apostleisland.com/fares-schedules/',signals:[
  {label:'Raspberry Island tour',patterns:[/Raspberry Island Lighthouse Tour/i]},
  {label:'Michigan Island tour',patterns:[/Michigan Island Lighthouse Tour/i]}
 ]}
];

export function visiblePageText(html){
 return String(html)
 .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<[^>]+>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ')
 .replace(/&amp;/gi,'&').replace(/&(?:mdash|ndash|#8211|#8212);/gi,'-')
 .replace(/\s+/g,' ').trim();
}
export function assessSource(entry,html){
 const text=visiblePageText(html);
 const missing=entry.signals.filter(signal=>!signal.patterns.some(pattern=>pattern.test(text))).map(signal=>signal.label);
 return {id:entry.id,name:entry.name,url:entry.url,state:missing.length?'changed':'baseline-signals-present',missing,bytes:html.length};
}
export async function checkSources(fetcher=fetch){
 const reports=[];
 for(const entry of watchList){
  try{
   const response=await fetcher(entry.url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; ApostleSourceAudit/1.0; +https://chrisizworski.com/apostle-islands/)','Accept':'text/html'},signal:AbortSignal.timeout(18000),redirect:'follow'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const body=await response.text();
   if(body.length<900)throw Error('unusually short response');
   reports.push(assessSource(entry,body));
  }catch(error){reports.push({id:entry.id,name:entry.name,url:entry.url,state:'unavailable',missing:[],reason:String(error.message||error).slice(0,160)});}
 }
 const flagged=reports.filter(x=>x.state!=='baseline-signals-present');
 return {checkedAt:new Date().toISOString(),policy:'Source text is a drift alarm only. Do not mark conditions current or publish new schedules without editorial review.',overall:flagged.length?'needs-editorial-review':'baseline-signals-present-not-live-verified',sources:reports,flagged:flagged.map(x=>x.id)};
}
async function main(){
 const report=await checkSources();
 const file=process.env.APOSTLE_SOURCE_REPORT;
 if(file)await writeFile(file,JSON.stringify(report,null,2)+'\n','utf8');
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{process.stderr.write(String(e.stack||e)+'\n');process.exitCode=1;});
}
