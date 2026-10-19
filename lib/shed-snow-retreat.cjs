'use strict';
// Interpret recent archived forecast-model snow depth, not measured on-site snow.
// NOHRSC latest analysis is deliberately NOT spliced into this different model series.
const SOURCE='https://open-meteo.com/en/docs';
const EPS=0.005; // Five millimeters in a model grid cell is treated as effectively bare.
function missing(reason='Snow-depth history unavailable'){
 return {status:'unavailable',reason,days:[],source:'Open-Meteo model history',sourceUrl:SOURCE,unit:'m',interpretation:'Historical modeled snow depth, not NOAA history or measured field snow.'};
}
function sourceUrl(site){
 const params=new URLSearchParams({latitude:site.lat.toFixed(4),longitude:site.lon.toFixed(4),
   hourly:'snow_depth',past_days:'14',forecast_days:'1',timezone:'America/Detroit'});
 return 'https://api.open-meteo.com/v1/forecast?'+params.toString();
}
function analyze(data,now=new Date()){
 if(data?.hourly_units?.snow_depth!=='m')return missing('Snow-depth source units could not be verified.');
 const time=data?.hourly?.time,depth=data?.hourly?.snow_depth;
 if(!Array.isArray(time)||!Array.isArray(depth)||time.length!==depth.length)return missing('Incomplete model history.');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 // Use local noon on completed days only: never inadvertently call a forecast point a historical record.
 const records=[];
 for(let i=0;i<time.length;i++){
  const t=time[i];
  if(typeof t!=='string'||!/^\d{4}-\d{2}-\d{2}T12:00$/.test(t)||t.slice(0,10)>=today)continue;
  const v=depth[i];
  if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>15)continue;
  records.push({date:t.slice(0,10),depthM:Math.round(v*1000)/1000});
 }
 const days=records.slice(-14),latest=days.at(-1);
 if(days.length<10||!latest)return missing('Fewer than 10 valid completed-day model values.');
 const freshness=(Date.parse(today+'T12:00:00Z')-Date.parse(latest.date+'T12:00:00Z'))/86400000;
 if(!Number.isFinite(freshness)||freshness>2||freshness<0)return missing('The last model-history day is stale.');
 const recent=days.slice(-3),prior=days.slice(0,-3);
 const priorSnow=prior.some(d=>d.depthM>=0.03);
 const latestBare=latest.depthM<=EPS;
 const previousBare=recent.at(-2)?.depthM<=EPS;
 const lastWeek=days.slice(-7);
 const stableBare=lastWeek.length===7&&lastWeek.every(d=>d.depthM<=EPS);
 const before=days[0].depthM,deltaM=Math.round((latest.depthM-before)*1000)/1000;
 const base={days,status:'covered',reason:'The regional model still depicts snow cover; wait for field-verified exposed ground.',
  source:'Open-Meteo recent archived forecast-model snow depth',sourceUrl:SOURCE,unit:'m',
  throughDate:latest.date,latestDepthM:latest.depthM,changeM:deltaM,
  interpretation:'Point-model local-noon series, not measured snow, verified NOAA history, or property-scale bare ground.'};
 if(stableBare)return {...base,status:'persistently_bare',reason:'The model has shown effectively bare snow depth for seven completed days; verify shaded woods and any new snow locally.'};
 if(latestBare&&previousBare&&priorSnow)return {...base,status:'recent_retreat',reason:'The same model went from snow cover to two completed days of near-zero depth. Recent exposure needs a ground check.'};
 if(latestBare)return {...base,status:'possible_brief_thaw',reason:'The latest model day appears bare, but persistence is unconfirmed. A one-day thaw is not reliable access.'};
 if(before-latest.depthM>=0.03)return {...base,status:'thinning',reason:'Modeled snow depth has decreased, but the grid cell still shows snow.'};
 return base;
}
module.exports={sourceUrl,analyze,missing};
