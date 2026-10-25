'use strict';
const {norm,stableSlug,addEvidence}=require('./freighter-layup-season');
const SOURCE_CATALOG=require('../public/assets/freighter-layup-sources.json');
const SOURCES=SOURCE_CATALOG.sources;
const HARBORS=[{id:'superior',re:/\b(?:superior|duluth|fraser shipyards)\b/i},{id:'sturgeon-bay',re:/\b(?:sturgeon bay|fincantieri)\b/i},{id:'milwaukee',re:/\bmilwaukee\b/i},{id:'owen-sound',re:/\bowen sound\b/i},{id:'toledo',re:/\btoledo\b/i},
 {id:'sarnia',re:/\bsarnia\b/i},
 {id:'port-colborne',re:/\bport colborne\b/i},
 {id:'hamilton',re:/\b(?:hamilton harbour|port of hamilton|hamilton,? ontario)\b/i},
 {id:'thunder-bay',re:/\b(?:port of thunder bay|thunder bay,? ontario|thunder bay,? on)\b/i},
 {id:'erie-pa',re:/\b(?:erie,? pennsylvania|erie,? pa|port of erie|donjon shipbuilding)\b/i},
 {id:'cleveland',re:/\bcleveland\b/i},
 {id:'buffalo',re:/\b(?:buffalo harbor|buffalo,? new york|port of buffalo)\b/i},
 {id:'escanaba',re:/\bescanaba\b/i}];
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

 // Generic roundup articles belong in review; the headline must identify the ship.
 const titleNorm=' '+norm(title)+' ';
 if(matches.length===1&&!matches[0].aliases.some(a=>{const n=norm(a);return n.length>4&&titleNorm.includes(' '+n+' ')}))
  return{reason:'review',review:{date:new Date(epoch).toISOString().slice(0,10),url:link.toString(),title,publisher:source.publisher,why:'ship_not_explicit_in_headline'}};
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
function discoverWinterRoster(body,season){
 const fullYear=String(Number(season.slice(0,4))+1);
 const yr=season.slice(0,4)+'[-–]'+fullYear;
 const nameMatch=new RegExp('winter[-_ ]?lay[-_ ]?up[-_ ]?list[-_ ]?'+season.slice(0,4)+'[-_]'+fullYear,'i');
 for(const anchor of String(body||'').matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   const url=clean(anchor[1]),label=clean(anchor[2]);
   const normalized=label+' '+url;
   if(!nameMatch.test(normalized)&&!new RegExp('winter\\s*lay\\s*[- ]?\\s*up','i').test(label))continue;
   if(!new RegExp(yr,'i').test(normalized)&&!nameMatch.test(normalized))continue;
   try{
     const parsed=new URL(url,'https://www.boatnerd.com/');
     if(parsed.protocol==='https:'&&['www.boatnerd.com','boatnerd.com'].includes(parsed.hostname))return parsed.toString();
   }catch{}
 }
 return null;
}
function leadFor(item,why,source,details={}){
 return {date:item.date||null,url:String(item.url),title:String(item.title||'').slice(0,190),
   publisher:source.publisher,sourceId:source.id,why,priority:why==='winter_roster_discovered'?100:why==='source_review_only'?80:60,...details};
}

