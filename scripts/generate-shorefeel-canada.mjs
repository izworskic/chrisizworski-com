import{readFile,writeFile}from'node:fs/promises';
import path from'node:path';
const root=path.resolve(import.meta.dirname,'..');
const file=path.join(root,'data/shorefeel-canada.json');
const page=path.join(root,'public/great-lakes-beaches/canada/index.html');
const data=JSON.parse(await readFile(file,'utf8'));
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
const first='<!-- shorefeel-canada-list:start -->',last='<!-- shorefeel-canada-list:end -->';
if(data.beaches?.length!==16)throw Error('Ontario source count changed: review source and revise tests');
const used=new Set();
const rows=data.beaches.map(p=>{
 if(used.has(p.slug))throw Error('Duplicate park '+p.slug);used.add(p.slug);
 if(!['Superior','Huron','Erie','Ontario'].includes(p.lake)||p.country!=='CA'||p.province!=='ON'||!p.parkUrl.startsWith('https://www.ontarioparks.ca/'))throw Error('Unreviewed source '+p.slug);
 return `<li class="park-item" data-park="${esc(p.slug)}" data-lake="${p.lake}" data-name="${esc(p.name)}" data-city="${esc(p.city)}" data-lat="${p.lat}" data-lon="${p.lon}" data-story="${esc(p.story)}" data-coordinate-note="${esc(p.coordinateNote)}" data-park-url="${esc(p.parkUrl)}" data-alerts-url="${esc(p.alertsUrl)}">
<button type="button" class="park-choice" data-select="${esc(p.slug)}" aria-pressed="false"><strong>${esc(p.name)}</strong><span>${esc(p.city)} · Lake ${p.lake}</span></button><a href="${esc(p.parkUrl)}" rel="noopener" target="_blank">Park details</a></li>`;
});
const original=await readFile(page,'utf8'),a=original.indexOf(first),z=original.indexOf(last,a);
if(a<0||z<0||original.indexOf(first,a+1)!==-1)throw Error('Invalid Canadian source markers');
const result=original.slice(0,a+first.length)+'\n'+rows.join('\n')+'\n'+original.slice(z);
if(result!==original)await writeFile(page,result);
console.log('Verified '+rows.length+' Ontario Parks destinations from controlled source catalog');
