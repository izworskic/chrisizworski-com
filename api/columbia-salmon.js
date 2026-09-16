const SOURCE_URL='https://www.fpc.org/currentdaily/HistFishTwo_7day-ytd_Adults.htm';

const DAMS=[
  {id:'BON',name:'Bonneville Dam',next:'THE DALLES DAM'},
  {id:'TDA',name:'The Dalles Dam',next:'JOHN DAY DAM'},
  {id:'JDA',name:'John Day Dam',next:'MCNARY DAM'},
  {id:'MCN',name:'McNary Dam',next:'ICE HARBOR DAM'}
];

const COL={
  date:0,chinookAdult:1,chinookJack:2,springChinookAdult:3,summerChinookAdult:5,
  fallChinookAdult:7,cohoAdult:9,cohoJack:10,steelhead:11,wildSteelhead:12,
  shad:13,sockeye:14,lamprey:15,chum:17,pink:18,source:19
};

function clean(value=''){
  return value
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}

function num(value){
  const v=clean(String(value||'')).replace(/,/g,'').trim();
  if(!v||v==='-'||/^n\/?a$/i.test(v))return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

function parseDate(value){
  const m=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m)return null;
  return `${m[3]}-${m[1]}-${m[2]}`;
}

function rowObject(cells){
  const date=parseDate(clean(cells[COL.date]||''));
  if(!date)return null;
  return {
    date,
    chinookAdult:num(cells[COL.chinookAdult]),
    chinookJack:num(cells[COL.chinookJack]),
    springChinookAdult:num(cells[COL.springChinookAdult]),
    summerChinookAdult:num(cells[COL.summerChinookAdult]),
    fallChinookAdult:num(cells[COL.fallChinookAdult]),
    cohoAdult:num(cells[COL.cohoAdult]),
    cohoJack:num(cells[COL.cohoJack]),
    steelhead:num(cells[COL.steelhead]),
    wildSteelhead:num(cells[COL.wildSteelhead]),
    shad:num(cells[COL.shad]),
    sockeye:num(cells[COL.sockeye]),
    lamprey:num(cells[COL.lamprey]),
    chum:num(cells[COL.chum]),
    pink:num(cells[COL.pink]),
    source:clean(cells[COL.source]||'')||null
  };
}

function parseBlock(html,dam){
  const upper=html.toUpperCase();
  const start=upper.indexOf(dam.name.toUpperCase());
  if(start<0)return {id:dam.id,name:dam.name,rows:[],ytd:null};
  const end=dam.next?upper.indexOf(dam.next.toUpperCase(),start+dam.name.length):-1;
  const block=html.slice(start,end>start?end:Math.min(html.length,start+80000));
  const rows=[];
  let ytd=null;
  for(const match of block.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>clean(m[1]));
    if(!cells.length)continue;
    const first=clean(cells[0]||'');
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(first)){
      const parsed=rowObject(cells);
      if(parsed)rows.push(parsed);
    }else if(/^YTD$/i.test(first)){
      ytd={
        chinookAdult:num(cells[COL.chinookAdult]),
        fallChinookAdult:num(cells[COL.fallChinookAdult]),
        cohoAdult:num(cells[COL.cohoAdult]),
        steelhead:num(cells[COL.steelhead]),
        sockeye:num(cells[COL.sockeye]),
        lamprey:num(cells[COL.lamprey])
      };
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return {id:dam.id,name:dam.name,rows:rows.slice(-7),ytd};
}

function avg(values){
  const good=values.filter(Number.isFinite);
  return good.length?good.reduce((a,b)=>a+b,0)/good.length:null;
}

function trend(rows,key){
  const valid=rows.filter(r=>Number.isFinite(r[key]));
  if(valid.length<4)return {direction:'unknown',pct:null};
  const n=Math.min(3,Math.floor(valid.length/2));
  const early=avg(valid.slice(0,n).map(r=>r[key]));
  const recent=avg(valid.slice(-n).map(r=>r[key]));
  if(!Number.isFinite(early)||early<=0||!Number.isFinite(recent))return {direction:'unknown',pct:null};
  const pct=((recent-early)/early)*100;
  const direction=pct>=15?'rising':pct<=-15?'falling':'steady';
  return {direction,pct:Math.round(pct)};
}

