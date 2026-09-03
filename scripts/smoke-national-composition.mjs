#!/usr/bin/env node
const origin=process.env.NATIONAL_SMOKE_ORIGIN||'https://chrisizworski.com';
const checks=[];

async function request(path,{json=false,timeout=20000}={}){
  const url=origin+path+(path.includes('?')?'&':'?')+'_smoke='+Date.now();
  const response=await fetch(url,{headers:{accept:json?'application/json':'text/plain, text/html, application/javascript, text/css, */*','cache-control':'no-cache'},signal:AbortSignal.timeout(timeout)});
  const text=await response.text();
  if(!response.ok)throw new Error(path+' HTTP '+response.status+' '+text.slice(0,160));
  if(!json)return {text,response};
  try{return {data:JSON.parse(text),response,text}}catch{throw new Error(path+' returned non-JSON: '+text.slice(0,160))}
}

async function check(label,fn){
  try{await fn();checks.push({label,ok:true});console.log('PASS',label)}
  catch(error){checks.push({label,ok:false,error:String(error.message||error)});console.error('FAIL',label,error.message||error)}
}

await check('garden hub route',async()=>{
  const {text}=await request('/national-tools/garden/');
  if(!/garden/i.test(text)||!/<title>/i.test(text))throw new Error('garden page shell missing');
});

await check('planting page is v3.4 shell on v35 runtime',async()=>{
  const {text}=await request('/national-tools/planting/');
  for(const marker of ['data-planting-ui="v3.4"','id="packet-crop"','id="horizon-grid"','national-planting-page-v3.js?v=20260903-v35']){
    if(!text.includes(marker))throw new Error('missing marker '+marker);
  }
});

await check('planting page JS is live',async()=>{
  const {text}=await request('/assets/national-planting-page-v3.js');
  for(const marker of ['fallbackNationalTools','N.bind(form,run)','/api/national-geocode?q='])if(!text.includes(marker))throw new Error('missing JS marker '+marker);
});

await check('planting season-year JS is live',async()=>{
  const {text}=await request('/assets/national-planting-season-years.js');
  if(!text.includes('NationalPlantingSeasonYears'))throw new Error('season-year runtime missing');
});

await check('planting v3 CSS is live',async()=>{
  const {text}=await request('/assets/national-planting-v3.css');
  if(!/packet-block|horizon-grid/.test(text))throw new Error('v3 CSS missing expected selectors');
});

await check('planting v3 crop overlay is live',async()=>{
  const {data}=await request('/data/national-planting-v3.json',{json:true});
  if(data.version!=='3.0.0'||!Array.isArray(data.add_crops)||data.add_crops.length<10)throw new Error('v3 crop overlay incomplete');
});

await check('ZIP geocode 48706 resolves',async()=>{
  const {data}=await request('/api/national-geocode?q=48706',{json:true});
  if(!Number.isFinite(Number(data.latitude))||!Number.isFinite(Number(data.longitude)))throw new Error('ZIP missing coordinates');
  if(String(data.postcode||data.postalCode||'').slice(0,5)!=='48706')throw new Error('ZIP identity drifted');
});

await check('planting frost API works for 48706',async()=>{
  const {data}=await request('/api/national-frost?lat=43.59&lon=-83.89&zip=48706',{json:true,timeout:25000});
  if(!data.location||!Array.isArray(data.sources))throw new Error('frost contract incomplete');
});

console.log('\n'+JSON.stringify({origin,checked_at:new Date().toISOString(),passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,checks},null,2));
if(checks.some(x=>!x.ok))process.exit(1);
