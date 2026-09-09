#!/usr/bin/env node
const origin=process.env.NATIONAL_SMOKE_ORIGIN||'https://chrisizworski.com';
const checks=[];

async function request(path,{json=false,timeout=20000,cacheBust=true,noCacheHeader=true}={}){
  const suffix=cacheBust?(path.includes('?')?'&':'?')+'_smoke='+Date.now():'';
  const headers={accept:json?'application/json':'text/plain, text/html, application/javascript, text/css, */*'};
  if(noCacheHeader)headers['cache-control']='no-cache';
  const url=origin+path+suffix;
  const response=await fetch(url,{headers,signal:AbortSignal.timeout(timeout)});
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

await check('national hub links branded Lake Ice-Out',async()=>{
  // Exact public URL, no query-string bypass: this must be what ordinary users receive.
  const {text}=await request('/national-tools/',{cacheBust:false,noCacheHeader:false});
  if(!text.includes('Lake Ice-Out Forecast'))throw new Error('Lake Ice-Out card missing from canonical hub response');
  if(!text.includes('href="/national-tools/ice-out/"')&&!text.includes('href="https://chrisizworski.com/national-tools/ice-out/"')){
    throw new Error('hub does not link to branded Lake Ice-Out route');
  }
  if(text.includes('href="https://lspp-ice-out.vercel.app/north-america/"'))throw new Error('hub still exposes legacy Vercel ice-out href');
});

await check('national hub links Melvin Price Live',async()=>{
  // Exact canonical response: verify the user-facing hub, not a preview or cache-busted bypass.
  const {text}=await request('/national-tools/',{cacheBust:false,noCacheHeader:false});
  for(const marker of ['Time a Melvin Price Locks visit','Melvin Price Live','Melvin Price Live: Tows, Locks &amp; River']){
    if(!text.includes(marker))throw new Error('Melvin Price hub marker missing: '+marker);
  }
  if(!text.includes('href="https://chrisizworski.com/national-tools/melvin-price-live/"')&&!text.includes('href="/national-tools/melvin-price-live/"')){
    throw new Error('hub does not link to canonical Melvin Price Live route');
  }
  if(text.includes('href="https://chrisizworski.com/melvin-price/"'))throw new Error('hub still exposes legacy Melvin Price root href');
});

await check('branded Lake Ice-Out page is live',async()=>{
  const {text}=await request('/national-tools/ice-out/',{cacheBust:false,noCacheHeader:false});
  for(const marker of [
    '<title>Lake Ice-Out Forecast — Northern U.S. & Canada | Chris Izworski</title>',
    '<link rel="canonical" href="https://chrisizworski.com/national-tools/ice-out/"',
    'G-Y5D2V2W7HN',
    'ca-pub-8222782620788075',
    'https://lspp-ice-out.vercel.app/north-america/app.js'
  ])if(!text.includes(marker))throw new Error('branded ice-out page missing marker '+marker);
});

await check('Lake Ice-Out seasonal physics proxy works',async()=>{
  const {data}=await request('/api/seasonal-physics?lat=47.66&lon=-84.74&date=2025-04-15',{json:true,timeout:30000});
  if(data.active!==true)throw new Error('seasonal physics is not active for spring smoke date');
  if(!Array.isArray(data.features)||data.features.length!==4)throw new Error('seasonal physics feature vector invalid');
  if(Number(data.prior_years)<8)throw new Error('seasonal physics prior-year coverage too small');
});

await check('planting canonical page is v3.4 shell on v35 runtime',async()=>{
  // Deliberately use the exact public URL with no cache-busting query and no
  // no-cache request header. This catches a stale canonical CDN object that a
  // query-string smoke would silently bypass.
  const {text}=await request('/national-tools/planting/',{cacheBust:false,noCacheHeader:false});
  for(const marker of ['data-planting-ui="v3.4"','id="packet-crop"','id="horizon-grid"','national-planting-page-v3.js?v=20260903-v35']){
    if(!text.includes(marker))throw new Error('canonical page missing marker '+marker);
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