function seasonalContext(isoDate){
  if(!isoDate)return {chinookRun:'unknown',fallChinookPeakEnvelope:false,cohoPeakEnvelope:false,steelheadPeakEnvelope:false};
  const md=isoDate.slice(5);
  const between=(a,b)=>md>=a&&md<=b;
  let chinookRun='between primary run windows';
  if(between('03-15','05-31'))chinookRun='spring Chinook';
  else if(between('06-01','07-31'))chinookRun='summer Chinook';
  else if(between('08-01','11-15'))chinookRun='fall Chinook';
  return {
    chinookRun,
    fallChinookPeakEnvelope:between('08-30','09-17'),
    cohoPeakEnvelope:between('08-29','10-11'),
    steelheadPeakEnvelope:between('07-16','09-22')
  };
}

function ageDays(isoDate){
  if(!isoDate)return null;
  const today=new Date();
  const d=new Date(`${isoDate}T12:00:00-07:00`);
  if(Number.isNaN(d.getTime()))return null;
  return Math.max(0,Math.floor((today.getTime()-d.getTime())/86400000));
}

export default async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin','*');
  try{
    const response=await fetch(SOURCE_URL,{headers:{'User-Agent':'ChrisIzworski-NationalTools/1.0 (+https://chrisizworski.com/national-tools/)','Accept':'text/html'}});
    if(!response.ok)throw new Error(`FPC returned ${response.status}`);
    const html=await response.text();
    const dams=DAMS.map(d=>parseBlock(html,d));
    const bonneville=dams.find(d=>d.id==='BON');
    const latest=bonneville?.rows?.at(-1)||null;
    if(!latest)throw new Error('Bonneville rows were not found in FPC response');
    const latestByDam=dams.map(d=>({id:d.id,name:d.name,latest:d.rows.at(-1)||null,ytd:d.ytd}));
    const counts=latestByDam.filter(d=>d.latest&&Number.isFinite(d.latest.chinookAdult));
    const highest=counts.sort((a,b)=>b.latest.chinookAdult-a.latest.chinookAdult)[0]||null;
    res.status(200).json({
      ok:true,
      generatedAt:new Date().toISOString(),
      source:{name:'Fish Passage Center',url:SOURCE_URL,courtesy:'U.S. Army Corps of Engineers and regional fish-count partners'},
      latestDate:latest.date,
      dataAgeDays:ageDays(latest.date),
      season:seasonalContext(latest.date),
      bonneville:{
        latest,
        rows:bonneville.rows,
        ytd:bonneville.ytd,
        trends:{
          chinook:trend(bonneville.rows,'chinookAdult'),
          coho:trend(bonneville.rows,'cohoAdult'),
          steelhead:trend(bonneville.rows,'steelhead')
        }
      },
      dams:latestByDam,
      corridor:{
        highestReportedChinook:highest?{damId:highest.id,damName:highest.name,date:highest.latest.date,count:highest.latest.chinookAdult}:null,
        note:'Counts are checkpoint observations, not a real-time fish-location estimate. Reporting dates and tributary destinations differ by dam.'
      },
      definitions:{
        trend:'Trend compares the mean of the first three available daily counts with the mean of the latest three; ±15% is labeled rising/falling.',
        peakEnvelope:'Peak envelopes are historical earliest-to-latest annual peak dates in the 2026 Bonneville Fish Passage Plan; they do not mean the current run is at peak.'
      }
    });
  }catch(error){
    res.status(502).json({ok:false,generatedAt:new Date().toISOString(),error:'Live fish-count source is temporarily unavailable.',detail:String(error?.message||error),source:{name:'Fish Passage Center',url:SOURCE_URL}});
  }
}
