// Read-only adapter for *dated* USACE winter bald eagle survey rows.
// Never changes no-report / unavailable into zero birds or today's activity.
const ALLOWED={
 ld13:{url:"https://www.mvr.usace.army.mil/mississippiriver/eagle-watching/",match:/\b(?:lock\s*(?:and|&)\s*dam\s*|ld\s*)13\b|\bfulton\b/i},
 ld14:{url:"https://www.mvr.usace.army.mil/mississippiriver/eagle-watching/",match:/\b(?:lock\s*(?:and|&)\s*dam\s*|ld\s*)14\b|\bpleasant\s+valley\b/i},
 starved:{url:"https://www.mvr.usace.army.mil/illinoiswaterway/eagle-watching/",match:/\bstarved\s+rock\b/i}
};
function strip(html){
 return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
  .replace(/\s+/g," ").trim();
}
function parse(html,entry){
 const out=[];
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>strip(c[1]));
  if(cells.length<4)continue;
  const when=cells[0].match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if(!when||!entry.match.test(cells[1]))continue;
  const adults=cells[2].trim(),juveniles=cells[3].trim();
  if(!/^\d+$/.test(adults)||!/^\d+$/.test(juveniles))continue;
  const ts=Date.UTC(Number(when[3]),Number(when[1])-1,Number(when[2]));
  if(!Number.isFinite(ts)||ts>Date.now()+86400000)continue;
  const date=new Date(ts);
  if(date.getUTCMonth()!==Number(when[1])-1||date.getUTCDate()!==Number(when[2]))continue;
  out.push({date:when[0],adults:Number(adults),juveniles:Number(juveniles),ts});
 }
 out.sort((a,b)=>b.ts-a.ts);
 return out[0]||null;
}
module.exports=async function handler(req,res){
 res.setHeader("X-Robots-Tag","noindex, nofollow");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","public, max-age=300, s-maxage=21600, stale-while-revalidate=86400");
 if(req.method!=="GET")return res.status(405).json({available:false,error:"Method not allowed"});
 const site=String(req.query?.site||"");const entry=ALLOWED[site];
 if(!entry)return res.status(400).json({available:false,error:"Unknown site"});
 try{
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),9500);let response;
  try{response=await fetch(entry.url,{signal:c.signal,headers:{"Accept":"text/html","User-Agent":"WinterEagleWatching/1.0 (+https://chrisizworski.com/winter-eagle-watching/)"}})}
  finally{clearTimeout(timer)}
  if(!response.ok)throw Error("upstream status "+response.status);
  const html=await response.text();if(html.length>4_000_000)throw Error("oversized source");
  const count=parse(html,entry);if(!count)return res.status(200).json({available:false,source:entry.url,reason:"No dated numeric survey row could be verified"});
  const ageDays=Math.floor((Date.now()-count.ts)/86400000);
  return res.status(200).json({available:true,source:entry.url,count:{date:count.date,adults:count.adults,juveniles:count.juveniles},ageDays,stale:ageDays>14,sourceType:"USACE winter eagle survey, observed on stated date"});
 }catch{return res.status(200).json({available:false,source:entry.url,reason:"Published survey data temporarily inaccessible"})}
}
