import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import shorelineNetwork from '../lib/shorefeel/network-links.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const check=process.argv.includes('--check');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
const mi=JSON.parse(await readFile(path.join(root,'data/beaches.json'),'utf8')).beaches;
const us=JSON.parse(await readFile(path.join(root,'data/shorefeel-us-coast.json'),'utf8')).beaches;
const ca=JSON.parse(await readFile(path.join(root,'data/shorefeel-canada-ontario.json'),'utf8')).locations;
if(mi.length!==50||us.length!==16||ca.length!==30)throw Error('ShoreFeel catalog count changed: re-audit before publishing');
const inserted=[];
let count=0;
for(const b of mi){
 const file=path.join(root,'public/great-lakes-beaches',b.slug,'index.html');
 const original=await readFile(file,'utf8');
 const link=shorelineNetwork.waterEvidenceLink(b);
 const expected='<p class="shorefeel-evidence-link"><a href="'+esc(link.href)+'">'+esc(link.label)+'</a> <span>'+esc(link.note)+'</span></p>';
 if(original.includes(expected)){count++;continue;}
 if(check)throw Error('Missing or stale ShoreFeel water bridge at '+b.slug);
 const existing='<p class="shorefeel-water" data-shorefeel-water>Nearby NOAA lake temperature is being checked. It will not be mistaken for swimming-area water.</p>';
 if(!original.includes(existing)||original.includes('class="shorefeel-evidence-link"'))
   throw Error('Unexpected Michigan beach source layout '+b.slug);
 await writeFile(file,original.replace(existing,existing+'\n      '+expected));
 inserted.push(b.slug);
 count++;
}
for(const [area,beaches] of [['around-the-lakes',us],['canada',ca]]){
 for(const b of beaches){
  const file=path.join(root,'public/great-lakes-beaches',area,b.slug,'index.html');
  const content=await readFile(file,'utf8');
  const link=shorelineNetwork.waterEvidenceLink(b);
  if(!content.includes('class="shore-water-context"')||
    !content.includes('href="'+esc(link.href)+'"')||
    !content.includes(esc(link.label)))throw Error('Missing ShoreFeel water context: '+area+'/'+b.slug);
  count++;
 }
}
console.log('ShoreFeel cross-tool link audit: '+count+' beaches checked'+(inserted.length?', '+inserted.length+' Michigan links synchronized':''));
