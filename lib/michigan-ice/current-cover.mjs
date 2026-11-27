import { michiganIceClock, winterObservationDate, belongsToWinter } from './season.mjs';

const keys=['superior','michigan','huron','erie','ontario','stclair','total'];
export async function readCurrentCover(now=new Date(),fetcher=fetch) {
  const clock=michiganIceClock(now),y=clock.seasonYear;
  const seasonFile='g'+y+'_'+(y+1)+'_ice.dat';
  const sourceUrl='https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/'+seasonFile;
  const outcome=(state,extra={},cover=null)=>({cover,coverStatus:{state,seasonFile,sourceUrl,seasonStart:clock.seasonStart,lastObservedAt:null,httpStatus:null,...extra}});
  if(!clock.active)return outcome('off-season');
  let r,txt;
  try{
    r=await fetcher(sourceUrl,{headers:{'User-Agent':'michigan-ice-report (chrisizworski.com/michigan-ice/)'},signal:AbortSignal.timeout(10000)});
    if(!r.ok)return outcome(r.status===404?'season-file-not-found':'source-http-error',{httpStatus:r.status});
    txt=await r.text();
  }catch{return outcome('source-unavailable',{httpStatus:r?.status??null});}
  let latest=null,validDateRows=0;
  const seen=new Set(),duplicates=new Set();
  for(const line of txt.split(/\r?\n/)){
    const p=line.trim().split(/\s+/);
    if(p.length!==9||!/^\d{4}$/.test(p[0])||!/^\d{1,3}$/.test(p[1]))continue;
    const date=winterObservationDate(Number(p[0]),Number(p[1]));
    if(!belongsToWinter(date,y,clock.today))continue;
    validDateRows++;
    if(seen.has(date))duplicates.add(date);
    seen.add(date);
    if(p.slice(2).some(v=>!/^\d+(?:\.\d+)?$/.test(v)))continue;
    const values=p.slice(2).map(Number);
    if(values.some(v=>!Number.isFinite(v)||v<0||v>100))continue;
    if(!latest||date>latest.date)latest={date,p,values};
  }
  const meta={httpStatus:r.status};
  if(!latest)return outcome(validDateRows?'no-complete-observation':'no-current-season-observation',meta);
  const observed={...meta,lastObservedAt:latest.date};
  if(duplicates.has(latest.date))return outcome('ambiguous-observation',observed);
  const age=(now.getTime()-Date.parse(latest.date+'T00:00:00Z'))/3600000;
  if(!Number.isFinite(age)||age<0)return outcome('invalid-observation',observed);
  if(age>48)return outcome('stale-observation',observed);
  const cover={seasonFile,observedAt:latest.date,year:Number(latest.p[0]),dayOfYear:Number(latest.p[1])};
  keys.forEach((key,i)=>{cover[key]=latest.values[i]});
  return outcome('observed',observed,cover);
}
