#!/usr/bin/env node
/** Research-only Welland source audit. Prints file-level media licenses,
 * dates, attributions and descriptions before ANY replacement on the site.
 * A filename or search result alone is not a verified image identity.
 */
const fs=require('fs');
const q=[
  'file: "Welland Canal" "Lock 4"',
  'file: "Welland Canal" "Lock 5"',
  'file: "Welland Canal" "Lock 6"',
  'file: "Welland Canal" "Lock 8"',
  'file: "Twin Flight Locks" "Welland"',
  'file: "Thorold" "Flight Locks"',
  'file: "Welland Canal" "flight"',
  'file: "Port Colborne" "Lock 8"'
];
const manual=[
  'File:Lock 8 On The Welland Ship Canal.jpg',
  'File:Welland ship canal - channelled faces for pit for lock no. 5 LCCN2007681023.jpg',
  'File:Welland Canal aerial.png',
  'File:Aerial view of the Welland Canal.jpg',
  'File:Welland Canal locks.png',
  'File:Locks at the Welland Canal (8740509871).jpg',
  'File:Welland Canal 01.jpg',
  'File:Welland Canal 02.jpg'
];
const headers={'User-Agent':'ChrisIzworski-PhotoSourceAudit/1.0 (https://chrisizworski.com/welland-canal/; research with source credit)','Accept':'application/json'};
function clean(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,550)}
async function api(query){
 const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({...query,format:'json',formatversion:'2',origin:'*'});
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),35000);
 try{const r=await fetch(url,{headers,signal:c.signal});if(!r.ok)throw Error(r.status+' '+url);return await r.json()}finally{clearTimeout(timer)}
}
async function main(){
 let candidateTitles=new Set(manual), searches=[];
 for(const term of q){
 try{
   const data=await api({action:'query',generator:'search',gsrsearch:term,gsrnamespace:6,gsrlimit:30,prop:'info'});
   const titles=(data.query?.pages||[]).map(x=>x.title);
   searches.push({term,count:titles.length,titles:titles.slice(0,22)});
   titles.forEach(t=>candidateTitles.add(t));
 }catch(e){searches.push({term,error:String(e)})}
 }
 try{
 const special=await api({action:'query',pageids:'106064694',prop:'imageinfo',iiprop:'url|size|extmetadata'});
 console.log('TARGET WOLFGANG IMAGE PAGEID:',JSON.stringify(special.query?.pages||[]).slice(0,4000));
 for(const item of special.query?.pages||[])if(item.title?.startsWith('File:'))candidateTitles.add(item.title);
 }catch(e){console.log('TARGET WOLFGANG ERROR',String(e))}
 const names=[...candidateTitles].filter(s=>s.startsWith('File:')).slice(0,160),images=[];
 for(let i=0;i<names.length;i+=20){
  try{
    const data=await api({action:'query',titles:names.slice(i,i+20).join('|'),prop:'imageinfo',iiprop:'url|size|extmetadata',iilimit:1});
    for(const item of data.query?.pages||[]){
      const im=item.imageinfo?.[0],m=im?.extmetadata||{};
      if(!im)continue;
      images.push({name:item.title,width:im.width,height:im.height,bytes:im.size,url:im.url,
        description:clean(m.ImageDescription?.value),credit:clean(m.Artist?.value),
        license:m.LicenseShortName?.value||'',licenseUrl:m.LicenseUrl?.value||'',
        restrictions:clean(m.Restrictions?.value),copyrighted:m.Copyrighted?.value||'',
        usage:m.UsageTerms?.value||'',sourcePage:im.descriptionurl,
      });
    }
  }catch(e){console.log('batch fail',i,String(e))}
 }
 const report={date:new Date().toISOString(),note:'Research candidates; no photo assigned to a lock absent source and visual checks',searches,images};
 fs.mkdirSync('artifacts',{recursive:true});
 fs.writeFileSync('artifacts/welland-exact-photo-source-audit.json',JSON.stringify(report,null,2));
 console.log('FOUND CANDIDATES:',images.length);
 for(const x of images.filter(x=>/lock|flight|aerial/i.test(x.name+' '+x.description)))
   console.log(JSON.stringify({name:x.name,size:x.width+'x'+x.height,license:x.license,credit:x.credit,description:x.description.slice(0,160),url:x.sourcePage}));
 console.log('Report written');
}
main().catch(e=>{console.error(e);process.exitCode=1});
