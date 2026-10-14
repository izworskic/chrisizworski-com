'use strict';
const E=require('../lib/maple-sap-engine.cjs');
const NWS='https://api.weather.gov';
const USER_AGENT='MichiganMapleSapRun/1.0 (https://chrisizworski.com/michigan-maple-sap-run/; contact: https://chrisizworski.com/)';
async function getJson(url){
  const r=await fetch(url,{headers:{'User-Agent':USER_AGENT,Accept:'application/geo+json, application/json'},
    signal:AbortSignal.timeout(6500)});
  if(!r.ok) throw new Error('NWS response '+r.status);
  return r.json();
}
async function forecast(site,now){
  if(E.season(site,now)==='OFF_SEASON')
    return {site,phase:'OFF_SEASON',daily:[],summary:{bestDay:null,bestScore:null,bestLevel:'OFF_SEASON',evaluatedDays:0},
      source:'National Weather Service',fetchedAt:null,detail:'Outside the Michigan maple-tapping weather-monitoring season. No current sap flow is claimed.'};
  const point=await getJson(NWS+'/points/'+site.lat.toFixed(4)+','+site.lon.toFixed(4));
  const hourly=point?.properties?.forecastHourly;
  if(typeof hourly!=='string'||!hourly.startsWith(NWS+'/'))throw new Error('Missing NWS hourly forecast');
  const data=await getJson(hourly);
  const periods=data?.properties?.periods;
  if(!Array.isArray(periods)||periods.length<10)throw new Error('Incomplete NWS hourly forecast');
  const daily=E.evaluate(periods,site,now);
  return {site,phase:'WEATHER_WINDOW',daily,summary:E.summarize(daily),
    source:'National Weather Service',sourceUrl:hourly,
    fetchedAt:new Date().toISOString(),
    detail:'Heuristic index of favorable freeze/thaw weather, not observed flow, gallons, or a guarantee. Tree dormancy and bud development must be checked locally.'};
}
async function board(now){
  const sites=E.BOARD_IDS.map(E.lookup).filter(Boolean);
  if(sites.every(function(s){return E.season(s,now)==='OFF_SEASON';}))
    return sites.map(function(site){return {site,phase:'OFF_SEASON',summary:{bestDay:null,bestScore:null,bestLevel:'OFF_SEASON',evaluatedDays:0}};});
  let index=0;
  async function worker(){
    const results=[];
    while(index<sites.length){
      const i=index++;
      try{const row=await forecast(sites[i],now);results.push([i,{site:row.site,phase:row.phase,summary:row.summary,updatedAt:row.fetchedAt}]);}
      catch(e){results.push([i,{site:sites[i],phase:'UNAVAILABLE',summary:null,updatedAt:null}]);}
    }
    return results;
  }
  const batches=await Promise.all(Array.from({length:5},worker));
  return batches.flat().sort(function(a,b){return a[0]-b[0];}).map(function(x){return x[1];});
}
module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }
  const mode=String(req.query?.mode||'site');
  const now=new Date();
  if(mode==='locations'){
    res.setHeader('Cache-Control','public, s-maxage=86400');
    return res.status(200).json({locations:E.LOCATIONS,anchorIds:E.BOARD_IDS});
  }
  if(mode==='site'){
    const site=E.lookup(String(req.query?.site||'bay-city'));
    if(!site)return res.status(400).json({error:'Unknown Michigan forecast location'});
    try{
      const report=await forecast(site,now);
      res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
      return res.status(200).json(report);
    }catch(e){res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'NWS weather temporarily unavailable',site,phase:'UNAVAILABLE'});}
  }
  if(mode==='board'){
    const result=await board(now);
    res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
    return res.status(200).json({locations:result,updatedAt:new Date().toISOString(),source:'National Weather Service',
      note:'Regional forecast conditions, never confirmed sap flow.'});
  }
  return res.status(400).json({error:'Unknown mode'});
};
module.exports._test={forecast,board};