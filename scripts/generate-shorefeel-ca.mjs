import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const catalog=JSON.parse(await readFile(path.join(root,'data/shorefeel-canada-ontario.json'),'utf8'));
const file=path.join(root,'public/great-lakes-beaches/canada/index.html');
const enc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
const slugs=new Set();
const html=catalog.locations.map(b=>{
 if(slugs.has(b.slug))throw new Error('Duplicate Canadian beach slug '+b.slug);
 slugs.add(b.slug);
 if(!['Superior','Huron','Erie','Ontario'].includes(b.lake)||!b.officialUrl.startsWith('https://')||
    !b.advisory.url.startsWith('https://')||!Number.isFinite(b.reference.lat)||!Number.isFinite(b.reference.lon))
   throw new Error('Invalid source-controlled Canada beach '+b.slug);
 return `<li class="shore-stop" data-slug="${enc(b.slug)}" data-lake="${enc(b.lake)}" data-lat="${b.reference.lat}" data-lon="${b.reference.lon}" data-name="${enc(b.name)}" data-nearby="${enc(b.nearbyTown)}" data-story="${enc(b.story)}" data-source="${enc(b.advisory.authority)}" data-advisory="${enc(b.advisory.url)}" data-official="${enc(b.officialUrl)}"><button data-select="${enc(b.slug)}" type="button" aria-pressed="false"><span class="shore-stop-name">${enc(b.name)}</span><span class="shore-stop-sub">${enc(b.nearbyTown)}, Ontario · Lake ${enc(b.lake)}</span></button><a href="${enc(b.officialUrl)}" target="_blank" rel="noopener" aria-label="${enc(b.name)} official park or municipality page">Park details</a></li>`;
}).join('\n');
let page=await readFile(file,'utf8');
const start='<!-- shorefeel-ca-list:start -->',end='<!-- shorefeel-ca-list:end -->';
const a=page.indexOf(start),z=page.indexOf(end,a);
if(a<0||z<a||page.indexOf(start,a+1)!==-1)throw new Error('Missing or duplicate Canadian source markers');
const result=page.slice(0,a+start.length)+'\n'+html+'\n'+page.slice(z);
if(result!==page)await writeFile(file,result);
console.log('Canada ShoreFeel: '+slugs.size+' source-backed Ontario destinations');
