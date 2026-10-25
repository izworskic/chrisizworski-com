'use strict';
const {norm,stableSlug,addEvidence}=require('./freighter-layup-season');
const SOURCES=[
 {id:'duluth-cam',url:'https://www.duluthharborcam.com/feeds/posts/default?alt=json&max-results=75',publisher:'Duluth Harbor Cam',host:'www.duluthharborcam.com',sourceClass:'journalistic_report',format:'blogger'},
 {id:'wmhs',url:'https://wmhs.org/feed/',publisher:'Wisconsin Marine Historical Society',host:'wmhs.org',sourceClass:'maritime_historical_society',format:'rss'},
 {id:'duluth-port',url:'https://duluthport.com/feed/',publisher:'Duluth Seaway Port Authority',host:'duluthport.com',sourceClass:'port_authority',format:'rss'},
 {id:'owen-museum',url:'https://waterfrontheritage.ca/feed/',publisher:'Community Waterfront Heritage Centre',host:'waterfrontheritage.ca',sourceClass:'local_maritime_museum',format:'rss'}
];
const HARBORS=[{id:'superior',re:/\b(?:superior|duluth|fraser shipyards)\b/i},{id:'sturgeon-bay',re:/\b(?:sturgeon bay|fincantieri)\b/i},{id:'milwaukee',re:/\bmilwaukee\b/i},{id:'owen-sound',re:/\bowen sound\b/i},{id:'toledo',re:/\btoledo\b/i}];
function clean(s){return String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim().slice(0,8500)}
function xml(s,tag){const re=new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i');return clean(String(s).match(re)?.[1]||'')}
function parse(s,source){
 if(String(s).length>1100000)throw Error('Feed too large');
 if(source.format==='blogger'){const p=JSON.parse(s);return(p.feed?.entry||[]).slice(0,70).map(x=>({title:clean(x.title?.$t),text:clean(x.content?.$t),date:x.published?.$t,url:x.link?.find(l=>l.rel==='alternate')?.href}))}
 return [...String(s).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,75).map(x=>({title:xml(x[1],'title'),text:xml(x[1],'description'),date:xml(x[1],'pubDate'),url:xml(x[1],'link')}));
}
function catalog(archive,ledger){const out=new Map();for(const s of archive.seasons||[])for(const r of s.records||[])out.set(r.identity?.key||r.id,{key:r.identity?.key||r.id,name:r.name,aliases:[r.name,...(r.aliases||[])]});for(const e of ledger.events)if(!out.has(e.vessel.key))out.set(e.vessel.key,{...e.vessel,aliases:[e.vessel.name]});return [...out.values()]}
function classify(article,source,known,season){
 let link;try{link=new URL(article.url)}catch{return{reason:'invalid_url'}}
 if(link.protocol!=='https:'||![source.host,source.host.replace(/^www\./,''),'www.'+source.host].includes(link.hostname))return{reason:'untrusted_url'};
 const epoch=Date.parse(article.date||''),year=Number(season.slice(0,4));
 if(!Number.isFinite(epoch)||epoch<Date.UTC(year,10,1)||epoch>Date.UTC(year+1,9,31,23,59,59))return{reason:'wrong_season'};
 const title=clean(article.title).slice(0,190),full=title+' '+clean(article.text).slice(0,3300),phrase=norm(full);
 if(!/\b(?:winter layup|winter lay up|winter berth|wintering|wintered|spring departure)\b/.test(phrase))return{reason:'not_layup'};
 if(/\b(?:retrospective|history|archives|remembering|look back)\b/i.test(title))return{reason:'retrospective'};
 const matches=known.filter(v=>v.aliases.some(a=>{const n=norm(a);return n.length>4&&(' '+phrase+' ').includes(' '+n+' ')}));
 let discovered=null;
 if(matches.length===0){
  // New hull may be added from an explicit "M/V Vessel Name arrived" title, but remains reported only.
  const raw=title.match(/^(?:M\/V|MV|S\/S)\s+([A-Z][A-Za-z0-9 .'-]{4,65}?)\s+(?:arrived|arrives|reached|docked|berthed|enters?|wintering)\b/i);
  const proposed=raw?.[1]?.trim();
  if(proposed&&proposed.split(/\s+/).length>=2&&proposed.split(/\s+/).length<=7&&
      !/\b(?:vessels?|freighters?|lakers?|ships?|winter|harbor|port|news)\b/i.test(proposed))
   discovered={name:proposed,key:stableSlug(proposed)};
 }

 const harbors=HARBORS.filter(h=>h.re.test(full));
 const date=new Date(epoch).toISOString().slice(0,10);
 if((matches.length!==1&&!discovered)||harbors.length!==1)return{reason:'review',review:{date,url:link.toString(),title,publisher:source.publisher,why:matches.length!==1&&!discovered?'identity_unresolved':'harbor_unresolved'}};
 let kind=null;
 if(/\b(?:departed|departure|leaving winter|returned to service)\b/i.test(title))kind='departure';
 else if(/\b(?:arrived|arrival|docked|berthed|tied up|wintering)\b/i.test(full))kind='arrival';
 else if(/\b(?:moved to|shifted|graving dock|dry dock)\b/i.test(full))kind='berth_change';
 else if(/\b(?:maintenance|inspection|repairs|painting)\b/i.test(full))kind='maintenance';
 if(!kind)return{reason:'no_milestone'};
 if(kind==='arrival'&&/\b(?:expected|will arrive|scheduled|planning|plans to)\b/i.test(title))return{reason:'planned_only'};
 const vessel=discovered||{name:matches[0].name,key:matches[0].key},harborId=harbors[0].id;
 const verified=!discovered&&source.sourceClass==='port_authority'&&kind==='arrival'&&/\b(?:arrived|docked|berthed|wintering)\b/i.test(full);
 const summary=kind==='arrival'?vessel.name+' was reported arriving for winter layup in '+harborId.replace(/-/g,' ')+'.':kind==='departure'?vessel.name+' was reported departing after winter layup.':kind==='maintenance'?vessel.name+' received a winter maintenance update.':vessel.name+' had a documented change in winter berth.';
 return{reason:'accepted',event:{vessel,harborId,kind,date,confidence:verified?'confirmed':'reported',summary,source:{url:link.toString(),title,publisher:source.publisher,class:source.sourceClass}}};
}
async function refresh({ledger,archive,fetcher=fetch,now=new Date().toISOString()}){
 const known=catalog(archive,ledger),outcomes=[],reviews=[];let current=ledger,changed=false;
 for(const source of SOURCES){
  try{
   const res=await fetcher(source.url,{headers:{Accept:'application/json,application/rss+xml','User-Agent':'WinterLayupWatch/1.0 (+https://chrisizworski.com/)'},signal:AbortSignal.timeout(10000)});
   if(!res.ok)throw Error('HTTP '+res.status);
   const items=parse(await res.text(),source);let added=0;
   for(const item of items){const d=classify(item,source,known,ledger.season);if(d.review)reviews.push(d.review);if(d.event){const result=addEvidence(current,d.event,now);current=result.ledger;if(result.changed){changed=true;added++}}}
   outcomes.push({source:source.id,ok:true,items:items.length,added});
  }catch(e){outcomes.push({source:source.id,ok:false,error:String(e.message||e).slice(0,100)})}
 }
 return{ledger:current,changed,reviews:[...new Map(reviews.map(r=>[r.url,r])).values()],outcomes};
}
module.exports={SOURCES,clean,parse,catalog,classify,refresh};