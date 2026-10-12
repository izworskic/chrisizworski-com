#!/usr/bin/env node
const ids=[99282,99277,99179,99330,99279,99281,99284,99285];
const headers={'User-Agent':'ChrisIzworski-Welland-Historic-Photo-Research/1.0 (https://chrisizworski.com/welland-canal/)','Accept':'application/json'};
async function pull(url){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),25000);
 try{const r=await fetch(url,{headers,signal:c.signal});if(!r.ok)throw Error(r.status+' '+url);return await r.json()}finally{clearTimeout(timer)}
}
function values(o,key){return(o[key]||[]).map(v=>v['@value']||v['o:label']||v.display_title||v['@id']||'').join(' / ').slice(0,500)}
for(const id of ids){
 try{
  const item=await pull('https://nfpl.historicniagara.ca/api/items/'+id);
  const info={id,title:values(item,'dcterms:title'),rights:values(item,'dcterms:rights'),rightsHolder:values(item,'dcterms:rightsHolder'),source:values(item,'dcterms:source'),created:values(item,'dcterms:date'),medias:[]};
  for(const m of (item['o:media']||[]).slice(0,3)){
   try{
    const mm=await pull(m['@id']);
    info.medias.push({id:mm['o:id'],original: mm['o:original_url'],large:mm['o:large_url'],thumb:mm['o:thumbnail_urls'],type:mm['o:media_type'],title:values(mm,'dcterms:title')});
   }catch(e){info.medias.push({error:String(e)})}
  }
  console.log(JSON.stringify(info));
 }catch(e){console.log(JSON.stringify({id,error:String(e)}))}
}