function corroborate(candidates,known,ledger,now){
 const knownKeys=new Set(known.map(x=>x.key));
 const grouped=new Map();
 for(const c of candidates){
  const e=c.event,title=String(e.source.title||'');
  // No unknown identities or broad year-end recaps can autonomously create a winter entry.
  if(!knownKeys.has(e.vessel.key)||e.kind!=='arrival'||!/\b(?:winter layup|winter lay-up|winter berth|wintering)\b/i.test(title)
    ||!/\b(?:arrived|arrives|arrival|docked|berthed|wintering)\b/i.test(title))continue;
  if(c.source.kind==='discovery'||c.source.kind==='roster')continue;
  const key=e.vessel.key+'|'+e.harborId;
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(e);
 }
 const completed=[];
 for(const group of grouped.values()){
  group.sort((a,b)=>b.date.localeCompare(a.date)||a.source.url.localeCompare(b.source.url));
  for(const primary of group){
   const complement=group.find(other=>other.source.url!==primary.source.url
     &&new URL(other.source.url).hostname!==new URL(primary.source.url).hostname
     &&Math.abs(Date.parse(other.date)-Date.parse(primary.date))<=3*86400000);
   if(!complement)continue;
   if(ledger.events.some(e=>e.kind==='arrival'&&e.vessel.key===primary.vessel.key
      &&e.harborId===primary.harborId&&Math.abs(Date.parse(e.date)-Date.parse(primary.date))<=3*86400000))break;
   completed.push({...primary,confidence:'reported',summary:
      'Two dated reports from different publisher domains describe '+primary.vessel.name+
      ' arriving for winter layup at '+primary.harborId.replace(/-/g,' ')+'. The arrival remains reported, not officially confirmed.',
      supportingSources:[complement.source]});
   break;
  }
 }
 return completed;
}
async function refresh({ledger,archive,fetcher=fetch,now=new Date().toISOString()}){
 const known=catalog(archive,ledger),outcomes=[],reviews=[],corroborationCandidates=[];
 let current=ledger,changed=false;
 const CONCURRENCY=4;
 async function read(source){
  try{
   const response=await fetcher(source.url,{headers:{Accept:source.format==='blogger'?'application/json':'application/rss+xml,application/xml,text/html',
     'User-Agent':'WinterLayupSourceWatch/2.0 (+https://chrisizworski.com/)'},signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const body=await response.text();
   if(body.length>1100000)throw Error('Feed too large');
   return {ok:true,body};
  }catch(e){return{ok:false,error:String(e.message||e).slice(0,100)}}
 }
 for(let offset=0;offset<SOURCES.length;offset+=CONCURRENCY){
  const batch=SOURCES.slice(offset,offset+CONCURRENCY),downloads=await Promise.all(batch.map(read));
  for(let j=0;j<batch.length;j++){
   const source=batch[j],result=downloads[j];
   if(!result.ok){outcomes.push({source:source.id,mode:source.mode,ok:false,error:result.error});continue}
   try{
    if(source.format==='roster_html'){
     const url=discoverWinterRoster(result.body,ledger.season);
     if(url)reviews.push(leadFor({url,date:now.slice(0,10),title:'BoatNerd '+ledger.season+' winter layup roster published'},
       'winter_roster_discovered',source,{detail:'A roster link cannot establish any current-season vessel location'}));
     outcomes.push({source:source.id,mode:source.mode,ok:true,items:url?1:0,added:0,reviewed:url?1:0});
     continue;
    }
    const items=parse(result.body,source);
    let added=0,reviewed=0;
    for(const item of items){
     const d=classify(item,source,known,ledger.season);
     if(d.review){reviews.push({...leadFor(d.review,d.review.why||'needs_review',source),mode:source.mode});reviewed++}
     if(!d.event)continue;
     if(source.mode==='review'){
      // Google News and all broader journalism is reviewed; a single feed cannot confirm layup.
      if(source.kind!=='discovery')corroborationCandidates.push({source,event:d.event});
      reviews.push({...leadFor({url:d.event.source.url,date:d.event.date,title:d.event.source.title},
       'editorial_review_required',source,{vesselKey:d.event.vessel.key,harborId:d.event.harborId,kind:d.event.kind}),mode:'review'});
      reviewed++;continue;
     }
     try{const accepted=addEvidence(current,d.event,now);current=accepted.ledger;if(accepted.changed){changed=true;added++}}
     catch(e){reviews.push({...leadFor({url:d.event.source.url,date:d.event.date,title:d.event.source.title},
       'event_requires_review',source,{detail:String(e.message).slice(0,100)}),mode:source.mode});reviewed++}
    }
    outcomes.push({source:source.id,mode:source.mode,ok:true,items:items.length,added,reviewed});
   }catch(e){outcomes.push({source:source.id,mode:source.mode,ok:false,error:String(e.message||e).slice(0,100)})}
  }
 }
 for(const e of corroborate(corroborationCandidates,known,current,now)){
  try{const applied=addEvidence(current,e,now);current=applied.ledger;if(applied.changed)changed=true}
  catch(err){reviews.push({url:e.source.url,date:e.date,title:e.source.title,publisher:e.source.publisher,why:'cross_source_requires_review',detail:String(err.message).slice(0,100)})}
 }
 return {ledger:current,changed,reviews:[...new Map(reviews.map(x=>[x.url,x])).values()]
  .sort((a,b)=>(b.priority||0)-(a.priority||0)||(b.date||'').localeCompare(a.date||'')),outcomes};
}
module.exports={SOURCES,SOURCE_CATALOG,clean,parse,catalog,classify,discoverWinterRoster,corroborate,refresh};